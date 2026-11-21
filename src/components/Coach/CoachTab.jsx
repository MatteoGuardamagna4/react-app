import { useState, useRef, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../../context/AppContext.jsx';
import { sendChatMessage, uploadPDF } from '../../services/api.js';
import SourceReferences from './SourceReferences.jsx';
import MessageContent from './MessageContent.jsx';
import SourceViewer from './SourceViewer.jsx';

function FeedbackButtons({ messageKey, feedback, onFeedback }) {
  const current = feedback[messageKey];
  return (
    <div className="feedback-row">
      <button
        className={`feedback-btn ${current === 'up' ? 'active-up' : ''}`}
        onClick={() => onFeedback(messageKey, current === 'up' ? null : 'up')}
        title="Helpful"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
        </svg>
      </button>
      <button
        className={`feedback-btn ${current === 'down' ? 'active-down' : ''}`}
        onClick={() => onFeedback(messageKey, current === 'down' ? null : 'down')}
        title="Not helpful"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
          <path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>
        </svg>
      </button>
    </div>
  );
}

function PDFUploadButton() {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus(null);

    try {
      const result = await uploadPDF(file, sourceUrl.trim() || undefined);
      setStatus({ ok: true, text: `Indexed "${result.filename}" (${result.chunks} chunks)` });
      setSourceUrl('');
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="pdf-upload-area">
      <input
        className="pdf-url-input"
        type="url"
        placeholder="Optional: source URL (e.g. https://...)"
        value={sourceUrl}
        onChange={e => setSourceUrl(e.target.value)}
        disabled={uploading}
      />
      <label className="pdf-upload-btn" title="Upload a PDF to the knowledge base">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          onChange={handleUpload}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        {uploading ? 'Indexing...' : 'Upload PDF'}
      </label>
      {status && (
        <span className={`upload-status ${status.ok ? 'ok' : 'err'}`}>
          {status.text}
        </span>
      )}
    </div>
  );
}

function SessionPicker({ sessions, activeId, onSwitch, onNew, onDelete }) {
  const [open, setOpen] = useState(false);
  const active = sessions.find(s => s.id === activeId);
  const ordered = [...sessions].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="session-picker">
      <button className="session-current" onClick={() => setOpen(o => !o)}>
        <span className="session-current-label">{active ? active.title : 'New chat'}</span>
        <span className="session-caret">{open ? '\u25B4' : '\u25BE'}</span>
      </button>
      <button className="session-new-btn" onClick={() => { onNew(); setOpen(false); }} title="Start a new chat">
        + New chat
      </button>
      {open && (
        <div className="session-dropdown">
          {ordered.length === 0 && (
            <div className="session-empty">No sessions yet</div>
          )}
          {ordered.map(s => (
            <div key={s.id} className={`session-row ${s.id === activeId ? 'active' : ''}`}>
              <button
                className="session-row-title"
                onClick={() => { onSwitch(s.id); setOpen(false); }}
                title={s.title}
              >
                {s.title}
              </button>
              <button
                className="session-delete"
                onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                title="Delete session"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CoachTab() {
  const { chatSessions, activeSessionId, userData, clusterInfo, workoutPlan, quizCompleted, feedback } = useAppState();
  const dispatch = useAppDispatch();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [viewer, setViewer] = useState({ open: false, source: null, chunks: [] });
  const messagesEndRef = useRef(null);

  const openSourceForMessage = (msg, sourceIndex) => {
    const sources = msg.sources || [];
    const chunks = msg.chunks || [];
    const raw = sources[sourceIndex - 1];
    if (!raw) return;
    const source = typeof raw === 'string'
      ? { name: raw, url: null }
      : { name: raw.name, url: raw.url || null };
    const matching = chunks.filter(c => {
      if (typeof c.sourceIndex === 'number') return c.sourceIndex === sourceIndex;
      return c.source === source.name;
    });
    setViewer({ open: true, source, chunks: matching });
  };

  const closeViewer = () => setViewer(v => ({ ...v, open: false }));

  const activeSession = chatSessions.find(s => s.id === activeSessionId) || null;
  const messages = activeSession?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeSessionId]);

  if (!quizCompleted || !workoutPlan) {
    return (
      <div className="tab-content">
        <div className="locked-overlay">
          <div className="locked-icon">LOCKED</div>
          <div className="locked-text">
            Complete the quiz and generate a plan first to unlock the AI Coach.
          </div>
        </div>
      </div>
    );
  }

  const handleFeedback = (messageKey, value) => {
    dispatch({ type: 'SET_FEEDBACK', payload: { key: messageKey, value } });
  };

  const handleNewSession = () => {
    dispatch({ type: 'NEW_SESSION' });
  };

  const handleSwitchSession = (id) => {
    dispatch({ type: 'SWITCH_SESSION', payload: id });
  };

  const handleDeleteSession = (id) => {
    dispatch({ type: 'DELETE_SESSION', payload: id });
  };

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || sending) return;

    const isFirstMessage = messages.length === 0;
    const currentTitle = activeSession?.title;
    const currentSessionId = activeSessionId;

    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { role: 'user', content: msg } });

    // Auto-rename session from first user message
    if (isFirstMessage && currentSessionId && currentTitle === 'New chat') {
      dispatch({
        type: 'RENAME_SESSION',
        payload: { id: currentSessionId, title: msg.slice(0, 40) },
      });
    }

    setInput('');
    setSending(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const sessionFeedbackPrefix = `chat_${currentSessionId || 'none'}_`;
      const feedbackSummary = Object.entries(feedback)
        .filter(([k]) => k.startsWith(sessionFeedbackPrefix))
        .map(([k, v]) => `Message ${k.slice(sessionFeedbackPrefix.length)}: ${v}`)
        .join(', ');
      const { reply, sources, chunks } = await sendChatMessage({
        message: msg,
        history,
        userData,
        clusterInfo,
        plan: workoutPlan,
        feedbackSummary,
      });
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          role: 'assistant',
          content: reply,
          sources: sources || [],
          chunks: chunks || [],
        },
      });
    } catch (e) {
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container" style={{ height: '100%' }}>
      <div style={{ padding: '16px 16px 0' }}>
        <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>AI Coach</span>
          <span className="rag-badge" title="Retrieval-Augmented Generation enabled">RAG</span>
        </div>
        <p className="tab-subtitle">Ask about your plan, nutrition, recovery, or modifications.</p>
        <SessionPicker
          sessions={chatSessions}
          activeId={activeSessionId}
          onSwitch={handleSwitchSession}
          onNew={handleNewSession}
          onDelete={handleDeleteSession}
        />
        <PDFUploadButton />
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>
            Start a conversation with your AI fitness coach.
          </div>
        )}
        {messages.map((msg, i) => {
          const msgKey = `chat_${activeSessionId}_${i}`;
          return (
            <div key={`${activeSessionId}-${i}`} className={`chat-bubble-wrapper ${msg.role}`}>
              <div className={`chat-bubble ${msg.role} fade-in`}>
                {msg.role === 'assistant'
                  ? <MessageContent
                      content={msg.content}
                      sources={msg.sources}
                      chunks={msg.chunks}
                      onOpenSource={(n) => openSourceForMessage(msg, n)}
                    />
                  : msg.content}
              </div>
              {msg.role === 'assistant' && (
                <>
                  <SourceReferences
                    sources={msg.sources}
                    onOpenSource={(n) => openSourceForMessage(msg, n)}
                  />
                  <FeedbackButtons
                    messageKey={msgKey}
                    feedback={feedback}
                    onFeedback={handleFeedback}
                  />
                </>
              )}
            </div>
          );
        })}
        {sending && (
          <div className="chat-bubble assistant" style={{ opacity: 0.6 }}>
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <SourceViewer
        open={viewer.open}
        source={viewer.source}
        chunks={viewer.chunks}
        onClose={closeViewer}
      />

      <div className="chat-input-area">
        <input
          className="chat-input"
          placeholder="Ask your coach..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          className="chat-send"
          onClick={handleSend}
          disabled={!input.trim() || sending}
        >
          &gt;
        </button>
      </div>
    </div>
  );
}
