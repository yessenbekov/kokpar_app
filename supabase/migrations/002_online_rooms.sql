create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.online_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{4,6}$'),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'starting', 'closed')),
  mode_id text not null default 'online_room',
  goal_type text not null default 'kazan' check (goal_type in ('circle', 'kazan')),
  team_size integer not null default 3 check (team_size in (3, 4, 5)),
  match_minutes integer not null default 2 check (match_minutes in (2, 3, 5)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.online_room_players (
  room_id uuid not null references public.online_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rider_name text not null default 'Шабандоз',
  horse_id text not null,
  horse_name text not null,
  horse_type text not null,
  team_side text not null default 'blue' check (team_side in ('blue', 'red')),
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists online_rooms_code_idx on public.online_rooms(code);
create index if not exists online_rooms_status_idx on public.online_rooms(status);
create index if not exists online_room_players_room_idx on public.online_room_players(room_id);
create index if not exists online_room_players_user_idx on public.online_room_players(user_id);

drop trigger if exists online_rooms_set_updated_at on public.online_rooms;
create trigger online_rooms_set_updated_at
before update on public.online_rooms
for each row execute function public.set_updated_at();

drop trigger if exists online_room_players_set_updated_at on public.online_room_players;
create trigger online_room_players_set_updated_at
before update on public.online_room_players
for each row execute function public.set_updated_at();

alter table public.online_rooms enable row level security;
alter table public.online_room_players enable row level security;

grant select, insert, update, delete on public.online_rooms to authenticated;
grant select, insert, update, delete on public.online_room_players to authenticated;

drop policy if exists "Authenticated users can read lobby rooms" on public.online_rooms;
create policy "Authenticated users can read lobby rooms"
on public.online_rooms
for select
to authenticated
using (
  status in ('lobby', 'starting')
  or host_user_id = auth.uid()
);

drop policy if exists "Hosts can create rooms" on public.online_rooms;
create policy "Hosts can create rooms"
on public.online_rooms
for insert
to authenticated
with check (auth.uid() = host_user_id);

drop policy if exists "Hosts can update rooms" on public.online_rooms;
create policy "Hosts can update rooms"
on public.online_rooms
for update
to authenticated
using (auth.uid() = host_user_id)
with check (auth.uid() = host_user_id);

drop policy if exists "Hosts can delete rooms" on public.online_rooms;
create policy "Hosts can delete rooms"
on public.online_rooms
for delete
to authenticated
using (auth.uid() = host_user_id);

drop policy if exists "Room players are visible to authenticated users" on public.online_room_players;
create policy "Room players are visible to authenticated users"
on public.online_room_players
for select
to authenticated
using (
  exists (
    select 1
    from public.online_rooms r
    where r.id = online_room_players.room_id
      and r.status in ('lobby', 'starting')
  )
);

drop policy if exists "Users can join lobby rooms" on public.online_room_players;
create policy "Users can join lobby rooms"
on public.online_room_players
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.online_rooms r
    where r.id = room_id
      and r.status = 'lobby'
  )
);

drop policy if exists "Users can update own lobby player" on public.online_room_players;
create policy "Users can update own lobby player"
on public.online_room_players
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.online_rooms r
    where r.id = room_id
      and r.status = 'lobby'
  )
)
with check (auth.uid() = user_id);

drop policy if exists "Users can leave rooms" on public.online_room_players;
create policy "Users can leave rooms"
on public.online_room_players
for delete
to authenticated
using (auth.uid() = user_id);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.online_rooms;
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.online_room_players;
  end if;
exception
  when duplicate_object then null;
end $$;
