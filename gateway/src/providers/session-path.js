import path from "node:path";

import { SESSIONS_DIR } from "../config.js";

export function sessionPath(sessionId) {
  return path.join(SESSIONS_DIR, sessionId);
}
