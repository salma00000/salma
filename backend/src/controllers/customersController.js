"use strict";

const customerModel = require("../models/customerModel");

async function list(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const { data, total } = await customerModel.findAll({ page, limit });
    res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const customer = await customerModel.findById(id);
    if (!customer) return res.status(404).json({ error: `Customer "${id}" not found.` });
    res.json(customer);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById };
