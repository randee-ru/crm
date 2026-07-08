import fs from "node:fs";
import path from "node:path";

import QRCode from "qrcode";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

import { notifyCrm } from "../crm-webhook.js";
import { TELEGRAM_API_HASH, TELEGRAM_API_ID } from "../config.js";
import { saveMeta } from "../session-manager.js";
import { sessionPath } from "./session-path.js";

function loadStringSession(session) {
  const file = path.join(sessionPath(session.id), "telegram.session");
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {
    return "";
  }
}

function saveStringSession(session, value) {
  fs.writeFileSync(path.join(sessionPath(session.id), "telegram.session"), value, "utf8");
}

function extractPhoneFromPeer(peerId) {
  if (!peerId) return "";
  if (typeof peerId === "object" && "userId" in peerId) {
    return String(peerId.userId);
  }
  return "";
}

async function bindTelegramHandlers(session, client) {
  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message || message.out) return;
    const chatId = String(message.chatId || message.peerId?.userId || "");
    if (!chatId) return;
    const text = message.message || "";
    if (!text) return;

    let contactName = "";
    try {
      const sender = await message.getSender();
      if (sender && "firstName" in sender) {
        contactName = [sender.firstName, sender.lastName].filter(Boolean).join(" ");
      }
    } catch {
      contactName = "";
    }

    await notifyCrm({
      event: "message.inbound",
      company_slug: session.companySlug,
      provider: "telegram",
      session_id: session.id,
      external_chat_id: chatId,
      external_message_id: String(message.id || ""),
      contact_phone: "",
      contact_name: contactName,
      body: text,
      sent_at: message.date ? new Date(message.date * 1000).toISOString() : new Date().toISOString(),
      raw: {},
    });
  });
}

/**
 * @param {import('../session-manager.js').GatewaySession} session
 * @param {{ phone?: string, apiId?: number, apiHash?: string, restore?: boolean }} options
 */
export async function createTelegramSession(session, options = {}) {
  const apiId = Number(options.apiId || TELEGRAM_API_ID);
  const apiHash = (options.apiHash || TELEGRAM_API_HASH).trim();
  if (!apiId || !apiHash) {
    throw new Error("Укажите TELEGRAM_API_ID и TELEGRAM_API_HASH в настройках шлюза");
  }

  const stringSession = new StringSession(loadStringSession(session));
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  session.runtime = {
    client,
    sendMessage: async ({ chatId, text }) => {
      const result = await client.sendMessage(chatId, { message: text });
      return {
        external_chat_id: String(chatId),
        external_message_id: String(result.id || ""),
      };
    },
  };

  if (options.restore && loadStringSession(session)) {
    await client.connect();
    if (await client.isUserAuthorized()) {
      session.status = "ready";
      const me = await client.getMe();
      session.phone = me?.phone || session.phone || "";
      saveMeta(session);
      await bindTelegramHandlers(session, client);
      return;
    }
  }

  await client.connect();

  if (await client.isUserAuthorized()) {
    session.status = "ready";
    saveStringSession(session, client.session.save());
    const me = await client.getMe();
    session.phone = me?.phone || "";
    saveMeta(session);
    await bindTelegramHandlers(session, client);
    return;
  }

  if (options.phone) {
    session.status = "code_required";
    session.phone = options.phone;
    const result = await client.sendCode({ apiId, apiHash }, options.phone);
    session.runtime.phoneCodeHash = result.phoneCodeHash;
    saveMeta(session);
    return;
  }

  session.status = "qr";
  saveMeta(session);
  await client.signInUserWithQrCode(
    { apiId, apiHash },
    {
      qrCode: async (code) => {
        session.qrDataUrl = await QRCode.toDataURL(
          `tg://login?token=${code.token.toString("base64url")}`,
          { margin: 1, width: 280 },
        );
        saveMeta(session);
      },
      onError: async () => false,
    },
  );

  session.status = "ready";
  session.qrDataUrl = "";
  saveStringSession(session, client.session.save());
  const me = await client.getMe();
  session.phone = me?.phone || "";
  saveMeta(session);
  await bindTelegramHandlers(session, client);
}

export async function handleTelegramCode(session, code) {
  const client = session.runtime?.client;
  if (!client) throw new Error("Telegram client not initialized");
  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: session.phone,
        phoneCodeHash: session.runtime.phoneCodeHash,
        phoneCode: code,
      }),
    );
  } catch (error) {
    if (String(error).includes("SESSION_PASSWORD_NEEDED")) {
      session.status = "password_required";
      saveMeta(session);
      return;
    }
    throw error;
  }
  session.status = "ready";
  saveStringSession(session, client.session.save());
  saveMeta(session);
  await bindTelegramHandlers(session, client);
}

export async function handleTelegramPassword(session, password) {
  const client = session.runtime?.client;
  if (!client) throw new Error("Telegram client not initialized");
  await client.signInWithPassword({ password: () => password });
  session.status = "ready";
  saveStringSession(session, client.session.save());
  saveMeta(session);
  await bindTelegramHandlers(session, client);
}
