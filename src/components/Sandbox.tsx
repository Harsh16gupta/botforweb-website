import React, { useState, useEffect, useRef } from 'react';

interface FileItem {
  name: string;
  type: string;
  size: string;
  description: string;
  questions: string[];
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  citation?: {
    file: string;
    section: string;
  };
  isLoading?: boolean;
}

const mockFiles: FileItem[] = [
  {
    name: 'api_v1_reference.md',
    type: 'Markdown',
    size: '24 KB',
    description: 'Documentation for authenticating API calls and rate-limiting rules.',
    questions: ['How do I authenticate API requests?']
  },
  {
    name: 'installation_guide.pdf',
    type: 'PDF Document',
    size: '1.2 MB',
    description: 'Guide for embedding the widget script on web platforms.',
    questions: ['What is the installation process?']
  },
  {
    name: 'billing_faq.md',
    type: 'Markdown',
    size: '15 KB',
    description: 'Details on monthly vs annual pricing models, RLS guarantees, and features.',
    questions: ['How does billing work?']
  }
];

const presetAnswers: { [key: string]: { text: string; file: string; section: string } } = {
  'How do I authenticate API requests?': {
    text: 'To authenticate your API requests, include your project API key in the `Authorization` header as a Bearer token. \n\nExample:\n`Authorization: Bearer bfw_live_948af7...`\n\nEnsure this token is kept secure and never exposed in client-side code repositories.',
    file: 'api_v1_reference.md',
    section: 'Section 1.1: Authentication Headers'
  },
  'What is the installation process?': {
    text: 'You can install the chatbot on any website using a single line of JavaScript. Simply copy your widget script from the dashboard and paste it before the closing `</body>` tag of your website layout:\n\n```html\n<script src="https://cdn.botforweb.com/widget.js" data-id="proj_48f8a" async></script>\n```\n\nThe widget will automatically appear in the bottom-right corner of your site.',
    file: 'installation_guide.pdf',
    section: 'Section 3.1: HTML Widget Embed'
  },
  'How does billing work?': {
    text: 'botforweb offers two primary subscription tiers: Starter ($199/mo) and Growth ($799/mo). \n\nSelecting annual billing applies a 20% discount automatically (reducing rates to $159/mo and $639/mo respectively). Every project benefits from enterprise PostgreSQL Row-Level Security (RLS) guarantees, ensuring complete data isolation regardless of your plan.',
    file: 'billing_faq.md',
    section: 'Section 2.4: Subscription Tiers'
  }
};

