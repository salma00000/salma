"use strict";

const factureModel = require("../models/factureModel");
const articleModel = require("../models/articleModel");
const savTicketModel = require("../models/savTicketModel");

const VALID_PRIORITIES = ["low", "medium", "high", "critical"];

function generateTicketId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SAV-${date}-${rand}`;
}

async function createTicket({
  facture_id,
  issue_description,
  priority = "medium",
  ai_summary = "",
}) {
  const facture = await factureModel.findById(facture_id);
  if (!facture) return null;

  const articles = await articleModel.findByFactureId(facture.id);
  const safeP = VALID_PRIORITIES.includes(priority) ? priority : "medium";
  const ticket_id = generateTicketId();

  const row = await savTicketModel.insert({
    ticket_id,
    facture_id: facture.id,
    numero_facture: facture.numero_facture,
    client_nom: facture.client_nom,
    client_email: facture.client_email || "",
    order_date: facture.date_creation,
    issue_description: issue_description.trim(),
    status: "open",
    priority: safeP,
    ai_summary: ai_summary.trim(),
  });

  return {
    ...row,
    invoice_total: parseFloat(facture.montant_total || 0),
    invoice_status: facture.statut,
    products: articles.map((a) => ({
      name: a.nom_article,
      description: a.description || "",
      quantity: parseFloat(a.quantite),
      unit_price: parseFloat(a.prix_unitaire),
      subtotal: parseFloat(a.sous_total),
    })),
  };
}

module.exports = { createTicket };
