import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const RETRY_DELAYS = [2000, 4000, 8000, 16000, 30000];

export function createOnlineMatchSync({ matchId, isHost, onStatusChange, onReceiveState, onReceiveInput }) {
  if (!isSupabaseConfigured || !supabase || !matchId) {
    console.warn("[sync] не создан — matchId:", matchId, "supabase:", !!supabase);
    onStatusChange?.("error");
    return null;
  }

  const role = isHost ? "host" : "guest";
  const channelName = `match-sync:${matchId}`;
  console.log(`[sync] ${role} подключается к каналу`, channelName);

  let destroyed = false;
  let retryCount = 0;
  let reconnectTimer = null;
  let channel = null;

  function attach() {
    channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    channel
      .on("broadcast", { event: "state" }, ({ payload }) => {
        if (!isHost) onReceiveState?.(payload);
      })
      .on("broadcast", { event: "input" }, ({ payload }) => {
        if (isHost) onReceiveInput?.(payload);
      })
      .subscribe((status, err) => {
        if (destroyed) return;

        if (err) {
          console.error("[sync] ошибка подписки:", err);
          scheduleReconnect();
          return;
        }

        console.log(`[sync] ${role} статус канала:`, status);
        if (status === "SUBSCRIBED") {
          retryCount = 0;
          onStatusChange?.("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          scheduleReconnect();
        }
      });
  }

  function scheduleReconnect() {
    if (destroyed) return;

    if (retryCount >= RETRY_DELAYS.length) {
      console.warn("[sync] исчерпаны попытки реконнекта");
      onStatusChange?.("error");
      return;
    }

    const delay = RETRY_DELAYS[retryCount++];
    onStatusChange?.("reconnecting");
    console.log(`[sync] ${role} реконнект через ${delay}ms (попытка ${retryCount}/${RETRY_DELAYS.length})`);

    reconnectTimer = setTimeout(() => {
      if (destroyed) return;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      attach();
    }, delay);
  }

  attach();

  return {
    sendState(state) {
      channel?.send({ type: "broadcast", event: "state", payload: state });
    },
    sendInput(input) {
      channel?.send({ type: "broadcast", event: "input", payload: input });
    },
    destroy() {
      console.log(`[sync] ${role} отключается от канала`, channelName);
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    }
  };
}
