export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function normalize2D(x, z) {
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}

export function rotate2D(vector, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: vector.x * cos - vector.z * sin,
    z: vector.x * sin + vector.z * cos
  };
}

export function angleDelta(target, current) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

export function formatTime(seconds) {
  const min = String(Math.floor(seconds / 60)).padStart(2, "0");
  const sec = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${min}:${sec}`;
}

export function forwardVector(rider) {
  return { x: Math.cos(rider.rotation), z: Math.sin(rider.rotation) };
}
