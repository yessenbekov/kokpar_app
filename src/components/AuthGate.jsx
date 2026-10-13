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
            <button className="ob-splash-btn-social ob-google-btn" type="button" onClick={onGoogleSignIn} disabled={busy}>
              <svg width="18" height="18" viewBox="0 0 18 18" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }}>
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
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
            <br /><span style={{ fontSize: "0.82em", opacity: 0.65 }}>The riders' game — build your stable, win serke, rise in the aul rankings.</span>
          </p>
        </div>
        <div className="ob-splash-actions">
          <button className="ob-splash-btn-primary" type="button" onClick={onGuestContinue}>
            Начать игру · Play
          </button>
          <div className="ob-splash-btn-row">
            <button className="ob-splash-btn-social" type="button" onClick={() => setShowAuth(true)}>
              Войти · Sign in
            </button>
            {onGoogleSignIn && (
              <button className="ob-splash-btn-social" type="button" onClick={onGoogleSignIn}>
                Google
              </button>
            )}
          </div>
          <button className="ob-splash-btn-ghost" type="button" onClick={onGuestContinue}>
            Играть как гость · Play as guest
          </button>
        </div>
        <p className="ob-splash-legal">
          Продолжая, вы принимаете правила игры и политику данных.
        </p>
      </div>
    </div>
  );
}
