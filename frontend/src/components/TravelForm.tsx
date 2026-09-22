"use client";

import React, { useState } from "react";
import type { TravelPlanRequest } from "@/lib/api";

interface TravelFormProps {
  onSubmit: (request: TravelPlanRequest) => void;
  isLoading: boolean;
}

export default function TravelForm({ onSubmit, isLoading }: TravelFormProps) {
  const [form, setForm] = useState<TravelPlanRequest>({
    origin: "",
    destination: "",
    departure_date: "",
    return_date: "",
    budget_usd: 2000,
    travelers: 1,
    travel_style: "moderate",
    special_requests: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const update = (field: keyof TravelPlanRequest, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Get tomorrow's date as minimum for departure
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="travel-form">
      <div className="form-header">
        <div className="form-icon">✈️</div>
        <h2>Plan Your Dream Trip</h2>
        <p>Our AI agents will find the best flights, hotels, and create a perfect itinerary</p>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="origin" className="input-label">Origin</label>
          <input
            id="origin"
            type="text"
            className="input-field"
            placeholder="e.g., New York"
            value={form.origin}
            onChange={(e) => update("origin", e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="destination" className="input-label">Destination</label>
          <input
            id="destination"
            type="text"
            className="input-field"
            placeholder="e.g., London"
            value={form.destination}
            onChange={(e) => update("destination", e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="departure" className="input-label">Departure Date</label>
          <input
            id="departure"
            type="date"
            className="input-field"
            min={minDate}
            value={form.departure_date}
            onChange={(e) => update("departure_date", e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="return" className="input-label">Return Date</label>
          <input
            id="return"
            type="date"
            className="input-field"
            min={form.departure_date || minDate}
            value={form.return_date}
            onChange={(e) => update("return_date", e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="budget" className="input-label">
            Budget (USD): ${form.budget_usd.toLocaleString()}
          </label>
          <input
            id="budget"
            type="range"
            className="range-input"
            min={200}
            max={20000}
            step={100}
            value={form.budget_usd}
            onChange={(e) => update("budget_usd", Number(e.target.value))}
          />
          <div className="range-labels">
            <span>$200</span>
            <span>$20,000</span>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="travelers" className="input-label">Travelers</label>
          <input
            id="travelers"
            type="number"
            className="input-field"
            min={1}
            max={10}
            value={form.travelers}
            onChange={(e) => update("travelers", Number(e.target.value))}
          />
        </div>

        <div className="form-group full-width">
          <label htmlFor="style" className="input-label">Travel Style</label>
          <div className="style-selector">
            {(["budget", "moderate", "luxury"] as const).map((style) => (
              <button
                key={style}
                type="button"
                className={`style-btn ${form.travel_style === style ? "active" : ""}`}
                onClick={() => update("travel_style", style)}
              >
                <span className="style-emoji">
                  {style === "budget" ? "🎒" : style === "moderate" ? "🧳" : "💎"}
                </span>
                <span className="style-label">{style.charAt(0).toUpperCase() + style.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="special" className="input-label">Special Requests (Optional)</label>
          <textarea
            id="special"
            className="input-field textarea"
            placeholder="e.g., vegetarian restaurants, avoid early morning flights, interested in art museums..."
            value={form.special_requests}
            onChange={(e) => update("special_requests", e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-lg submit-btn"
        disabled={isLoading || !form.origin || !form.destination || !form.departure_date || !form.return_date}
      >
        {isLoading ? (
          <>
            <div className="spinner" />
            <span>Agents Working...</span>
          </>
        ) : (
          <>
            <span>🚀</span>
            <span>Generate Travel Plan</span>
          </>
        )}
      </button>

      <style jsx>{`
        .travel-form {
          animation: fadeIn 0.5s ease-out;
        }

        .form-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .form-icon {
          font-size: 3rem;
          margin-bottom: 12px;
        }

        .form-header h2 {
          font-size: 1.8rem;
          background: var(--gradient-brand);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }

        .form-header p {
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 28px;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .range-input {
          width: 100%;
          height: 6px;
          appearance: none;
          background: var(--bg-tertiary);
          border-radius: 3px;
          outline: none;
          margin-top: 8px;
        }

        .range-input::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--gradient-brand);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
          transition: transform var(--transition-fast);
        }

        .range-input::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .range-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .style-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .style-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px;
          background: var(--bg-input);
          border: 2px solid var(--border-subtle);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-base);
          font-family: var(--font-sans);
        }

        .style-btn:hover {
          border-color: var(--border-default);
          background: var(--bg-hover);
        }

        .style-btn.active {
          border-color: var(--brand-primary);
          background: rgba(99, 102, 241, 0.1);
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.15);
        }

        .style-emoji {
          font-size: 1.5rem;
        }

        .style-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .style-btn.active .style-label {
          color: var(--text-accent);
        }

        .textarea {
          resize: vertical;
          min-height: 80px;
        }

        .submit-btn {
          width: 100%;
          padding: 18px;
          font-size: 1rem;
        }

        @media (max-width: 640px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          .style-selector {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </form>
  );
}
