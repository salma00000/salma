"use strict";

const prisma = require("../db/prisma");

const CUSTOMER_SELECT = {
  id: true,
  external_id: true,
  name: true,
  email: true,
  phone: true,
  loyalty_tier: true,
  organization: true,
  created_at: true,
};

async function findAll({ page = 1, limit = 20 } = {}) {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const offset = (Math.max(1, page) - 1) * safeLimit;
  const [data, total] = await prisma.$transaction([
    prisma.customer.findMany({
      select: CUSTOMER_SELECT,
      orderBy: { name: "asc" },
      take: safeLimit,
      skip: offset,
    }),
    prisma.customer.count(),
  ]);
  return { data, total };
}

async function findById(id) {
  return prisma.customer.findUnique({ where: { id }, select: CUSTOMER_SELECT });
}

async function findByExternalId(externalId) {
  return prisma.customer.findUnique({
    where: { external_id: externalId },
    select: CUSTOMER_SELECT,
  });
}

module.exports = { findAll, findById, findByExternalId };
