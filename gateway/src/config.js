import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PORT = Number(process.env.MESSENGER_GATEWAY_PORT || 8787);
export const GATEWAY_SECRET = (process.env.MESSENGER_GATEWAY_SECRET || "dev-gateway-secret").trim();
export const CRM_WEBHOOK_URL = (
  process.env.CRM_GATEWAY_WEBHOOK_URL || "http://127.0.0.1:8000/api/v1/channels/gateway/inbound/"
).trim();
export const SESSIONS_DIR = path.resolve(
  process.env.MESSENGER_GATEWAY_SESSIONS_DIR || path.join(__dirname, "..", "data", "sessions"),
);
export const TELEGRAM_API_ID = Number(process.env.TELEGRAM_API_ID || 0);
export const TELEGRAM_API_HASH = (process.env.TELEGRAM_API_HASH || "").trim();

fs.mkdirSync(SESSIONS_DIR, { recursive: true });
