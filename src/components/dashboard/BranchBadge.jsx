export default function BranchBadge({ name, color, textColor, compact = false }) {
  if (!name && !color) {
    return <span>—</span>;
  }

  return (
    <span
      className={`branch-color-badge ${compact ? 'is-compact' : ''}`}
      style={{
        background: color || '#64748B',
        color: textColor || '#FFFFFF',
      }}
    >
      <span className="branch-color-badge-dot" aria-hidden="true" />
      {name || color}
    </span>
  );
}
