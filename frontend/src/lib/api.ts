/**
 * API client for the Multi-Agent Travel Planner backend.
 *
 * All functions call the backend FastAPI server.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ─── Types ──────────────────────────────────────────────────────────────

export interface TravelPlanRequest {
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string;
  budget_usd: number;
  travelers: number;
  travel_style: "budget" | "moderate" | "luxury";
  special_requests?: string;
  session_id?: string;
}

export interface Flight {
  airline: string;
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  price_usd: number;
  stops: number;
  duration_hours?: number;
}

export interface Hotel {
  name: string;
  star_rating: number;
  price_per_night_usd: number;
  total_cost_usd: number;
  amenities: string[];
  guest_rating: number;
}

export interface Activity {
  time: string;
  activity: string;
  location: string;
  estimated_cost_usd: number;
  duration_hours: number;
  notes?: string;
}

export interface Meal {
  type: string;
  suggestion: string;
  estimated_cost_usd: number;
}

export interface DayItinerary {
  day: number;
  date: string;
  theme: string;
  weather_forecast: string;
  activities: Activity[];
  meals: Meal[];
  daily_total_usd: number;
}

export interface WeatherInfo {
  summary: string;
  avg_temp_high_c: number;
  avg_temp_low_c: number;
  rainy_days: number;
  packing_tips: string[];
}

export interface ExpenseBreakdown {
  flights_usd: number;
  hotel_usd: number;
  activities_usd: number;
  meals_usd: number;
  transportation_usd: number;
  total_usd: number;
  remaining_budget_usd: number;
}

export interface TravelPlan {
  trip_summary: {
    destination: string;
    dates: { departure: string; return: string };
    duration_nights: number;
    travelers: number;
    travel_style: string;
    total_budget_usd: number;
    estimated_total_usd: number;
  };
  flights: {
    outbound: Flight;
    return: Flight;
  };
  hotel: Hotel;
  weather: WeatherInfo;
  daily_itinerary: DayItinerary[];
  expense_breakdown: ExpenseBreakdown;
}

export interface TravelPlanResponse {
  session_id: string;
  status: string;
  plan: TravelPlan;
  raw_response?: string;
  warnings: string[];
}

export interface ChatResponse {
  session_id: string;
  status: string;
  response: string;
  updated_plan?: TravelPlan;
}

export interface AgentCard {
  agent_name: string;
  url: string;
  status: "online" | "offline";
  description?: string;
  card_json?: Record<string, unknown>;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: string;
  source?: string;
  target?: string;
  payload?: unknown;
  duration_ms?: number;
  error?: string;
  agent?: string;
  server?: string;
  tool?: string;
  message?: string;
}

export interface HealthStatus {
  status: string;
  services: Record<string, string>;
}

// ─── API Functions ──────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API Error: ${res.status}`);
  }
  return res.json();
}

/** Create a new travel plan */
export async function createPlan(
  request: TravelPlanRequest
): Promise<TravelPlanResponse> {
  return apiFetch<TravelPlanResponse>("/api/plan", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/** Chat to refine an existing plan */
export async function chatRefine(
  sessionId: string,
  message: string
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, message }),
  });
}

/** Get session information */
export async function getSession(sessionId: string) {
  return apiFetch(`/api/session/${sessionId}`);
}

/** Fetch all agent cards */
export async function getAgentCards(): Promise<AgentCard[]> {
  return apiFetch<AgentCard[]>("/api/agent-cards");
}

/** Get activity logs for a session */
export async function getLogs(
  sessionId: string
): Promise<{ session_id: string; count: number; logs: LogEntry[] }> {
  return apiFetch(`/api/logs/${sessionId}`);
}

/** Check health of all services */
export async function getHealth(): Promise<HealthStatus> {
  return apiFetch<HealthStatus>("/api/health");
}
