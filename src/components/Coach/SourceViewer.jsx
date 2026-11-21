import { useEffect } from 'react';

export default function SourceViewer({ open, source, chunks, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !source) return null;

  return (
    <div className="source-viewer-backdrop" onClick={onClose}>
      <div className="source-viewer" onClick={e => e.stopPropagation()}>
        <div className="source-viewer-header">
          <div className="source-viewer-title">
            <span className="source-viewer-label">Source</span>
            <span className="source-viewer-name" title={source.name}>{source.name}</span>
          </div>
          <button className="source-viewer-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="source-viewer-body">
          {chunks.length === 0 ? (
            <div className="source-viewer-empty">No retrieved snippets for this source.</div>
          ) : (
            chunks.map((c, i) => (
              <blockquote key={i} className="source-snippet">
                {c.text}
              </blockquote>
            ))
          )}
        </div>

        {source.url && (
          <div className="source-viewer-footer">
            <a
              className="source-viewer-link"
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View original article &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
