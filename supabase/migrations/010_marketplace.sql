-- Add inventory to player profiles (unequipped items waiting to be equipped or sold)
alter table public.player_profiles
  add column if not exists inventory jsonb not null default '[]';

-- Marketplace listings
create table if not exists public.marketplace_listings (
  id           uuid primary key default gen_random_uuid(),
  seller_id    uuid not null references auth.users(id) on delete cascade,
  seller_name  text not null default 'Шабандоз',
  item_type    text not null check (item_type in ('equipment', 'horse')),
  -- Equipment listing
  item_id      text,
  slot_key     text,
  -- Horse listing
  horse_type_id text,
  horse_name    text,
  horse_level   integer default 1,
  horse_xp      integer default 0,
  horse_record  jsonb default '{}',
  -- Common
  price        integer not null check (price >= 1),
  status       text not null default 'active' check (status in ('active', 'sold', 'cancelled')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists marketplace_listings_status_idx on public.marketplace_listings(status);
create index if not exists marketplace_listings_seller_idx on public.marketplace_listings(seller_id);

drop trigger if exists marketplace_listings_set_updated_at on public.marketplace_listings;
create trigger marketplace_listings_set_updated_at
  before update on public.marketplace_listings
  for each row execute function public.set_updated_at();

alter table public.marketplace_listings enable row level security;

drop policy if exists "Anyone can view active listings" on public.marketplace_listings;
create policy "Anyone can view active listings"
  on public.marketplace_listings for select
  using (status = 'active' or seller_id = auth.uid());

drop policy if exists "Users can insert listings" on public.marketplace_listings;
create policy "Users can insert listings"
  on public.marketplace_listings for insert
  to authenticated with check (seller_id = auth.uid());

drop policy if exists "Sellers can update listings" on public.marketplace_listings;
create policy "Sellers can update listings"
  on public.marketplace_listings for update
  to authenticated
  using (seller_id = auth.uid());

-- create_listing: validates ownership, removes item from seller, creates listing
create or replace function public.create_listing(
  p_item_type text,
  p_item_id   text,
  p_slot_key  text,
  p_horse_id  text,
  p_price     integer
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_seller_name text;
  v_horse       record;
  v_lid         uuid;
begin
  if v_uid is null then raise exception 'Auth required'; end if;
  if p_price < 1 then raise exception 'Price must be >= 1'; end if;

  select rider_name into v_seller_name from player_profiles where user_id = v_uid;

  if p_item_type = 'horse' then
    select * into v_horse from owned_horses where user_id = v_uid and id = p_horse_id for update;
    if not found then raise exception 'Horse not found'; end if;
    if (select count(*) from owned_horses where user_id = v_uid) <= 1 then
      raise exception 'Cannot sell your last horse';
    end if;
    delete from owned_horses where user_id = v_uid and id = p_horse_id;

    insert into marketplace_listings
      (seller_id, seller_name, item_type, horse_type_id, horse_name, horse_level, horse_xp, horse_record, price)
    values
      (v_uid, coalesce(v_seller_name,'Шабандоз'), 'horse',
       v_horse.type_id, v_horse.name, v_horse.level, v_horse.xp, v_horse.record, p_price)
    returning id into v_lid;

  elsif p_item_type = 'equipment' then
    -- item must be equipped on one of seller's horses
    if not exists (
      select 1 from owned_horses
      where user_id = v_uid and equipment->>p_slot_key = p_item_id
    ) then
      raise exception 'Equipment not found';
    end if;
    -- Remove from horse equipment
    update owned_horses
    set equipment = equipment - p_slot_key
    where user_id = v_uid and equipment->>p_slot_key = p_item_id;

    insert into marketplace_listings
      (seller_id, seller_name, item_type, item_id, slot_key, price)
    values
      (v_uid, coalesce(v_seller_name,'Шабандоз'), 'equipment', p_item_id, p_slot_key, p_price)
    returning id into v_lid;

  else
    raise exception 'Invalid item_type';
  end if;

  return v_lid;
end;
$$;

-- purchase_listing: atomic transfer of coins + item
create or replace function public.purchase_listing(p_listing_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_listing record;
  v_coins   integer;
  v_new_id  text;
begin
  if v_uid is null then raise exception 'Auth required'; end if;

  select * into v_listing from marketplace_listings
    where id = p_listing_id and status = 'active' for update;
  if not found then raise exception 'Listing not found or sold'; end if;
  if v_listing.seller_id = v_uid then raise exception 'Cannot buy own listing'; end if;

  select coins into v_coins from player_profiles where user_id = v_uid for update;
  if v_coins < v_listing.price then raise exception 'Not enough coins'; end if;

  -- Transfer coins
  update player_profiles set coins = coins - v_listing.price where user_id = v_uid;
  update player_profiles set coins = coins + v_listing.price where user_id = v_listing.seller_id;

  -- Mark sold
  update marketplace_listings set status = 'sold', updated_at = now() where id = p_listing_id;

  if v_listing.item_type = 'horse' then
    v_new_id := 'horse-' || v_listing.horse_type_id || '-' || floor(extract(epoch from now()))::text;
    insert into owned_horses (user_id, id, name, type_id, level, xp, bond, equipment, record)
    values (v_uid, v_new_id, v_listing.horse_name, v_listing.horse_type_id,
            coalesce(v_listing.horse_level,1), coalesce(v_listing.horse_xp,0),
            0, '{}', coalesce(v_listing.horse_record,'{}'));
  else
    -- Add item to buyer's inventory
    update player_profiles
    set inventory = inventory || jsonb_build_array(v_listing.item_id)
    where user_id = v_uid;
  end if;

  return jsonb_build_object(
    'item_type', v_listing.item_type,
    'item_id',   v_listing.item_id,
    'slot_key',  v_listing.slot_key,
    'horse_type_id', v_listing.horse_type_id,
    'horse_name', v_listing.horse_name,
    'price', v_listing.price
  );
end;
$$;

-- cancel_listing: returns item to seller
create or replace function public.cancel_listing(p_listing_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_listing record;
  v_new_id  text;
begin
  select * into v_listing from marketplace_listings
    where id = p_listing_id and seller_id = v_uid and status = 'active';
  if not found then raise exception 'Listing not found'; end if;

  update marketplace_listings set status = 'cancelled', updated_at = now() where id = p_listing_id;

  if v_listing.item_type = 'horse' then
    v_new_id := 'horse-' || v_listing.horse_type_id || '-' || floor(extract(epoch from now()))::text;
    insert into owned_horses (user_id, id, name, type_id, level, xp, bond, equipment, record)
    values (v_uid, v_new_id, v_listing.horse_name, v_listing.horse_type_id,
            v_listing.horse_level, v_listing.horse_xp, 0, '{}', v_listing.horse_record);
  else
    update player_profiles
    set inventory = inventory || jsonb_build_array(v_listing.item_id)
    where user_id = v_uid;
  end if;
end;
$$;

grant execute on function public.create_listing(text,text,text,text,integer) to authenticated;
grant execute on function public.purchase_listing(uuid) to authenticated;
grant execute on function public.cancel_listing(uuid) to authenticated;
