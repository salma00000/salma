"use strict";

const prisma = require("../db/prisma");

async function findByFactureId(factureId) {
  return prisma.article.findMany({
    where: { facture_id: factureId },
    select: {
      id: true,
      facture_id: true,
      nom_article: true,
      description: true,
      quantite: true,
      prix_unitaire: true,
      sous_total: true,
      product_sku: true,
      product_brand: true,
      product_category: true,
      warranty_months: true,
    },
    orderBy: { id: "asc" },
  });
}

module.exports = { findByFactureId };
