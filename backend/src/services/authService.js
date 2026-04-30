"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const advisorModel = require("../models/advisorModel");

async function login(email, password) {
  const advisor = await advisorModel.findByEmail(email);
  if (!advisor) return null;

  const valid = await bcrypt.compare(password, advisor.password_hash);
  if (!valid) return null;

  const token = jwt.sign(
    { id: advisor.id, email: advisor.email, full_name: advisor.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
  );

  return {
    token,
    advisor: {
      id: advisor.id,
      email: advisor.email,
      full_name: advisor.full_name,
    },
  };
}

module.exports = { login };
