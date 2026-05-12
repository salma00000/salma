"use strict";

const prisma = require("../db/prisma");

async function insert({
  ticket_id,
  facture_id,
  numero_facture,
  client_nom,
  client_email,
  order_date,
  issue_description,
  status,
  priority,
  ai_summary,
}) {
  return prisma.savTicket.create({
    data: {
      ticket_id,
      facture_id: facture_id ?? null,
      numero_facture: numero_facture ?? null,
      client_nom: client_nom ?? null,
      client_email: client_email ?? null,
      order_date: order_date ? new Date(order_date) : null,
      issue_description,
      status: status || "open",
      priority: priority || "medium",
      ai_summary: ai_summary ?? null,
    },
  });
}

async function findAll({ status, priority } = {}) {
  const tickets = await prisma.savTicket.findMany({
    where: {
      ...(status && { status }),
      ...(priority && { priority }),
    },
    select: {
      ticket_id: true,
      facture_id: true,
      numero_facture: true,
      client_nom: true,
      issue_description: true,
      status: true,
      priority: true,
      created_at: true,
      facture: { select: { montant_total: true } },
    },
    orderBy: { created_at: "desc" },
    take: 50,
  });

  return tickets.map(({ facture, ...t }) => ({
    ...t,
    montant_total: facture?.montant_total ?? null,
  }));
}

async function findByTicketId(ticketId) {
  const ticket = await prisma.savTicket.findUnique({
    where: { ticket_id: ticketId },
    include: {
      facture: {
        select: {
          montant_ht: true,
          montant_tva: true,
          montant_total: true,
          date_echeance: true,
          statut: true,
          notes: true,
        },
      },
    },
  });
  if (!ticket) return null;
  const { facture, ...rest } = ticket;
  return {
    ...rest,
    montant_ht: facture?.montant_ht ?? null,
    montant_tva: facture?.montant_tva ?? null,
    montant_total: facture?.montant_total ?? null,
    date_echeance: facture?.date_echeance ?? null,
    invoice_status: facture?.statut ?? null,
    facture_notes: facture?.notes ?? null,
  };
}

async function updateStatus(ticketId, status) {
  try {
    return await prisma.savTicket.update({
      where: { ticket_id: ticketId },
      data: { status, updated_at: new Date() },
    });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
}

module.exports = { insert, findAll, findByTicketId, updateStatus };
