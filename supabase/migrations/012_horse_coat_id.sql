alter table public.online_room_players
  add column if not exists horse_coat_id text default null;
