"use strict";

const prisma = require("../db/prisma");
const { Prisma } = require("@prisma/client");

const FACTURE_SELECT = {
  id: true,
  numero_facture: true,
  client_nom: true,
  client_email: true,
  client_phone: true,
  client_loyalty_tier: true,
  customer_id: true,
  date_creation: true,
  date_echeance: true,
  montant_ht: true,
  montant_tva: true,
  montant_total: true,
  statut: true,
  store: true,
  notes: true,
};

async function findAll({ page = 1, limit = 20 } = {}) {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const offset = (Math.max(1, page) - 1) * safeLimit;

  const [data, total] = await prisma.$transaction([
    prisma.facture.findMany({
      select: FACTURE_SELECT,
      orderBy: { date_creation: "desc" },
      take: safeLimit,
      skip: offset,
    }),
    prisma.facture.count(),
  ]);

  return { data, total };
}

async function search({ q, client, article, date, numero } = {}) {
  const conditions = [];

  if (numero)
    conditions.push(Prisma.sql`f.numero_facture ILIKE ${`%${numero}%`}`);
  if (client)
    conditions.push(Prisma.sql`f.client_nom ILIKE ${`%${client}%`}`);
  if (date)
    conditions.push(Prisma.sql`DATE(f.date_creation) = ${date}::date`);
  if (article)
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM articles a WHERE a.facture_id = f.id AND a.nom_article ILIKE ${`%${article}%`})`,
    );
  if (q) {
    const qLike = `%${q}%`;
    conditions.push(Prisma.sql`(
      f.numero_facture ILIKE ${qLike}
      OR f.client_nom   ILIKE ${qLike}
      OR f.client_email ILIKE ${qLike}
      OR EXISTS (SELECT 1 FROM articles a WHERE a.facture_id = f.id AND a.nom_article ILIKE ${qLike})
    )`);
  }

  const whereClause = conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;

  return prisma.$queryRaw`
    SELECT f.id, f.numero_facture, f.client_nom, f.client_email,
           f.date_creation, f.montant_total, f.statut,
           COUNT(a.id)::int AS nb_articles
    FROM factures f LEFT JOIN articles a ON a.facture_id = f.id
    ${whereClause}
    GROUP BY f.id ORDER BY f.date_creation DESC LIMIT 10
  `;
}

async function findById(id) {
  return prisma.facture.findUnique({ where: { id }, select: FACTURE_SELECT });
}

async function findByNumero(numero) {
  return prisma.facture.findUnique({
    where: { numero_facture: numero },
    select: FACTURE_SELECT,
  });
}

module.exports = { findAll, search, findById, findByNumero };
