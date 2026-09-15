import { useEffect, useState } from "react";

export function AuthGate({ auth, onEmailSignIn, onPasswordSignIn, onSignUp, onResetPassword, onGuestContinue, onGoogleSignIn }) {
  const [showAuth, setShowAuth] = useState(false);
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

  function submitLogin(e) {
    e.preventDefault();
    onPasswordSignIn(email, password);
  }

  function submitRegister(e) {
    e.preventDefault();
    if (password.length < 6) { setPasswordError("Минимум 6 символов"); return; }
    if (password !== passwordConfirm) { setPasswordError("Пароли не совпадают"); return; }
    setPasswordError("");
    onSignUp(email, password);
  }

  async function handleResetPassword() {
    if (!email.trim() || resetSent) return;
    await onResetPassword(email);
    setResetSent(true);
  }

  if (showAuth) {
    return (
      <div className="ob-splash">
        <div className="ob-splash-gradient" />
        <div className="ob-auth-overlay">
          <button className="ob-auth-back" type="button" onClick={() => setShowAuth(false)}>
            ‹ Назад
          </button>
          <div className="ob-auth-title">
            {mode === "register" ? "Регистрация" : "Вход"}
          </div>
          <div className="ob-auth-tabs">
            <button type="button" className={`ob-auth-tab${mode === "login" ? " active" : ""}`} onClick={() => switchMode("login")}>
              Вход
            </button>
            <button type="button" className={`ob-auth-tab${mode === "register" ? " active" : ""}`} onClick={() => switchMode("register")}>
              Регистрация
            </button>
          </div>

          {mode === "login" && (
            <form className="ob-auth-form" onSubmit={submitLogin}>
              <input className="ob-auth-input" type="email" inputMode="email" autoComplete="email"
                placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
              <input className="ob-auth-input" type="password" autoComplete="current-password"
                placeholder="пароль" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
              <button className="ob-auth-submit" type="submit" disabled={busy || !email.trim() || !password}>
                {auth.status === "sending" ? "Входим…" : "Войти"}
              </button>
              <button className="ob-skip-btn" type="button" disabled={busy || !email.trim() || resetSent} onClick={handleResetPassword}>
                {resetSent ? "Письмо отправлено" : "Забыли пароль?"}
              </button>
            </form>
          )}

          {mode === "register" && (
            <form className="ob-auth-form" onSubmit={submitRegister}>
              <input className="ob-auth-input" type="email" inputMode="email" autoComplete="email"
                placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
              <input className="ob-auth-input" type="password" autoComplete="new-password"
                placeholder="пароль (мин. 6 символов)" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
              <input className="ob-auth-input" type="password" autoComplete="new-password"
                placeholder="повторите пароль" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} disabled={busy} />
              {passwordError && <p className="ob-auth-error">{passwordError}</p>}
              <button className="ob-auth-submit" type="submit" disabled={busy || !email.trim() || !password || !passwordConfirm}>
                {auth.status === "sending" ? "Создаём…" : "Создать аккаунт"}
              </button>
            </form>
          )}

          {onGoogleSignIn && (
            <button className="ob-splash-btn-social" type="button" onClick={onGoogleSignIn} disabled={busy}>
              Войти через Google
            </button>
          )}

          {(auth.error || auth.message) && (
            <p className={`ob-auth-error${auth.error ? "" : " ob-auth-msg"}`}>{auth.error || auth.message}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ob-splash">
      <div className="ob-splash-gradient" />
      <div className="ob-splash-content">
        <div>
          <div className="ob-splash-title">KOKPAR 3D</div>
          <p className="ob-splash-tagline">
            Көкпар — игра всадников. Соберите конюшню, выигрывайте серке, поднимайтесь в аул-рейтинге.
          </p>
        </div>
        <div className="ob-splash-actions">
          <button className="ob-splash-btn-primary" type="button" onClick={onGuestContinue}>
            Начать игру
          </button>
          <div className="ob-splash-btn-row">
            <button className="ob-splash-btn-social" type="button" onClick={() => setShowAuth(true)}>
              Войти
            </button>
            {onGoogleSignIn && (
              <button className="ob-splash-btn-social" type="button" onClick={onGoogleSignIn}>
                Google
              </button>
            )}
          </div>
          <button className="ob-splash-btn-ghost" type="button" onClick={onGuestContinue}>
            Играть как гость
          </button>
        </div>
        <p className="ob-splash-legal">
          Продолжая, вы принимаете правила игры и политику данных.
        </p>
      </div>
    </div>
  );
}
