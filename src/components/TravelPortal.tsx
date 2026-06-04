import React, { useState } from "react";
import { Plane, Calendar, DollarSign, Sparkles, MapPin, Compass } from "lucide-react";

interface TravelPortalProps {
  onGenerate: (data: {
    origin: string;
    destination: string;
    startDate: string;
    endDate: string;
    budget: number;
    travelStyle: string;
    interests: string[];
  }) => void;
  isLoading: boolean;
}

const STYLES = [
  {"name": "Backpacker", "desc": "Value-focused, local eats, hostels & walking tours", "icon": "🎒"},
  {"name": "Balanced", "desc": "Comfortable mid-range stays with mixed experiences", "icon": "✈️"},
  {"name": "Luxury", "desc": "Premium boutique dining, fine suites & private travel", "icon": "💎"},
  {"name": "Adventure", "desc": "High intensity hiking, wildlife excursions & exploring", "icon": "🧗"},
  {"name": "Relaxation", "desc": "Lounge cafes, beach access, wellness spas & retreats", "icon": "🌴"}
];

const INTERESTS = [
  "Food & Dining", "Historical Landmarks", "Nature & Wildlife", "Shopping & Markets",
  "Nightlife & Clubs", "Art & Galleries", "Outdoor Sports", "Local Traditions"
];

export default function TravelPortal({ onGenerate, isLoading }: TravelPortalProps) {
  const [origin, setOrigin] = useState("San Francisco, CA");
  const [destination, setDestination] = useState("Tokyo, Japan");
  const [startDate, setStartDate] = useState("2026-06-15");
  const [endDate, setEndDate] = useState("2026-06-20");
  const [budget, setBudget] = useState(2500);
  const [travelStyle, setTravelStyle] = useState("Balanced");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["Food & Dining", "Historical Landmarks"]);

  const toggleInterest = (item: string) => {
    if (selectedInterests.includes(item)) {
      setSelectedInterests(selectedInterests.filter((x) => x !== item));
    } else {
      setSelectedInterests([...selectedInterests, item]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim() || !startDate || !endDate || budget <= 0) return;
    onGenerate({
      origin,
      destination,
      startDate,
      endDate,
      budget,
      travelStyle,
      interests: selectedInterests,
    });
  };

  return (
    <div className="glass-panel-heavy rounded-2xl p-6 md:p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-gradient(circle_at_10%_10%,_rgba(59,130,246,0.1)_0%,_transparent_50%) pointer-events-none"></div>
      
      <div className="mb-6 relative z-10">
        <div className="flex items-center gap-2 text-blue-400 font-medium mb-1.5">
          <Compass className="h-5 w-5 animate-spin-slow" />
          <span className="text-xs uppercase tracking-[0.15em] font-bold">Multi-Agent Flight, Hotel &amp; Route Synthesis</span>
        </div>
        <h2 className="text-2xl font-light text-white tracking-tight">Configure Your Travel Parameters</h2>
        <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
          Input your travel specifics. Our collaborative agent swarm will synchronize with Travel, Weather, and Maps MCP servers to render a complete optimized itinerary.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Origin */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">From (Origin)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <MapPin className="h-4.5 w-4.5" />
              </span>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                required
                className="w-full pl-11 pr-3 py-3 glass-input rounded-xl placeholder-slate-500 transition-all text-xs font-semibold"
                placeholder="City, Country"
              />
            </div>
          </div>

          {/* Destination */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">To (Destination)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <Plane className="h-4.5 w-4.5 rotate-45" />
              </span>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                className="w-full pl-11 pr-3 py-3 glass-input rounded-xl placeholder-slate-500 transition-all text-xs font-semibold"
                placeholder="City, Country"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Departure Date</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <Calendar className="h-4.5 w-4.5" />
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full pl-11 pr-3 py-3 glass-input rounded-xl transition-all text-xs font-semibold scheme-dark"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Return Date</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <Calendar className="h-4.5 w-4.5" />
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full pl-11 pr-3 py-3 glass-input rounded-xl transition-all text-xs font-semibold scheme-dark"
              />
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Total Budget (USD)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <DollarSign className="h-4.5 w-4.5" />
              </span>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Math.max(100, Number(e.target.value)))}
                required
                className="w-full pl-11 pr-3 py-3 glass-input rounded-xl transition-all text-xs font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Travel Style Grid */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Travel Vibe / Style</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {STYLES.map((style) => (
              <button
                key={style.name}
                type="button"
                onClick={() => setTravelStyle(style.name)}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  travelStyle === style.name
                    ? "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                    : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10"
                }`}
              >
                <span className="text-xl mb-1">{style.icon}</span>
                <span className={`text-xs font-bold ${travelStyle === style.name ? "text-purple-400" : "text-slate-200"}`}>{style.name}</span>
                <span className="text-[10px] text-slate-400 mt-1 leading-normal line-clamp-2">{style.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Interests Selection */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Interests &amp; Activities Focus</label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((item) => {
              const isSelected = selectedInterests.includes(item);
              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => toggleInterest(item)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-500/25"
                      : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/5 hover:border-white/10"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 font-semibold rounded-xl cursor-pointer glass-btn-primary focus:outline-none disabled:opacity-50"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Agents collaborating... Consulted MCPs ...</span>
            </div>
          ) : (
            <>
              <Sparkles className="h-4.5 w-4.5 text-blue-200 animate-pulse" />
              <span>Synthesize Live Agent Travel Plan</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
