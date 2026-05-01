"use strict";

/**
 * Middleware for n8n → backend internal calls.
 * Checks the X-Internal-Key header against N8N_INTERNAL_KEY env var.
 * Used on /api/internal/* routes instead of JWT auth.
 */
function internalAuth(req, res, next) {
  const key = req.headers["x-internal-key"];
  if (!key || key !== process.env.N8N_INTERNAL_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

module.exports = internalAuth;
