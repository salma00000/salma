"use strict";

const router = require("express").Router();
const customersController = require("../controllers/customersController");

router.get("/", customersController.list);
router.get("/:id", customersController.getById);

module.exports = router;
