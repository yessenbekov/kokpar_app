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

function makeHints(t) {
  return [
    {
      id: "move",
      step: "1/3",
      title: t("Скачи к серке", "Серкеге жүгір", "Ride to serke"),
      text: (touch) => touch
        ? t("Джойстик слева — управляй конём", "Сол жақ джойстик — жылқыны басқар", "Left joystick — steer your horse")
        : t("WASD или стрелки — управляй конём", "WASD немесе көрсеткілер — жылқыны басқар", "WASD or arrows — steer your horse")
    },
    {
      id: "pickup",
      step: "2/3",
      title: t("Подбери серке", "Серкені ал", "Pick up serke"),
      text: () => t("Подъедь вплотную — серке подберётся сам", "Жақын кел — серке өздігінен алынады", "Ride close — serke is grabbed automatically")
    },
    {
      id: "throw",
      step: "3/3",
      title: t("Бросай в цель", "Нысанаға лақтыр", "Throw at target"),
      text: (touch) => touch
        ? t("Удерживай правую кнопку — зарядка. Отпусти — бросок в круг/казан", "Оң батырманы ұстап тұр — зарядтау. Жібер — шеңберге/қазанға лақтыру", "Hold right button — charge. Release — throw to circle/kazan")
        : t("Удерживай Space — зарядка. Отпусти — бросок в круг/казан", "Space ұстап тұр — зарядтау. Жібер — шеңберге/қазанға лақтыру", "Hold Space — charge. Release — throw to circle/kazan")
    }
  ];
}

export function TutorialHints({ active, hud, lang = "ru" }) {
  function t(ru, kz, en) {
    if (lang === "kz") return kz ?? ru;
    if (lang === "en") return en ?? ru;
    return ru;
  }

  const HINTS = makeHints(t);

  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(() => Boolean(localStorage.getItem(STORAGE_KEY)));
  const touch = useRef(isTouchDevice()).current;
  const timerRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || done) return;
    if (startedRef.current) return;

    const delay = setTimeout(() => {
      startedRef.current = true;
      setVisible(true);
    }, 3500);

    return () => clearTimeout(delay);
  }, [active, done]);

  useEffect(() => {
    if (!visible || done || step !== 1) return;
    const carries = ["Кокпар у тебя", "Удерживай Space", "Space — пас"];
    if (carries.some((s) => hud.carry?.startsWith(s))) {
      setStep(2);
      resetTimer();
    }
  }, [hud.carry, visible, done, step]);

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
          aria-label={t("Закрыть подсказки", "Кеңестерді жабу", "Close hints")}
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
