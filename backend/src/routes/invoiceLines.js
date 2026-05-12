"use strict";

const router = require("express").Router();
const invoiceLinesController = require("../controllers/invoiceLinesController");

router.get("/", invoiceLinesController.listByInvoice);

module.exports = router;
