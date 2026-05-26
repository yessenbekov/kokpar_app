import { TEAM } from "./constants.js";

export function createMatchFeedback(initialEnabled = true) {
  let enabled = initialEnabled;
  let context = null;
  let masterGain = null;

  function prime() {
    if (!enabled) return;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!context) {
      context = new AudioContextClass();
      masterGain = context.createGain();
      masterGain.gain.value = 0.34;
      masterGain.connect(context.destination);
    }

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }
  }

  function tone({ frequency, endFrequency = frequency, duration = 0.12, gain = 0.16, type = "sine", delay = 0 }) {
    if (!enabled || !context || !masterGain || context.state !== "running") return;

    const startAt = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(24, endFrequency), startAt + duration);
    envelope.gain.setValueAtTime(0.001, startAt);
    envelope.gain.exponentialRampToValueAtTime(gain, startAt + Math.min(0.025, duration * 0.22));
    envelope.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    oscillator.connect(envelope);
    envelope.connect(masterGain);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.03);
  }

  function vibrate(pattern) {
    if (enabled && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  }

  return {
    prime,
    setEnabled(nextEnabled) {
      enabled = nextEnabled;

      if (enabled) {
        prime();
        if (masterGain && context) masterGain.gain.setTargetAtTime(0.34, context.currentTime, 0.02);
      } else {
        if (masterGain && context) masterGain.gain.setTargetAtTime(0.001, context.currentTime, 0.02);
        if (typeof navigator.vibrate === "function") navigator.vibrate(0);
      }
    },
    whistle() {
      tone({ frequency: 860, endFrequency: 1180, duration: 0.1, gain: 0.16, type: "sine" });
      tone({ frequency: 1060, endFrequency: 1340, duration: 0.2, gain: 0.18, type: "sine", delay: 0.11 });
      vibrate(16);
    },
    pickup(team, strong = false) {
      const base = team === TEAM.blue ? 430 : 370;
      tone({ frequency: base, endFrequency: base * 1.32, duration: 0.11, gain: 0.14, type: "triangle" });
      if (strong) tone({ frequency: base * 1.18, endFrequency: base * 1.6, duration: 0.13, gain: 0.12, type: "triangle", delay: 0.08 });
      vibrate(strong ? [18, 28, 24] : 16);
    },
    contest() {
      tone({ frequency: 185, endFrequency: 145, duration: 0.14, gain: 0.16, type: "sawtooth" });
      vibrate([18, 24, 18]);
    },
    impact(strong = false) {
      tone({
        frequency: strong ? 118 : 148,
        endFrequency: 64,
        duration: strong ? 0.2 : 0.11,
        gain: strong ? 0.22 : 0.12,
        type: "triangle"
      });
      vibrate(strong ? [28, 32, 34] : 18);
    },
    throw() {
      tone({ frequency: 310, endFrequency: 620, duration: 0.16, gain: 0.11, type: "triangle" });
      vibrate(12);
    },
    outOfBounds() {
      tone({ frequency: 290, endFrequency: 180, duration: 0.16, gain: 0.15, type: "square" });
      tone({ frequency: 240, endFrequency: 145, duration: 0.19, gain: 0.13, type: "square", delay: 0.18 });
      vibrate([20, 45, 20]);
    },
    goal(team) {
      const base = team === TEAM.blue ? 392 : 330;
      [1, 1.34, 1.68].forEach((step, index) => {
        tone({
          frequency: base * step,
          endFrequency: base * step * 1.04,
          duration: 0.26,
          gain: 0.19,
          type: "triangle",
          delay: index * 0.13
        });
      });
      vibrate([36, 34, 66]);
    },
    destroy() {
      if (typeof navigator.vibrate === "function") navigator.vibrate(0);
      context?.close().catch(() => {});
      context = null;
      masterGain = null;
    }
  };
}
