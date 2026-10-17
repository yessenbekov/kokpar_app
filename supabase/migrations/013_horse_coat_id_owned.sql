-- Add coat_id to owned_horses so the selected coat colour persists in the cloud profile.
alter table public.owned_horses
  add column if not exists coat_id text default null;

-- Replace sync_owned_horses to include coat_id in upsert
create or replace function public.sync_owned_horses(
  p_horses jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_horse   jsonb;
  v_ids     text[];
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select array_agg(h->>'id')
  into v_ids
  from jsonb_array_elements(p_horses) as h;

  for v_horse in select * from jsonb_array_elements(p_horses)
  loop
    insert into owned_horses (user_id, id, name, type_id, coat_id, level, xp, bond, equipment, record)
    values (
      v_user_id,
      v_horse->>'id',
      coalesce(v_horse->>'name', 'Ат'),
      coalesce(v_horse->>'type_id', 'argymak'),
      v_horse->>'coat_id',
      coalesce((v_horse->>'level')::integer, 1),
      coalesce((v_horse->>'xp')::integer, 0),
      coalesce((v_horse->>'bond')::integer, 0),
      coalesce(v_horse->'equipment', '{}'::jsonb),
      coalesce(v_horse->'record', '{}'::jsonb)
    )
    on conflict (user_id, id) do update
      set
        name      = excluded.name,
        type_id   = excluded.type_id,
        coat_id   = excluded.coat_id,
        bond      = excluded.bond,
        equipment = excluded.equipment;
        -- xp, level, record are intentionally preserved —
        -- progression is only updated through apply_match_reward()
  end loop;

  -- Remove horses that are no longer in the client roster
  if v_ids is not null then
    delete from owned_horses
    where user_id = v_user_id
      and id != all(v_ids);
  end if;
end;
$$;
