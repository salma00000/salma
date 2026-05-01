import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({
  sessionId,
  messages,
  loading,
  sending,
  isArchived,
  onSend,
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (!sending) inputRef.current?.focus();
  }, [sending]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!sessionId) {
    return (
      <main style={styles.main}>
        <div style={styles.empty}>
          <p style={styles.emptyTitle}>SAV Assistant</p>
          <p style={styles.emptyHint}>
            Créez ou sélectionnez une conversation dans la barre latérale.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      {isArchived && (
        <div style={styles.archivedBanner}>
          ✅ Ticket créé — Cette conversation est archivée
        </div>
      )}

      <div style={styles.messageList}>
        {loading && <p style={styles.hint}>Chargement des messages…</p>}
        {!loading && messages.length === 0 && (
          <p style={styles.hint}>
            Commencez par décrire le problème du client.
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {sending && (
          <div style={styles.typingRow}>
            <div style={styles.typingBubble}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} style={styles.inputBar}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isArchived
              ? "Conversation archivée"
              : "Saisissez votre message… (Entrée pour envoyer)"
          }
          disabled={sending || isArchived}
          rows={1}
          style={{
            ...styles.textarea,
            opacity: isArchived ? 0.5 : 1,
          }}
        />
        <button
          type="submit"
          disabled={sending || !input.trim() || isArchived}
          style={{
            ...styles.sendBtn,
            opacity: sending || !input.trim() || isArchived ? 0.4 : 1,
          }}
        >
          Envoyer
        </button>
      </form>
    </main>
  );
}

const styles = {
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
    background: "var(--color-bg)",
  },
  archivedBanner: {
    background: "#f0fdf4",
    border: "1px solid #86efac",
    color: "#15803d",
    fontSize: "13px",
    fontWeight: 600,
    padding: "10px 20px",
    flexShrink: 0,
  },
  messageList: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 32px",
  },
  hint: {
    fontSize: "13px",
    color: "var(--color-text-muted)",
    textAlign: "center",
    padding: "40px 0",
  },
  typingRow: {
    display: "flex",
    justifyContent: "flex-start",
    marginBottom: "12px",
  },
  typingBubble: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "14px 14px 14px 4px",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    boxShadow: "var(--shadow)",
  },
  inputBar: {
    display: "flex",
    gap: "10px",
    padding: "16px 24px",
    borderTop: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: "var(--radius)",
    border: "1.5px solid var(--color-border)",
    fontSize: "14px",
    resize: "none",
    background: "var(--color-bg)",
    color: "var(--color-text)",
    lineHeight: "1.5",
    maxHeight: "120px",
    overflowY: "auto",
    transition: "border-color .15s",
  },
  sendBtn: {
    padding: "10px 20px",
    background: "var(--color-accent)",
    color: "#18181b",
    fontWeight: 700,
    fontSize: "13px",
    borderRadius: "var(--radius)",
    transition: "background .15s, opacity .15s",
    flexShrink: 0,
    alignSelf: "flex-end",
  },
  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  emptyTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--color-text-muted)",
  },
  emptyHint: {
    fontSize: "14px",
    color: "var(--color-text-muted)",
    maxWidth: "300px",
    textAlign: "center",
  },
};
