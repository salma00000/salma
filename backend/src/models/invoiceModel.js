"use strict";

const prisma = require("../db/prisma");
const { Prisma } = require("@prisma/client");

const INVOICE_SELECT = {
  id: true,
  invoice_number: true,
  customer_id: true,
  date: true,
  store: true,
  amount_ht: true,
  vat_rate: true,
  amount_ttc: true,
  status: true,
  source: true,
  customer: {
    select: {
      id: true,
      external_id: true,
      name: true,
      email: true,
      phone: true,
      loyalty_tier: true,
    },
  },
};

async function findAll({ page = 1, limit = 20 } = {}) {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const offset = (Math.max(1, page) - 1) * safeLimit;
  const [data, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      select: INVOICE_SELECT,
      orderBy: { date: "desc" },
      take: safeLimit,
      skip: offset,
    }),
    prisma.invoice.count(),
  ]);
  return { data, total };
}

async function search({ q, customer, line, date, numero } = {}) {
  const conditions = [];

  if (numero)
    conditions.push(Prisma.sql`i.invoice_number ILIKE ${`%${numero}%`}`);
  if (customer)
    conditions.push(Prisma.sql`c.name ILIKE ${`%${customer}%`}`);
  if (date)
    conditions.push(Prisma.sql`DATE(i.date) = ${date}::date`);
  if (line)
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM invoice_lines l WHERE l.invoice_id = i.id AND l.label ILIKE ${`%${line}%`})`,
    );
  if (q) {
    const qLike = `%${q}%`;
    conditions.push(Prisma.sql`(
      i.invoice_number ILIKE ${qLike}
      OR c.name         ILIKE ${qLike}
      OR c.email        ILIKE ${qLike}
      OR EXISTS (SELECT 1 FROM invoice_lines l WHERE l.invoice_id = i.id AND l.label ILIKE ${qLike})
    )`);
  }

  const whereClause = conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;

  return prisma.$queryRaw`
    SELECT i.id, i.invoice_number, c.name AS customer_name, c.email AS customer_email,
           i.date, i.amount_ttc, i.status,
           COUNT(l.id)::int AS nb_lines
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN invoice_lines l ON l.invoice_id = i.id
    ${whereClause}
    GROUP BY i.id, c.name, c.email ORDER BY i.date DESC LIMIT 10
  `;
}

async function findById(id) {
  return prisma.invoice.findUnique({ where: { id }, select: INVOICE_SELECT });
}

async function findByNumber(invoiceNumber) {
  return prisma.invoice.findUnique({
    where: { invoice_number: invoiceNumber },
    select: INVOICE_SELECT,
  });
}

module.exports = { findAll, search, findById, findByNumber };
