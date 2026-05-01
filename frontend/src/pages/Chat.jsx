import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import DraftPanel from "../components/DraftPanel";
import {
  getMessages,
  sendMessage as apiSendMessage,
  createConversation,
} from "../api/conversations";
import { v4 as uuidv4 } from "uuid";

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSessionId = searchParams.get("session");

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshSidebar, setRefreshSidebar] = useState(0);
  const [isArchived, setIsArchived] = useState(false);

  // ── Mobile / drawer state ─────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [draftUpdated, setDraftUpdated] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastExiting, setToastExiting] = useState(false);
  const toastTimerRef = useRef(null);

  // Track viewport width
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Close drawers when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setLeftOpen(false);
      setRightOpen(false);
    }
  }, [isMobile]);

  // Auto-dismiss toast after 4 s
  useEffect(() => {
    if (showToast) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setToastExiting(true);
        setTimeout(() => {
          setShowToast(false);
          setToastExiting(false);
        }, 260);
      }, 4000);
    }
    return () => clearTimeout(toastTimerRef.current);
  }, [showToast]);

  // Reset on session change
  useEffect(() => {
    setIsArchived(false);
    setDraftUpdated(false);
    setShowToast(false);
    setToastExiting(false);
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    getMessages(activeSessionId)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoadingMessages(false));
  }, [activeSessionId]);

  const handleNewConversation = async () => {
    const sessionId = uuidv4();
    try {
      await createConversation(sessionId);
      setSearchParams({ session: sessionId });
      setMessages([]);
      setRefreshSidebar((n) => n + 1);
      if (isMobile) setLeftOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (content) => {
    if (sending || !activeSessionId) return;
    setSending(true);

    const optimisticUser = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const { userMessage, assistantMessage } = await apiSendMessage(
        activeSessionId,
        content,
      );
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        userMessage,
        assistantMessage,
      ]);
      setRefreshSidebar((n) => n + 1);
    } catch (err) {
      console.error(err);
      const errorMsg =
        err?.response?.data?.error ||
        "Une erreur est survenue. Veuillez réessayer.";
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        optimisticUser,
        { id: `error-${Date.now()}`, role: "error", content: errorMsg },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSelectSession = (sessionId) => {
    setSearchParams({ session: sessionId });
    if (isMobile) setLeftOpen(false);
  };

  const handleDeleteSession = (deletedId) => {
    if (activeSessionId === deletedId) setSearchParams({});
    setRefreshSidebar((n) => n + 1);
  };

  // Called by DraftPanel when polling detects a change
  const handleDraftUpdate = useCallback(() => {
    if (!rightOpen) {
      setDraftUpdated(true);
      if (isMobile) {
        setToastExiting(false);
        setShowToast(true);
      }
    }
  }, [rightOpen, isMobile]);

  const handleOpenRight = () => {
    setRightOpen(true);
    setDraftUpdated(false);
    setShowToast(false);
  };

  const handleCloseDrawers = () => {
    setLeftOpen(false);
    setRightOpen(false);
  };

  return (
    <div style={styles.layout}>
      {/* Backdrop for mobile drawers */}
      {isMobile && (leftOpen || rightOpen) && (
        <div className="drawer-overlay" onClick={handleCloseDrawers} />
      )}

      <Sidebar
        activeSessionId={activeSessionId}
        onSelect={handleSelectSession}
        onNew={handleNewConversation}
        onDelete={handleDeleteSession}
        refresh={refreshSidebar}
        isMobile={isMobile}
        isOpen={leftOpen}
        onClose={() => setLeftOpen(false)}
      />

      <ChatWindow
        sessionId={activeSessionId}
        messages={messages}
        loading={loadingMessages}
        sending={sending}
        isArchived={isArchived}
        onSend={handleSend}
        isMobile={isMobile}
        onOpenLeft={() => setLeftOpen(true)}
        onOpenRight={handleOpenRight}
        draftUpdated={draftUpdated}
      />

      <DraftPanel
        sessionId={activeSessionId}
        onStatusChange={(s) => setIsArchived(s === "ticket_created")}
        onDraftUpdate={handleDraftUpdate}
        isMobile={isMobile}
        isOpen={rightOpen}
        onClose={() => setRightOpen(false)}
        draftUpdated={draftUpdated}
      />

      {/* Draft-update toast (mobile only) */}
      {isMobile && showToast && activeSessionId && (
        <button
          className={toastExiting ? "toast-exit" : "toast-enter"}
          style={styles.toast}
          onClick={handleOpenRight}
        >
          <span style={styles.toastIcon}>📋</span>
          <span style={styles.toastText}>Dossier mis à jour</span>
          <span style={styles.toastCta}>Voir →</span>
        </button>
      )}
    </div>
  );
}

const styles = {
  layout: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    background: "var(--color-bg)",
  },
  toast: {
    position: "fixed",
    bottom: "84px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 60,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "var(--color-sidebar)",
    border: "1.5px solid var(--color-accent)",
    borderRadius: "40px",
    padding: "11px 22px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,158,11,0.25)",
    whiteSpace: "nowrap",
  },
  toastIcon: { fontSize: "16px" },
  toastText: { color: "var(--color-sidebar-text-bright)" },
  toastCta: {
    color: "var(--color-accent)",
    fontSize: "13px",
    fontWeight: 700,
    marginLeft: "4px",
  },
};
