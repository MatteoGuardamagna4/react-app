export default function SourceReferences({ sources }) {
  if (!sources || sources.length === 0) return null;
  const unique = [...new Set(sources.filter(Boolean))];

  return (
    <div className="source-references">
      <span className="source-label">Sources:</span>
      {unique.map((s, i) => (
        <span key={i} className="source-chip" title={s}>{s}</span>
      ))}
    </div>
  );
}
