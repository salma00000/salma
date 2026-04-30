"use strict";

const router = require("express").Router();
const facturesController = require("../controllers/facturesController");

router.get("/search", facturesController.search);
router.get("/:id", facturesController.getById);
router.get("/", facturesController.list);

module.exports = router;
