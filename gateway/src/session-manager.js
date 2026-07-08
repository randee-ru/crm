import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { SESSIONS_DIR } from "./config.js";
import { createMaxSession, handleMaxCode, handleMaxPassword } from "./providers/max.js";
import { createTelegramSession, handleTelegramCode, handleTelegramPassword } from "./providers/telegram.js";
import { createWhatsAppSession } from "./providers/whatsapp.js";
import { sessionPath } from "./providers/session-path.js";

/** @typedef {'pending'|'qr'|'code_required'|'password_required'|'ready'|'error'|'disconnected'} SessionStatus */

/**
 * @typedef {object} GatewaySession
 * @property {string} id
 * @property {string} companySlug
 * @property {string} provider
 * @property {string} label
 * @property {SessionStatus} status
 * @property {string} [qrDataUrl]
 * @property {string} [phone]
 * @property {string} [error]
 * @property {object} [runtime]
 */

/** @type {Map<string, GatewaySession>} */
const sessions = new Map();

function metaPath(sessionId) {
  return path.join(sessionPath(sessionId), "meta.json");
}

function loadMeta(sessionId) {
  try {
    const raw = fs.readFileSync(metaPath(sessionId), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveMeta(session) {
  fs.mkdirSync(sessionPath(session.id), { recursive: true });
  const payload = {
    id: session.id,
    companySlug: session.companySlug,
    provider: session.provider,
    label: session.label,
    status: session.status,
    phone: session.phone || "",
    error: session.error || "",
  };
  fs.writeFileSync(metaPath(session.id), JSON.stringify(payload, null, 2));
}

export function listSessions(companySlug) {
  const items = [];
  for (const session of sessions.values()) {
    if (!companySlug || session.companySlug === companySlug) {
      items.push(publicSession(session));
    }
  }
  if (fs.existsSync(SESSIONS_DIR)) {
    for (const entry of fs.readdirSync(SESSIONS_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (sessions.has(entry.name)) continue;
      const meta = loadMeta(entry.name);
      if (!meta) continue;
      if (companySlug && meta.companySlug !== companySlug) continue;
      items.push({
        id: meta.id,
        company_slug: meta.companySlug,
        provider: meta.provider,
        label: meta.label,
        status: meta.status,
        phone: meta.phone,
        error: meta.error,
      });
    }
  }
  return items;
}

export function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) return publicSession(session);
  const meta = loadMeta(sessionId);
  if (!meta) return null;
  return {
    id: meta.id,
    company_slug: meta.companySlug,
    provider: meta.provider,
    label: meta.label,
    status: meta.status,
    phone: meta.phone,
    error: meta.error,
  };
}

function publicSession(session) {
  return {
    id: session.id,
    company_slug: session.companySlug,
    provider: session.provider,
    label: session.label,
    status: session.status,
    phone: session.phone || "",
    qr_data_url: session.qrDataUrl || "",
    error: session.error || "",
  };
}

export async function startSession({ companySlug, provider, label = "", phone = "", apiId, apiHash }) {
  const id = `${companySlug}__${provider}__${crypto.randomBytes(4).toString("hex")}`;
  /** @type {GatewaySession} */
  const session = {
    id,
    companySlug,
    provider,
    label: label || provider.toUpperCase(),
    status: "pending",
    phone: phone || "",
  };
  sessions.set(id, session);
  fs.mkdirSync(sessionPath(id), { recursive: true });
  saveMeta(session);

  try {
    if (provider === "whatsapp") {
      await createWhatsAppSession(session);
    } else if (provider === "telegram") {
      await createTelegramSession(session, { phone, apiId, apiHash });
    } else if (provider === "max") {
      await createMaxSession(session, { phone });
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error) {
    session.status = "error";
    session.error = error instanceof Error ? error.message : String(error);
    saveMeta(session);
  }

  return publicSession(session);
}

export async function submitTelegramCode(sessionId, code) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  await handleTelegramCode(session, code);
  saveMeta(session);
  return publicSession(session);
}

export async function submitTelegramPassword(sessionId, password) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  await handleTelegramPassword(session, password);
  saveMeta(session);
  return publicSession(session);
}

export async function submitMaxCode(sessionId, code) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  await handleMaxCode(session, code);
  saveMeta(session);
  return publicSession(session);
}

export async function submitMaxPassword(sessionId, password) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  await handleMaxPassword(session, password);
  saveMeta(session);
  return publicSession(session);
}

export async function sendOutbound({ sessionId, chatId, text, contactPhone = "", contactName = "" }) {
  const session = sessions.get(sessionId);
  if (!session || session.status !== "ready") {
    throw new Error("Сессия не подключена");
  }
  if (!session.runtime?.sendMessage) {
    throw new Error("Отправка не поддерживается для этой сессии");
  }
  return session.runtime.sendMessage({ chatId, text, contactPhone, contactName });
}

export async function deleteSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session?.runtime?.client) {
    try {
      if (typeof session.runtime.client.stop === "function") {
        await session.runtime.client.stop();
      } else if (typeof session.runtime.client.disconnect === "function") {
        await session.runtime.client.disconnect();
      }
    } catch {
      // ignore disconnect errors
    }
  }
  sessions.delete(sessionId);
  const dir = sessionPath(sessionId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function restoreSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  for (const entry of fs.readdirSync(SESSIONS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const meta = loadMeta(entry.name);
    if (!meta || meta.status !== "ready") continue;
    const session = {
      id: meta.id,
      companySlug: meta.companySlug,
      provider: meta.provider,
      label: meta.label,
      status: "pending",
      phone: meta.phone,
    };
    sessions.set(session.id, session);
    try {
      if (session.provider === "whatsapp") {
        await createWhatsAppSession(session, { restore: true });
      } else if (session.provider === "telegram") {
        await createTelegramSession(session, { restore: true });
      } else if (session.provider === "max") {
        await createMaxSession(session, { restore: true });
      }
    } catch (error) {
      session.status = "error";
      session.error = error instanceof Error ? error.message : String(error);
      saveMeta(session);
    }
  }
}