export default function Sandbox() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! I am the botforweb documentation assistant, grounded strictly in the files listed on the left.\n\nClick one of the suggested questions below, or ask your own question to test my zero-hallucination engine.'
    }
  ]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(mockFiles[0]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom inside the chat container (prevents window jumping)
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({
        top: chatHistoryRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  // XSS Prevention: Safe HTML Escaping
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const handlePresetQuestion = (question: string) => {
    if (isTyping) return;
    
    // Add user message
    const userMsgId = 'user-' + Date.now();
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text: question }]);
    
    // Trigger bot typing
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      const data = presetAnswers[question];
      if (data) {
        setMessages(prev => [
          ...prev,
          {
            id: 'bot-' + Date.now(),
            sender: 'bot',
            text: data.text,
            citation: { file: data.file, section: data.section }
          }
        ]);
      }
    }, 900);
  };

  const handleCustomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const rawInput = inputValue;
    const escapedInput = escapeHtml(rawInput);
    setInputValue('');

    // Add user message
    const userMsgId = 'user-' + Date.now();
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text: escapedInput }]);

    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      
      // Simple Keyword Grounded Matching
      const lowerInput = rawInput.toLowerCase();
      let matchedQuestion = '';

      if (lowerInput.includes('auth') || lowerInput.includes('key') || lowerInput.includes('token') || lowerInput.includes('secret')) {
        matchedQuestion = 'How do I authenticate API requests?';
      } else if (lowerInput.includes('install') || lowerInput.includes('embed') || lowerInput.includes('script') || lowerInput.includes('widget') || lowerInput.includes('js')) {
        matchedQuestion = 'What is the installation process?';
      } else if (lowerInput.includes('bill') || lowerInput.includes('price') || lowerInput.includes('cost') || lowerInput.includes('starter') || lowerInput.includes('growth')) {
        matchedQuestion = 'How does billing work?';
      }

      if (matchedQuestion && presetAnswers[matchedQuestion]) {
        const data = presetAnswers[matchedQuestion];
        setMessages(prev => [
          ...prev,
          {
            id: 'bot-' + Date.now(),
            sender: 'bot',
            text: data.text,
            citation: { file: data.file, section: data.section }
          }
        ]);
      } else {
        // Zero Hallucination Fallback
        setMessages(prev => [
          ...prev,
          {
            id: 'bot-' + Date.now(),
            sender: 'bot',
            text: `I'm sorry, but I cannot find information regarding "${escapedInput}" in the uploaded knowledge base (\`api_v1_reference.md\`, \`installation_guide.pdf\`, \`billing_faq.md\`). \n\nAs a zero-hallucination RAG assistant, I only answer questions strictly grounded in the provided sources. Please rephrase or query details on authentication, installation, or pricing.`,
            citation: { file: 'Fact-Checked', section: 'Source validation rejected (Groundedness score: 0.00)' }
          }
        ]);
      }
    }, 1100);
  };

  return (
    <div className="sandbox-panel-container">
      {/* Self-contained premium styles for Sandbox React Island */}
      <style dangerouslySetInnerHTML={{ __html: `
        .sandbox-panel-container {
          display: grid;
          grid-template-columns: 360px 1fr;
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          height: 580px;
          font-family: var(--font-sans);
        }

        /* Left side - files */
        .sandbox-files-pane {
          background-color: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .pane-title-area {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          background-color: #ffffff;
        }

        .pane-title-area h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .pane-title-area p {
          font-size: 0.775rem;
          color: var(--text-muted);
          margin-bottom: 0;
        }

        .files-list {
          flex-grow: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sandbox-file-item {
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
        }

        .sandbox-file-item:hover {
          border-color: var(--border-hover);
          transform: translateY(-1px);
        }

        .sandbox-file-item.selected {
          border-color: var(--accent);
          box-shadow: 0 0 0 1px var(--accent);
          background-color: var(--accent-soft);
        }

        .file-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.375rem;
        }

        .file-title-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--text-primary);
        }

        .file-chk-icon {
          color: var(--success);
          width: 14px;
          height: 14px;
        }

        .file-badge-type {
          font-size: 0.7rem;
          padding: 0.125rem 0.375rem;
          background-color: var(--bg-tertiary);
          color: var(--text-secondary);
          border-radius: var(--radius-sm);
        }

        .file-desc-text {
          font-size: 0.775rem;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-bottom: 0.5rem;
        }

        .file-size-row {
          font-size: 0.7rem;
          color: var(--text-light);
          display: flex;
          justify-content: space-between;
        }

        /* Right side - Chat */
        .sandbox-chat-pane {
          display: flex;
          flex-direction: column;
          background-color: #ffffff;
          overflow: hidden;
        }

        .chat-header-area {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .chat-logo-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .chat-avatar-circle {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background-color: var(--accent);
          color: #ffffff;
          font-weight: 700;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-sm);
        }

        .chat-title-group h4 {
          font-size: 0.925rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .chat-title-group p {
          font-size: 0.725rem;
          color: var(--success);
          margin-bottom: 0;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          background-color: var(--success);
          border-radius: var(--radius-full);
        }

        .sandbox-chat-history {
          flex-grow: 1;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          background-color: var(--bg-secondary);
        }

        .chat-msg-row {
          display: flex;
          flex-direction: column;
          max-width: 80%;
        }

        .chat-msg-row.user {
          align-self: flex-end;
        }

        .chat-msg-row.bot {
          align-self: flex-start;
        }

        .chat-bubble-content {
          padding: 0.9rem 1.15rem;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          line-height: 1.5;
          white-space: pre-line;
          word-break: break-word;
        }

        .chat-msg-row.user .chat-bubble-content {
          background-color: var(--accent);
          color: #ffffff;
          border-bottom-right-radius: 2px;
          box-shadow: 0 4px 10px rgba(79, 70, 229, 0.15);
        }

        .chat-msg-row.bot .chat-bubble-content {
          background-color: #ffffff;
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          border-bottom-left-radius: 2px;
          box-shadow: var(--shadow-sm);
        }

        .chat-msg-row.bot code {
          background-color: var(--bg-secondary);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 0.775rem;
          color: #d63384;
        }

        .chat-msg-row.bot pre {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 0.75rem;
          margin-top: 0.75rem;
          overflow-x: auto;
        }

        .chat-msg-row.bot pre code {
          background-color: transparent;
          padding: 0;
          color: var(--text-primary);
        }

        .citation-box {
          margin-top: 0.5rem;
          padding: 0.5rem 0.75rem;
          border: 1px solid rgba(79, 70, 229, 0.15);
          background-color: var(--accent-soft);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          color: var(--accent);
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .citation-box.fallback {
          border-color: #f87171;
          background-color: #fef2f2;
          color: #ef4444;
        }

        .citation-box svg {
          flex-shrink: 0;
        }

        /* Typing Indicator dots */
        .typing-dots {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0.5rem 0.25rem;
        }

        .typing-dot {
          width: 6px;
          height: 6px;
          background-color: var(--text-light);
          border-radius: var(--radius-full);
          animation: dotBounce 1.4s infinite ease-in-out both;
        }

        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        /* Suggestions row */
        .chat-suggestions-area {
          padding: 0.75rem 1.5rem;
          border-top: 1px solid var(--border-color);
          background-color: #ffffff;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .suggestion-chip {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          padding: 0.4rem 0.85rem;
          font-size: 0.775rem;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
          text-align: left;
        }

        .suggestion-chip:hover {
          border-color: var(--accent);
          color: var(--accent);
          background-color: var(--accent-soft);
          transform: translateY(-0.5px);
        }

        /* Form Footer */
        .chat-input-form {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-color);
          background-color: #ffffff;
          display: flex;
          gap: 0.75rem;
        }

        .chat-text-input {
          flex-grow: 1;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          outline: none;
          transition: all var(--transition-fast);
        }

        .chat-text-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-light);
        }

        .chat-send-btn {
          background-color: var(--accent);
          color: #ffffff;
          border: none;
          border-radius: var(--radius-md);
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }

        .chat-send-btn:hover {
          background-color: var(--accent-hover);
        }

        .chat-send-btn:disabled {
          background-color: var(--border-color);
          cursor: not-allowed;
        }

        /* Responsive */
        @media (max-width: 820px) {
          .sandbox-panel-container {
            grid-template-columns: 1fr;
            height: auto;
          }

          .sandbox-files-pane {
            height: 220px;
            border-right: none;
            border-bottom: 1px solid var(--border-color);
          }

          .sandbox-chat-pane {
            height: 420px;
          }
        }
      ` }} />

      {/* Left Pane: Knowledge Base */}
      <div className="sandbox-files-pane" id="sandboxFiles">
        <div className="pane-title-area">
          <h3>Knowledge Base</h3>
          <p>Click a file to see its pre-indexed questions</p>
        </div>
        
        <div className="files-list">
          {mockFiles.map(file => (
            <button
              key={file.name}
              className={`sandbox-file-item ${selectedFile?.name === file.name ? 'selected' : ''}`}
              onClick={() => setSelectedFile(file)}
              id={`file-${file.name.replace(/\./g, '-')}`}
            >
              <div className="file-header-row">
                <div className="file-title-group">
                  <svg className="file-chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{file.name}</span>
                </div>
                <span className="file-badge-type">{file.type}</span>
              </div>
              <p className="file-desc-text">{file.description}</p>
              <div className="file-size-row">
                <span>Size: {file.size}</span>
                <span>Status: Indexed</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Pane: Chat Window */}
      <div className="sandbox-chat-pane" id="sandboxChat">
        <div className="chat-header-area">
          <div className="chat-logo-group">
            <div className="chat-avatar-circle">AI</div>
            <div className="chat-title-group">
              <h4>Documentation Assistant</h4>
              <p>
                <span className="status-dot"></span>
                Zero-Hallucination active
              </p>
            </div>
          </div>
        </div>

        {/* Chat History */}
        <div ref={chatHistoryRef} className="sandbox-chat-history">
          {messages.map(msg => (
            <div key={msg.id} className={`chat-msg-row ${msg.sender === 'user' ? 'user' : 'bot'}`}>
              <div className="chat-bubble-content">
                {msg.text}
              </div>
              {msg.citation && (
                <div className={`citation-box ${msg.citation.file === 'Fact-Checked' ? 'fallback' : ''}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    {msg.citation.file === 'Fact-Checked' ? (
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    ) : (
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    )}
                  </svg>
                  <span>
                    {msg.citation.file === 'Fact-Checked' ? (
                      <strong>{msg.citation.section}</strong>
                    ) : (
                      <>Grounded Answer: <strong>{msg.citation.file}</strong> ({msg.citation.section})</>
                    )}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="chat-msg-row bot">
              <div className="chat-bubble-content">
                <div className="typing-dots">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Suggestions Row */}
        <div className="chat-suggestions-area">
          {selectedFile ? (
            selectedFile.questions.map(q => (
              <button
                key={q}
                className="suggestion-chip"
                onClick={() => handlePresetQuestion(q)}
                disabled={isTyping}
              >
                {q}
              </button>
            ))
          ) : (
            mockFiles.map(file => 
              file.questions.map(q => (
                <button
                  key={q}
                  className="suggestion-chip"
                  onClick={() => handlePresetQuestion(q)}
                  disabled={isTyping}
                >
                  {q}
                </button>
              ))
            )
          )}
        </div>

        {/* User Input Form */}
        <form className="chat-input-form" onSubmit={handleCustomSubmit} id="chatInputForm">
          <input
            type="text"
            className="chat-text-input"
            placeholder="Type your own question (e.g. 'how to auth')..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isTyping}
            id="chatInputField"
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!inputValue.trim() || isTyping}
            aria-label="Send message"
            id="chatSendButton"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
