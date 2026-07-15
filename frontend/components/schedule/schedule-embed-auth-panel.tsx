"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { formatRussianPhoneInput, isValidRussianMobile, normalizeRussianPhone } from "@/lib/phone";
import {
  clearSessionToken,
  fetchCallcheckStatus,
  getStoredPhone,
  loginSchedulePortal,
  requestPasswordReset,
  resetSchedulePassword,
  storePhone,
  storeSessionToken,
} from "@/lib/schedule-public-api";

type ScheduleEmbedAuthPanelProps = {
  companySlug: string;
  embedToken: string;
  clientName?: string;
  onAuthenticated: (sessionToken: string) => void;
  onLogout: () => void;
};

type AuthStep = "login" | "forgot" | "call" | "reset";

const AUTH_STEP_COPY: Record<
  AuthStep,
  {
    title: string;
    subtitle: string;
    hintTitle: string;
    hintText: string;
  }
> = {
  login: {
    title: "Вход в личный кабинет",
    subtitle: "Введите номер телефона и пароль. Если пароль ещё не создан, мы поможем восстановить доступ.",
    hintTitle: "Если входите впервые",
    hintText: "Нажмите «Забыли пароль?» и подтвердите номер звонком. Это займёт пару минут.",
  },
  forgot: {
    title: "Подтвердите номер",
    subtitle: "Мы сразу позвоним на ваш номер для подтверждения, без дополнительной капчи.",
    hintTitle: "Что понадобится",
    hintText: "Номер телефона и доступ к нему. После звонка вы сразу сможете задать новый пароль.",
  },
  call: {
    title: "Почти готово",
    subtitle: "Осталось принять короткий звонок с указанного номера.",
    hintTitle: "Что сделать",
    hintText: "Позвоните на номер ниже со своего телефона и можете сразу сбросить вызов. Звонок бесплатный.",
  },
  reset: {
    title: "Задайте новый пароль",
    subtitle: "После подтверждения номера можно сразу сохранить пароль и войти.",
    hintTitle: "Совет",
    hintText: "Выберите пароль, который удобно вводить с телефона, чтобы не возвращаться к восстановлению снова.",
  },
};

