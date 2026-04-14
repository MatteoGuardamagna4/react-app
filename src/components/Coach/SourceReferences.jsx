export default function SourceReferences({ sources }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="source-references">
      <span className="source-label">Sources:</span>
      {sources.map((s, i) => (
        <span
          key={i}
          className="source-chip"
          title={`Relevance: ${Math.round(s.score * 100)}%`}
        >
          {s.source} &rsaquo; {s.section}
        </span>
      ))}
    </div>
  );
}
