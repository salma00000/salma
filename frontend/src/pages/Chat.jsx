import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const activeSessionId = searchParams.get("session");

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshSidebar, setRefreshSidebar] = useState(0);
  const [isArchived, setIsArchived] = useState(false);

  // Reset archived state when switching sessions
  useEffect(() => {
    setIsArchived(false);
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (content) => {
    if (sending || !activeSessionId) return;
    setSending(true);

    // Optimistic: show user message immediately
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
      // Replace optimistic message with real one + append assistant reply
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        userMessage,
        assistantMessage,
      ]);
      setRefreshSidebar((n) => n + 1);
    } catch (err) {
      console.error(err);
      // Replace optimistic message with error bubble
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
  };

  const handleDeleteSession = (deletedId) => {
    if (activeSessionId === deletedId) setSearchParams({});
    setRefreshSidebar((n) => n + 1);
  };

  return (
    <div style={styles.layout}>
      <Sidebar
        activeSessionId={activeSessionId}
        onSelect={handleSelectSession}
        onNew={handleNewConversation}
        onDelete={handleDeleteSession}
        refresh={refreshSidebar}
      />
      <ChatWindow
        sessionId={activeSessionId}
        messages={messages}
        loading={loadingMessages}
        sending={sending}
        isArchived={isArchived}
        onSend={handleSend}
      />
      <DraftPanel
        sessionId={activeSessionId}
        onStatusChange={(s) => setIsArchived(s === "ticket_created")}
      />
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
};
