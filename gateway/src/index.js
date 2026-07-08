import crypto from "node:crypto";
import express from "express";

import { GATEWAY_SECRET, PORT } from "./config.js";
import {
  deleteSession,
  getSession,
  listSessions,
  restoreSessions,
  sendOutbound,
  startSession,
  submitMaxCode,
  submitMaxPassword,
  submitTelegramCode,
  submitTelegramPassword,
} from "./session-manager.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

function authorize(req, res, next) {
  const header = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const secret = String(req.headers["x-gateway-secret"] || header).trim();
  if (!GATEWAY_SECRET || secret !== GATEWAY_SECRET) {
    return res.status(401).json({ detail: "Unauthorized" });
  }
  return next();
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "messenger-gateway" });
});

app.get("/sessions", authorize, (req, res) => {
  const companySlug = String(req.query.company_slug || "").trim();
  res.json({ sessions: listSessions(companySlug) });
});

app.get("/sessions/:sessionId", authorize, (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ detail: "Session not found" });
  return res.json(session);
});

app.post("/sessions", authorize, async (req, res) => {
  try {
    const companySlug = String(req.body.company_slug || "").trim();
    const provider = String(req.body.provider || "").trim();
    const label = String(req.body.label || "").trim();
    const phone = String(req.body.phone || "").trim();
    const apiId = Number(req.body.api_id || 0);
    const apiHash = String(req.body.api_hash || "").trim();
    if (!companySlug || !provider) {
      return res.status(400).json({ detail: "company_slug and provider required" });
    }
    const session = await startSession({ companySlug, provider, label, phone, apiId, apiHash });
    return res.status(201).json(session);
  } catch (error) {
    return res.status(400).json({ detail: error instanceof Error ? error.message : String(error) });
  }
});

app.post("/sessions/:sessionId/telegram-code", authorize, async (req, res) => {
  try {
    const session = await submitTelegramCode(req.params.sessionId, String(req.body.code || "").trim());
    return res.json(session);
  } catch (error) {
    return res.status(400).json({ detail: error instanceof Error ? error.message : String(error) });
  }
});

app.post("/sessions/:sessionId/max-code", authorize, async (req, res) => {
  try {
    const session = await submitMaxCode(req.params.sessionId, String(req.body.code || "").trim());
    return res.json(session);
  } catch (error) {
    return res.status(400).json({ detail: error instanceof Error ? error.message : String(error) });
  }
});

app.post("/sessions/:sessionId/max-password", authorize, async (req, res) => {
  try {
    const session = await submitMaxPassword(
      req.params.sessionId,
      String(req.body.password || ""),
    );
    return res.json(session);
  } catch (error) {
    return res.status(400).json({ detail: error instanceof Error ? error.message : String(error) });
  }
});

app.post("/sessions/:sessionId/telegram-password", authorize, async (req, res) => {
  try {
    const session = await submitTelegramPassword(
      req.params.sessionId,
      String(req.body.password || ""),
    );
    return res.json(session);
  } catch (error) {
    return res.status(400).json({ detail: error instanceof Error ? error.message : String(error) });
  }
});

app.delete("/sessions/:sessionId", authorize, async (req, res) => {
  try {
    const session = getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ detail: "Session not found" });
    await deleteSession(req.params.sessionId);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ detail: error instanceof Error ? error.message : String(error) });
  }
});

app.post("/sessions/:sessionId/send", authorize, async (req, res) => {
  try {
    const result = await sendOutbound({
      sessionId: req.params.sessionId,
      chatId: String(req.body.chat_id || ""),
      text: String(req.body.text || ""),
      contactPhone: String(req.body.contact_phone || ""),
      contactName: String(req.body.contact_name || ""),
    });
    return res.json({ status: "ok", ...result });
  } catch (error) {
    return res.status(400).json({ detail: error instanceof Error ? error.message : String(error) });
  }
});

restoreSessions()
  .catch((error) => console.error("[gateway] restore failed", error))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`[messenger-gateway] listening on :${PORT}`);
    });
  });
