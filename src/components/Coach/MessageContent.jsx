function normalizeSource(s) {
  if (!s) return null;
  if (typeof s === 'string') return { name: s, url: null };
  if (s.name) return { name: s.name, url: s.url || null };
  return null;
}

const CITATION_RE = /\[(\d+)\]/g;

export default function MessageContent({ content, sources, chunks, onOpenSource }) {
  if (!content) return null;

  const normalized = (sources || []).map(normalizeSource).filter(Boolean);

  if (normalized.length === 0 || !onOpenSource) {
    return <>{content}</>;
  }

  const parts = [];
  let lastIndex = 0;
  let match;

  CITATION_RE.lastIndex = 0;
  while ((match = CITATION_RE.exec(content)) !== null) {
    const [marker, numStr] = match;
    const num = parseInt(numStr, 10);
    const source = normalized[num - 1];

    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    if (source) {
      parts.push(
        <button
          key={`cite-${match.index}`}
          type="button"
          className="inline-citation"
          title={`Open source: ${source.name}`}
          onClick={() => onOpenSource(num)}
        >
          [{num}]
        </button>
      );
    } else {
      parts.push(marker);
    }

    lastIndex = match.index + marker.length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <>{parts.map((p, i) => (typeof p === 'string' ? <span key={i}>{p}</span> : p))}</>;
}
