import { useEffect, useState } from "react";

function getLang() {
  try { return localStorage.getItem("kokpar_lang") ?? "ru"; } catch { return "ru"; }
}
function t(ru, kz, en) {
  const lang = getLang();
  if (lang === "kz") return kz ?? ru;
  if (lang === "en") return en ?? ru;
  return ru;
}

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
    if (password.length < 6) { setPasswordError(t("Минимум 6 символов", "Кемінде 6 таңба", "Minimum 6 characters")); return; }
    if (password !== passwordConfirm) { setPasswordError(t("Пароли не совпадают", "Құпия сөздер сәйкес келмейді", "Passwords don't match")); return; }
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
            ‹ {t("Назад", "Артқа", "Back")}
          </button>
          <div className="ob-auth-title">
            {mode === "register" ? t("Регистрация", "Тіркелу", "Sign up") : t("Вход", "Кіру", "Sign in")}
          </div>
          <div className="ob-auth-tabs">
            <button type="button" className={`ob-auth-tab${mode === "login" ? " active" : ""}`} onClick={() => switchMode("login")}>
              {t("Вход", "Кіру", "Sign in")}
            </button>
            <button type="button" className={`ob-auth-tab${mode === "register" ? " active" : ""}`} onClick={() => switchMode("register")}>
              {t("Регистрация", "Тіркелу", "Sign up")}
            </button>
          </div>

          {mode === "login" && (
            <form className="ob-auth-form" onSubmit={submitLogin}>
              <input className="ob-auth-input" type="email" inputMode="email" autoComplete="email"
                placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
              <input className="ob-auth-input" type="password" autoComplete="current-password"
                placeholder={t("пароль", "құпия сөз", "password")} value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
              <button className="ob-auth-submit" type="submit" disabled={busy || !email.trim() || !password}>
                {auth.status === "sending" ? t("Входим…", "Кіру...", "Signing in…") : t("Войти", "Кіру", "Sign in")}
              </button>
              <button className="ob-skip-btn" type="button" disabled={busy || !email.trim() || resetSent} onClick={handleResetPassword}>
                {resetSent ? t("Письмо отправлено", "Хат жіберілді", "Email sent") : t("Забыли пароль?", "Құпия сөзді ұмыттыңыз ба?", "Forgot password?")}
              </button>
            </form>
          )}

          {mode === "register" && (
            <form className="ob-auth-form" onSubmit={submitRegister}>
              <input className="ob-auth-input" type="email" inputMode="email" autoComplete="email"
                placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
              <input className="ob-auth-input" type="password" autoComplete="new-password"
                placeholder={t("пароль (мин. 6 символов)", "құпия сөз (кем. 6 таңба)", "password (min. 6 chars)")} value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
              <input className="ob-auth-input" type="password" autoComplete="new-password"
                placeholder={t("повторите пароль", "құпия сөзді қайталаңыз", "repeat password")} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} disabled={busy} />
              {passwordError && <p className="ob-auth-error">{passwordError}</p>}
              <button className="ob-auth-submit" type="submit" disabled={busy || !email.trim() || !password || !passwordConfirm}>
                {auth.status === "sending" ? t("Создаём…", "Тіркелу...", "Creating…") : t("Создать аккаунт", "Тіркелу", "Create account")}
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
              {t("Войти через Google", "Google арқылы кіру", "Sign in with Google")}
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
            Ойнау · Играть · Play
          </button>
          <div className="ob-splash-btn-row">
            <button className="ob-splash-btn-social" type="button" onClick={() => setShowAuth(true)}>
              Кіру · Войти · Sign in
            </button>
            {onGoogleSignIn && (
              <button className="ob-splash-btn-social" type="button" onClick={onGoogleSignIn}>
                Google
              </button>
            )}
          </div>
          <button className="ob-splash-btn-ghost" type="button" onClick={onGuestContinue}>
            Қонақ · Гость · Guest
          </button>
        </div>
        <p className="ob-splash-legal">
          {t(
            "Продолжая, вы принимаете правила игры и политику данных.",
            "Жалғастыру арқылы ойын ережелері мен деректер саясатын қабылдайсыз.",
            "By continuing, you accept the game rules and data policy."
          )}
        </p>
      </div>
    </div>
  );
}
