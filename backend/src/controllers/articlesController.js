"use strict";

const factureModel = require("../models/factureModel");
const articleModel = require("../models/articleModel");

async function listByFacture(req, res, next) {
  try {
    if (!req.query.facture_id) {
      return res
        .status(400)
        .json({ error: 'Le paramètre "facture_id" est requis.' });
    }

    const facture_id = parseInt(req.query.facture_id, 10);
    if (isNaN(facture_id) || facture_id <= 0) {
      return res
        .status(400)
        .json({ error: '"facture_id" doit être un entier positif.' });
    }

    const facture = await factureModel.findById(facture_id);
    if (!facture)
      return res
        .status(404)
        .json({ error: `La facture ${facture_id} n'existe pas.` });

    const articles = await articleModel.findByFactureId(facture_id);
    if (!articles.length) {
      return res.json({
        facture_id,
        articles: [],
        message: "Cette facture ne contient aucun article.",
      });
    }

    res.json(articles);
  } catch (err) {
    next(err);
  }
}

module.exports = { listByFacture };
