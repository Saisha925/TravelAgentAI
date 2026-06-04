import React, { useState } from "react";
import TravelPortal from "./components/TravelPortal";
import ItineraryBuilder from "./components/ItineraryBuilder";
import ExpenseDashboard from "./components/ExpenseDashboard";
import AgentConsole from "./components/AgentConsole";
import TravelChat from "./components/TravelChat";
import { TravelPlan, AgentLog, ChatMessage, Flight, Hotel } from "./types";
import {
  Compass,
  Plane,
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  Cloud,
  ChevronLeft,
  ArrowRightLeft,
  Star,
  Info,
  Building2,
  Sparkles,
  RefreshCw,
} from "lucide-react";

export default function App() {
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Layout tabs
  const [mainTab, setMainTab] = useState<"itinerary" | "expenses" | "stays">("itinerary");
  const [sidebarTab, setSidebarTab] = useState<"chat" | "console">("chat");

  // Onboarding generation
  const handleGeneratePlan = async (inputs: {
    origin: string;
    destination: string;
    startDate: string;
    endDate: string;
    budget: number;
    travelStyle: string;
    interests: string[];
  }) => {
    setIsGenerating(true);
    setErrorMsg(null);
    setTravelPlan(null);
    setLogs([]);
    setChatHistory([]);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Collaborative swarm failed to formulate travel plan.");
      }

      setTravelPlan(data.travelPlan);
      setLogs(data.logs);

      // Initialize chat with greeting
      const greetMsg: ChatMessage = {
        id: "greet-1",
        role: "assistant",
        content: `Greetings! I am your Itinerary Planning Agent.

I've successfully collaborated with our Flight Search, Hotel Recommendation, and Weather Information Agents to craft an optimized ${inputs.travelStyle} travel experience to **${inputs.destination}**.

Here is what we arranged:
- **Flight recommendation**: ${data.travelPlan.selectedFlight?.airline || "Lufthansa"}
- **Hotel stays**: ${data.travelPlan.selectedHotel?.name || "Boutique stays"}
- **Itinerary Timeline**: Optimized sequential travel paths mapped with Maps MCP.

Feel free to ask me to make updates, add activities or adjust the flights!`,
        timestamp: new Date().toISOString(),
      };
      setChatHistory([greetMsg]);
      setMainTab("itinerary");
      setSidebarTab("chat");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred during travel design.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Chat message submission
  const handleSendMessage = async (text: string) => {
    if (!travelPlan || isChatting) return;

    // Append local user bubble
    const userMsg: ChatMessage = {
      id: "msg-" + Math.random().toString(36).substr(2, 9),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setChatHistory((curr) => [...curr, userMsg]);
    setIsChatting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          travelPlan,
          message: text,
          history: [...chatHistory, userMsg],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to sync updates with Itinerary Swarm Agent.");
      }

      // Append assistant's answer
      const aiReply: ChatMessage = {
        id: "msg-" + Math.random().toString(36).substr(2, 9),
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toISOString(),
      };
      setChatHistory((curr) => [...curr, aiReply]);

      // If physical changes occurred
      if (data.updatedPlan) {
        setTravelPlan(data.updatedPlan);
      }

      // Append trace logs to console
      if (data.agentLogs && data.agentLogs.length > 0) {
        setLogs((curr) => [...curr, ...data.agentLogs]);
      }
    } catch (err: any) {
      console.error(err);
      const errReply: ChatMessage = {
        id: "msg-err",
        role: "assistant",
        content: `Error details: ${err.message || "Apologies, but the agents failed to finalize these updates."}`,
        timestamp: new Date().toISOString(),
      };
      setChatHistory((curr) => [...curr, errReply]);
    } finally {
      setIsChatting(false);
    }
  };

  // Swapping flights/hotels manually inside stays/flights tabs
  const handleSelectFlight = (flight: Flight) => {
    if (!travelPlan) return;

    const updatedExpenses = travelPlan.expenses.map((exp) => {
      if (exp.category === "Flights") {
        return {
          ...exp,
          title: `Roundtrip flight (${flight.airline} - ${flight.flightNumber})`,
          amount: flight.price,
        };
      }
      return exp;
    });

    const updated = {
      ...travelPlan,
      selectedFlight: flight,
      expenses: updatedExpenses,
    };
    setTravelPlan(updated);

    // Add immediate action log in traceback
    const timestamp = new Date().toISOString();
    setLogs((curr) => [
      ...curr,
      {
        id: "swaplog-" + Math.random().toString(36).substr(2, 9),
        timestamp,
        agentName: "Flight Search Agent",
        targetAgentOrMcp: "Itinerary Planner Agent",
        type: "collaboration",
        message: `Manual Flight choice override registered. Swapped active carrier with ${flight.airline} (${flight.flightNumber}) for $${flight.price} USD. Cost matrices adjusted.`,
      },
    ]);
  };

  const handleSelectHotel = (hotel: Hotel) => {
    if (!travelPlan) return;

    const diffTime = Math.abs(new Date(travelPlan.endDate).getTime() - new Date(travelPlan.startDate).getTime());
    const stayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    const updatedExpenses = travelPlan.expenses.map((exp) => {
      if (exp.category === "Hotels") {
        return {
          ...exp,
          title: `${hotel.name} (${stayDays} nights at $${hotel.pricePerNight})`,
          amount: hotel.pricePerNight * stayDays,
        };
      }
      return exp;
    });

    const updated = {
      ...travelPlan,
      selectedHotel: hotel,
      expenses: updatedExpenses,
    };
    setTravelPlan(updated);

    // Add action log traceback
    const timestamp = new Date().toISOString();
    setLogs((curr) => [
      ...curr,
      {
        id: "swaplog-" + Math.random().toString(36).substr(2, 9),
        timestamp,
        agentName: "Hotel Recommendation Agent",
        targetAgentOrMcp: "Itinerary Planner Agent",
        type: "collaboration",
        message: `Accommodation override received. Stays re-booked with ${hotel.name} ($${hotel.pricePerNight}/night). Balance sheets synchronized.`,
      },
    ]);
  };

  const handleUpdatePlan = (updated: TravelPlan) => {
    setTravelPlan(updated);
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 antialiased relative overflow-x-hidden">
      {/* Background Orbs */}
      <div className="glow-orb top-[10%] left-[5%] bg-blue-500/10"></div>
      <div className="glow-orb bottom-[10%] right-[5%] bg-purple-500/10"></div>

      {/* Visual Navigation Header */}
      <header className="bg-slate-950/40 border-b border-white/10 flex-none sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 border border-white/10">
              <Compass className="h-5.5 w-5.5 animate-spin-slow text-indigo-100" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Multi-Agent Travel Planner</span>
                <span className="hidden sm:inline-block text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-blue-400 uppercase">
                  ADK Core v3
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Flight, Hotel &amp; Optimal Routing Swarms</p>
            </div>
          </div>

          {travelPlan && (
            <button
              onClick={() => {
                setTravelPlan(null);
                setLogs([]);
                setChatHistory([]);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 glass-btn-secondary text-xs font-semibold rounded-lg transition"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to parameters</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 relative z-10">
        {/* Error Alert Box */}
        {errorMsg && (
          <div className="mb-6 bg-red-950/20 border border-red-500/30 text-red-200 p-5 rounded-2xl flex items-start gap-3.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
            <Info className="h-5.5 w-5.5 text-red-400 flex-none mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">System Conflict Encountered</h4>
              <p className="text-xs leading-relaxed text-slate-300">{errorMsg}</p>
            </div>
          </div>
        )}

        {!travelPlan && (
          <div className="max-w-4xl mx-auto space-y-6">
            <TravelPortal onGenerate={handleGeneratePlan} isLoading={isGenerating} />

            {/* Simulated Architecture guidelines cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="glass-panel p-5 rounded-2xl space-y-2">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Plane className="h-4.5 w-4.5 rotate-45" />
                </div>
                <h4 className="font-semibold text-xs text-white">Flight &amp; Hotel Swarms</h4>
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  Subordinate agents retrieve details from Travel API MCP tools matching travel budgets.
                </p>
              </div>

              <div className="glass-panel p-5 rounded-2xl space-y-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Cloud className="h-4.5 w-4.5" />
                </div>
                <h4 className="font-semibold text-xs text-white">Climate Suitability Grid</h4>
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  Weather Information Agent assesses trends from Weather MCP forecasts to layout schedule parameters.
                </p>
              </div>

              <div className="glass-panel p-5 rounded-2xl space-y-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Compass className="h-4.5 w-4.5 animate-spin-slow" />
                </div>
                <h4 className="font-semibold text-xs text-white">Vector Landmarks Map</h4>
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  Maps MCP optimizes relative coordinate geometries to order walking routes sequence.
                </p>
              </div>
            </div>
          </div>
        )}

        {travelPlan && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Main Workspace Tab sections */}
            <div className="lg:col-span-8 space-y-6">
              {/* Tabs list bar */}
              <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setMainTab("itinerary")}
                  className={`flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    mainTab === "itinerary" ? "bg-white/15 text-white border border-white/20 shadow-md" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  Itinerary Planner
                </button>

                <button
                  type="button"
                  onClick={() => setMainTab("stays")}
                  className={`flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    mainTab === "stays" ? "bg-white/15 text-white border border-white/20 shadow-md" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  Flights &amp; Hotels
                </button>

                <button
                  type="button"
                  onClick={() => setMainTab("expenses")}
                  className={`flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    mainTab === "expenses" ? "bg-white/15 text-white border border-white/20 shadow-md" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  Expense Dashboard
                </button>
              </div>

              {/* Render Selected View */}
              {mainTab === "itinerary" && (
                <ItineraryBuilder plan={travelPlan} onUpdatePlan={handleUpdatePlan} />
              )}

              {mainTab === "expenses" && (
                <ExpenseDashboard plan={travelPlan} onUpdatePlan={handleUpdatePlan} />
              )}

              {mainTab === "stays" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Flight Recommendations Selector */}
                  <div className="glass-panel rounded-2xl p-6 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                        <Plane className="h-4.5 w-4.5 rotate-45 text-blue-400" />
                        <span>Collaborative Flight Options</span>
                      </h3>
                      <p className="text-slate-400 text-xs mt-1">
                        Discovered by Flight Search Agent from Travel MCP Server limits. Select another option to update schedules.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {travelPlan.flights.map((flight) => {
                        const isSelected = travelPlan.selectedFlight?.id === flight.id;
                        return (
                          <div
                            key={flight.id}
                            onClick={() => handleSelectFlight(flight)}
                            className={`border rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected
                                ? "bg-blue-500/10 border-blue-500 ring-1 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                                : "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/25"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs text-slate-100">{flight.airline}</span>
                                <span className="text-[10px] font-mono text-slate-400">{flight.flightNumber}</span>
                              </div>
                              <div className="text-xs text-slate-300 font-medium space-y-1">
                                <div className="flex justify-between">
                                  <span>Dep: {flight.departureTime}</span>
                                  <span>{flight.stops === 0 ? "Nonstop" : `${flight.stops} stop`}</span>
                                </div>
                                <div className="text-[11px] text-slate-400">Duration: {flight.duration}</div>
                              </div>
                            </div>
                            <div className="border-t border-white/10 mt-3 pt-2.5 flex justify-between items-center text-xs font-semibold">
                              <span className="text-slate-400">{flight.origin} → {flight.destination}</span>
                              <span className="text-blue-400 font-bold">${flight.price} USD</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Hotel recommendations Selector */}
                  <div className="glass-panel rounded-2xl p-6 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                        <Building2 className="h-4.5 w-4.5 text-purple-400" />
                        <span>Sourced Lodging Proposals</span>
                      </h3>
                      <p className="text-slate-400 text-xs mt-1">
                        Cataloged by Hotel Agent matched against rating clusters. Overrides automatically re-budget lodging metrics.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {travelPlan.hotels.map((hotel) => {
                        const isSelected = travelPlan.selectedHotel?.id === hotel.id;
                        return (
                          <div
                            key={hotel.id}
                            onClick={() => handleSelectHotel(hotel)}
                            className={`border rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected
                                ? "bg-purple-500/10 border-purple-500 ring-1 ring-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.25)]"
                                : "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/25"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex justify-between items-start gap-1">
                                <span className="font-bold text-xs text-white line-clamp-1">{hotel.name}</span>
                                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5 shrink-0">
                                  <Star className="h-3 w-3 fill-amber-400" /> {hotel.rating}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">{hotel.address}</p>
                              <p className="text-[11px] text-slate-300 font-normal leading-relaxed line-clamp-2 pt-1">{hotel.description}</p>
                              <div className="flex flex-wrap gap-1 pt-1.5">
                                {hotel.amenities.map((am) => (
                                  <span key={am} className="text-[9px] font-semibold text-slate-300 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                                    {am}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="border-t border-white/10 mt-3 pt-2.5 flex justify-between items-center text-xs font-bold leading-none">
                              <span className="text-slate-400">Nightly rate:</span>
                              <span className="text-purple-400 font-bold">${hotel.pricePerNight} USD</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Assistant Workspace Panel section */}
            <div className="lg:col-span-4 space-y-6">
              {/* Right Tab controls */}
              <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSidebarTab("chat")}
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    sidebarTab === "chat"
                      ? "bg-white/15 text-white border border-white/20 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Planner Chat
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab("console")}
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    sidebarTab === "console"
                      ? "bg-white/15 text-white border border-white/20 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  ADK Agent Console
                </button>
              </div>

              {sidebarTab === "chat" ? (
                <TravelChat
                  messages={chatHistory}
                  onSendMessage={handleSendMessage}
                  isChatting={isChatting}
                />
              ) : (
                <AgentConsole logs={logs} isGenerating={isGenerating} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
