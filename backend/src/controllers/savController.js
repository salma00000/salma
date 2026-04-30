"use strict";

const { createTicket } = require("../services/savTicketService");
const savTicketModel = require("../models/savTicketModel");
const articleModel = require("../models/articleModel");

const VALID_STATUSES = ["open", "in_progress", "resolved", "closed"];
const TICKET_ID_RE = /^SAV-[A-Z0-9-]{5,20}$/;

async function create(req, res, next) {
  try {
    const {
      facture_id,
      issue_description,
      priority = "medium",
      ai_summary = "",
    } = req.body || {};

    if (!facture_id || !issue_description) {
      return res.status(400).json({
        error: "Champs requis manquants",
        required: ["facture_id", "issue_description"],
      });
    }

    const facture_id_int = parseInt(facture_id, 10);
    if (isNaN(facture_id_int) || facture_id_int <= 0) {
      return res
        .status(400)
        .json({ error: '"facture_id" doit être un entier positif.' });
    }

    if (
      typeof issue_description !== "string" ||
      issue_description.trim().length < 5
    ) {
      return res
        .status(400)
        .json({
          error: '"issue_description" doit faire au moins 5 caractères.',
        });
    }

    const ticket = await createTicket({
      facture_id: facture_id_int,
      issue_description,
      priority,
      ai_summary,
    });
    if (!ticket)
      return res
        .status(404)
        .json({ error: `La facture ${facture_id_int} n'existe pas.` });

    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { status, priority } = req.query;
    const tickets = await savTicketModel.findAll({ status, priority });
    res.json({ tickets, total: tickets.length });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const { ticket_id } = req.params;
    if (!TICKET_ID_RE.test(ticket_id)) {
      return res
        .status(400)
        .json({ error: "Format ticket_id invalide. Ex: SAV-20260310-A3F2" });
    }

    const ticket = await savTicketModel.findByTicketId(ticket_id);
    if (!ticket)
      return res
        .status(404)
        .json({ error: `Ticket "${ticket_id}" introuvable.` });

    const articles = await articleModel.findByFactureId(ticket.facture_id);
    res.json({ ...ticket, products: articles });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { ticket_id } = req.params;
    const { status } = req.body || {};

    if (!TICKET_ID_RE.test(ticket_id)) {
      return res.status(400).json({ error: "Format ticket_id invalide." });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ error: "Statut invalide.", allowed: VALID_STATUSES });
    }

    const ticket = await savTicketModel.updateStatus(ticket_id, status);
    if (!ticket)
      return res
        .status(404)
        .json({ error: `Ticket "${ticket_id}" introuvable.` });

    res.json(ticket);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, updateStatus };
