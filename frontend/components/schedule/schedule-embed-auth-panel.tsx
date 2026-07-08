"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { formatRussianPhoneInput, isValidRussianMobile, normalizeRussianPhone } from "@/lib/phone";
import {
  clearSessionToken,
  fetchCallcheckStatus,
  fetchOtpChallenge,
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
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [challengeQuestion, setChallengeQuestion] = useState("");
  const [checkId, setCheckId] = useState("");
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

  const loadChallenge = async () => {
    const challenge = await fetchOtpChallenge(companySlug, embedToken);
    setChallengeId(challenge.challenge_id);
    setChallengeQuestion(challenge.question);
    setCaptchaAnswer("");
  };

  useEffect(() => {
    if (clientName || step !== "forgot") return;
    let cancelled = false;
    void (async () => {
      try {
        const challenge = await fetchOtpChallenge(companySlug, embedToken);
        if (cancelled) return;
        setChallengeId(challenge.challenge_id);
        setChallengeQuestion(challenge.question);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить проверку");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientName, companySlug, embedToken, step]);

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
          challenge_id: challengeId,
          captcha_answer: captchaAnswer.trim(),
          website: honeypotRef.current?.value || "",
        });
        setCheckId(result.check_id);
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
        try {
          await loadChallenge();
        } catch {
          // keep original error
        }
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
        <strong>Запись на занятия</strong>
        <span>Войдите по номеру телефона и паролю</span>
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
            Первый вход / забыли пароль?
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
          <label className="schedule-embed-auth-captcha">
            <span>Защита от роботов: сколько будет {challengeQuestion || "…"}?</span>
            <div className="schedule-embed-auth-captcha-row">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ответ"
                value={captchaAnswer}
                onChange={(event) => setCaptchaAnswer(event.target.value)}
              />
              <button
                type="button"
                className="schedule-embed-auth-back"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await loadChallenge();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Не удалось обновить проверку");
                    }
                  });
                }}
              >
                Обновить
              </button>
            </div>
          </label>
          <button
            type="button"
            disabled={isPending || !phone.trim() || !captchaAnswer.trim() || !challengeId}
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
            Позвоните на номер ниже со своего телефона. Звонок бесплатный — можно сразу сбросить.
          </p>
          {callPhoneHtml ? (
            <a className="schedule-embed-auth-call-number" href={`tel:${callPhoneHtml.replace(/\D/g, "")}`}>
              {callPhonePretty || callPhoneHtml}
            </a>
          ) : (
            <strong className="schedule-embed-auth-call-number">{callPhonePretty}</strong>
          )}
          <p className="schedule-embed-auth-message">Ждём звонок… обычно это занимает несколько секунд</p>
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

      {message ? <p className="schedule-embed-auth-message">{message}</p> : null}
      {error ? <p className="schedule-embed-auth-error">{error}</p> : null}
    </section>
  );
}

export function logoutScheduleSession(companySlug: string, onLogout: () => void) {
  clearSessionToken(companySlug);
  onLogout();
}
