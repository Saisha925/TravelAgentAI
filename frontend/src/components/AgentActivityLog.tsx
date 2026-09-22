"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getLogs, type LogEntry } from "@/lib/api";

interface AgentActivityLogProps {
  sessionId: string | null;
  isLoading: boolean;
}

export default function AgentActivityLog({ sessionId, isLoading }: AgentActivityLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await getLogs(sessionId);
      setLogs(data.logs || []);
    } catch {
      // Silently fail on log fetch
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !autoRefresh) return;
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [sessionId, autoRefresh, fetchLogs]);

  // Also fetch when loading state changes
  useEffect(() => {
    if (sessionId && !isLoading) {
      // Fetch once more when loading stops
      setTimeout(fetchLogs, 1000);
    }
  }, [isLoading, sessionId, fetchLogs]);

  const getLogIcon = (type: string) => {
    switch (type) {
      case "a2a_request": return "📤";
      case "a2a_response": return "📥";
      case "mcp_call": return "🔧";
      case "plan_request": return "📋";
      case "plan_completed": return "✅";
      case "plan_error": return "❌";
      case "chat_message": return "💬";
      default: return "📌";
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case "a2a_request": return "#6366f1";
      case "a2a_response": return "#8b5cf6";
      case "mcp_call": return "#06b6d4";
      case "plan_completed": return "#10b981";
      case "plan_error": return "#ef4444";
      default: return "#a0a0c0";
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="activity-log">
      <div className="log-header">
        <div className="log-title">
          <span>🔍</span>
          <h3>Agent Activity</h3>
          <span className="badge badge-info">{logs.length}</span>
        </div>
        <button
          className={`btn btn-sm ${autoRefresh ? "btn-success" : "btn-secondary"}`}
          onClick={() => setAutoRefresh(!autoRefresh)}
        >
          {autoRefresh ? "●" : "○"} Live
        </button>
      </div>

      <div className="log-list">
        {isLoading && logs.length === 0 && (
          <div className="log-loading">
            <div className="spinner" />
            <span>Waiting for agent activity...</span>
          </div>
        )}

        {!isLoading && logs.length === 0 && (
          <div className="log-empty">
            <p>No activity yet. Generate a plan to see A2A and MCP traffic.</p>
          </div>
        )}

        {logs.map((log, i) => (
          <div
            key={log.id || i}
            className="log-entry animate-fade-in"
            style={{ borderLeftColor: getLogColor(log.type) }}
          >
            <div className="log-entry-header">
              <span className="log-icon">{getLogIcon(log.type)}</span>
              <span className="log-type" style={{ color: getLogColor(log.type) }}>
                {log.type.replace(/_/g, " ").toUpperCase()}
              </span>
              <span className="log-time">{formatTimestamp(log.timestamp)}</span>
            </div>

            {/* A2A traffic */}
            {(log.type === "a2a_request" || log.type === "a2a_response") && (
              <div className="log-body">
                <span className="log-route">
                  {log.source} → {log.target}
                </span>
                {log.duration_ms && (
                  <span className="log-duration">{log.duration_ms.toFixed(0)}ms</span>
                )}
                {log.error && <span className="log-error">⚠️ {log.error}</span>}
              </div>
            )}

            {/* MCP calls */}
            {log.type === "mcp_call" && (
              <div className="log-body">
                <span className="log-route">
                  {log.agent} → {log.server}.{log.tool}
                </span>
                {log.duration_ms && (
                  <span className="log-duration">{log.duration_ms.toFixed(0)}ms</span>
                )}
              </div>
            )}

            {/* Events */}
            {log.message && (
              <div className="log-body">
                <span className="log-message">{log.message}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .activity-log {
          display: flex;
          flex-direction: column;
          max-height: 400px;
        }

        .log-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 12px;
        }

        .log-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .log-title h3 {
          font-size: 1rem;
        }

        .log-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .log-loading,
        .log-empty {
          text-align: center;
          padding: 24px;
          color: var(--text-muted);
          font-size: 0.85rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .log-entry {
          padding: 10px 12px;
          background: rgba(99, 102, 241, 0.03);
          border-left: 3px solid var(--border-default);
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          font-size: 0.8rem;
        }

        .log-entry-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .log-icon {
          font-size: 0.9rem;
        }

        .log-type {
          font-weight: 600;
          font-size: 0.7rem;
          letter-spacing: 0.05em;
        }

        .log-time {
          margin-left: auto;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .log-body {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          padding-left: 24px;
        }

        .log-route {
          color: var(--text-secondary);
          font-family: var(--font-mono);
          font-size: 0.75rem;
        }

        .log-duration {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--brand-accent);
          background: rgba(6, 182, 212, 0.1);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .log-error {
          color: var(--brand-danger);
          font-size: 0.75rem;
        }

        .log-message {
          color: var(--text-secondary);
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}
