"use strict";

const router = require("express").Router();
const c = require("../controllers/conversationsController");

router.get("/", c.list);
router.post("/", c.create);
router.get("/:sessionId", c.get);
router.delete("/:sessionId", c.remove);
router.get("/:sessionId/messages", c.getMessages);
router.post("/:sessionId/messages", c.addMessage);

module.exports = router;
