-- Add onboarding_done column to player_profiles.
-- Backfill: any row with a non-default rider_name and at least one owned horse
-- is considered to have completed onboarding.

alter table public.player_profiles
  add column if not exists onboarding_done boolean not null default false;

update public.player_profiles p
set onboarding_done = true
where rider_name <> 'Шабандоз'
  and exists (
    select 1 from public.owned_horses h where h.user_id = p.user_id
  );
