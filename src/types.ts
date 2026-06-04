export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  origin: string;
  destination: string;
  duration: string;
  stops: number;
}

export interface Hotel {
  id: string;
  name: string;
  pricePerNight: number;
  rating: number;
  address: string;
  description: string;
  amenities: string[];
}

export interface WeatherDay {
  day: string;
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: string;
  description: string;
  packingAdvice: string;
}

export interface ItineraryActivity {
  id: string;
  title: string;
  time: string;
  duration: string;
  location: string;
  description: string;
  cost: number;
  category: "Transport" | "Hotel" | "Food" | "Sightseeing" | "Shopping" | "Adventure" | "Relaxation";
  coords: { x: number; y: number }; // Simulated map coordinates (percentages or canvas-based relative pixels)
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  theme: string;
  activities: ItineraryActivity[];
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: "Flights" | "Hotels" | "Food" | "Activities" | "Other";
  date: string;
}

export interface TravelPlan {
  id: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  travelStyle: string;
  interests: string[];
  flights: Flight[];
  selectedFlight: Flight | null;
  hotels: Hotel[];
  selectedHotel: Hotel | null;
  weather: WeatherDay[];
  itinerary: ItineraryDay[];
  expenses: ExpenseItem[];
}

export interface AgentLog {
  id: string;
  timestamp: string;
  agentName: "Itinerary Planner Agent" | "Flight Search Agent" | "Hotel Recommendation Agent" | "Weather Information Agent" | "System Coordinator";
  targetAgentOrMcp?: "Flight Search Agent" | "Hotel Recommendation Agent" | "Weather Information Agent" | "Travel API MCP" | "Weather MCP" | "Maps MCP" | "Itinerary Planner Agent";
  type: "info" | "tool_call" | "tool_response" | "collaboration" | "system";
  message: string;
  payload?: string; // Pretty-formatted JSON or data info
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
