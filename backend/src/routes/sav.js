"use strict";

const router = require("express").Router();
const savController = require("../controllers/savController");

router.post("/tickets", savController.create);
router.get("/tickets", savController.list);
router.get("/tickets/:ticket_id", savController.getById);
router.patch("/tickets/:ticket_id", savController.updateStatus);

module.exports = router;
