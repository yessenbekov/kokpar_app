import { useEffect, useState } from "react";
import { Link2, LogIn, Mail, Play, UserPlus, UserRound } from "lucide-react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/>
    </svg>
  );
}

export function AuthGate({ auth, onEmailSignIn, onPasswordSignIn, onSignUp, onResetPassword, onGuestContinue, onGoogleSignIn }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(auth.email ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const busy = ["loading", "sending", "verifying"].includes(auth.status) || auth.syncStatus === "syncing";

  useEffect(() => {
    if (auth.email) setEmail(auth.email);
  }, [auth.email]);

  function switchMode(next) {
    setMode(next);
    setPassword("");
    setPasswordConfirm("");
    setPasswordError("");
    setResetSent(false);
  }

  function submitLogin(event) {
    event.preventDefault();
    onPasswordSignIn(email, password);
  }

  function submitRegister(event) {
    event.preventDefault();
    if (password.length < 6) {
      setPasswordError("Минимум 6 символов");
      return;
    }
    if (password !== passwordConfirm) {
      setPasswordError("Пароли не совпадают");
      return;
    }
    setPasswordError("");
    onSignUp(email, password);
  }

  function submitMagicLink(event) {
    event.preventDefault();
    onEmailSignIn(email);
  }

  async function handleResetPassword() {
    if (!email.trim() || resetSent) return;
    await onResetPassword(email);
    setResetSent(true);
  }

  return (
    <section className="setup auth-screen" aria-label="Вход">
      <div className="auth-gate-panel">
        <div className="auth-gate-brand">
          <div className="auth-game-logo">
            <span className="auth-logo-kk">КОКПАР</span>
            <span className="auth-logo-3d">3D</span>
          </div>
          <p className="auth-game-tagline">Традиционная казахская конная игра</p>
          <h2 className="auth-section-title">
            {mode === "register" ? "Регистрация" : mode === "magic-link" ? "Войти по ссылке" : "Вход"}
          </h2>
        </div>

        <div className="auth-method-tabs auth-gate-tabs" role="tablist" aria-label="Способ входа">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => switchMode("login")}>
            <LogIn size={15} strokeWidth={2.5} />
            <span>Вход</span>
          </button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => switchMode("register")}>
            <UserPlus size={15} strokeWidth={2.5} />
            <span>Регистрация</span>
          </button>
          <button className={mode === "magic-link" ? "active" : ""} type="button" onClick={() => switchMode("magic-link")}>
            <Link2 size={15} strokeWidth={2.5} />
            <span>Ссылка</span>
          </button>
        </div>

        {mode === "login" && (
          <form className="auth-gate-form stacked" onSubmit={submitLogin}>
            <input
              aria-label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
            <input
              aria-label="Пароль"
              type="password"
              autoComplete="current-password"
              placeholder="пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
            <button type="submit" disabled={busy || !email.trim() || !password}>
              <LogIn size={17} strokeWidth={2.5} />
              <span>{auth.status === "sending" ? "Входим…" : "Войти"}</span>
            </button>
            <button
              className="auth-gate-link"
              type="button"
              disabled={busy || !email.trim() || resetSent}
              onClick={handleResetPassword}
            >
              {resetSent ? "Письмо отправлено" : "Забыли пароль?"}
            </button>
          </form>
        )}

        {mode === "register" && (
          <form className="auth-gate-form stacked" onSubmit={submitRegister}>
            <input
              aria-label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
            <input
              aria-label="Пароль"
              type="password"
              autoComplete="new-password"
              placeholder="пароль (мин. 6 символов)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
            <input
              aria-label="Повтор пароля"
              type="password"
              autoComplete="new-password"
              placeholder="повторите пароль"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              disabled={busy}
            />
            {passwordError && <p className="auth-gate-error">{passwordError}</p>}
            <button type="submit" disabled={busy || !email.trim() || !password || !passwordConfirm}>
              <UserPlus size={17} strokeWidth={2.5} />
              <span>{auth.status === "sending" ? "Создаём…" : "Создать аккаунт"}</span>
            </button>
          </form>
        )}

        {mode === "magic-link" && (
          <form className="auth-gate-form" onSubmit={submitMagicLink}>
            <input
              aria-label="Email для входа"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
            <button type="submit" disabled={busy || !email.trim()}>
              <Mail size={17} strokeWidth={2.5} />
              <span>{auth.status === "sending" ? "Отправляем…" : "Войти"}</span>
            </button>
          </form>
        )}

        {onGoogleSignIn && (
          <button className="google-signin-button" type="button" onClick={onGoogleSignIn} disabled={busy}>
            <GoogleIcon />
            <span>Войти через Google</span>
          </button>
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
