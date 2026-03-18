import { useState, useRef, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../../context/AppContext.jsx';
import { sendChatMessage } from '../../services/api.js';

export default function CoachTab() {
  const { chatMessages, userData, clusterInfo, workoutPlan, quizCompleted } = useAppState();
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

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || sending) return;

    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { role: 'user', content: msg } });
    setInput('');
    setSending(true);

    try {
      const history = chatMessages.map(m => ({ role: m.role, content: m.content }));
      const { reply } = await sendChatMessage({
        message: msg,
        history,
        userData,
        clusterInfo,
        plan: workoutPlan,
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
          <div key={i} className={`chat-bubble ${msg.role} fade-in`}>
            {msg.content}
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
