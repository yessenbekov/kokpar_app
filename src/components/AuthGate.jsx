import { useEffect, useState } from "react";
import { Mail, Play, Smartphone, UserRound } from "lucide-react";

export function AuthGate({ auth, onEmailSignIn, onGuestContinue }) {
  const [method, setMethod] = useState("email");
  const [email, setEmail] = useState(auth.email ?? "");
  const busy = ["loading", "sending", "verifying"].includes(auth.status) || auth.syncStatus === "syncing";

  useEffect(() => {
    if (auth.email) setEmail(auth.email);
  }, [auth.email]);

  function submitEmail(event) {
    event.preventDefault();
    onEmailSignIn(email);
  }

  return (
    <section className="setup auth-screen" aria-label="Вход">
      <div className="auth-gate-panel">
        <div className="auth-gate-brand">
          <p className="label">Kokpar 3D</p>
          <h1>Вход / регистрация</h1>
        </div>

        <div className="auth-method-tabs" role="tablist" aria-label="Способ входа">
          <button className={method === "email" ? "active" : ""} type="button" onClick={() => setMethod("email")}>
            <Mail size={16} strokeWidth={2.5} />
            <span>Email</span>
          </button>
          <button
            className={method === "phone" ? "active is-upcoming" : "is-upcoming"}
            type="button"
            onClick={() => setMethod("phone")}
          >
            <Smartphone size={16} strokeWidth={2.5} />
            <span>WhatsApp</span>
            <small>позже</small>
          </button>
        </div>

        {method === "email" ? (
          <form className="auth-gate-form" onSubmit={submitEmail}>
            <input
              aria-label="Email для входа"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
            />
            <button type="submit" disabled={busy || !email.trim()}>
              <Mail size={17} strokeWidth={2.5} />
              <span>{auth.status === "sending" ? "Отправляем" : "Войти"}</span>
            </button>
          </form>
        ) : (
          <div className="auth-coming-soon" role="status">
            <Smartphone size={18} strokeWidth={2.5} />
            <div>
              <strong>WhatsApp вход позже</strong>
              <span>Сейчас надежный MVP-путь: email или гостевой профиль.</span>
            </div>
          </div>
        )}

        <button className="guest-button" type="button" onClick={onGuestContinue}>
          <Play size={17} fill="currentColor" strokeWidth={2.5} />
          <span>Играть гостем</span>
        </button>

        <div className="auth-status-line" role="status" aria-live="polite">
          <UserRound size={15} strokeWidth={2.5} />
          <span>{auth.error || auth.message}</span>
        </div>
      </div>
    </section>
  );
}
