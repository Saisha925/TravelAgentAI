"use client";

import React, { useState, useEffect } from "react";
import TravelForm from "@/components/TravelForm";
import ItineraryBuilder from "@/components/ItineraryBuilder";
import ExpenseDashboard from "@/components/ExpenseDashboard";
import ChatAssistant from "@/components/ChatAssistant";
import AgentActivityLog from "@/components/AgentActivityLog";
import PdfExport from "@/components/PdfExport";
import {
  createPlan,
  getHealth,
  getAgentCards,
  type TravelPlanRequest,
  type TravelPlan,
  type TravelPlanResponse,
  type AgentCard,
  type HealthStatus,
} from "@/lib/api";

type MainTab = "form" | "itinerary" | "expenses";
type SideTab = "chat" | "agents";

export default function HomePage() {
  // State
  const [mainTab, setMainTab] = useState<MainTab>("form");
  const [sideTab, setSideTab] = useState<SideTab>("agents");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [agentCards, setAgentCards] = useState<AgentCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch health status on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const h = await getHealth();
        setHealth(h);
      } catch {
        setHealth(null);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch agent cards on mount and periodically
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const cards = await getAgentCards();
        setAgentCards(cards);
      } catch {
        // Backend might not be running yet
      }
    };
    fetchCards();
    const interval = setInterval(fetchCards, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle form submission
  const handleSubmit = async (request: TravelPlanRequest) => {
    setIsLoading(true);
    setError(null);
    setWarnings([]);
    setPlan(null);
    setRawResponse(null);
    setSideTab("agents"); // Show agent activity during generation

    try {
      const response: TravelPlanResponse = await createPlan({
        ...request,
        session_id: sessionId || undefined,
      });

      setSessionId(response.session_id);
      setWarnings(response.warnings || []);

      if (response.plan && Object.keys(response.plan).length > 0) {
        setPlan(response.plan as TravelPlan);
        setMainTab("itinerary");
      } else if (response.raw_response) {
        setRawResponse(response.raw_response);
        setMainTab("itinerary");
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate plan");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle plan update from chat
  const handlePlanUpdate = (updatedPlan: TravelPlan) => {
    setPlan(updatedPlan);
    setMainTab("itinerary");
  };

  const isBackendOnline = health?.status === "ok" || health?.status === "degraded";

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <span className="brand-icon">🌍</span>
            <h1>TravelAgent <span className="brand-ai">AI</span></h1>
          </div>
          <div className="header-right">
            <PdfExport planAvailable={!!plan} />
            <div className="header-status">
              <span
                className={`status-dot ${isBackendOnline ? "online" : "offline"}`}
              />
              <span className="status-text">
                {isBackendOnline ? "System Online" : "Backend Offline"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-layout">
        {/* Left Panel — Main Content */}
        <main className="main-panel">
          {/* Tab Navigation */}
          <div className="tab-nav">
            <button
              className={`tab-btn ${mainTab === "form" ? "active" : ""}`}
              onClick={() => setMainTab("form")}
            >
              ✈️ Plan Trip
            </button>
            <button
              className={`tab-btn ${mainTab === "itinerary" ? "active" : ""}`}
              onClick={() => setMainTab("itinerary")}
              disabled={!plan && !rawResponse}
            >
              📋 Itinerary
            </button>
            <button
              className={`tab-btn ${mainTab === "expenses" ? "active" : ""}`}
              onClick={() => setMainTab("expenses")}
              disabled={!plan?.expense_breakdown}
            >
              💰 Expenses
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-banner glass-card">
              <span>❌</span>
              <p>{error}</p>
              <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="warning-banner glass-card">
              {warnings.map((w, i) => (
                <div key={i} className="warning-item">
                  <span>⚠️</span>
                  <p>{w}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tab Content */}
          <div className="tab-content glass-card">
            {mainTab === "form" && (
              <TravelForm onSubmit={handleSubmit} isLoading={isLoading} />
            )}

            {mainTab === "itinerary" && plan && (
              <ItineraryBuilder plan={plan} />
            )}

            {mainTab === "itinerary" && !plan && rawResponse && (
              <div className="raw-response">
                <h3>Agent Response</h3>
                <pre>{rawResponse}</pre>
              </div>
            )}

            {mainTab === "itinerary" && !plan && !rawResponse && (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <h3>No Itinerary Yet</h3>
                <p>Fill out the travel form to generate your plan.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => setMainTab("form")}
                >
                  Go to Form
                </button>
              </div>
            )}

            {mainTab === "expenses" && plan?.expense_breakdown && (
              <ExpenseDashboard
                expenses={plan.expense_breakdown}
                budget={plan.trip_summary?.total_budget_usd || 0}
              />
            )}
          </div>
        </main>

        {/* Right Panel — Sidebar */}
        <aside className="side-panel">
          <div className="tab-nav">
            <button
              className={`tab-btn ${sideTab === "chat" ? "active" : ""}`}
              onClick={() => setSideTab("chat")}
            >
              💬 Chat
            </button>
            <button
              className={`tab-btn ${sideTab === "agents" ? "active" : ""}`}
              onClick={() => setSideTab("agents")}
            >
              🔍 Agents
            </button>
          </div>

          <div className="side-content glass-card">
            {sideTab === "chat" && (
              <ChatAssistant
                sessionId={sessionId}
                onPlanUpdate={handlePlanUpdate}
              />
            )}

            {sideTab === "agents" && (
              <div className="agents-panel">
                {/* Agent Cards */}
                <div className="agent-cards-section">
                  <h4>Agent Status</h4>
                  <div className="agent-cards-list stagger-children">
                    {agentCards.length > 0 ? (
                      agentCards.map((card) => (
                        <div key={card.agent_name} className="agent-card-item">
                          <span
                            className={`status-dot ${card.status === "online" ? "online" : "offline"}`}
                          />
                          <span className="agent-card-name">
                            {card.agent_name.replace(/_/g, " ")}
                          </span>
                          <span className={`badge badge-${card.status === "online" ? "success" : "danger"}`}>
                            {card.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="no-agents">
                        Start the backend to see agent status.
                      </p>
                    )}
                  </div>
                </div>

                {/* Activity Log */}
                <AgentActivityLog sessionId={sessionId} isLoading={isLoading} />
              </div>
            )}
          </div>
        </aside>
      </div>

      <style jsx>{`
        .app {
          min-height: 100vh;
          position: relative;
          z-index: 1;
        }

        /* ─── Header ─── */
        .app-header {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-subtle);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .header-content {
          max-width: 1440px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand-icon {
          font-size: 1.8rem;
        }

        .header-brand h1 {
          font-size: 1.3rem;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .brand-ai {
          background: var(--gradient-brand);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-status {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .status-dot.online {
          background: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
        }

        .status-dot.offline {
          background: #ef4444;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
        }

        .status-text {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        /* ─── Panels ─── */
        .main-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        .side-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        .tab-content,
        .side-content {
          flex: 1;
        }

        /* ─── Agent Panel ─── */
        .agents-panel {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .agent-cards-section h4 {
          font-size: 0.9rem;
          margin-bottom: 12px;
        }

        .agent-cards-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 8px;
        }

        .agent-card-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(99, 102, 241, 0.04);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
        }

        .agent-card-name {
          flex: 1;
          text-transform: capitalize;
          color: var(--text-secondary);
        }

        .no-agents {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-align: center;
          padding: 12px;
        }

        /* ─── Error/Warning Banners ─── */
        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(239, 68, 68, 0.08) !important;
          border: 1px solid rgba(239, 68, 68, 0.25) !important;
        }

        .error-banner p {
          flex: 1;
          color: #f87171;
          font-size: 0.85rem;
        }

        .warning-banner {
          background: rgba(245, 158, 11, 0.08) !important;
          border: 1px solid rgba(245, 158, 11, 0.25) !important;
        }

        .warning-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .warning-item p {
          color: #fbbf24;
          font-size: 0.85rem;
        }

        /* ─── Empty State ─── */
        .empty-state {
          text-align: center;
          padding: 48px 24px;
        }

        .empty-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin-bottom: 8px;
        }

        .empty-state p {
          margin-bottom: 20px;
        }

        /* ─── Raw Response ─── */
        .raw-response {
          padding: 16px;
        }

        .raw-response h3 {
          margin-bottom: 12px;
        }

        .raw-response pre {
          background: var(--bg-tertiary);
          padding: 16px;
          border-radius: var(--radius-md);
          overflow-x: auto;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--text-secondary);
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 600px;
          overflow-y: auto;
        }

        @media (max-width: 1024px) {
          .main-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
