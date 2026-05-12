function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'À l\'instant';
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `il y a ${days} j`;
}

export default function ConversationItem({ conversation, active, onClick, onDelete }) {
  const { label, updated_at, draft } = conversation;
  const isArchived = draft?.status === 'folder_created';

  return (
    <div
      onClick={onClick}
      style={{
        ...styles.item,
        background: active ? 'var(--color-sidebar-active)' : 'transparent',
        borderLeft: active ? '2px solid var(--color-accent)' : '2px solid transparent',
      }}
    >
      <div style={styles.top}>
        <span style={styles.label}>{label}</span>
        {isArchived && <span style={styles.archivedBadge}>✓</span>}
        <button
          onClick={onDelete}
          style={styles.deleteBtn}
          title="Supprimer"
        >
          ×
        </button>
      </div>
      <span style={styles.time}>{timeAgo(updated_at)}</span>
    </div>
  );
}

const styles = {
  item: {
    padding: '9px 10px',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    marginBottom: '2px',
    transition: 'background .15s',
    paddingLeft: '12px',
  },
  top: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  label: {
    flex: 1,
    fontSize: '13px',
    color: 'var(--color-sidebar-text-bright)',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.1px',
  },
  archivedBadge: {
    fontSize: '11px',
    color: '#22c55e',
    flexShrink: 0,
  },
  deleteBtn: {
    flexShrink: 0,
    background: 'none',
    color: '#52525b',
    fontSize: '16px',
    lineHeight: 1,
    padding: '0 2px',
    borderRadius: '3px',
    transition: 'color .15s',
    opacity: 0.6,
  },
  time: {
    fontSize: '11px',
    color: '#52525b',
    fontFamily: 'var(--font-mono)',
    display: 'block',
    marginTop: '3px',
  },
};
