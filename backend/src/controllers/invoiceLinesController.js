"use strict";

const invoiceModel = require("../models/invoiceModel");
const invoiceLineModel = require("../models/invoiceLineModel");

async function listByInvoice(req, res, next) {
  try {
    if (!req.query.invoice_id) {
      return res.status(400).json({ error: '"invoice_id" query parameter is required.' });
    }
    const invoice_id = parseInt(req.query.invoice_id, 10);
    if (isNaN(invoice_id) || invoice_id <= 0) {
      return res.status(400).json({ error: '"invoice_id" must be a positive integer.' });
    }
    const invoice = await invoiceModel.findById(invoice_id);
    if (!invoice) return res.status(404).json({ error: `Invoice ${invoice_id} not found.` });

    const lines = await invoiceLineModel.findByInvoiceId(invoice_id);
    res.json(lines);
  } catch (err) {
    next(err);
  }
}

module.exports = { listByInvoice };
