-- Server-side match reward: validates and caps XP gain, atomically updates horse progression.
-- Max gain is 40 XP (15 participation + 25 win) — client-supplied values above this are capped.
create or replace function public.apply_match_reward(
  p_horse_id text,
  p_xp_gain   integer,
  p_won       boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id       uuid;
  v_horse         record;
  v_max_xp_gain   constant integer := 40;
  v_xp_per_level  constant integer := 100;
  v_capped_xp     integer;
  v_new_total_xp  integer;
  v_levels_gained integer;
  v_new_level     integer;
  v_new_xp        integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_capped_xp := least(greatest(coalesce(p_xp_gain, 0), 0), v_max_xp_gain);

  select * into v_horse
  from owned_horses
  where user_id = v_user_id and id = p_horse_id
  for update;

  if not found then
    raise exception 'Horse not found: %', p_horse_id;
  end if;

  v_new_total_xp  := v_horse.xp + v_capped_xp;
  v_levels_gained := v_new_total_xp / v_xp_per_level;
  v_new_xp        := v_new_total_xp % v_xp_per_level;
  v_new_level     := v_horse.level + v_levels_gained;

  update owned_horses
  set
    xp     = v_new_xp,
    level  = v_new_level,
    record = jsonb_build_object(
      'matches', coalesce((v_horse.record->>'matches')::integer, 0) + 1,
      'wins',    coalesce((v_horse.record->>'wins')::integer,    0) + (case when p_won then 1 else 0 end),
      'goals',   coalesce((v_horse.record->>'goals')::integer,   0),
      'steals',  coalesce((v_horse.record->>'steals')::integer,  0)
    )
  where user_id = v_user_id and id = p_horse_id;

  return jsonb_build_object(
    'horse_id',   p_horse_id,
    'xp',         v_new_xp,
    'level',      v_new_level,
    'xp_gain',    v_capped_xp,
    'leveled_up', v_levels_gained > 0
  );
end;
$$;

-- Sync the full horse roster (add / rename / delete) without touching progression.
-- On INSERT of a new horse: all supplied values are used (level, xp, record included).
-- On UPDATE of an existing horse: only metadata is updated — xp, level, record stay
-- as they are and are never overwritten by client-supplied values.
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
    insert into owned_horses (user_id, id, name, type_id, level, xp, bond, equipment, record)
    values (
      v_user_id,
      v_horse->>'id',
      coalesce(v_horse->>'name', 'Ат'),
      coalesce(v_horse->>'type_id', 'argymak'),
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

grant execute on function public.apply_match_reward(text, integer, boolean) to authenticated;
grant execute on function public.sync_owned_horses(jsonb) to authenticated;
