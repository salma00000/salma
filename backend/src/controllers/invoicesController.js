"use strict";

const invoiceModel = require("../models/invoiceModel");

async function list(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const { data, total } = await invoiceModel.findAll({ page, limit });
    res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

async function search(req, res, next) {
  try {
    const { q, customer, line, date, numero } = req.query;
    if (!q && !customer && !line && !date && !numero) {
      return res.status(400).json({
        error: "At least one search parameter required: q, customer, line, date, or numero.",
      });
    }
    const results = await invoiceModel.search({ q, customer, line, date, numero });
    res.json({ found: results.length, results, search_criteria: { q, customer, line, date, numero } });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: '"id" must be a positive integer.' });
    }
    const invoice = await invoiceModel.findById(id);
    if (!invoice) return res.status(404).json({ error: `Invoice ${id} not found.` });
    res.json(invoice);
  } catch (err) {
    next(err);
  }
}

async function getByNumber(req, res, next) {
  try {
    const { number } = req.params;
    const invoice = await invoiceModel.findByNumber(number);
    if (!invoice) return res.status(404).json({ error: `Invoice "${number}" not found.` });
    res.json(invoice);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, search, getById, getByNumber };
