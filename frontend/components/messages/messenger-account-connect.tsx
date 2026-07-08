"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";

import {
  createMessengerGatewayAccountAction,
  refreshMessengerGatewayAccountAction,
  submitMessengerGatewayCodeAction,
  submitMessengerGatewayPasswordAction,
} from "@/app/actions/messenger";
import { MESSENGER_PROVIDER_LABELS, type MessengerChannelProvider } from "@/lib/messenger";
import type { MessengerAccountRecord } from "@/lib/types";

type MessengerAccountConnectProps = {
  provider: MessengerChannelProvider;
  account: MessengerAccountRecord | null;
};

const PHONE_PROVIDERS = new Set<MessengerChannelProvider>(["max", "telegram"]);

export function MessengerAccountConnect({ provider, account: initialAccount }: MessengerAccountConnectProps) {
  const router = useRouter();
  const [account, setAccount] = useState(initialAccount);
  const [phone, setPhone] = useState(initialAccount?.phone || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setAccount(initialAccount);
  }, [initialAccount]);

  useEffect(() => {
    if (!account?.id) return;
    if (account.status === "ready" || account.status === "error" || account.status === "disconnected") {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshMessengerGatewayAccountAction(account.id).then((result) => {
        if (result.account) {
          setAccount(result.account);
          if (result.account.status === "ready") {
            router.refresh();
          }
        }
      });
    }, 2000);

    return () => window.clearInterval(timer);
  }, [account?.id, account?.status, router]);

  const handleConnect = () => {
    setError(null);
    startTransition(async () => {
      const result = await createMessengerGatewayAccountAction(provider, {
        label: MESSENGER_PROVIDER_LABELS[provider],
        phone: PHONE_PROVIDERS.has(provider) ? phone.trim() : "",
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setAccount(result.account ?? null);
      router.refresh();
    });
  };

  const handleSubmitCode = () => {
    if (!account?.id) return;
    setError(null);
    startTransition(async () => {
      const result = await submitMessengerGatewayCodeAction(account.id, code, provider as "max" | "telegram");
      if (result.error) {
        setError(result.error);
        return;
      }
      setCode("");
      setAccount(result.account ?? null);
      router.refresh();
    });
  };

  const handleSubmitPassword = () => {
    if (!account?.id) return;
    setError(null);
    startTransition(async () => {
      const result = await submitMessengerGatewayPasswordAction(
        account.id,
        password,
        provider as "max" | "telegram",
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setPassword("");
      setAccount(result.account ?? null);
      router.refresh();
    });
  };

  const status = account?.status;
  const showPhoneInput = PHONE_PROVIDERS.has(provider) && !account;

  return (
    <section className="messages-empty-state messages-channel-setup">
      <div className="messages-empty-illustration" aria-hidden="true">
        <MessageSquare size={48} strokeWidth={1.5} className="text-[var(--muted)]" />
      </div>
      <h2 className="messages-empty-title">Подключите {MESSENGER_PROVIDER_LABELS[provider]}</h2>
      <p className="messages-empty-text">
        {provider === "whatsapp"
          ? "Отсканируйте QR-код в приложении WhatsApp на телефоне."
          : provider === "max"
            ? "Войдите по номеру телефона или отсканируйте QR-код в приложении MAX."
            : "Войдите по номеру телефона или отсканируйте QR-код в Telegram."}
      </p>

      <div className="messages-channel-settings-form">
        {showPhoneInput ? (
          <label className="messages-channel-field">
            <span>Номер телефона</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+79991234567"
              className="messages-channel-input"
            />
          </label>
        ) : null}

        {!account ? (
          <button
            type="button"
            className="btn-primary"
            disabled={isPending || (PHONE_PROVIDERS.has(provider) && !phone.trim())}
            onClick={handleConnect}
          >
            {isPending ? "Подключение…" : "Подключить"}
          </button>
        ) : null}

        {status === "qr" && account.qr_data_url ? (
          <div className="messages-channel-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={account.qr_data_url} alt="QR-код для входа" width={280} height={280} />
            <p className="messages-empty-text">Отсканируйте QR-код в приложении</p>
          </div>
        ) : null}

        {status === "code_required" ? (
          <label className="messages-channel-field">
            <span>Код из SMS</span>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="12345"
              className="messages-channel-input"
            />
            <button
              type="button"
              className="btn-primary"
              disabled={isPending || !code.trim()}
              onClick={handleSubmitCode}
            >
              {isPending ? "Проверка…" : "Подтвердить код"}
            </button>
          </label>
        ) : null}

        {status === "password_required" ? (
          <label className="messages-channel-field">
            <span>Пароль 2FA</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Облачный пароль"
              className="messages-channel-input"
            />
            <button
              type="button"
              className="btn-primary"
              disabled={isPending || !password}
              onClick={handleSubmitPassword}
            >
              {isPending ? "Проверка…" : "Подтвердить пароль"}
            </button>
          </label>
        ) : null}

        {status === "pending" ? (
          <p className="messages-empty-text">Ожидание подключения…</p>
        ) : null}

        {status === "error" ? (
          <p className="messages-composer-error">{account.error_message || "Ошибка подключения."}</p>
        ) : null}

        {error ? <p className="messages-composer-error">{error}</p> : null}
      </div>
    </section>
  );
}
