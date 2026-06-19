import * as THREE from "three";
import { clamp, distance2D, normalize2D } from "./mathUtils.js";
import { TEAM } from "./constants.js";

const START_LINE_Z = 45; // WORLD.height / 2
const START_LANE_DEPTH = 17;
const START_CAMERA_FOCUS_Z = (START_LINE_Z + START_LANE_DEPTH * 0.62 + (-14.5)) / 2;
const START_CAMERA_POSITION = { x: -34, y: 72, z: 94 };
const CENTER_DUEL_CAMERA_POSITION = { x: -24, y: 54, z: 46 };
const CENTER_MARK = { x: 0, z: 0 };
const CHASE_CAMERA_SIDE_OFFSET = 3.8;

const CAMERA_MODES = [
  { id: "overhead", label: "Сверху" },
  { id: "wide", label: "Обзор" },
  { id: "chase", label: "Ближе" },
  { id: "broadcast", label: "ТВ" }
];

export function createCameraSystem({ camera, player, kokpar, match, contestCandidates, scoringGoalFor }) {
  const cameraTrack = new THREE.Vector3();
  const cameraTrackTarget = new THREE.Vector3();
  const cameraDesired = new THREE.Vector3();
  const cameraLookAt = new THREE.Vector3();
  let cameraModeIndex = 3;

  function currentCameraMode() {
    return CAMERA_MODES[cameraModeIndex % CAMERA_MODES.length];
  }

  function cycleCameraMode() {
    cameraModeIndex = (cameraModeIndex + 1) % CAMERA_MODES.length;
    return currentCameraMode();
  }

  function updateCamera(dt) {
    const CONTEST_RADIUS = 5.4;

    if (match.phase === "goal") {
      const team = match.goalTeam ?? kokpar.flightTeam ?? TEAM.blue;
      const target = scoringGoalFor(team);
      const cameraSide = Math.sign(target.x) || 1;
      const goalEase = 1 - Math.pow(0.012, dt);

      cameraTrackTarget.set(
        target.x * 0.72 + kokpar.x * 0.28,
        1.15,
        target.z * 0.72 + kokpar.z * 0.28
      );
      cameraTrack.lerp(cameraTrackTarget, goalEase);
      cameraDesired.set(cameraTrack.x - cameraSide * 19, 24, cameraTrack.z + 23);
      cameraLookAt.set(cameraTrack.x, 1.35, cameraTrack.z);
      camera.position.lerp(cameraDesired, goalEase);
      camera.fov += (50 - camera.fov) * (1 - Math.pow(0.035, dt));
      camera.updateProjectionMatrix();
      camera.lookAt(cameraLookAt);
      return;
    }

    if (match.phase === "countdown") {
      if (match.duelMode) {
        cameraDesired.set(CENTER_DUEL_CAMERA_POSITION.x, CENTER_DUEL_CAMERA_POSITION.y, CENTER_DUEL_CAMERA_POSITION.z);
        cameraLookAt.set(CENTER_MARK.x, 1.1, CENTER_MARK.z);
      } else {
        cameraDesired.set(START_CAMERA_POSITION.x, START_CAMERA_POSITION.y, START_CAMERA_POSITION.z);
        cameraLookAt.set(0, 1.1, START_CAMERA_FOCUS_Z);
      }

      const countdownEase = 1 - Math.pow(0.01, dt);
      const targetFov = match.duelMode ? 58 : 64;

      cameraTrack.copy(cameraLookAt);
      camera.position.lerp(cameraDesired, countdownEase);
      camera.fov += (targetFov - camera.fov) * (1 - Math.pow(0.03, dt));
      camera.updateProjectionMatrix();
      camera.lookAt(cameraLookAt);
      return;
    }

    if (kokpar.contest.active) {
      const mounted = kokpar.contest.mode === "mounted";
      const focusRiders = mounted
        ? [kokpar.contest.holder, kokpar.contest.challenger].filter(Boolean)
        : contestCandidates(CONTEST_RADIUS + 0.25);
      const focusDivisor = focusRiders.length + 1;
      const focusX = (kokpar.x + focusRiders.reduce((total, rider) => total + rider.x, 0)) / focusDivisor;
      const focusZ = (kokpar.z + focusRiders.reduce((total, rider) => total + rider.z, 0)) / focusDivisor;
      const contestEase = 1 - Math.pow(0.008, dt);

      cameraTrackTarget.set(focusX, 1.05, focusZ);
      cameraTrack.lerp(cameraTrackTarget, contestEase);
      cameraDesired.set(cameraTrack.x - 15, mounted ? 32 : 36, cameraTrack.z + (mounted ? 26 : 30));
      cameraLookAt.set(cameraTrack.x + 2.6, 1.1, cameraTrack.z);

      const targetFov = mounted ? 54 : 58;
      camera.position.lerp(cameraDesired, 1 - Math.pow(0.01, dt));
      camera.fov += (targetFov - camera.fov) * (1 - Math.pow(0.035, dt));
      camera.updateProjectionMatrix();
      camera.lookAt(cameraLookAt);
      return;
    }

    const speed = Math.hypot(player.vx, player.vz);
    const speedRatio = clamp(speed / player.maxSpeed, 0, 1);
    const serkeDistance = distance2D(player, kokpar);
    const serkeLead = kokpar.holder === player ? 0.12 : clamp(0.33 - serkeDistance / 420, 0.1, 0.3);
    const movingDirection = speed > 1.2 ? normalize2D(player.vx, player.vz) : null;
    const forward = movingDirection ?? { x: Math.cos(player.rotation), z: Math.sin(player.rotation) };
    const side = { x: -forward.z, z: forward.x };
    const lookAhead = 5.2 + speedRatio * 5.3;
    const focusX = player.x + forward.x * lookAhead + (kokpar.x - player.x) * serkeLead;
    const focusZ = player.z + forward.z * lookAhead + (kokpar.z - player.z) * serkeLead;
    const looseSerkeFov = kokpar.holder ? 0 : clamp((serkeDistance - 28) / 80, 0, 1) * 4;
    const focusEase = 1 - Math.pow(0.018, dt);
    const chaseDistance = 18.8 + speedRatio * 6 + looseSerkeFov * 0.7;
    const chaseHeight = 12.4 + speedRatio * 4.8 + looseSerkeFov * 0.8;
    const cameraMode = currentCameraMode().id;
    const cameraEase = 1 - Math.pow(0.015, dt);
    let targetFov = 53 + speedRatio * 4 + looseSerkeFov;

    if (cameraMode === "overhead") {
      cameraTrackTarget.set(focusX, 0, focusZ);
      cameraTrack.lerp(cameraTrackTarget, focusEase);
      cameraDesired.set(cameraTrack.x, 50 + speedRatio * 10, cameraTrack.z + 5);
      cameraLookAt.set(cameraTrack.x, 0, cameraTrack.z);
      targetFov = 64 + speedRatio * 4 + looseSerkeFov;
    } else if (cameraMode === "wide") {
      cameraTrackTarget.set(focusX, 0.9, focusZ);
      cameraTrack.lerp(cameraTrackTarget, focusEase);
      cameraDesired.set(
        cameraTrack.x - 18 - speedRatio * 4,
        31 + speedRatio * 7,
        cameraTrack.z + 31 + speedRatio * 7
      );
      cameraLookAt.set(cameraTrack.x + 4, 0.9, cameraTrack.z);
      targetFov = 56 + speedRatio * 5 + looseSerkeFov;
    } else if (cameraMode === "broadcast") {
      const broadcastSide = kokpar.holder?.team === TEAM.red ? -1 : 1;
      cameraTrackTarget.set(
        focusX * 0.78 + kokpar.x * 0.22,
        1.15,
        focusZ * 0.72 + kokpar.z * 0.28
      );
      cameraTrack.lerp(cameraTrackTarget, 1 - Math.pow(0.012, dt));
      cameraDesired.set(cameraTrack.x - broadcastSide * 34, 42, cameraTrack.z + 50);
      cameraLookAt.set(cameraTrack.x + broadcastSide * 4, 1.2, cameraTrack.z);
      targetFov = 58 + looseSerkeFov * 0.8;
    } else {
      cameraTrackTarget.set(focusX, 1.55, focusZ);
      cameraTrack.lerp(cameraTrackTarget, focusEase);
      cameraDesired.set(
        cameraTrack.x - forward.x * chaseDistance + side.x * CHASE_CAMERA_SIDE_OFFSET,
        chaseHeight,
        cameraTrack.z - forward.z * chaseDistance + side.z * CHASE_CAMERA_SIDE_OFFSET
      );
      cameraLookAt.set(cameraTrack.x + forward.x * 3.2, 1.85, cameraTrack.z + forward.z * 3.2);
    }

    camera.position.lerp(cameraDesired, cameraEase);
    camera.fov += (targetFov - camera.fov) * (1 - Math.pow(0.04, dt));
    camera.updateProjectionMatrix();
    camera.lookAt(cameraLookAt);
  }

  return {
    updateCamera,
    currentCameraMode,
    cycleCameraMode
  };
}
