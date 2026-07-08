import crypto from "node:crypto";

import { CRM_WEBHOOK_URL, GATEWAY_SECRET } from "./config.js";

export async function notifyCrm(payload) {
  if (!CRM_WEBHOOK_URL) return;

  const body = JSON.stringify(payload);
  const sign = crypto.createHmac("sha256", GATEWAY_SECRET).update(body).digest("hex");

  try {
    const response = await fetch(CRM_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Secret": sign,
      },
      body,
    });
    if (!response.ok) {
      const text = await response.text();
      console.error("[crm-webhook] failed", response.status, text);
    }
  } catch (error) {
    console.error("[crm-webhook] error", error);
  }
}
