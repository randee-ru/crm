import fs from "node:fs";
import path from "node:path";

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";

import { notifyCrm } from "../crm-webhook.js";
import { saveMeta } from "../session-manager.js";
import { sessionPath } from "./session-path.js";

const logger = pino({ level: "warn" });

function extractPhone(jid = "") {
  const digits = String(jid).split("@")[0].replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  if (digits.length === 10) return `7${digits}`;
  return digits;
}

/**
 * @param {import('../session-manager.js').GatewaySession} session
 * @param {{ restore?: boolean }} [options]
 */
export async function createWhatsAppSession(session, options = {}) {
  const authDir = path.join(sessionPath(session.id), "whatsapp");
  fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  let resolveReady;
  const readyPromise = new Promise((resolve) => {
    resolveReady = resolve;
  });

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    syncFullHistory: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      session.status = "qr";
      session.qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 280 });
      saveMeta(session);
    }

    if (connection === "open") {
      session.status = "ready";
      session.phone = extractPhone(sock.user?.id || "");
      session.qrDataUrl = "";
      session.error = "";
      saveMeta(session);
      resolveReady?.(true);
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (!shouldReconnect) {
        session.status = "disconnected";
        session.error = "Сессия WhatsApp завершена. Подключите заново.";
      } else if (session.status !== "ready") {
        session.status = "error";
        session.error = "Соединение WhatsApp прервано";
      }
      saveMeta(session);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const message of messages) {
      if (!message.message || message.key.fromMe) continue;
      const jid = message.key.remoteJid || "";
      if (!jid || jid.endsWith("@g.us")) continue;
      const text =
        message.message.conversation ||
        message.message.extendedTextMessage?.text ||
        message.message.imageMessage?.caption ||
        "";
      if (!text) continue;

      await notifyCrm({
        event: "message.inbound",
        company_slug: session.companySlug,
        provider: "whatsapp",
        session_id: session.id,
        external_chat_id: jid,
        external_message_id: message.key.id || "",
        contact_phone: extractPhone(jid),
        contact_name: message.pushName || "",
        body: text,
        sent_at: new Date((message.messageTimestamp || Date.now()) * 1000).toISOString(),
        raw: { jid },
      });
    }
  });

  session.runtime = {
    sendMessage: async ({ chatId, text }) => {
      const jid = chatId.includes("@") ? chatId : `${chatId.replace(/\D/g, "")}@s.whatsapp.net`;
      const result = await sock.sendMessage(jid, { text });
      return {
        external_chat_id: jid,
        external_message_id: result?.key?.id || "",
      };
    },
  };

  if (options.restore && state.creds.registered) {
    await Promise.race([
      readyPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("WhatsApp timeout")), 30000)),
    ]);
  }
}
