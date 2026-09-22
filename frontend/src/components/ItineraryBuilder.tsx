"use client";

import React from "react";
import type { TravelPlan, DayItinerary } from "@/lib/api";

interface ItineraryBuilderProps {
  plan: TravelPlan;
}

export default function ItineraryBuilder({ plan }: ItineraryBuilderProps) {
  if (!plan?.daily_itinerary?.length) {
    return (
      <div className="empty-state">
        <p>No itinerary data available</p>
      </div>
    );
  }

  return (
    <div className="itinerary-builder" id="itinerary-content">
      {/* Trip Header */}
      <div className="trip-header glass-card">
        <div className="trip-header-content">
          <h2>{plan.trip_summary?.destination || "Your Trip"}</h2>
          <div className="trip-meta">
            <span className="meta-item">
              📅 {plan.trip_summary?.dates?.departure} → {plan.trip_summary?.dates?.return}
            </span>
            <span className="meta-item">
              🌙 {plan.trip_summary?.duration_nights} nights
            </span>
            <span className="meta-item">
              👥 {plan.trip_summary?.travelers} traveler{plan.trip_summary?.travelers > 1 ? "s" : ""}
            </span>
            <span className="badge badge-info">
              {plan.trip_summary?.travel_style}
            </span>
          </div>
        </div>
      </div>

      {/* Flights */}
      {plan.flights && (
        <div className="section">
          <h3 className="section-title">✈️ Flights</h3>
          <div className="flights-grid">
            <FlightCard flight={plan.flights.outbound} label="Outbound" />
            <FlightCard flight={plan.flights.return} label="Return" />
          </div>
        </div>
      )}

      {/* Hotel */}
      {plan.hotel && (
        <div className="section">
          <h3 className="section-title">🏨 Accommodation</h3>
          <div className="glass-card hotel-card">
            <div className="hotel-header">
              <h4>{plan.hotel.name}</h4>
              <div className="hotel-stars">
                {"⭐".repeat(plan.hotel.star_rating || 0)}
              </div>
            </div>
            <div className="hotel-details">
              <span>${plan.hotel.price_per_night_usd}/night</span>
              <span>Total: ${plan.hotel.total_cost_usd}</span>
              <span>Rating: {plan.hotel.guest_rating}/10</span>
            </div>
            {plan.hotel.amenities?.length > 0 && (
              <div className="amenities">
                {plan.hotel.amenities.map((a, i) => (
                  <span key={i} className="badge badge-info">{a}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weather */}
      {plan.weather && (
        <div className="section">
          <h3 className="section-title">🌤️ Weather</h3>
          <div className="glass-card weather-card">
            <p className="weather-summary">{plan.weather.summary}</p>
            <div className="weather-stats">
              <div className="stat">
                <span className="stat-value">{plan.weather.avg_temp_high_c}°C</span>
                <span className="stat-label">Avg High</span>
              </div>
              <div className="stat">
                <span className="stat-value">{plan.weather.avg_temp_low_c}°C</span>
                <span className="stat-label">Avg Low</span>
              </div>
              <div className="stat">
                <span className="stat-value">{plan.weather.rainy_days}</span>
                <span className="stat-label">Rainy Days</span>
              </div>
            </div>
            {plan.weather.packing_tips?.length > 0 && (
              <div className="packing-tips">
                <strong>🧳 Packing Tips:</strong>
                <ul>
                  {plan.weather.packing_tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily Itinerary */}
      <div className="section">
        <h3 className="section-title">📋 Day-by-Day Itinerary</h3>
        <div className="days-list stagger-children">
          {plan.daily_itinerary.map((day) => (
            <DayCard key={day.day} day={day} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .itinerary-builder {
          display: flex;
          flex-direction: column;
          gap: 24px;
          animation: fadeIn 0.5s ease-out;
        }

        .trip-header {
          background: var(--gradient-card);
          border-left: 4px solid var(--brand-primary);
        }

        .trip-header h2 {
          font-size: 1.5rem;
          margin-bottom: 12px;
          background: var(--gradient-brand);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .trip-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
        }

        .meta-item {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .section-title {
          font-size: 1.1rem;
          margin-bottom: 12px;
          color: var(--text-primary);
        }

        .flights-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .hotel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .hotel-header h4 {
          font-size: 1.1rem;
        }

        .hotel-details {
          display: flex;
          gap: 20px;
          color: var(--text-secondary);
          font-size: 0.85rem;
          margin-bottom: 12px;
        }

        .amenities {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .weather-summary {
          margin-bottom: 16px;
          font-size: 0.9rem;
        }

        .weather-stats {
          display: flex;
          gap: 24px;
          margin-bottom: 16px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-value {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--brand-accent);
        }

        .stat-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .packing-tips {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .packing-tips ul {
          list-style: none;
          padding-left: 8px;
          margin-top: 8px;
        }

        .packing-tips li::before {
          content: "•";
          color: var(--brand-primary);
          margin-right: 8px;
        }

        .empty-state {
          text-align: center;
          padding: 48px;
          color: var(--text-muted);
        }

        @media (max-width: 640px) {
          .flights-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────

function FlightCard({ flight, label }: { flight: any; label: string }) {
  if (!flight) return null;
  return (
    <div className="glass-card flight-card">
      <div className="flight-label">{label}</div>
      <div className="flight-airline">{flight.airline}</div>
      <div className="flight-number">{flight.flight_number}</div>
      <div className="flight-times">
        <span>{flight.departure_time}</span>
        <span className="flight-arrow">→</span>
        <span>{flight.arrival_time}</span>
      </div>
      <div className="flight-price">${flight.price_usd}</div>
      {flight.stops > 0 && (
        <span className="badge badge-warning">{flight.stops} stop{flight.stops > 1 ? "s" : ""}</span>
      )}
      {flight.stops === 0 && <span className="badge badge-success">Direct</span>}

      <style jsx>{`
        .flight-card {
          text-align: center;
        }
        .flight-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .flight-airline {
          font-weight: 600;
          margin-bottom: 2px;
        }
        .flight-number {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 12px;
        }
        .flight-times {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .flight-arrow {
          color: var(--brand-primary);
        }
        .flight-price {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--brand-success);
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
}

function DayCard({ day }: { day: DayItinerary }) {
  return (
    <div className="glass-card day-card">
      <div className="day-header">
        <div className="day-number">Day {day.day}</div>
        <div className="day-info">
          <h4>{day.theme}</h4>
          <div className="day-meta">
            <span>📅 {day.date}</span>
            {day.weather_forecast && <span>🌤️ {day.weather_forecast}</span>}
          </div>
        </div>
        <div className="day-cost">${day.daily_total_usd}</div>
      </div>

      {day.activities?.length > 0 && (
        <div className="activities-list">
          {day.activities.map((act, i) => (
            <div key={i} className="activity-item">
              <span className="activity-time">{act.time}</span>
              <div className="activity-content">
                <strong>{act.activity}</strong>
                <span className="activity-location">📍 {act.location}</span>
                {act.notes && <span className="activity-notes">{act.notes}</span>}
              </div>
              <span className="activity-cost">
                {act.estimated_cost_usd > 0 ? `$${act.estimated_cost_usd}` : "Free"}
              </span>
            </div>
          ))}
        </div>
      )}

      {day.meals?.length > 0 && (
        <div className="meals-section">
          <div className="meals-title">🍽️ Dining</div>
          {day.meals.map((meal, i) => (
            <div key={i} className="meal-item">
              <span className="meal-type">{meal.type}</span>
              <span className="meal-suggestion">{meal.suggestion}</span>
              <span className="meal-cost">${meal.estimated_cost_usd}</span>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .day-card {
          border-left: 3px solid var(--brand-primary);
        }
        .day-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }
        .day-number {
          background: var(--gradient-brand);
          color: white;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .day-info {
          flex: 1;
        }
        .day-info h4 {
          font-size: 1rem;
          margin-bottom: 4px;
        }
        .day-meta {
          display: flex;
          gap: 12px;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .day-cost {
          font-weight: 700;
          color: var(--brand-accent);
          font-size: 1rem;
        }
        .activities-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }
        .activity-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 10px;
          background: rgba(99, 102, 241, 0.04);
          border-radius: var(--radius-sm);
        }
        .activity-time {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--brand-primary);
          min-width: 50px;
          font-family: var(--font-mono);
        }
        .activity-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .activity-content strong {
          font-size: 0.9rem;
        }
        .activity-location {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .activity-notes {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-style: italic;
        }
        .activity-cost {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--brand-success);
          white-space: nowrap;
        }
        .meals-section {
          border-top: 1px solid var(--border-subtle);
          padding-top: 12px;
        }
        .meals-title {
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--text-secondary);
        }
        .meal-item {
          display: flex;
          gap: 12px;
          padding: 6px 0;
          font-size: 0.85rem;
        }
        .meal-type {
          font-weight: 600;
          text-transform: capitalize;
          min-width: 60px;
          color: var(--text-secondary);
        }
        .meal-suggestion {
          flex: 1;
          color: var(--text-secondary);
        }
        .meal-cost {
          color: var(--brand-success);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
