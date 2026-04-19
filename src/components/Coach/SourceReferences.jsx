function normalizeSource(s) {
  if (!s) return null;
  if (typeof s === 'string') return { name: s, url: null };
  if (s.name) return { name: s.name, url: s.url || null };
  return null;
}

export default function SourceReferences({ sources, onOpenSource }) {
  if (!sources || sources.length === 0) return null;

  const seen = new Set();
  const unique = sources
    .map(normalizeSource)
    .filter(Boolean)
    .filter(s => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });

  if (unique.length === 0) return null;

  return (
    <div className="source-references">
      <span className="source-label">Sources:</span>
      {unique.map((s, i) => (
        <button
          key={s.name}
          type="button"
          className="source-chip"
          title={s.name}
          onClick={() => onOpenSource && onOpenSource(i + 1)}
        >
          [{i + 1}] {s.name}
        </button>
      ))}
    </div>
  );
}
