"use strict";

const authService = require("../services/authService");
const advisorModel = require("../models/advisorModel");

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const result = await authService.login(email, password);
    if (!result)
      return res.status(401).json({ error: "Identifiants invalides" });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const advisor = await advisorModel.findById(req.advisor.id);
    if (!advisor)
      return res.status(404).json({ error: "Conseiller introuvable" });
    res.json(advisor);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };
