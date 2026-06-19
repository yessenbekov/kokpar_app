-- Allow 'spectator' as a valid team_side value in online_room_players.
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.online_room_players'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%team_side%';

  if cname is not null then
    execute format('alter table public.online_room_players drop constraint %I', cname);
  end if;
end $$;

alter table public.online_room_players
  add constraint online_room_players_team_side_check
  check (team_side in ('blue', 'red', 'spectator'));
