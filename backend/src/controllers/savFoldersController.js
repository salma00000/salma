"use strict";

const savFolderModel = require("../models/savFolderModel");
const invoiceLineModel = require("../models/invoiceLineModel");

const VALID_STATUSES = ["open", "in_progress", "resolved", "closed"];
const FOLDER_REF_RE = /^SAV-[A-Z0-9-]{5,25}$/;

function generateFolderReference() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SAV-${date}-${rand}`;
}

async function create(req, res, next) {
  try {
    const { invoice_id, issue_description, priority = "medium", ai_summary = "" } = req.body || {};

    if (!invoice_id || !issue_description) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["invoice_id", "issue_description"],
      });
    }

    const invoice_id_int = parseInt(invoice_id, 10);
    if (isNaN(invoice_id_int) || invoice_id_int <= 0) {
      return res.status(400).json({ error: '"invoice_id" must be a positive integer.' });
    }

    if (typeof issue_description !== "string" || issue_description.trim().length < 5) {
      return res.status(400).json({ error: '"issue_description" must be at least 5 characters.' });
    }

    const invoiceModel = require("../models/invoiceModel");
    const invoice = await invoiceModel.findById(invoice_id_int);
    if (!invoice) return res.status(404).json({ error: `Invoice ${invoice_id_int} not found.` });

    const lines = await invoiceLineModel.findByInvoiceId(invoice_id_int);
    const VALID_PRIORITIES = ["low", "medium", "high", "critical"];
    const safeP = VALID_PRIORITIES.includes(priority) ? priority : "medium";
    const folder_reference = generateFolderReference();

    const folder = await savFolderModel.insert({
      folder_reference,
      customer_id: invoice.customer_id,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      issue_description: issue_description.trim(),
      status: "open",
      priority: safeP,
      ai_summary: ai_summary.trim(),
    });

    res.status(201).json({
      ...folder,
      invoice_total: parseFloat(invoice.amount_ttc || 0),
      invoice_status: invoice.status,
      products: lines.map((l) => ({
        label: l.label,
        description: l.description || "",
        quantity: parseFloat(l.quantity),
        unit_price: parseFloat(l.unit_price),
        subtotal: parseFloat(l.subtotal),
        product_state: l.product_state,
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { status, priority } = req.query;
    const folders = await savFolderModel.findAll({ status, priority });
    res.json({ folders, total: folders.length });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const { folder_reference } = req.params;
    if (!FOLDER_REF_RE.test(folder_reference)) {
      return res.status(400).json({ error: "Invalid folder_reference format. Ex: SAV-20260310-A3F2" });
    }
    const folder = await savFolderModel.findByReference(folder_reference);
    if (!folder) return res.status(404).json({ error: `Folder "${folder_reference}" not found.` });

    const lines = folder.invoice_id
      ? await invoiceLineModel.findByInvoiceId(folder.invoice_id)
      : [];
    res.json({ ...folder, products: lines });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { folder_reference } = req.params;
    const { status } = req.body || {};

    if (!FOLDER_REF_RE.test(folder_reference)) {
      return res.status(400).json({ error: "Invalid folder_reference format." });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status.", allowed: VALID_STATUSES });
    }

    const folder = await savFolderModel.updateStatus(folder_reference, status);
    if (!folder) return res.status(404).json({ error: `Folder "${folder_reference}" not found.` });
    res.json(folder);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, updateStatus };
