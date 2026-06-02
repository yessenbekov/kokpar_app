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
using (true);

drop policy if exists "Users can join lobby rooms" on public.online_room_players;
create policy "Users can join lobby rooms"
on public.online_room_players
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own lobby player" on public.online_room_players;
create policy "Users can update own lobby player"
on public.online_room_players
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can leave rooms" on public.online_room_players;
create policy "Users can leave rooms"
on public.online_room_players
for delete
to authenticated
using (auth.uid() = user_id);
