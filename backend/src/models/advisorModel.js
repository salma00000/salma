"use strict";

const prisma = require("../db/prisma");

async function findByEmail(email) {
  return prisma.advisor.findUnique({ where: { email } });
}

async function findById(id) {
  return prisma.advisor.findUnique({
    where: { id },
    select: { id: true, email: true, full_name: true, created_at: true },
  });
}

module.exports = { findByEmail, findById };
