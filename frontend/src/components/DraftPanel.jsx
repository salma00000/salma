import { useEffect, useState, useRef } from "react";
import { getConversation } from "../api/conversations";

export default function DraftPanel({
  sessionId,
  onStatusChange,
  onDraftUpdate,
  isMobile,
  isOpen,
  onClose,
  draftUpdated,
}) {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);
  const prevDraftRef = useRef(null);

  useEffect(() => {
    if (!sessionId) {
      setDraft(null);
      prevDraftRef.current = null;
      return;
    }

    const fetchDraft = () => {
      getConversation(sessionId)
        .then((session) => {
          const newDraft = session.draft;
          // Detect changes after initial load
          if (
            prevDraftRef.current !== null &&
            JSON.stringify(prevDraftRef.current) !== JSON.stringify(newDraft)
          ) {
            onDraftUpdate?.();
          }
          prevDraftRef.current = newDraft;
          setDraft(newDraft);
          if (newDraft?.status === "ticket_created") {
            clearInterval(intervalRef.current);
            onStatusChange?.("ticket_created");
          }
        })
        .catch(console.error);
    };

    setLoading(true);
    getConversation(sessionId)
      .then((session) => {
        setDraft(session.draft);
        prevDraftRef.current = session.draft; // seed reference — no update fired
        setLoading(false);
        onStatusChange?.(session.draft?.status ?? "draft");
        if (session.draft?.status !== "ticket_created") {
          intervalRef.current = setInterval(fetchDraft, 3000);
        }
      })
      .catch(() => setLoading(false));

    return () => clearInterval(intervalRef.current);
  }, [sessionId]);

  // ── Panel style: fixed right drawer on mobile ─────────────────
  const panelStyle = {
    ...styles.panel,
    ...(isMobile
      ? {
          position: "fixed",
          right: 0,
          top: 0,
          height: "100vh",
          zIndex: 50,
          width: "min(320px, 92vw)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: isOpen ? "-6px 0 40px rgba(0,0,0,0.2)" : "none",
        }
      : {}),
  };

  const titleStyle = {
    ...styles.title,
    ...(draftUpdated && !isMobile ? {} : {}),
  };

  const emptyContent = (label) => (
    <aside style={panelStyle}>
      <div style={styles.titleRow}>
        <h2 style={titleStyle}>Aperçu du dossier</h2>
        {isMobile && (
          <button style={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        )}
      </div>
      <p style={styles.empty} className="pulse">
        {label}
      </p>
    </aside>
  );

  if (!sessionId) return emptyContent("Sélectionnez une conversation.");
  if (loading) return emptyContent("Chargement…");

  const isEmpty =
    !draft ||
    (!draft.customer?.name &&
      !draft.purchase?.invoice_id &&
      !draft.issue?.type);

  if (isEmpty) return emptyContent("En attente des informations…");

  const warrantyUnder = draft.purchase?.under_warranty;

  return (
    <aside style={panelStyle}>
      <div style={styles.titleRow}>
        <h2
          style={titleStyle}
          className={draftUpdated && !isMobile ? "draft-title-flash" : ""}
        >
          Aperçu du dossier
          {draftUpdated && !isMobile && (
            <span style={styles.desktopDot} className="notif-dot-enter" />
          )}
        </h2>
        {isMobile && (
          <button style={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        )}
      </div>

      {draft.status === "ticket_created" && (
        <div style={styles.ticketBadge}>✅ Dossier créé</div>
      )}

      {/* Client */}
      <Section title="Client">
        <Field label="Nom" value={draft.customer?.name} />
        <Field label="E-mail" value={draft.customer?.email} mono />
        <Field label="Téléphone" value={draft.customer?.phone} mono />
        <Field label="Fidélité" value={draft.customer?.loyalty_tier} />
      </Section>

      {/* Produit */}
      <Section title="Produit">
        <Field label="Désignation" value={draft.product?.label} />
        <Field label="Marque" value={draft.product?.brand} />
        <Field label="SKU" value={draft.product?.sku} mono />
      </Section>

      {/* Achat */}
      <Section title="Achat">
        <Field label="N° Facture" value={draft.purchase?.invoice_id} mono />
        <Field label="Date" value={draft.purchase?.date} />
        <Field label="Magasin" value={draft.purchase?.store} />
        {warrantyUnder !== null && warrantyUnder !== undefined && (
          <div style={{ marginTop: "6px" }}>
            <span
              style={{
                ...styles.warrantyBadge,
                background: warrantyUnder ? "#f0fdf4" : "#fefce8",
                color: warrantyUnder ? "#15803d" : "#92400e",
                borderColor: warrantyUnder ? "#86efac" : "#fcd34d",
              }}
            >
              {warrantyUnder ? "✅ Sous garantie" : "⚠️ Hors garantie"}
            </span>
          </div>
        )}
      </Section>

      {/* Panne */}
      <Section title="Panne">
        <Field label="Type" value={draft.issue?.type} />
        <Field label="Description" value={draft.issue?.description} multiline />
      </Section>

      {/* Warnings */}
      {draft.warnings?.length > 0 && (
        <Section title="Alertes">
          {draft.warnings.map((w, i) => (
            <div key={i} style={styles.warningRow}>
              ⚠️ {w}
            </div>
          ))}
        </Section>
      )}

      {/* Missing fields */}
      {draft.missing_fields?.length > 0 && (
        <Section title="Champs manquants">
          <div style={styles.chipsRow}>
            {draft.missing_fields.map((f, i) => (
              <span key={i} style={styles.chip}>
                {f}
              </span>
            ))}
          </div>
        </Section>
      )}
    </aside>
  );
}

function Section({ title, children }) {
  return (
    <div style={sStyles.section}>
      <p style={sStyles.sectionTitle}>{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value, mono, multiline }) {
  if (!value) return null;
  return (
    <div style={sStyles.field}>
      <span style={sStyles.fieldLabel}>{label}</span>
      <span
        style={{
          ...sStyles.fieldValue,
          fontFamily: mono ? "var(--font-mono)" : "var(--font-ui)",
          fontSize: mono ? "12px" : "13px",
          whiteSpace: multiline ? "pre-wrap" : "nowrap",
          overflow: multiline ? "visible" : "hidden",
          textOverflow: multiline ? "clip" : "ellipsis",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const styles = {
  panel: {
    width: "320px",
    flexShrink: 0,
    background: "var(--color-surface)",
    borderLeft: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflowY: "auto",
    padding: "20px 16px",
    gap: "0",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
    minHeight: "24px",
  },
  title: {
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  desktopDot: {
    display: "inline-block",
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "var(--color-accent)",
    boxShadow: "0 0 6px rgba(45, 212, 191, 0.8)",
    flexShrink: 0,
  },
  closeBtn: {
    background: "transparent",
    color: "var(--color-text-muted)",
    fontSize: "15px",
    padding: "4px 8px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--color-border)",
    cursor: "pointer",
    lineHeight: 1,
  },
  empty: {
    fontSize: "13px",
    color: "var(--color-text-muted)",
    textAlign: "center",
    marginTop: "60px",
    fontStyle: "italic",
  },
  ticketBadge: {
    background: "#f0fdf4",
    border: "1px solid #86efac",
    color: "#15803d",
    fontSize: "12px",
    fontWeight: 600,
    padding: "6px 10px",
    borderRadius: "var(--radius)",
    marginBottom: "16px",
    textAlign: "center",
  },
  warrantyBadge: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: "20px",
    border: "1px solid",
  },
  warningRow: {
    fontSize: "12px",
    padding: "6px 8px",
    background: "var(--color-warning)",
    border: "1px solid var(--color-warning-border)",
    borderRadius: "var(--radius)",
    marginBottom: "4px",
    color: "#92400e",
  },
  chipsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
  },
  chip: {
    fontSize: "11px",
    padding: "3px 8px",
    background: "#f4f4f5",
    border: "1px solid var(--color-border)",
    borderRadius: "20px",
    color: "var(--color-text-muted)",
    fontFamily: "var(--font-mono)",
  },
};

const sStyles = {
  section: {
    marginBottom: "16px",
    paddingBottom: "16px",
    borderBottom: "1px solid var(--color-border)",
  },
  sectionTitle: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "8px",
  },
  field: {
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
    marginBottom: "5px",
  },
  fieldLabel: {
    fontSize: "11px",
    color: "var(--color-text-muted)",
    flexShrink: 0,
    width: "72px",
    textAlign: "right",
  },
  fieldValue: {
    flex: 1,
    fontSize: "13px",
    color: "var(--color-text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};
