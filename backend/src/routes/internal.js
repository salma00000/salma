"use strict";

const router = require("express").Router();
const internalAuth = require("../middleware/internalAuth");
const c = require("../controllers/internalController");

router.use(internalAuth);

// Session management — replaces PG nodes in n8n workflow
router.get("/sessions/:sessionId", c.getSession);
router.post("/sessions/:sessionId", c.upsertSession);
router.patch("/sessions/:sessionId/draft", c.updateDraft);
router.patch("/sessions/:sessionId/status", c.updateStatus);
router.delete("/sessions/:sessionId", c.deleteSession);
router.post("/folders", c.createFolderFromDraft);

module.exports = router;
