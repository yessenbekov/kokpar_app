import { useEffect, useRef, useState } from "react";
import { gameModeById } from "./app/gameModes.js";
import { makeInitialHud, readUrlSettings, shouldAutoStart } from "./app/matchConfig.js";
import { createListing, cancelListing, purchaseListing } from "./app/marketplaceStore.js";
import { onlineMatchStore } from "./app/onlineMatches.js";
import { createOnlineMatchSync } from "./app/onlineMatchSync.js";
import { matchHistoryStore } from "./app/matchHistoryStore.js";
import { newOwnedHorse, sanitizePlayerProfile } from "./app/playerProfile.js";
import { playerProfileStore } from "./app/profileStore.js";
import { supabaseProfileStore } from "./app/supabaseProfileStore.js";
import { useSupabaseProfile } from "./app/useSupabaseProfile.js";
import { AuthGate } from "./components/AuthGate.jsx";
import { FieldRadar } from "./components/FieldRadar.jsx";
import { HorseOnboarding } from "./components/HorseOnboarding.jsx";
import { MatchHud } from "./components/MatchHud.jsx";
import { MatchReward } from "./components/MatchReward.jsx";
import { MatchSetup } from "./components/MatchSetup.jsx";
import { TouchControls } from "./components/TouchControls.jsx";
import { createKokparGame } from "./game/createKokparGame.js";

const JOYSTICK_RADIUS = 46;

