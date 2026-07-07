"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { connectMailAccountAction } from "@/app/actions/mail";
import { IconMail } from "@/components/ui/app-icon";
import { mailProviders } from "@/lib/nav";

export function MailConnectScreen() {
  const router = useRouter();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleConnect = () => {
    if (!selectedProvider || !email.trim()) {
      setError("Выберите провайдера и укажите email.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await connectMailAccountAction({
        provider: selectedProvider,
        email: email.trim(),
        displayName: displayName.trim(),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="mail-connect-screen">
      <div className="mail-connect-header">
        <h1>Подключение почтового ящика</h1>
        <p className="mail-connect-subtitle">Работайте с почтой внутри CRM Kit</p>
      </div>

      <div className="mail-provider-grid">
        {mailProviders.map((provider) => (
          <button
            key={provider.id}
            type="button"
            className={`mail-provider-card ${selectedProvider === provider.id ? "mail-provider-card--active" : ""}`}
            onClick={() => setSelectedProvider(provider.id)}
          >
            <span className="mail-provider-icon">
              {provider.id === "imap" ? <IconMail size={20} /> : provider.icon}
            </span>
            <span className="mail-provider-label">{provider.label}</span>
          </button>
        ))}
      </div>

      {selectedProvider ? (
        <div className="mail-connect-form">
          <h2>Подключить {mailProviders.find((item) => item.id === selectedProvider)?.label}</h2>
          <label className="mail-connect-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.ru"
            />
          </label>
          <label className="mail-connect-field">
            <span>Отображаемое имя</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Иван Иванов"
            />
          </label>
          {error ? <p className="mail-connect-error">{error}</p> : null}
          <button type="button" className="btn-primary" disabled={isPending} onClick={handleConnect}>
            {isPending ? "Подключаем…" : "Подключить почту"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
