import { useState, useRef, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../../context/AppContext.jsx';
import { sendChatMessage } from '../../services/api.js';

function FeedbackButtons({ messageIndex, feedback, onFeedback }) {
  const current = feedback[`chat_${messageIndex}`];
  return (
    <div className="feedback-row">
      <button
        className={`feedback-btn ${current === 'up' ? 'active-up' : ''}`}
        onClick={() => onFeedback(messageIndex, current === 'up' ? null : 'up')}
        title="Helpful"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
        </svg>
      </button>
      <button
        className={`feedback-btn ${current === 'down' ? 'active-down' : ''}`}
        onClick={() => onFeedback(messageIndex, current === 'down' ? null : 'down')}
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

export default function CoachTab() {
  const { chatMessages, userData, clusterInfo, workoutPlan, quizCompleted, feedback } = useAppState();
  const dispatch = useAppDispatch();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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

  const handleFeedback = (messageIndex, value) => {
    dispatch({ type: 'SET_FEEDBACK', payload: { key: `chat_${messageIndex}`, value } });
  };

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || sending) return;

    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { role: 'user', content: msg } });
    setInput('');
    setSending(true);

    try {
      const history = chatMessages.map(m => ({ role: m.role, content: m.content }));
      const feedbackSummary = Object.entries(feedback)
        .filter(([k]) => k.startsWith('chat_'))
        .map(([k, v]) => `Message ${k.split('_')[1]}: ${v}`)
        .join(', ');
      const { reply } = await sendChatMessage({
        message: msg,
        history,
        userData,
        clusterInfo,
        plan: workoutPlan,
        feedbackSummary,
      });
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { role: 'assistant', content: reply } });
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
        <div className="tab-header">AI Coach</div>
        <p className="tab-subtitle">Ask about your plan, nutrition, recovery, or modifications.</p>
      </div>

      <div className="chat-messages">
        {chatMessages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>
            Start a conversation with your AI fitness coach.
          </div>
        )}
        {chatMessages.map((msg, i) => (
          <div key={i} className={`chat-bubble-wrapper ${msg.role}`}>
            <div className={`chat-bubble ${msg.role} fade-in`}>
              {msg.content}
            </div>
            {msg.role === 'assistant' && (
              <FeedbackButtons
                messageIndex={i}
                feedback={feedback}
                onFeedback={handleFeedback}
              />
            )}
          </div>
        ))}
        {sending && (
          <div className="chat-bubble assistant" style={{ opacity: 0.6 }}>
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

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