export function ScheduleEmbedAuthPanel({
  companySlug,
  embedToken,
  clientName,
  onAuthenticated,
  onLogout,
}: ScheduleEmbedAuthPanelProps) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkId, setCheckId] = useState("");
  const [callPhone, setCallPhone] = useState("");
  const [callPhonePretty, setCallPhonePretty] = useState("");
  const [callPhoneHtml, setCallPhoneHtml] = useState("");
  const [step, setStep] = useState<AuthStep>("login");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedPhone = getStoredPhone(companySlug);
    if (storedPhone) setPhone(formatRussianPhoneInput(storedPhone));
  }, [companySlug]);

  useEffect(() => {
    if (step !== "call" || !checkId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const status = await fetchCallcheckStatus(companySlug, embedToken, checkId);
        if (cancelled) return;
        if (status.status === "confirmed") {
          setMessage(status.detail);
          setStep("reset");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось проверить звонок");
        }
      }
    };
    const timer = window.setInterval(() => {
      void tick();
    }, 2500);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [checkId, companySlug, embedToken, step]);

  if (clientName) {
    return (
      <div className="schedule-embed-auth schedule-embed-auth--logged">
        <div>
          <strong>{clientName}</strong>
          <span>Вы вошли для записи на занятия</span>
        </div>
        <button type="button" className="schedule-embed-auth-logout" onClick={onLogout}>
          Выйти
        </button>
      </div>
    );
  }

  const handlePhoneChange = (value: string) => {
    setPhone(formatRussianPhoneInput(value));
  };

  const completeAuth = (sessionToken: string, rawPhone: string) => {
    const normalizedPhone = normalizeRussianPhone(rawPhone);
    storeSessionToken(companySlug, sessionToken);
    storePhone(companySlug, normalizedPhone);
    onAuthenticated(sessionToken);
  };

  const loadChallenge = async () => {
    setCheckId("");
    setCallPhone("");
    setCallPhonePretty("");
    setCallPhoneHtml("");
    setMessage("");
    setError("");
  };

  const handleLogin = () => {
    setError("");
    setMessage("");
    if (!isValidRussianMobile(phone)) {
      setError("Укажите номер в формате +7, 7… или 8…");
      return;
    }
    startTransition(async () => {
      try {
        const result = await loginSchedulePortal(
          companySlug,
          embedToken,
          normalizeRussianPhone(phone),
          password,
        );
        completeAuth(result.session_token, phone);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось войти");
      }
    });
  };

  const handleForgotPassword = () => {
    setError("");
    setMessage("");
    if (!isValidRussianMobile(phone)) {
      setError("Укажите номер в формате +7, 7… или 8…");
      return;
    }
    startTransition(async () => {
      try {
        const result = await requestPasswordReset(companySlug, embedToken, normalizeRussianPhone(phone), {
          website: honeypotRef.current?.value || "",
        });
        setCheckId(result.check_id);
        setCallPhone(result.call_phone);
        setCallPhonePretty(result.call_phone_pretty);
        setCallPhoneHtml(result.call_phone_html || result.call_phone_pretty);
        setMessage(result.detail);
        if (result.status === "confirmed" || result.debug_confirmed) {
          setStep("reset");
        } else {
          setStep("call");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось начать проверку");
      }
    });
  };

  const handleResetPassword = () => {
    setError("");
    if (!email.trim()) {
      setError("Укажите email");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    startTransition(async () => {
      try {
        const result = await resetSchedulePassword(
          companySlug,
          embedToken,
          normalizeRussianPhone(phone),
          checkId,
          newPassword,
          email.trim(),
        );
        completeAuth(result.session_token, phone);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось сохранить пароль");
      }
    });
  };

  return (
    <section className="schedule-embed-auth">
      <div className="schedule-embed-auth-copy">
        <strong>{AUTH_STEP_COPY[step].title}</strong>
        <span>{AUTH_STEP_COPY[step].subtitle}</span>
      </div>

      <div className="schedule-embed-auth-note">
        <strong>{AUTH_STEP_COPY[step].hintTitle}</strong>
        <span>{AUTH_STEP_COPY[step].hintText}</span>
      </div>

      {step === "login" ? (
        <div className="schedule-embed-auth-form">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="8 999 123-45-67"
            value={phone}
            onChange={(event) => handlePhoneChange(event.target.value)}
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="button" disabled={isPending || !phone.trim() || !password} onClick={handleLogin}>
            {isPending ? "Вход…" : "Войти"}
          </button>
          <button
            type="button"
            className="schedule-embed-auth-back"
            onClick={() => {
              setError("");
              setMessage("");
              setStep("forgot");
              void loadChallenge().catch(() => undefined);
            }}
          >
            Не помню пароль
          </button>
        </div>
      ) : null}

      {step === "forgot" ? (
        <div className="schedule-embed-auth-form">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="8 999 123-45-67"
            value={phone}
            onChange={(event) => handlePhoneChange(event.target.value)}
          />
          <input
            ref={honeypotRef}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="schedule-embed-auth-honeypot"
            aria-hidden="true"
            defaultValue=""
          />
          <p className="schedule-embed-auth-call-hint">
            Мы сразу отправим запрос на подтверждение звонком. Никаких дополнительных кодов вводить не нужно.
          </p>
          <button
            type="button"
            disabled={isPending || !phone.trim()}
            onClick={handleForgotPassword}
          >
            {isPending ? "Подготовка…" : "Подтвердить номер звонком"}
          </button>
          <button type="button" className="schedule-embed-auth-back" onClick={() => setStep("login")}>
            Назад ко входу
          </button>
        </div>
      ) : null}

      {step === "call" ? (
        <div className="schedule-embed-auth-form">
          <p className="schedule-embed-auth-call-hint">
            Позвоните на номер ниже со своего телефона. Звонок бесплатный, его можно сразу сбросить.
          </p>
          {callPhonePretty || callPhoneHtml ? (
            <a
              className="schedule-embed-auth-call-number"
              href={`tel:${(callPhone || callPhonePretty || callPhoneHtml).replace(/\D/g, "")}`}
            >
              {callPhonePretty || callPhoneHtml}
            </a>
          ) : (
            <strong className="schedule-embed-auth-call-number">{callPhonePretty}</strong>
          )}
          <p className="schedule-embed-auth-message">Ждём подтверждение. Обычно это занимает несколько секунд.</p>
          <button
            type="button"
            disabled={isPending || !checkId}
            onClick={() => {
              startTransition(async () => {
                try {
                  const status = await fetchCallcheckStatus(companySlug, embedToken, checkId);
                  if (status.status === "confirmed") {
                    setMessage(status.detail);
                    setStep("reset");
                  } else {
                    setMessage(status.detail);
                  }
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Не удалось проверить звонок");
                }
              });
            }}
          >
            {isPending ? "Проверка…" : "Я уже позвонил"}
          </button>
          <button
            type="button"
            className="schedule-embed-auth-back"
            onClick={() => {
              setStep("forgot");
              setCheckId("");
              void loadChallenge().catch(() => undefined);
            }}
          >
            Начать заново
          </button>
        </div>
      ) : null}

      {step === "reset" ? (
        <div className="schedule-embed-auth-form">
          <input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Новый пароль"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Повторите пароль"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <button
            type="button"
            disabled={isPending || !email.trim() || !newPassword || !confirmPassword || !checkId}
            onClick={handleResetPassword}
          >
            {isPending ? "Сохранение…" : "Сохранить и войти"}
          </button>
          <button type="button" className="schedule-embed-auth-back" onClick={() => setStep("login")}>
            Назад ко входу
          </button>
        </div>
      ) : null}

      {message ? (
        <div className="schedule-embed-auth-status schedule-embed-auth-status--success" role="status">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="schedule-embed-auth-status schedule-embed-auth-status--error" role="alert">
          {error}
        </div>
      ) : null}
    </section>
  );
}

export function logoutScheduleSession(companySlug: string, onLogout: () => void) {
  clearSessionToken(companySlug);
  onLogout();
}
