import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const RETRY_DELAYS = [2000, 4000, 8000, 16000, 30000];
const HOST_TIMEOUT_MS = 8000;

export function createOnlineMatchSync({ matchId, isHost, onStatusChange, onReceiveState, onReceiveInput, onHostLeft }) {
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
  let hostLeftFired = false;

  // Guest-side: track when the last state arrived to detect a silent host
  let lastStateAt = Date.now();
  let hostTimeoutInterval = null;

  function fireHostLeft() {
    if (hostLeftFired || destroyed) return;
    hostLeftFired = true;
    console.warn("[sync] хост недоступен");
    onHostLeft?.();
  }

  function attach() {
    channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    channel
      .on("broadcast", { event: "state" }, ({ payload }) => {
        if (!isHost) {
          lastStateAt = Date.now();
          onReceiveState?.(payload);
        }
      })
      .on("broadcast", { event: "input" }, ({ payload }) => {
        if (isHost) onReceiveInput?.(payload);
      })
      .on("broadcast", { event: "host_left" }, () => {
        if (!isHost) fireHostLeft();
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
          // Start the host-liveness check on the guest side
          if (!isHost && !hostTimeoutInterval) {
            lastStateAt = Date.now();
            hostTimeoutInterval = setInterval(() => {
              if (destroyed) return;
              if (Date.now() - lastStateAt > HOST_TIMEOUT_MS) fireHostLeft();
            }, 2000);
          }
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

  // Host: announce departure on beforeunload / pagehide (best-effort)
  function handleUnload() {
    channel?.send({ type: "broadcast", event: "host_left", payload: {} });
  }

  if (isHost) {
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
  }

  attach();

  return {
    sendState(state) {
      channel?.send({ type: "broadcast", event: "state", payload: state });
    },
    sendInput(input) {
      channel?.send({ type: "broadcast", event: "input", payload: input });
    },
    notifyHostLeft() {
      if (isHost) handleUnload();
    },
    destroy() {
      console.log(`[sync] ${role} отключается от канала`, channelName);
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (hostTimeoutInterval) {
        clearInterval(hostTimeoutInterval);
        hostTimeoutInterval = null;
      }
      if (isHost) {
        window.removeEventListener("beforeunload", handleUnload);
        window.removeEventListener("pagehide", handleUnload);
      }
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    }
  };
}
