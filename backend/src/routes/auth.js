"use strict";

const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const requireAuth = require("../middleware/auth");
const authController = require("../controllers/authController");

const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", loginLimiter, authController.login);
router.get("/me", requireAuth, authController.me);

module.exports = router;
