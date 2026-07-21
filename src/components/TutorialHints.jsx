import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "kokpar_hints_v1";
const AUTO_DISMISS_MS = 10000;

function isTouchDevice() {
  return ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
}

function MoveIcon({ touch }) {
  if (touch) {
    return (
      <svg className="hint-icon" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <circle cx="20" cy="20" r="7" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="20" cy="20" r="3" fill="currentColor" />
      </svg>
    );
  }
  return (
    <span className="hint-keys" aria-label="WASD">
      <span className="hint-key hint-key--row">
        <span className="hint-key__empty" />
        <kbd>W</kbd>
        <span className="hint-key__empty" />
      </span>
      <span className="hint-key hint-key--row">
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd>
      </span>
    </span>
  );
}

function ActionIcon({ touch }) {
  if (touch) {
    return (
      <svg className="hint-icon" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect x="8" y="8" width="24" height="24" rx="6" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="20" cy="20" r="5" fill="currentColor" opacity="0.85" />
      </svg>
    );
  }
  return <kbd className="hint-key hint-key--space">Space</kbd>;
}

const HINTS = [
  {
    id: "move",
    step: "1/3",
    title: "Скачи к серке",
    text: (touch) => touch ? "Джойстик слева — управляй конём" : "WASD или стрелки — управляй конём"
  },
  {
    id: "pickup",
    step: "2/3",
    title: "Подбери серке",
    text: () => "Подъедь вплотную — серке подберётся сам"
  },
  {
    id: "throw",
    step: "3/3",
    title: "Бросай в цель",
    text: (touch) => touch
      ? "Удерживай правую кнопку — зарядка. Отпусти — бросок в круг/казан"
      : "Удерживай Space — зарядка. Отпусти — бросок в круг/казан"
  }
];

export function TutorialHints({ active, hud }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(() => Boolean(localStorage.getItem(STORAGE_KEY)));
  const touch = useRef(isTouchDevice()).current;
  const timerRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || done) return;
    if (startedRef.current) return;

    // Wait for match banner to clear before showing hints
    const delay = setTimeout(() => {
      startedRef.current = true;
      setVisible(true);
    }, 3500);

    return () => clearTimeout(delay);
  }, [active, done]);

  // Advance to next hint when player picks up serke
  useEffect(() => {
    if (!visible || done || step !== 1) return;
    const carries = ["Кокпар у тебя", "Удерживай Space", "Space — пас"];
    if (carries.some((s) => hud.carry?.startsWith(s))) {
      setStep(2);
      resetTimer();
    }
  }, [hud.carry, visible, done, step]);

  // Advance to throw hint when player charges
  useEffect(() => {
    if (!visible || done || step !== 2) return;
    if (hud.throwPower > 0) {
      setStep(3);
      resetTimer();
    }
  }, [hud.throwPower, visible, done, step]);

  function resetTimer() {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(advanceOrDismiss, AUTO_DISMISS_MS);
  }

  function advanceOrDismiss() {
    setStep((prev) => {
      const next = prev + 1;
      if (next >= HINTS.length) {
        dismiss();
        return prev;
      }
      resetTimer();
      return next;
    });
  }

  function dismiss() {
    clearTimeout(timerRef.current);
    setVisible(false);
    setDone(true);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  useEffect(() => {
    if (visible) resetTimer();
    return () => clearTimeout(timerRef.current);
  }, [visible]);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  if (!visible || done || step >= HINTS.length) return null;

  const hint = HINTS[step];

  return (
    <div className="tutorial-hints" role="status" aria-live="polite">
      <div className="tutorial-hints__card">
        <button
          className="tutorial-hints__close"
          type="button"
          aria-label="Закрыть подсказки"
          onClick={dismiss}
        >
          <X size={14} strokeWidth={2.5} />
        </button>

        <span className="tutorial-hints__step">{hint.step}</span>

        <div className="tutorial-hints__content">
          {step === 0 && <MoveIcon touch={touch} />}
          {(step === 2 || step === 3) && <ActionIcon touch={touch} />}
          <div className="tutorial-hints__text">
            <strong>{hint.title}</strong>
            <span>{hint.text(touch)}</span>
          </div>
        </div>

        <div className="tutorial-hints__progress">
          {HINTS.map((h, i) => (
            <span
              key={h.id}
              className={i === step ? "tutorial-dot tutorial-dot--active" : i < step ? "tutorial-dot tutorial-dot--done" : "tutorial-dot"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
