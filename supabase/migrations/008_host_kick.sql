-- Allow hosts to kick players from their rooms.
-- Replaces the "leave" policy to also allow the room host to delete any player row.
drop policy if exists "Users can leave rooms" on public.online_room_players;
create policy "Users can leave rooms"
on public.online_room_players
for delete
to authenticated
using (
  auth.uid() = user_id
  or (select host_user_id from public.online_rooms where id = room_id) = auth.uid()
);
