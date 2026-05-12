"use strict";

const prisma = require("../db/prisma");

const LINE_SELECT = {
  id: true,
  invoice_id: true,
  label: true,
  description: true,
  quantity: true,
  unit_price: true,
  subtotal: true,
  sku: true,
  brand: true,
  category: true,
  warranty_months: true,
  product_state: true,
  image_url: true,
  supplier: true,
};

async function findByInvoiceId(invoiceId) {
  return prisma.invoiceLine.findMany({
    where: { invoice_id: invoiceId },
    select: LINE_SELECT,
    orderBy: { id: "asc" },
  });
}

module.exports = { findByInvoiceId };
