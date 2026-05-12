"use strict";

const prisma = require("../db/prisma");

async function insert({
  folder_reference,
  customer_id,
  invoice_id,
  invoice_number,
  product_id,
  issue_type,
  issue_description,
  product_state,
  status,
  priority,
  advisor_id,
  ai_summary,
}) {
  return prisma.savFolder.create({
    data: {
      folder_reference,
      customer_id: customer_id ?? null,
      invoice_id: invoice_id ?? null,
      invoice_number: invoice_number ?? null,
      product_id: product_id ?? null,
      issue_type: issue_type ?? null,
      issue_description,
      product_state: product_state ?? null,
      status: status || "open",
      priority: priority || "medium",
      advisor_id: advisor_id ?? null,
      ai_summary: ai_summary ?? null,
    },
  });
}

async function findAll({ status, priority } = {}) {
  return prisma.savFolder.findMany({
    where: {
      ...(status && { status }),
      ...(priority && { priority }),
    },
    select: {
      folder_reference: true,
      invoice_id: true,
      invoice_number: true,
      issue_type: true,
      issue_description: true,
      product_state: true,
      status: true,
      priority: true,
      created_at: true,
      customer: { select: { name: true, email: true } },
      invoice: { select: { amount_ttc: true } },
    },
    orderBy: { created_at: "desc" },
    take: 50,
  });
}

async function findByReference(folderReference) {
  return prisma.savFolder.findUnique({
    where: { folder_reference: folderReference },
    include: {
      customer: {
        select: { id: true, external_id: true, name: true, email: true, phone: true, loyalty_tier: true },
      },
      invoice: {
        select: { id: true, invoice_number: true, date: true, store: true, amount_ht: true, amount_ttc: true, status: true },
      },
      product: {
        select: { id: true, label: true, sku: true, brand: true, category: true, warranty_months: true, product_state: true },
      },
    },
  });
}

async function updateStatus(folderReference, status) {
  try {
    return await prisma.savFolder.update({
      where: { folder_reference: folderReference },
      data: { status, updated_at: new Date() },
    });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
}

module.exports = { insert, findAll, findByReference, updateStatus };
