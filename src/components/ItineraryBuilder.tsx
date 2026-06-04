import React, { useState } from "react";
import { ItineraryDay, ItineraryActivity, TravelPlan } from "../types";
import { Calendar, Clock, MapPin, DollarSign, Plus, Trash, Edit3, Compass, Map, ExternalLink } from "lucide-react";
import MapVisualization from "./MapVisualization";

const CATEGORIES: ItineraryActivity["category"][] = [
  "Transport",
  "Hotel",
  "Food",
  "Sightseeing",
  "Shopping",
  "Adventure",
  "Relaxation"
];

interface ItineraryBuilderProps {
  plan: TravelPlan;
  onUpdatePlan: (updated: TravelPlan) => void;
}

export default function ItineraryBuilder({ plan, onUpdatePlan }: ItineraryBuilderProps) {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [editingActivity, setEditingActivity] = useState<ItineraryActivity | null>(null);
  const [editingDayNum, setEditingDayNum] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for adding/editing activities
  const [formTitle, setFormTitle] = useState("");
  const [formTime, setFormTime] = useState("09:00 AM");
  const [formDuration, setFormDuration] = useState("2 hours");
  const [formLocation, setFormLocation] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCost, setFormCost] = useState(0);
  const [formCategory, setFormCategory] = useState<ItineraryActivity["category"]>("Sightseeing");

  const activeDay = plan.itinerary[activeDayIndex];

  // Map visualization coordinates
  const currentActivities = activeDay?.activities || [];

  const handleOpenEdit = (dayNumber: number, act: ItineraryActivity) => {
    setEditingDayNum(dayNumber);
    setEditingActivity(act);
    setFormTitle(act.title);
    setFormTime(act.time);
    setFormDuration(act.duration);
    setFormLocation(act.location);
    setFormDesc(act.description);
    setFormCost(act.cost);
    setFormCategory(act.category);
    setShowAddModal(true);
  };

  const handleOpenAdd = (dayNumber: number) => {
    setEditingDayNum(dayNumber);
    setEditingActivity(null);
    setFormTitle("");
    setFormTime("10:00 AM");
    setFormDuration("1.5 hours");
    setFormLocation("");
    setFormDesc("");
    setFormCost(0);
    setFormCategory("Sightseeing");
    setShowAddModal(true);
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const updatedItinerary = plan.itinerary.map((day) => {
      if (day.dayNumber !== editingDayNum) return day;

      let updatedActivities = [...day.activities];

      if (editingActivity) {
        // Edit existing
        updatedActivities = updatedActivities.map((act) =>
          act.id === editingActivity.id
            ? {
                ...act,
                title: formTitle,
                time: formTime,
                duration: formDuration,
                location: formLocation,
                description: formDesc,
                cost: Number(formCost),
                category: formCategory,
              }
            : act
        );
      } else {
        // Add new
        const newAct: ItineraryActivity = {
          id: "act-" + Math.random().toString(36).substr(2, 9),
          title: formTitle,
          time: formTime,
          duration: formDuration,
          location: formLocation,
          description: formDesc,
          cost: Number(formCost),
          category: formCategory,
          coords: {
            x: 15 + Math.random() * 70,
            y: 15 + Math.random() * 70,
          },
        };
        updatedActivities.push(newAct);
      }

      // Sort activities by time
      return {
        ...day,
        activities: updatedActivities.sort((a, b) => a.time.localeCompare(b.time)),
      };
    });

    // Recalculate expenses
    const updatedExpenses = recalculateExpenses({ ...plan, itinerary: updatedItinerary });

    onUpdatePlan({
      ...plan,
      itinerary: updatedItinerary,
      expenses: updatedExpenses,
    });

    setShowAddModal(false);
    setEditingActivity(null);
  };

  const handleDeleteActivity = (dayNumber: number, actId: string) => {
    const updatedItinerary = plan.itinerary.map((day) => {
      if (day.dayNumber !== dayNumber) return day;
      return {
        ...day,
        activities: day.activities.filter((act) => act.id !== actId),
      };
    });

    const updatedExpenses = recalculateExpenses({ ...plan, itinerary: updatedItinerary });

    onUpdatePlan({
      ...plan,
      itinerary: updatedItinerary,
      expenses: updatedExpenses,
    });
  };

  const recalculateExpenses = (currentPlan: TravelPlan) => {
    const expenses = [];
    if (currentPlan.selectedFlight) {
      expenses.push({
        id: "exp-flight",
        title: `Roundtrip flight (${currentPlan.selectedFlight.airline} - ${currentPlan.selectedFlight.flightNumber})`,
        amount: currentPlan.selectedFlight.price,
        category: "Flights" as const,
        date: currentPlan.startDate,
      });
    }
    if (currentPlan.selectedHotel) {
      const diffTime = Math.abs(new Date(currentPlan.endDate).getTime() - new Date(currentPlan.startDate).getTime());
      const stayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      expenses.push({
        id: "exp-hotel",
        title: `${currentPlan.selectedHotel.name} (${stayDays} nights at $${currentPlan.selectedHotel.pricePerNight})`,
        amount: currentPlan.selectedHotel.pricePerNight * stayDays,
        category: "Hotels" as const,
        date: currentPlan.startDate,
      });
    }

    let actCounter = 1;
    for (const day of currentPlan.itinerary) {
      for (const act of day.activities) {
        if (act.cost > 0) {
          expenses.push({
            id: `exp-act-${actCounter++}`,
            title: act.title,
            amount: act.cost,
            category: "Activities" as const,
            date: day.date,
          });
        }
      }
    }
    return expenses;
  };

  return (
    <div className="space-y-6">
      {/* Visual Header */}
      <div className="glass-panel rounded-2xl p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-400 tracking-wider uppercase">Active Routing Matrix</span>
          <h3 className="text-xl font-semibold mt-1 text-white">Simulated Geographical Itinerary Nodes</h3>
          <p className="text-slate-400 text-xs mt-0.5 max-w-lg leading-relaxed">
            Below is the sequence mapped by Maps MCP. Coordinates indicate relative positioning inside the {plan.destination} grid pattern.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 border border-white/10 rounded-xl text-xs font-mono">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300">Maps MCP Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Day-to-Day Timeline controls and activity lists */}
        <div className="lg:col-span-8 space-y-4">
          {/* Day Navigation Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-custom">
            {plan.itinerary.map((day, idx) => (
              <button
                key={day.dayNumber}
                onClick={() => setActiveDayIndex(idx)}
                className={`flex-none px-4 py-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeDayIndex === idx
                    ? "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/30 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                    : "bg-white/5 text-slate-300 border-white/5 hover:border-white/15 hover:bg-white/10"
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-75 text-purple-300">Day {day.dayNumber}</div>
                <div className="text-xs font-semibold mt-0.5 text-white">{day.date}</div>
              </button>
            ))}
          </div>

          {/* Active Day card */}
          {activeDay && (
            <div className="glass-panel rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div>
                  <h4 className="text-[10px] uppercase font-bold tracking-wider opacity-70 text-slate-400">DAY {activeDay.dayNumber} SUMMARY</h4>
                  <p className="text-lg font-semibold text-white mt-0.5">{activeDay.theme}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenAdd(activeDay.dayNumber)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-pink-400 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/25 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Activity</span>
                </button>
              </div>

              {/* List of Activities */}
              <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
                {currentActivities.length === 0 ? (
                  <p className="text-slate-400 text-xs italic pl-8 py-3">No activities planned for today. Click &apos;Add Activity&apos; to schedule some.</p>
                ) : (
                  currentActivities.map((act) => {
                    // Category Tag Styling
                    const getCategoryTheme = (cat: string) => {
                      switch (cat) {
                        case "Food":
                          return "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        case "Adventure":
                          return "bg-rose-500/10 text-rose-400 border-rose-500/20";
                        case "Relaxation":
                          return "bg-teal-500/10 text-teal-400 border-teal-500/20";
                        case "Sightseeing":
                          return "bg-violet-500/10 text-violet-400 border-violet-500/20";
                        case "Shopping":
                          return "bg-sky-500/10 text-sky-400 border-sky-500/20";
                        case "Transport":
                          return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                        default:
                          return "bg-slate-500/10 text-slate-300 border-slate-500/20";
                      }
                    };

                    return (
                      <div key={act.id} className="relative pl-9 group">
                        {/* Bullet index node */}
                        <div className="absolute left-[8px] top-1.5 h-[16px] w-[16px] rounded-full border-2 border-purple-500 bg-slate-900 ring-2 ring-purple-500/30 shadow flex items-center justify-center z-10 transition group-hover:scale-110" />

                        <div className="border border-white/5 hover:border-white/15 bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all flex flex-col md:flex-row justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-100">{act.title}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryTheme(act.category)}`}>
                                {act.category}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-medium pb-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-slate-500" /> {act.time} ({act.duration})
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-slate-500" /> {act.location}
                              </span>
                              <span className="flex items-center gap-1 text-slate-300">
                                <DollarSign className="h-3.5 w-3.5 text-slate-500" /> {act.cost === 0 ? "Free" : `${act.cost} USD`}
                              </span>
                            </div>

                            <p className="text-slate-300 text-xs leading-relaxed font-normal">{act.description}</p>
                          </div>

                          <div className="flex items-center md:flex-col justify-end gap-1.5 md:self-start">
                            <button
                              onClick={() => handleOpenEdit(activeDay.dayNumber, act)}
                              className="p-1.5 text-slate-400 hover:text-white bg-white/5 border border-white/5 hover:border-white/10 rounded-lg cursor-pointer transition"
                              title="Edit Activity"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(activeDay.dayNumber, act.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 bg-white/5 border border-white/5 hover:border-white/10 rounded-lg cursor-pointer transition"
                              title="Delete Activity"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mapped view layout */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="glass-panel rounded-2xl p-4 flex-1 flex flex-col min-h-[350px]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Map className="h-4 w-4 text-slate-400" />
                <span>Computed Routing Map</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Day {activeDay?.dayNumber || 1} Map</span>
            </div>

            {/* Google Map Visualization */}
             <MapVisualization 
              destination={plan.destination} 
              activities={currentActivities} 
              hotel={plan.selectedHotel} 
             />

            {/* Map Legend */}
            <div className="mt-3 bg-white/5 p-3 rounded-xl border border-white/10 text-[11px] text-slate-400 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-lg bg-pink-600 border border-pink-400 flex items-center justify-center text-white text-[8px] font-bold">H</span>
                <span>Selected Accommodation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full bg-purple-600 border border-purple-400 flex items-center justify-center text-white text-[8px] font-bold">1</span>
                <span>Sequence numbering represents task timeline path.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-[2px] w-4 border-t-2 border-dashed border-purple-500" />
                <span>Computed driving routes between locations.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Adding or Editing Activity Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="glass-panel-heavy rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative border border-white/15 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center text-white">
              <h4 className="font-semibold text-base">
                {editingActivity ? "Modify Activity Details" : `Add Activity to Day ${editingDayNum}`}
              </h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white font-semibold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-slate-100 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Time</label>
                  <input
                    type="text"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input text-slate-100 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                    placeholder="e.g. 10:00 AM"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Duration</label>
                  <input
                    type="text"
                    required
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input text-slate-100 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                    placeholder="e.g. 2 hours"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Est. Cost (USD)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className="w-full px-4 py-2.5 glass-input text-slate-100 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ItineraryActivity["category"])}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-white/10 text-white rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer transition theme-dark"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Location / Target address</label>
                <input
                  type="text"
                  required
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-slate-100 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                  placeholder="Street landmarks or districts"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                <textarea
                  rows={2}
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-slate-100 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 border border-blue-500 text-white transition hover:bg-blue-700 cursor-pointer rounded-lg text-xs font-semibold"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
