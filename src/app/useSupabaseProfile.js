import { useCallback, useEffect, useRef, useState } from "react";
import { playerProfileStore } from "./profileStore.js";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";
import { supabaseProfileStore } from "./supabaseProfileStore.js";

const signedOutState = {
  status: isSupabaseConfigured ? "signed-out" : "unconfigured",
  syncStatus: "local",
  email: "",
  phone: "",
  phoneChannel: "sms",
  message: isSupabaseConfigured ? "Гостевой профиль" : "Supabase не настроен",
  error: ""
};

export function useSupabaseProfile({ onProfileLoaded } = {}) {
  const onProfileLoadedRef = useRef(onProfileLoaded);
  const loadedUserIdRef = useRef("");
  const [authState, setAuthState] = useState(() => ({
    ...signedOutState,
    status: isSupabaseConfigured ? "loading" : "unconfigured",
    message: isSupabaseConfigured ? "Проверяем вход" : signedOutState.message
  }));

  useEffect(() => {
    onProfileLoadedRef.current = onProfileLoaded;
  }, [onProfileLoaded]);

  const loadRemoteProfile = useCallback(async (user) => {
    if (!user) {
      loadedUserIdRef.current = "";
      setAuthState(signedOutState);
      return;
    }

    setAuthState({
      status: "signed-in",
      syncStatus: "syncing",
      email: user.email ?? "",
      phone: user.phone ?? "",
      phoneChannel: "sms",
      message: "Синхронизация",
      error: ""
    });

    try {
      const result = await supabaseProfileStore.read();
      const profile =
        result.status === "missing"
          ? await supabaseProfileStore.save(playerProfileStore.read())
          : playerProfileStore.save(result.profile);

      loadedUserIdRef.current = user.id;
      onProfileLoadedRef.current?.(profile);
      setAuthState({
        status: "signed-in",
        syncStatus: "synced",
        email: user.email ?? "",
        phone: user.phone ?? "",
        phoneChannel: "sms",
        message: result.status === "missing" ? "Локальный профиль перенесен" : "Профиль синхронизирован",
        error: ""
      });
    } catch (error) {
      setAuthState({
        status: "signed-in",
        syncStatus: "error",
        email: user.email ?? "",
        phone: user.phone ?? "",
        phoneChannel: "sms",
        message: "Локальный профиль активен",
        error: error instanceof Error ? error.message : "Ошибка синхронизации"
      });
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;

    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      if (error) {
        setAuthState({ ...signedOutState, status: "error", syncStatus: "error", error: error.message });
        return;
      }

      if (data.session?.user) {
        loadRemoteProfile(data.session.user);
      } else {
        setAuthState(signedOutState);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        loadedUserIdRef.current = "";
        setAuthState(signedOutState);
        return;
      }

      if (session?.user && loadedUserIdRef.current !== session.user.id) {
        loadRemoteProfile(session.user);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadRemoteProfile]);

  async function signInWithPassword(email, password) {
    if (!supabase) {
      setAuthState({ ...signedOutState, status: "unconfigured", syncStatus: "error", error: "Supabase не настроен" });
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) return;

    setAuthState((current) => ({
      ...current,
      status: "sending",
      syncStatus: "sending",
      email: cleanEmail,
      message: "Входим",
      error: ""
    }));

    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

    if (error) {
      setAuthState({
        ...signedOutState,
        status: "error",
        syncStatus: "error",
        email: cleanEmail,
        message: "Проверьте email и пароль",
        error: error.message
      });
    }
    // On success onAuthStateChange fires → loadRemoteProfile
  }

  async function signUp(email, password) {
    if (!supabase) {
      setAuthState({ ...signedOutState, status: "unconfigured", syncStatus: "error", error: "Supabase не настроен" });
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) return;

    setAuthState((current) => ({
      ...current,
      status: "sending",
      syncStatus: "sending",
      email: cleanEmail,
      message: "Создаём аккаунт",
      error: ""
    }));

    const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });

    if (error) {
      setAuthState({
        ...signedOutState,
        status: "error",
        syncStatus: "error",
        email: cleanEmail,
        message: "Ошибка регистрации",
        error: error.message
      });
      return;
    }

    if (!data.session) {
      // Email confirmation required
      setAuthState({
        ...signedOutState,
        syncStatus: "sent",
        email: cleanEmail,
        message: "Подтвердите email — письмо отправлено",
        error: ""
      });
      return;
    }
    // Session exists → onAuthStateChange fires → loadRemoteProfile
  }

  async function resetPassword(email) {
    if (!supabase) return;

    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setAuthState((current) => ({ ...current, status: "sending", message: "Отправляем письмо", error: "" }));

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin
    });

    setAuthState((current) => ({
      ...current,
      status: "signed-out",
      syncStatus: error ? "error" : "sent",
      email: cleanEmail,
      message: error ? "Ошибка отправки" : "Письмо для сброса пароля отправлено",
      error: error ? error.message : ""
    }));
  }

  async function signInWithEmail(email) {
    if (!supabase) {
      setAuthState({ ...signedOutState, status: "unconfigured", syncStatus: "error", error: "Supabase не настроен" });
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setAuthState((current) => ({
      ...current,
      status: "sending",
      syncStatus: "sending",
      email: cleanEmail,
      phone: "",
      phoneChannel: "sms",
      message: "Отправляем ссылку",
      error: ""
    }));

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      setAuthState({
        ...signedOutState,
        status: "error",
        syncStatus: "error",
        email: cleanEmail,
        phone: "",
        phoneChannel: "sms",
        message: "Гостевой профиль активен",
        error: error.message
      });
      return;
    }

    setAuthState({
      status: "signed-out",
      syncStatus: "sent",
      email: cleanEmail,
      phone: "",
      phoneChannel: "sms",
      message: "Ссылка отправлена",
      error: ""
    });
  }

  async function signInWithPhone(phone, channel = "sms") {
    if (!supabase) {
      setAuthState({ ...signedOutState, status: "unconfigured", syncStatus: "error", error: "Supabase не настроен" });
      return;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone) return;
    const otpChannel = channel === "whatsapp" ? "whatsapp" : "sms";

    setAuthState((current) => ({
      ...current,
      status: "sending",
      syncStatus: "sending",
      email: "",
      phone: cleanPhone,
      phoneChannel: otpChannel,
      message: otpChannel === "whatsapp" ? "Отправляем WhatsApp" : "Отправляем SMS",
      error: ""
    }));

    const { error } = await supabase.auth.signInWithOtp({
      phone: cleanPhone,
      options: {
        channel: otpChannel
      }
    });

    if (error) {
      setAuthState({
        ...signedOutState,
        status: "error",
        syncStatus: "error",
        email: "",
        phone: cleanPhone,
        phoneChannel: otpChannel,
        message: "Гостевой профиль активен",
        error: error.message
      });
      return;
    }

    setAuthState({
      status: "signed-out",
      syncStatus: "phone-sent",
      email: "",
      phone: cleanPhone,
      phoneChannel: otpChannel,
      message: otpChannel === "whatsapp" ? "Код отправлен в WhatsApp" : "Код отправлен по SMS",
      error: ""
    });
  }

  async function verifyPhoneOtp(phone, token) {
    if (!supabase) return;

    const cleanPhone = phone.trim();
    const cleanToken = token.trim();
    if (!cleanPhone || !cleanToken) return;

    setAuthState((current) => ({
      ...current,
      status: "verifying",
      syncStatus: "verifying",
      phone: cleanPhone,
      phoneChannel: authState.phoneChannel ?? "sms",
      message: "Проверяем код",
      error: ""
    }));

    const { error } = await supabase.auth.verifyOtp({
      phone: cleanPhone,
      token: cleanToken,
      type: "sms"
    });

    if (error) {
      setAuthState({
        ...signedOutState,
        status: "error",
        syncStatus: "error",
        email: "",
        phone: cleanPhone,
        phoneChannel: authState.phoneChannel ?? "sms",
        message: "Код не подошел",
        error: error.message
      });
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    loadedUserIdRef.current = "";
    setAuthState(signedOutState);
  }

  async function applyMatchReward(horseId, xpGain, won) {
    if (!supabase || authState.status !== "signed-in") return null;

    const { data, error } = await supabase.rpc("apply_match_reward", {
      p_horse_id: horseId,
      p_xp_gain: xpGain,
      p_won: won
    });

    if (error) {
      console.warn("apply_match_reward failed", error);
      return null;
    }

    return data;
  }

  const syncProfile = useCallback(async (profile) => {
    if (!supabase || authState.status !== "signed-in") return;

    setAuthState((current) => ({ ...current, syncStatus: "syncing", message: "Синхронизация", error: "" }));

    try {
      await supabaseProfileStore.save(profile);
      setAuthState((current) => ({ ...current, syncStatus: "synced", message: "Профиль сохранен", error: "" }));
    } catch (error) {
      setAuthState((current) => ({
        ...current,
        syncStatus: "error",
        message: "Локально сохранено",
        error: error instanceof Error ? error.message : "Ошибка сохранения"
      }));
    }
  }, [authState.status]);

  return {
    authState,
    signInWithPassword,
    signUp,
    resetPassword,
    signInWithEmail,
    signInWithPhone,
    verifyPhoneOtp,
    signOut,
    syncProfile,
    applyMatchReward
  };
}
