"use strict";

const router = require("express").Router();
const invoicesController = require("../controllers/invoicesController");

router.get("/search", invoicesController.search);
router.get("/by-number/:number", invoicesController.getByNumber);
router.get("/:id", invoicesController.getById);
router.get("/", invoicesController.list);

module.exports = router;
