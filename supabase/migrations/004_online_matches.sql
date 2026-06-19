create table if not exists public.online_matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.online_rooms(id) on delete set null,
  host_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'starting' check (status in ('starting', 'playing', 'finished')),
  mode_id text not null default 'online_room',
  goal_type text not null default 'kazan' check (goal_type in ('circle', 'kazan')),
  team_size integer not null default 3 check (team_size in (3, 4, 5)),
  match_minutes integer not null default 2 check (match_minutes in (2, 3, 5)),
  settings jsonb not null default '{}'::jsonb,
  score_blue integer not null default 0 check (score_blue >= 0),
  score_red integer not null default 0 check (score_red >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.online_match_players (
  match_id uuid not null references public.online_matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rider_name text not null default 'Шабандоз',
  horse_id text not null,
  horse_name text not null,
  horse_type text not null,
  team_side text not null default 'blue' check (team_side in ('blue', 'red')),
  ready boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create table if not exists public.online_match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.online_matches(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  team_side text check (team_side in ('blue', 'red')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.online_rooms
add column if not exists online_match_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'online_rooms_online_match_id_fkey'
  ) then
    alter table public.online_rooms
    add constraint online_rooms_online_match_id_fkey
    foreign key (online_match_id) references public.online_matches(id) on delete set null;
  end if;
end $$;

create index if not exists online_rooms_online_match_idx on public.online_rooms(online_match_id);
create index if not exists online_matches_room_idx on public.online_matches(room_id);
create index if not exists online_matches_host_idx on public.online_matches(host_user_id);
create index if not exists online_matches_status_idx on public.online_matches(status);
create index if not exists online_match_players_match_idx on public.online_match_players(match_id);
create index if not exists online_match_events_match_idx on public.online_match_events(match_id, created_at);

drop trigger if exists online_matches_set_updated_at on public.online_matches;
create trigger online_matches_set_updated_at
before update on public.online_matches
for each row execute function public.set_updated_at();

alter table public.online_matches enable row level security;
alter table public.online_match_players enable row level security;
alter table public.online_match_events enable row level security;

grant select, insert, update on public.online_matches to authenticated;
grant select, insert on public.online_match_players to authenticated;
grant select, insert on public.online_match_events to authenticated;

drop policy if exists "Authenticated users can read online matches" on public.online_matches;
create policy "Authenticated users can read online matches"
on public.online_matches
for select
to authenticated
using (true);

drop policy if exists "Hosts can create online matches" on public.online_matches;
create policy "Hosts can create online matches"
on public.online_matches
for insert
to authenticated
with check (auth.uid() = host_user_id);

drop policy if exists "Hosts can update online matches" on public.online_matches;
create policy "Hosts can update online matches"
on public.online_matches
for update
to authenticated
using (auth.uid() = host_user_id)
with check (auth.uid() = host_user_id);

drop policy if exists "Authenticated users can read match players" on public.online_match_players;
create policy "Authenticated users can read match players"
on public.online_match_players
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can snapshot match players" on public.online_match_players;
create policy "Authenticated users can snapshot match players"
on public.online_match_players
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "Authenticated users can read match events" on public.online_match_events;
create policy "Authenticated users can read match events"
on public.online_match_events
for select
to authenticated
using (true);

drop policy if exists "Users can record own match events" on public.online_match_events;
create policy "Users can record own match events"
on public.online_match_events
for insert
to authenticated
with check (auth.uid() is not null and (user_id is null or auth.uid() = user_id));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.online_matches;
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.online_match_players;
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.online_match_events;
  end if;
exception
  when duplicate_object then null;
end $$;
