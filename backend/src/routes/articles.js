"use strict";

const router = require("express").Router();
const articlesController = require("../controllers/articlesController");

router.get("/", articlesController.listByFacture);

module.exports = router;
