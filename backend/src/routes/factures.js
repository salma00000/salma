"use strict";

const router = require("express").Router();
const facturesController = require("../controllers/facturesController");

router.get("/search", facturesController.search);
router.get("/by-numero/:numero", facturesController.getByNumero);
router.get("/:id", facturesController.getById);
router.get("/", facturesController.list);

module.exports = router;