export default function App() {
  const mountRef = useRef(null);
  const gameRef = useRef(null);
  const syncRef = useRef(null);
  const joystickRef = useRef(null);
  const initialProfileRef = useRef(null);
  if (!initialProfileRef.current) initialProfileRef.current = playerProfileStore.read();
  const [joystick, setJoystick] = useState({ active: false, x: 0, z: 0 });
  const [profile, setProfile] = useState(() => initialProfileRef.current);
  const [settings, setSettings] = useState(() => readUrlSettings(initialProfileRef.current));
  const [activeSettings, setActiveSettings] = useState(() => (shouldAutoStart() ? readUrlSettings(initialProfileRef.current) : null));
  const [hud, setHud] = useState(() => makeInitialHud());
  const [ready, setReady] = useState(false);
  const [sceneError, setSceneError] = useState("");
  const [feedbackEnabled, setFeedbackEnabled] = useState(true);
  const [setupEntered, setSetupEntered] = useState(() => shouldAutoStart());
  const [matchReward, setMatchReward] = useState(null);
  const [syncStatus, setSyncStatus] = useState("idle");
  const { authState, needsOnboarding, completeOnboarding, signInWithPassword, signUp, resetPassword, signInWithEmail, signOut, syncProfile, applyMatchReward } = useSupabaseProfile({
    onProfileLoaded: loadSyncedProfile
  });

  function loadSyncedProfile(nextProfile) {
    setProfile(nextProfile);
    setSettings(readUrlSettings(nextProfile));
  }

  useEffect(() => {
    if (!mountRef.current || !activeSettings) return undefined;

    const settingsSnapshot = { ...activeSettings };
    const isOnlineHost = settingsSnapshot.onlineIsHost !== false;
    const gameSettings = {
      ...activeSettings,
      matchSeconds: activeSettings.matchMinutes * 60,
      feedbackEnabled,
      onMatchEvent: (event) => {
        if (settingsSnapshot.onlineMatchId && isOnlineHost) {
          onlineMatchStore.recordEvent(settingsSnapshot.onlineMatchId, event).catch((error) => {
            console.warn("online match event failed", error);
          });
        }
        if (event.type === "match_finished") {
          handleMatchFinished(event, settingsSnapshot);
        }
      }
    };

    try {
      gameRef.current = createKokparGame(mountRef.current, setHud, gameSettings);
      gameRef.current.assetsReadyPromise.then(() => setReady(true)).catch(() => setReady(true));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown WebGL error";
      setSceneError(message);
      setReady(true);
      setHud({
        ...makeInitialHud(),
        message: "WebGL недоступен",
        submessage: "Открой игру в браузере с включенным аппаратным ускорением.",
        showBanner: true
      });
    }

    let stateBroadcastInterval = null;

    if (settingsSnapshot.onlineMatchId) {
      setSyncStatus("connecting");
      syncRef.current = createOnlineMatchSync({
        matchId: settingsSnapshot.onlineMatchId,
        isHost: isOnlineHost,
        onStatusChange: setSyncStatus,
        onReceiveState(state) {
          gameRef.current?.applyNetworkState(state);
        },
        onReceiveInput(input) {
          gameRef.current?.setRemoteRiderInput(input);
        }
      });

      const isSpectator = settingsSnapshot.teamSide === "spectator";
      stateBroadcastInterval = setInterval(() => {
        if (isOnlineHost) {
          const state = gameRef.current?.getNetworkState?.();
          if (state) syncRef.current?.sendState(state);
        } else if (!isSpectator) {
          const input = gameRef.current?.getLocalPlayerInput?.();
          if (input) syncRef.current?.sendInput(input);
        }
      }, 50);
    }

    return () => {
      if (stateBroadcastInterval) clearInterval(stateBroadcastInterval);
      syncRef.current?.destroy();
      syncRef.current = null;
      setSyncStatus("idle");
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [activeSettings]);

  useEffect(() => {
    if (authState.status === "signed-in") setSetupEntered(true);
  }, [authState.status]);

  function setGameTouchInput(input) {
    gameRef.current?.setTouchInput?.(input);
  }

  function updateJoystick(event) {
    event.preventDefault();
    const rect = joystickRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dx = event.clientX - (rect.left + rect.width / 2);
    const dz = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dz);
    const scale = distance > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / distance : 1;
    const x = (dx * scale) / JOYSTICK_RADIUS;
    const z = (dz * scale) / JOYSTICK_RADIUS;

    setJoystick({ active: true, x, z });
    setGameTouchInput({ x, z });
  }

  function startJoystick(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateJoystick(event);
  }

  function releaseJoystick(event) {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setJoystick({ active: false, x: 0, z: 0 });
    setGameTouchInput({ x: 0, z: 0 });
  }

  function pressAction(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setGameTouchInput({ action: true });
  }

  function releaseAction(event) {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setGameTouchInput({ action: false });
  }

  function pressBodyCheck(event) {
    event.preventDefault();
    setGameTouchInput({ bodyCheck: true });
  }

  function releaseTouchControls(updateUi = true) {
    if (updateUi) setJoystick({ active: false, x: 0, z: 0 });
    setGameTouchInput({ x: 0, z: 0, action: false });
  }

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) releaseTouchControls();
    }

    window.addEventListener("blur", releaseTouchControls);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      releaseTouchControls(false);
      window.removeEventListener("blur", releaseTouchControls);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    releaseTouchControls();
  }, [activeSettings]);

  function updateSetting(key, value) {
    const nextSettings = { ...settings, [key]: value };

    if (key === "modeId") {
      const selectedMode = gameModeById(value);
      nextSettings.modeId = selectedMode.id;
      nextSettings.goalType = selectedMode.defaultGoalType;
    }

    if (key === "horseId") {
      const selectedHorse = profile.ownedHorses.find((horse) => horse.id === value) ?? profile.ownedHorses[0];
      nextSettings.horseId = selectedHorse.id;
      nextSettings.horseType = selectedHorse.typeId;
      nextSettings.horseName = selectedHorse.name;
    }

    setSettings(nextSettings);
    setProfile((currentProfile) =>
      saveProfile({
        ...currentProfile,
        selectedHorseId: nextSettings.horseId,
        selectedHorseType: nextSettings.horseType,
        matchPreferences: {
          modeId: nextSettings.modeId,
          goalType: nextSettings.goalType,
          teamSize: nextSettings.teamSize,
          matchMinutes: nextSettings.matchMinutes,
          teamSide: nextSettings.teamSide
        }
      })
    );
  }

  function saveProfile(nextProfile) {
    const savedProfile = playerProfileStore.save(nextProfile);
    syncProfile(savedProfile);
    return savedProfile;
  }

  function handleMatchFinished(event, settingsSnapshot) {
    const { horseId, teamSide } = settingsSnapshot;
    if (teamSide === "spectator") return;
    const playerWon =
      (teamSide === "blue" && event.score.blue > event.score.red) ||
      (teamSide === "red" && event.score.red > event.score.blue);

    const XP_PARTICIPATION = 15;
    const XP_WIN = 25;
    const XP_PER_LEVEL = 100;
    const xpGain = XP_PARTICIPATION + (playerWon ? XP_WIN : 0);

    const currentProfile = playerProfileStore.read();
    let reward = null;

    matchHistoryStore.push({
      id: String(Date.now()),
      horseName: currentProfile.ownedHorses.find((h) => h.id === horseId)?.name ?? "",
      horseId,
      modeId: settingsSnapshot.modeId ?? "classic",
      goalType: settingsSnapshot.goalType ?? "kazan",
      teamSize: settingsSnapshot.teamSize ?? 3,
      teamSide,
      scoreBlue: event.score.blue,
      scoreRed: event.score.red,
      won: playerWon,
      xpGain,
      isOnline: Boolean(settingsSnapshot.onlineMatchId),
      playedAt: new Date().toISOString()
    });

    const updatedHorses = currentProfile.ownedHorses.map((horse) => {
      if (horse.id !== horseId) return horse;

      const newXp = (horse.xp ?? 0) + xpGain;
      const levelsGained = Math.floor(newXp / XP_PER_LEVEL);

      reward = {
        xpGain,
        leveledUp: levelsGained > 0,
        newLevel: horse.level + levelsGained,
        horseName: horse.name
      };

      return {
        ...horse,
        xp: newXp % XP_PER_LEVEL,
        level: horse.level + levelsGained,
        record: {
          matches: (horse.record?.matches ?? 0) + 1,
          wins: (horse.record?.wins ?? 0) + (playerWon ? 1 : 0),
          goals: horse.record?.goals ?? 0,
          steals: horse.record?.steals ?? 0
        }
      };
    });

    const nextProfile = saveProfile({ ...currentProfile, ownedHorses: updatedHorses });
    setProfile(nextProfile);
    if (reward) {
      setMatchReward(reward);
      applyMatchReward(horseId, reward.xpGain, playerWon).catch((error) => {
        console.warn("server reward sync failed", error);
      });
    }
  }

  function renameHorse(horseId, name) {
    const trimmedName = name.trim().slice(0, 24);
    if (!trimmedName) return;

    setProfile((currentProfile) => {
      const renamedHorses = currentProfile.ownedHorses.map((horse) =>
        horse.id === horseId ? { ...horse, name: trimmedName } : horse
      );
      const nextProfile = saveProfile({
        ...currentProfile,
        ownedHorses: renamedHorses
      });

      if (settings.horseId === horseId) {
        setSettings((currentSettings) => ({ ...currentSettings, horseName: trimmedName }));
      }

      return nextProfile;
    });
  }

  function createHorse(typeId, name) {
    const horse = newOwnedHorse(typeId, name);
    const currentProfile = playerProfileStore.read();
    if (currentProfile.ownedHorses.length >= currentProfile.stableCapacity) return;

    const nextProfile = saveProfile({
      ...currentProfile,
      ownedHorses: [...currentProfile.ownedHorses, horse],
      selectedHorseId: horse.id,
      selectedHorseType: horse.typeId
    });
    setProfile(nextProfile);
    setSettings((s) => ({ ...s, horseId: horse.id, horseType: horse.typeId, horseName: horse.name }));
  }

  function renameRider(name) {
    const trimmedName = name.trim().slice(0, 24);
    if (!trimmedName) return;
    setProfile((currentProfile) => saveProfile({ ...currentProfile, riderName: trimmedName }));
  }

  function deleteHorse(horseId) {
    const currentProfile = playerProfileStore.read();
    if (currentProfile.ownedHorses.length <= 1) return;

    const remaining = currentProfile.ownedHorses.filter((h) => h.id !== horseId);
    const nextHorse = remaining.find((h) => h.id === currentProfile.selectedHorseId) ?? remaining[0];
    const nextProfile = saveProfile({
      ...currentProfile,
      ownedHorses: remaining,
      selectedHorseId: nextHorse.id,
      selectedHorseType: nextHorse.typeId
    });
    setProfile(nextProfile);
    setSettings((s) => ({
      ...s,
      horseId: nextHorse.id,
      horseType: nextHorse.typeId,
      horseName: nextHorse.name
    }));
  }

  function handleBuyItem(horseId, slotKey, itemId, cost) {
    const currentProfile = playerProfileStore.read();
    if (currentProfile.coins < cost) return;

    const updatedHorses = currentProfile.ownedHorses.map((horse) =>
      horse.id === horseId
        ? { ...horse, equipment: { ...horse.equipment, [slotKey]: itemId } }
        : horse
    );
    const nextProfile = saveProfile({
      ...currentProfile,
      coins: currentProfile.coins - cost,
      ownedHorses: updatedHorses
    });
    setProfile(nextProfile);
  }

  function handleBuyHorse(typeId, horseName, cost) {
    const currentProfile = playerProfileStore.read();
    if (currentProfile.coins < cost) return;
    if (currentProfile.ownedHorses.length >= currentProfile.stableCapacity) return;

    const horse = newOwnedHorse(typeId, horseName);
    const nextProfile = saveProfile({
      ...currentProfile,
      coins: currentProfile.coins - cost,
      ownedHorses: [...currentProfile.ownedHorses, horse]
    });
    setProfile(nextProfile);
  }

  function handleEquipItem(horseId, slotKey, itemId) {
    const currentProfile = playerProfileStore.read();
    const updatedHorses = currentProfile.ownedHorses.map((horse) =>
      horse.id === horseId
        ? { ...horse, equipment: { ...horse.equipment, [slotKey]: itemId } }
        : horse
    );
    const nextProfile = saveProfile({
      ...currentProfile,
      ownedHorses: updatedHorses
    });
    setProfile(nextProfile);
  }

  async function handleListItem(itemType, itemId, slotKey, horseId, price) {
    try {
      await createListing(itemType, itemId, slotKey, horseId, price);
      const currentProfile = playerProfileStore.read();
      const nextProfile = sanitizePlayerProfile({
        ...currentProfile,
        ownedHorses: itemType === "equipment"
          ? currentProfile.ownedHorses.map((h) =>
              h.id === horseId
                ? { ...h, equipment: { ...h.equipment, [slotKey]: null } }
                : h
            )
          : currentProfile.ownedHorses.filter((h) => h.id !== horseId),
        inventory: itemType === "equipment" && !horseId
          ? (currentProfile.inventory ?? []).filter((id) => id !== itemId)
          : currentProfile.inventory ?? []
      });
      playerProfileStore.save(nextProfile);
      setProfile(nextProfile);
      syncProfile(nextProfile);
    } catch (err) {
      console.warn("create_listing failed", err);
      throw err;
    }
  }

  async function handleCancelListing(listingId) {
    try {
      await cancelListing(listingId);
      const result = await supabaseProfileStore.read();
      if (result.profile) {
        const updated = playerProfileStore.save(result.profile);
        setProfile(updated);
      }
    } catch (err) {
      console.warn("cancel_listing failed", err);
      throw err;
    }
  }

  async function handlePurchase(result, cost) {
    const currentProfile = playerProfileStore.read();
    const nextProfile = sanitizePlayerProfile({
      ...currentProfile,
      coins: Math.max(0, currentProfile.coins - cost),
      inventory: result.item_type === "equipment"
        ? [...(currentProfile.inventory ?? []), result.item_id]
        : currentProfile.inventory ?? [],
      ownedHorses: result.item_type === "horse"
        ? [...currentProfile.ownedHorses, newOwnedHorse(result.horse_type_id, result.horse_name)]
        : currentProfile.ownedHorses
    });
    playerProfileStore.save(nextProfile);
    setProfile(nextProfile);
    syncProfile(nextProfile);
  }

  function handleEquipFromInventory(horseId, slotKey, itemId) {
    const currentProfile = playerProfileStore.read();
    const nextProfile = sanitizePlayerProfile({
      ...currentProfile,
      inventory: (currentProfile.inventory ?? []).filter((id) => id !== itemId),
      ownedHorses: currentProfile.ownedHorses.map((h) =>
        h.id === horseId
          ? { ...h, equipment: { ...h.equipment, [slotKey]: itemId } }
          : h
      )
    });
    playerProfileStore.save(nextProfile);
    setProfile(nextProfile);
    syncProfile(nextProfile);
  }

  function startMatch(settingsOverride) {
    const matchSettings = settingsOverride ? { ...settings, ...settingsOverride } : settings;

    setHud(makeInitialHud(matchSettings));
    setReady(false);
    setSceneError("");
    setActiveSettings({ ...matchSettings });
  }

  function openSettings() {
    gameRef.current?.destroy();
    gameRef.current = null;
    setActiveSettings(null);
    setReady(false);
    setSceneError("");
    setHud(makeInitialHud(settings));
  }

  function toggleFeedback() {
    const enabled = !feedbackEnabled;
    setFeedbackEnabled(enabled);
    gameRef.current?.setFeedbackEnabled?.(enabled);
  }

  async function handleSignOut() {
    await signOut();
    if (!activeSettings) setSetupEntered(false);
  }

  function backToLogin() {
    setSetupEntered(false);
  }

  const isSetup = !activeSettings;
  const showAuthGate = isSetup && !setupEntered && authState.status !== "signed-in";

  return (
    <main className="game" aria-label="Kokpar Game">
      <div className="viewport" ref={mountRef} />

      {showAuthGate && (
        <AuthGate
          auth={authState}
          onPasswordSignIn={signInWithPassword}
          onSignUp={signUp}
          onResetPassword={resetPassword}
          onEmailSignIn={signInWithEmail}
          onGuestContinue={() => setSetupEntered(true)}
        />
      )}

      {needsOnboarding && (
        <HorseOnboarding
          onComplete={(typeId, horseName, riderName) => {
            completeOnboarding(typeId, horseName, riderName);
          }}
        />
      )}

      {isSetup && !showAuthGate && (
        <MatchSetup
          profile={profile}
          settings={settings}
          auth={authState}
          onBackToLogin={backToLogin}
          onSignOut={handleSignOut}
          onRiderRename={renameRider}
          onHorseRename={renameHorse}
          onHorseCreate={createHorse}
          onHorseDelete={deleteHorse}
          onSettingChange={updateSetting}
          onStart={startMatch}
          onBuyItem={handleBuyItem}
          onBuyHorse={handleBuyHorse}
          onEquipItem={handleEquipItem}
          onListItem={handleListItem}
          onCancelListing={handleCancelListing}
          onPurchase={handlePurchase}
          onEquipFromInventory={handleEquipFromInventory}
        />
      )}

      {activeSettings && !ready && <div className="loading">Готовим степь, коней и казаны...</div>}
      {sceneError && (
        <div className="webgl-error" role="alert">
          <strong>3D-сцена не запустилась</strong>
          <span>{sceneError}</span>
        </div>
      )}

      {activeSettings && (
        <MatchHud
          settings={activeSettings}
          hud={hud}
          feedbackEnabled={feedbackEnabled}
          onRestart={() => gameRef.current?.restart()}
          onOpenSettings={openSettings}
          onCycleCamera={() => gameRef.current?.cycleCameraMode?.()}
          onToggleFeedback={toggleFeedback}
        />
      )}

      {activeSettings && <FieldRadar radar={hud.radar} goalType={activeSettings.goalType} />}

      {activeSettings && hud.showBanner && (
        <div className="banner" role="status" aria-live="polite">
          <strong>{hud.message}</strong>
          <span>{hud.submessage}</span>
        </div>
      )}

      <MatchReward reward={matchReward} onDismiss={() => setMatchReward(null)} />

      {activeSettings?.onlineMatchId && (
        <div className={`sync-badge sync-badge--${syncStatus}`}>
          {syncStatus === "connected" ? "● Онлайн" : syncStatus === "error" ? "● Ошибка сети" : syncStatus === "reconnecting" ? "● Переподключение..." : "● Подключение..."}
        </div>
      )}

      {activeSettings && (
        <TouchControls
          joystick={joystick}
          joystickRef={joystickRef}
          onJoystickStart={startJoystick}
          onJoystickMove={updateJoystick}
          onJoystickRelease={releaseJoystick}
          onActionPress={pressAction}
          onActionRelease={releaseAction}
          onBodyCheck={pressBodyCheck}
          bodyCheckActive={hud.bodyCheckActive}
          bodyCheckCooldown={hud.bodyCheckCooldown}
          bodyCheckReady={hud.bodyCheckReady}
        />
      )}
    </main>
  );
}
