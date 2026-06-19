-- Update apply_match_reward to accept per-match goal and steal counts.
-- Replaces the previous version that always kept goals/steals unchanged.
create or replace function public.apply_match_reward(
  p_horse_id  text,
  p_xp_gain   integer,
  p_won       boolean,
  p_goals     integer default 0,
  p_steals    integer default 0
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
      'goals',   coalesce((v_horse.record->>'goals')::integer,   0) + greatest(coalesce(p_goals,  0), 0),
      'steals',  coalesce((v_horse.record->>'steals')::integer,  0) + greatest(coalesce(p_steals, 0), 0)
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

grant execute on function public.apply_match_reward(text, integer, boolean, integer, integer) to authenticated;
