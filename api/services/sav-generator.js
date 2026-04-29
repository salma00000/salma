'use strict';

/**
 * Génère un identifiant unique pour un ticket SAV.
 * Format : SAV-YYYYMMDD-XXXX  (ex: SAV-20260310-A3F2)
 */
function generateTicketId() {
  const now   = new Date();
  const date  = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand  = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SAV-${date}-${rand}`;
}

/**
 * Construit l'objet JSON complet d'un ticket SAV.
 *
 * @param {object} facture   - Ligne facture depuis la DB
 * @param {Array}  articles  - Articles de la facture depuis la DB
 * @param {string} issue_description - Description du problème signalé
 * @param {string} priority  - low | medium | high | critical
 * @param {string} ai_summary - Résumé analytique de l'IA
 * @returns {object} ticket SAV structuré
 */
function buildSavTicket({ facture, articles, issue_description, priority = 'medium', ai_summary = '' }) {
  const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

  return {
    ticket_id:        generateTicketId(),
    invoice_number:   facture.numero_facture,
    customer_name:    facture.client_nom,
    customer_email:   facture.client_email  || '',
    order_date:       facture.date_creation,
    invoice_status:   facture.statut,
    invoice_total:    parseFloat(facture.montant_total || 0),
    products:         articles.map(a => ({
      name:        a.nom_article,
      description: a.description || '',
      quantity:    parseFloat(a.quantite),
      unit_price:  parseFloat(a.prix_unitaire),
      subtotal:    parseFloat(a.sous_total),
    })),
    issue_description: issue_description.trim(),
    status:           'open',
    priority:         VALID_PRIORITIES.includes(priority) ? priority : 'medium',
    ai_summary:       ai_summary.trim(),
    created_at:       new Date().toISOString(),
  };
}

module.exports = { generateTicketId, buildSavTicket };
