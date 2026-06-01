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

create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rider_name text not null default 'Шабандоз',
  level integer not null default 1 check (level >= 1),
  coins integer not null default 0 check (coins >= 0),
  reputation integer not null default 0 check (reputation >= 0),
  selected_horse_id text,
  selected_horse_type text not null default 'argymak',
  stable_capacity integer not null default 6 check (stable_capacity >= 1),
  match_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.owned_horses (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  type_id text not null,
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  bond integer not null default 0 check (bond >= 0),
  equipment jsonb not null default '{}'::jsonb,
  record jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists owned_horses_user_id_idx on public.owned_horses(user_id);

drop trigger if exists player_profiles_set_updated_at on public.player_profiles;
create trigger player_profiles_set_updated_at
before update on public.player_profiles
for each row execute function public.set_updated_at();

drop trigger if exists owned_horses_set_updated_at on public.owned_horses;
create trigger owned_horses_set_updated_at
before update on public.owned_horses
for each row execute function public.set_updated_at();

alter table public.player_profiles enable row level security;
alter table public.owned_horses enable row level security;

drop policy if exists "Users can read own profile" on public.player_profiles;
create policy "Users can read own profile"
on public.player_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.player_profiles;
create policy "Users can insert own profile"
on public.player_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.player_profiles;
create policy "Users can update own profile"
on public.player_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own horses" on public.owned_horses;
create policy "Users can read own horses"
on public.owned_horses
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own horses" on public.owned_horses;
create policy "Users can insert own horses"
on public.owned_horses
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own horses" on public.owned_horses;
create policy "Users can update own horses"
on public.owned_horses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own horses" on public.owned_horses;
create policy "Users can delete own horses"
on public.owned_horses
for delete
using (auth.uid() = user_id);
