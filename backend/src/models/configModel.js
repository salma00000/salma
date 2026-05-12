"use strict";

const prisma = require("../db/prisma");

async function findByCode(configCode) {
  return prisma.configValue.findMany({
    where: { config_code: configCode },
    orderBy: { sort_order: "asc" },
  });
}

module.exports = { findByCode };
