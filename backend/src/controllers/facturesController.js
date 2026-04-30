"use strict";

const factureModel = require("../models/factureModel");

async function list(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit || "20", 10)),
    );
    const { data, total } = await factureModel.findAll({ page, limit });
    res.json({
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function search(req, res, next) {
  try {
    const { q, client, article, date, numero } = req.query;
    if (!q && !client && !article && !date && !numero) {
      return res.status(400).json({
        error: "Paramètre requis",
        message:
          "Fournissez au moins un critère : q, client, article, date, ou numero.",
      });
    }
    const results = await factureModel.search({
      q,
      client,
      article,
      date,
      numero,
    });
    res.json({
      found: results.length,
      results,
      search_criteria: { q, client, article, date, numero },
    });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res
        .status(400)
        .json({ error: 'Le paramètre "id" doit être un entier positif.' });
    }
    const facture = await factureModel.findById(id);
    if (!facture)
      return res.status(404).json({ error: `Aucune facture avec l'ID ${id}.` });
    res.json(facture);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, search, getById };
