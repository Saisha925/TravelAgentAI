"use client";

import React, { useState, useRef, useEffect } from "react";
import { chatRefine, type ChatResponse } from "@/lib/api";

interface ChatAssistantProps {
  sessionId: string | null;
  onPlanUpdate?: (plan: any) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatAssistant({ sessionId, onPlanUpdate }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response: ChatResponse = await chatRefine(sessionId, userMessage.content);

      const assistantMessage: Message = {
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.updated_plan && onPlanUpdate) {
        onPlanUpdate(response.updated_plan);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error: ${error.message}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-assistant">
      <div className="chat-header">
        <span className="chat-icon">💬</span>
        <h3>Travel Chat</h3>
        {sessionId && (
          <span className="badge badge-success">Connected</span>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>💡 Modify your travel plan through conversation.</p>
            <div className="chat-suggestions">
              <button
                className="suggestion-btn"
                onClick={() => {
                  setInput("Can you find cheaper flights?");
                  inputRef.current?.focus();
                }}
              >
                Find cheaper flights
              </button>
              <button
                className="suggestion-btn"
                onClick={() => {
                  setInput("Add more free activities to the itinerary");
                  inputRef.current?.focus();
                }}
              >
                Add free activities
              </button>
              <button
                className="suggestion-btn"
                onClick={() => {
                  setInput("Change the hotel to something more budget-friendly");
                  inputRef.current?.focus();
                }}
              >
                Budget hotel options
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role}`}>
            <div className="message-avatar">
              {msg.role === "user" ? "👤" : "🤖"}
            </div>
            <div className="message-content">
              <p>{msg.content}</p>
              <span className="message-time">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message message-assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          ref={inputRef}
          type="text"
          className="input-field chat-input"
          placeholder={sessionId ? "Ask about your trip..." : "Generate a plan first"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!sessionId || isLoading}
        />
        <button
          className="btn btn-primary send-btn"
          onClick={handleSend}
          disabled={!sessionId || !input.trim() || isLoading}
        >
          ↑
        </button>
      </div>

      <style jsx>{`
        .chat-assistant {
          display: flex;
          flex-direction: column;
          height: 100%;
          max-height: 600px;
        }

        .chat-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 12px;
        }

        .chat-icon {
          font-size: 1.2rem;
        }

        .chat-header h3 {
          flex: 1;
          font-size: 1rem;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 8px 0;
          min-height: 200px;
        }

        .chat-empty {
          text-align: center;
          padding: 24px;
        }

        .chat-empty p {
          font-size: 0.85rem;
          margin-bottom: 16px;
        }

        .chat-suggestions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .suggestion-btn {
          padding: 8px 16px;
          background: var(--bg-input);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          font-family: var(--font-sans);
        }

        .suggestion-btn:hover {
          border-color: var(--brand-primary);
          color: var(--text-accent);
          background: var(--bg-hover);
        }

        .message {
          display: flex;
          gap: 10px;
          animation: fadeIn 0.3s ease-out;
        }

        .message-user {
          flex-direction: row-reverse;
        }

        .message-avatar {
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .message-content {
          max-width: 85%;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .message-user .message-content {
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.25);
          border-radius: var(--radius-md) var(--radius-md) 4px var(--radius-md);
        }

        .message-assistant .message-content {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md) var(--radius-md) var(--radius-md) 4px;
        }

        .message-content p {
          color: var(--text-primary);
          margin: 0;
          white-space: pre-wrap;
        }

        .message-time {
          display: block;
          font-size: 0.65rem;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 4px;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: var(--text-muted);
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out infinite;
        }

        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
        }

        .chat-input-container {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border-subtle);
        }

        .chat-input {
          flex: 1;
        }

        .send-btn {
          width: 42px;
          height: 42px;
          padding: 0;
          font-size: 1.2rem;
          border-radius: var(--radius-md);
        }
      `}</style>
    </div>
  );
}
