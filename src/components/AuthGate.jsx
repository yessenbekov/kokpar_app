import { useEffect, useState } from "react";
import { Mail, MessageSquareText, Play, Smartphone, UserRound } from "lucide-react";

export function AuthGate({ auth, onEmailSignIn, onPhoneSignIn, onPhoneVerify, onGuestContinue }) {
  const [method, setMethod] = useState("email");
  const [email, setEmail] = useState(auth.email ?? "");
  const [phone, setPhone] = useState(auth.phone ?? "");
  const [phoneChannel, setPhoneChannel] = useState(auth.phoneChannel ?? "sms");
  const [phoneCode, setPhoneCode] = useState("");
  const busy = ["loading", "sending", "verifying"].includes(auth.status) || auth.syncStatus === "syncing";
  const phoneCodeSent = auth.syncStatus === "phone-sent" && method === "phone";

  useEffect(() => {
    if (auth.email) setEmail(auth.email);
    if (auth.phone) {
      setPhone(auth.phone);
      setPhoneChannel(auth.phoneChannel ?? "sms");
      setMethod("phone");
    }
  }, [auth.email, auth.phone, auth.phoneChannel]);

  function submitEmail(event) {
    event.preventDefault();
    onEmailSignIn(email);
  }

  function submitPhone(event) {
    event.preventDefault();
    onPhoneSignIn(phone, phoneChannel);
  }

  function submitPhoneCode(event) {
    event.preventDefault();
    onPhoneVerify(phone, phoneCode);
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
          <button className={method === "phone" ? "active" : ""} type="button" onClick={() => setMethod("phone")}>
            <Smartphone size={16} strokeWidth={2.5} />
            <span>Телефон</span>
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
          <div className="auth-phone-stack">
            <div className="auth-channel-toggle" aria-label="Канал кода">
              <button className={phoneChannel === "sms" ? "active" : ""} type="button" onClick={() => setPhoneChannel("sms")}>
                SMS
              </button>
              <button
                className={phoneChannel === "whatsapp" ? "active" : ""}
                type="button"
                onClick={() => setPhoneChannel("whatsapp")}
              >
                WhatsApp
              </button>
            </div>

            <form className="auth-gate-form" onSubmit={submitPhone}>
              <input
                aria-label="Телефон для входа"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+77010000000"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={busy}
              />
              <button type="submit" disabled={busy || !phone.trim()}>
                <MessageSquareText size={17} strokeWidth={2.5} />
                <span>{auth.status === "sending" ? "..." : "Код"}</span>
              </button>
            </form>

            {phoneCodeSent && (
              <form className="auth-gate-form" onSubmit={submitPhoneCode}>
                <input
                  aria-label="Код из SMS"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="код"
                  value={phoneCode}
                  onChange={(event) => setPhoneCode(event.target.value)}
                  disabled={busy}
                />
                <button type="submit" disabled={busy || !phoneCode.trim()}>
                  <span>{auth.status === "verifying" ? "..." : "OK"}</span>
                </button>
              </form>
            )}
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
