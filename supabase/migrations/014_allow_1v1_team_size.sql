-- Allow team_size = 1 for 1v1 online matches

alter table public.online_rooms
  drop constraint if exists online_rooms_team_size_check;
alter table public.online_rooms
  add constraint online_rooms_team_size_check check (team_size in (1, 3, 4, 5));

alter table public.online_matches
  drop constraint if exists online_matches_team_size_check;
alter table public.online_matches
  add constraint online_matches_team_size_check check (team_size in (1, 3, 4, 5));
