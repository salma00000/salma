import ReactMarkdown from 'react-markdown';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div style={{ ...styles.row, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && <div style={styles.avatar}>AI</div>}
      <div
        style={{
          ...styles.bubble,
          background: isUser ? 'var(--color-user-bubble)' : 'var(--color-assistant-bubble)',
          color: isUser ? '#f4f4f5' : 'var(--color-text)',
          borderRadius: isUser
            ? '14px 14px 4px 14px'
            : '14px 14px 14px 4px',
          boxShadow: isUser ? 'none' : 'var(--shadow)',
          border: isUser ? 'none' : '1px solid var(--color-border)',
        }}
      >
        {isUser ? (
          <p style={styles.userText}>{message.content}</p>
        ) : (
          <div className="markdown-content">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && <div style={{ ...styles.avatar, background: 'var(--color-accent)', color: '#18181b' }}>C</div>}
    </div>
  );
}

const styles = {
  row: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    marginBottom: '12px',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#3f3f46',
    color: '#a1a1aa',
    fontSize: '10px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontFamily: 'var(--font-mono)',
  },
  bubble: {
    maxWidth: '72%',
    padding: '10px 14px',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  userText: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};
