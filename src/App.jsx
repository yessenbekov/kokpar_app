import { useEffect, useRef, useState } from "react";
import { gameModeById } from "./app/gameModes.js";
import { makeInitialHud, readUrlSettings, shouldAutoStart } from "./app/matchConfig.js";
import { playerProfileStore } from "./app/profileStore.js";
import { useSupabaseProfile } from "./app/useSupabaseProfile.js";
import { FieldRadar } from "./components/FieldRadar.jsx";
import { MatchHud } from "./components/MatchHud.jsx";
import { MatchSetup } from "./components/MatchSetup.jsx";
import { TouchControls } from "./components/TouchControls.jsx";
import { createKokparGame } from "./game/createKokparGame.js";

const JOYSTICK_RADIUS = 46;

export default function App() {
  const mountRef = useRef(null);
  const gameRef = useRef(null);
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
  const { authState, signInWithEmail, signOut, syncProfile } = useSupabaseProfile({ onProfileLoaded: loadSyncedProfile });

  function loadSyncedProfile(nextProfile) {
    setProfile(nextProfile);
    setSettings(readUrlSettings(nextProfile));
  }

  useEffect(() => {
    if (!mountRef.current || !activeSettings) return undefined;

    const gameSettings = {
      ...activeSettings,
      matchSeconds: activeSettings.matchMinutes * 60,
      feedbackEnabled
    };

    try {
      gameRef.current = createKokparGame(mountRef.current, setHud, gameSettings);
      setReady(true);
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

    return () => {
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [activeSettings]);

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

  function startMatch() {
    setHud(makeInitialHud(settings));
    setReady(false);
    setSceneError("");
    setActiveSettings({ ...settings });
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

  const isSetup = !activeSettings;

  return (
    <main className="game" aria-label="Kokpar Game">
      <div className="viewport" ref={mountRef} />

      {isSetup && (
        <MatchSetup
          profile={profile}
          settings={settings}
          auth={authState}
          onEmailSignIn={signInWithEmail}
          onSignOut={signOut}
          onHorseRename={renameHorse}
          onSettingChange={updateSetting}
          onStart={startMatch}
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
