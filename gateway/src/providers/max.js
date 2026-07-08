import fs from "node:fs";
import path from "node:path";

import QRCode from "qrcode";
import { MaxClient } from "max-account-api";

import { notifyCrm } from "../crm-webhook.js";
import { saveMeta } from "../session-manager.js";
import { sessionPath } from "./session-path.js";

function maxSessionFile(session) {
  return path.join(sessionPath(session.id), "max-session.json");
}

function extractPhone(value = "") {
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  if (digits.length === 10) return `7${digits}`;
  return digits;
}

async function resolveContactName(client, userId) {
  try {
    const contact = await client.getContactInfo(userId);
    const name = contact?.names?.[0]?.name || "";
    if (name) return name;
    const parts = [contact?.firstName, contact?.lastName].filter(Boolean);
    return parts.join(" ");
  } catch {
    return "";
  }
}

function bindMaxHandlers(session, client) {
  client.on("message", async (message) => {
    if (message.raw?.status) return;
    const me = client.getMe();
    if (me?.id && message.fromId === me.id) return;

    const chatId = String(message.chatId ?? "");
    const text = String(message.text || "").trim();
    if (!chatId || !text) return;

    const contactName = await resolveContactName(client, message.fromId);
    let contactPhone = "";
    try {
      const contact = await client.getContactInfo(message.fromId);
      contactPhone = extractPhone(contact?.phone || "");
    } catch {
      contactPhone = "";
    }

    await notifyCrm({
      event: "message.inbound",
      company_slug: session.companySlug,
      provider: "max",
      session_id: session.id,
      external_chat_id: chatId,
      external_message_id: String(message.id || message.msgId || ""),
      external_user_id: String(message.fromId || ""),
      contact_phone: contactPhone,
      contact_name: contactName,
      body: text,
      sent_at: message.timestamp
        ? new Date(message.timestamp).toISOString()
        : new Date().toISOString(),
      raw: {},
    });
  });

  client.on("close", () => {
    if (session.status === "ready") {
      session.status = "disconnected";
      session.error = "Сессия MAX завершена. Подключите заново.";
      saveMeta(session);
    }
  });

  client.on("error", (error) => {
    if (session.status === "ready") return;
    session.status = "error";
    session.error = error instanceof Error ? error.message : String(error);
    saveMeta(session);
  });
}

function attachSendMessage(session, client) {
  session.runtime = session.runtime || {};
  session.runtime.client = client;
  session.runtime.sendMessage = async ({ chatId, text }) => {
    const numericChatId = Number(chatId);
    const targetChatId = Number.isFinite(numericChatId) ? numericChatId : chatId;
    const result = await client.sendMessage(targetChatId, text);
    return {
      external_chat_id: String(chatId),
      external_message_id: String(result?.id || result?.msgId || result?.messageId || ""),
    };
  };
}

function markReady(session, client) {
  session.status = "ready";
  session.qrDataUrl = "";
  session.error = "";
  const me = client.getMe?.();
  session.phone = extractPhone(me?.phone || session.phone || "");
  saveMeta(session);
  bindMaxHandlers(session, client);
  attachSendMessage(session, client);
}

/**
 * @param {import('../session-manager.js').GatewaySession} session
 * @param {{ phone?: string, restore?: boolean }} [options]
 */
export async function createMaxSession(session, options = {}) {
  const sessionFile = maxSessionFile(session);

  if (options.restore && fs.existsSync(sessionFile)) {
    const client = new MaxClient({ sessionFile });
    await client.start();
    markReady(session, client);
    return;
  }

  if (options.phone) {
    await startPhoneLogin(session, options.phone);
    return;
  }

  await startQrLogin(session);
}

async function startQrLogin(session) {
  const sessionFile = maxSessionFile(session);
  const client = new MaxClient({ sessionFile });

  client.on("qr", async ({ link }) => {
    session.status = "qr";
    session.qrDataUrl = await QRCode.toDataURL(link, { margin: 1, width: 280 });
    session.error = "";
    saveMeta(session);
  });

  client.on("login", () => {
    markReady(session, client);
  });

  client.on("ready", () => {
    markReady(session, client);
  });

  client.on("error", (error) => {
    if (session.status === "ready") return;
    const message = error instanceof Error ? error.message : String(error);
    const wasQr = session.status === "qr";
    session.status = "error";
    session.qrDataUrl = "";
    session.error =
      wasQr || message.includes("WebSocket")
        ? "QR-код истёк. Нажмите «Подключить» для нового кода."
        : message;
    saveMeta(session);
  });

  session.runtime = { client };
  session.status = "pending";
  saveMeta(session);

  client
    .start()
    .then(() => {
      if (session.status !== "ready") {
        markReady(session, client);
      }
    })
    .catch((error) => {
      session.status = "error";
      session.error = error instanceof Error ? error.message : String(error);
      saveMeta(session);
    });
}

async function startPhoneLogin(session, phone) {
  const sessionFile = maxSessionFile(session);
  session.status = "code_required";
  session.phone = phone;
  saveMeta(session);

  /** @type {(value: string) => void} */
  let resolveSmsCode;
  /** @type {(reason?: unknown) => void} */
  let rejectSmsCode;
  const smsCodePromise = new Promise((resolve, reject) => {
    resolveSmsCode = resolve;
    rejectSmsCode = reject;
  });

  /** @type {(value: string) => void} */
  let resolvePassword;
  /** @type {(reason?: unknown) => void} */
  let rejectPassword;
  /** @type {Promise<string> | null} */
  let passwordPromise = null;

  const loginPromise = MaxClient.loginWithPhone({
    phone,
    getSmsCode: () => smsCodePromise,
    getPassword: (challenge) => {
      session.status = "password_required";
      session.runtime = session.runtime || {};
      session.runtime.passwordHint = challenge?.hint || "";
      saveMeta(session);
      passwordPromise = new Promise((resolve, reject) => {
        resolvePassword = resolve;
        rejectPassword = reject;
      });
      return passwordPromise;
    },
    sessionFile,
  });

  session.runtime = {
    loginPromise,
    resolveSmsCode,
    rejectSmsCode,
    resolvePassword,
    rejectPassword,
    client: null,
  };

  loginPromise
    .then((client) => {
      session.runtime.client = client;
      markReady(session, client);
    })
    .catch((error) => {
      if (session.status === "password_required") return;
      session.status = "error";
      session.error = error instanceof Error ? error.message : String(error);
      saveMeta(session);
    });
}

export async function handleMaxCode(session, code) {
  if (!session.runtime?.resolveSmsCode) {
    throw new Error("Вход MAX не инициализирован");
  }
  session.runtime.resolveSmsCode(code);
  try {
    await session.runtime.loginPromise;
  } catch (error) {
    if (session.status === "password_required") return;
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function handleMaxPassword(session, password) {
  if (!session.runtime?.resolvePassword) {
    throw new Error("Пароль 2FA не требуется");
  }
  session.runtime.resolvePassword(password);
  try {
    await session.runtime.loginPromise;
  } catch (error) {
    session.status = "error";
    session.error = error instanceof Error ? error.message : String(error);
    saveMeta(session);
    throw error instanceof Error ? error : new Error(String(error));
  }
  if (session.status !== "ready") {
    throw new Error("Не удалось войти в MAX");
  }
}
