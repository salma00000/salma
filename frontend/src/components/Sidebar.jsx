import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { listConversations, deleteConversation } from "../api/conversations";
import ConversationItem from "./ConversationItem";

export default function Sidebar({
  activeSessionId,
  onSelect,
  onNew,
  onDelete,
  refresh,
  isMobile,
  isOpen,
  onClose,
}) {
  const { advisor, signOut } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listConversations()
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refresh]);

  const handleLogout = () => {
    signOut();
    navigate("/login");
  };

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("Supprimer cette conversation ?")) return;
    try {
      await deleteConversation(sessionId);
      onDelete(sessionId);
    } catch (err) {
      console.error(err);
    }
  };

  const sidebarStyle = {
    ...styles.sidebar,
    ...(isMobile
      ? {
          position: "fixed",
          left: 0,
          top: 0,
          height: "100vh",
          zIndex: 50,
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: isOpen ? "6px 0 40px rgba(0,0,0,0.45)" : "none",
        }
      : {}),
  };

  return (
    <aside style={sidebarStyle}>
      <div style={styles.header}>
        <div style={styles.logoRow}>
          <span style={styles.logoIcon}>⚙</span>
          <span style={styles.logoText}>SAV Assistant</span>
          {isMobile && (
            <button
              style={styles.closeBtn}
              onClick={onClose}
              aria-label="Fermer"
            >
              ✕
            </button>
          )}
        </div>
        <p style={styles.advisorName}>{advisor?.full_name}</p>
      </div>

      <div style={styles.newBtnWrapper}>
        <button style={styles.newBtn} onClick={onNew}>
          + Nouvelle conversation
        </button>
      </div>

      <nav style={styles.list}>
        {loading && <p style={styles.hint}>Chargement…</p>}
        {!loading && conversations.length === 0 && (
          <p style={styles.hint}>Aucune conversation</p>
        )}
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.session_id}
            conversation={conv}
            active={conv.session_id === activeSessionId}
            onClick={() => onSelect(conv.session_id)}
            onDelete={(e) => handleDelete(e, conv.session_id)}
          />
        ))}
      </nav>

      <div style={styles.footer}>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "280px",
    flexShrink: 0,
    background: "var(--color-sidebar)",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
    borderRight: "1px solid #27272a",
  },
  header: {
    padding: "20px 16px 14px",
    borderBottom: "1px solid #27272a",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  logoIcon: { fontSize: "16px", color: "var(--color-accent)" },
  logoText: {
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--color-sidebar-text-bright)",
    letterSpacing: "-0.2px",
    flex: 1,
  },
  closeBtn: {
    background: "transparent",
    color: "var(--color-sidebar-text)",
    fontSize: "15px",
    padding: "4px 8px",
    borderRadius: "var(--radius)",
    border: "1px solid #3f3f46",
    cursor: "pointer",
    lineHeight: 1,
    marginLeft: "auto",
  },
  advisorName: {
    fontSize: "12px",
    color: "var(--color-sidebar-text)",
    fontFamily: "var(--font-mono)",
    marginTop: "2px",
  },
  newBtnWrapper: { padding: "12px 12px 8px" },
  newBtn: {
    width: "100%",
    padding: "9px 12px",
    background: "var(--color-accent)",
    color: "#18181b",
    fontWeight: 700,
    fontSize: "13px",
    borderRadius: "var(--radius)",
    transition: "background .15s",
    textAlign: "left",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "4px 8px",
  },
  hint: {
    fontSize: "12px",
    color: "var(--color-sidebar-text)",
    padding: "8px 8px",
    fontStyle: "italic",
  },
  footer: {
    padding: "12px",
    borderTop: "1px solid #27272a",
  },
  logoutBtn: {
    width: "100%",
    padding: "8px",
    background: "transparent",
    color: "var(--color-sidebar-text)",
    fontSize: "13px",
    borderRadius: "var(--radius)",
    transition: "background .15s, color .15s",
    border: "1px solid #3f3f46",
  },
};
