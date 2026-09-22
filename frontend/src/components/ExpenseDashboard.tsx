"use client";

import React from "react";
import type { ExpenseBreakdown } from "@/lib/api";

interface ExpenseDashboardProps {
  expenses: ExpenseBreakdown;
  budget: number;
}

export default function ExpenseDashboard({ expenses, budget }: ExpenseDashboardProps) {
  if (!expenses) {
    return (
      <div className="empty-state">
        <p>No expense data available</p>
      </div>
    );
  }

  const categories = [
    { label: "Flights", value: expenses.flights_usd, color: "#6366f1", emoji: "✈️" },
    { label: "Hotel", value: expenses.hotel_usd, color: "#8b5cf6", emoji: "🏨" },
    { label: "Activities", value: expenses.activities_usd, color: "#06b6d4", emoji: "🎯" },
    { label: "Meals", value: expenses.meals_usd, color: "#f59e0b", emoji: "🍽️" },
    { label: "Transport", value: expenses.transportation_usd, color: "#10b981", emoji: "🚕" },
  ];

  const total = expenses.total_usd || 0;
  const budgetUsed = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;
  const remaining = expenses.remaining_budget_usd ?? (budget - total);

  return (
    <div className="expense-dashboard">
      <h3 className="section-title">💰 Expense Breakdown</h3>

      {/* Budget Overview */}
      <div className="glass-card budget-overview">
        <div className="budget-row">
          <span>Total Budget</span>
          <span className="budget-amount">${budget.toLocaleString()}</span>
        </div>
        <div className="budget-row">
          <span>Estimated Total</span>
          <span className="budget-amount spent">${total.toLocaleString()}</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${budgetUsed}%`,
              background: budgetUsed > 90
                ? "linear-gradient(90deg, #ef4444, #dc2626)"
                : budgetUsed > 70
                ? "linear-gradient(90deg, #f59e0b, #d97706)"
                : "var(--gradient-brand)",
            }}
          />
        </div>
        <div className="budget-row remaining">
          <span>{remaining >= 0 ? "Remaining" : "Over Budget"}</span>
          <span className={`budget-amount ${remaining >= 0 ? "positive" : "negative"}`}>
            {remaining >= 0 ? `$${remaining.toLocaleString()}` : `-$${Math.abs(remaining).toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="categories">
        {categories.map((cat) => {
          const pct = total > 0 ? (cat.value / total) * 100 : 0;
          return (
            <div key={cat.label} className="category-item">
              <div className="category-header">
                <span className="category-name">
                  {cat.emoji} {cat.label}
                </span>
                <span className="category-value">${cat.value.toLocaleString()}</span>
              </div>
              <div className="category-bar">
                <div
                  className="category-fill"
                  style={{ width: `${pct}%`, backgroundColor: cat.color }}
                />
              </div>
              <span className="category-pct">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>

      {/* Visual Pie (CSS-based) */}
      <div className="chart-container">
        <div
          className="donut-chart"
          style={{
            background: `conic-gradient(
              ${categories
                .map((cat, i) => {
                  const start = categories.slice(0, i).reduce((s, c) => s + (total > 0 ? (c.value / total) * 360 : 0), 0);
                  const end = start + (total > 0 ? (cat.value / total) * 360 : 0);
                  return `${cat.color} ${start}deg ${end}deg`;
                })
                .join(", ")}
            )`,
          }}
        >
          <div className="donut-hole">
            <span className="donut-total">${total.toLocaleString()}</span>
            <span className="donut-label">Total</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .expense-dashboard {
          animation: fadeIn 0.5s ease-out;
        }

        .section-title {
          font-size: 1.1rem;
          margin-bottom: 16px;
        }

        .budget-overview {
          margin-bottom: 20px;
        }

        .budget-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .budget-amount {
          font-weight: 700;
          color: var(--text-primary);
          font-size: 1rem;
        }

        .budget-amount.spent {
          color: var(--brand-accent);
        }

        .budget-amount.positive {
          color: var(--brand-success);
        }

        .budget-amount.negative {
          color: var(--brand-danger);
        }

        .remaining {
          border-top: 1px solid var(--border-subtle);
          margin-top: 8px;
          padding-top: 12px;
        }

        .categories {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 24px;
        }

        .category-item {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 4px 12px;
        }

        .category-header {
          display: flex;
          justify-content: space-between;
          grid-column: 1 / -1;
        }

        .category-name {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .category-value {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .category-bar {
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 3px;
          overflow: hidden;
        }

        .category-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.8s ease-out;
        }

        .category-pct {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-align: right;
        }

        .chart-container {
          display: flex;
          justify-content: center;
          padding: 16px 0;
        }

        .donut-chart {
          width: 160px;
          height: 160px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .donut-hole {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: var(--bg-secondary);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .donut-total {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .donut-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .empty-state {
          text-align: center;
          padding: 32px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
