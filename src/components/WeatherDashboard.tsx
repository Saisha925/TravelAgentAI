import React from "react";
import { TravelPlan } from "../types";
import { Cloud, Sun, CloudRain, ThermometerSnowflake, ThermometerSun, BaggageClaim } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface WeatherDashboardProps {
  plan: TravelPlan;
}

export default function WeatherDashboard({ plan }: WeatherDashboardProps) {
  if (!plan.weather || plan.weather.length === 0) {
    return <div className="text-slate-400 text-sm">No weather modeling data available.</div>;
  }

  const chartData = plan.weather.map(w => ({
    date: w.date.split("-").length > 2 ? `${w.date.split("-")[1]}/${w.date.split("-")[2]}` : w.date,
    High: w.tempHigh,
    Low: w.tempLow,
  }));

  const getIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes("rain") || c.includes("shower") || c.includes("drizzle")) return <CloudRain className="h-6 w-6 text-blue-400" />;
    if (c.includes("cloud") || c.includes("overcast")) return <Cloud className="h-6 w-6 text-slate-300" />;
    if (c.includes("snow") || c.includes("ice")) return <ThermometerSnowflake className="h-6 w-6 text-cyan-300" />;
    return <Sun className="h-6 w-6 text-amber-400" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Visual Header */}
      <div className="glass-panel p-6 rounded-2xl">
         <h3 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
           <Cloud className="h-5.5 w-5.5 text-blue-400" />
           Climate Suitability & Packing Modeling
         </h3>
         <p className="text-slate-400 text-xs mt-1">
           Weather agent forecast and curated packing requirements for {plan.destination}.
         </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <h4 className="text-sm font-semibold text-white">Temperature Forecast</h4>
             <ThermometerSun className="h-4 w-4 text-orange-400" />
          </div>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#ffffff20", borderRadius: "8px", fontSize: "12px" }}
                  itemStyle={{ fontSize: "12px", fontWeight: "bold", color: "#f8fafc" }}
                />
                <Area type="monotone" dataKey="High" stroke="#f97316" fillOpacity={1} fill="url(#colorHigh)" strokeWidth={2} />
                <Area type="monotone" dataKey="Low" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLow)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown */}
        <div className="glass-panel p-6 rounded-2xl space-y-4 max-h-[350px] overflow-y-auto scrollbar-custom">
          <h4 className="text-sm font-semibold text-white sticky top-0 bg-[#070b14]/90 backdrop-blur-md pb-2 z-10 block">
             Daily Breakdown
          </h4>
          <div className="space-y-3">
             {plan.weather.map((day, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-start gap-4">
                   <div className="p-2 border border-white/10 bg-white/5 rounded-lg shrink-0">
                      {getIcon(day.condition)}
                   </div>
                   <div className="space-y-1 w-full flex-1 min-w-0">
                      <div className="flex justify-between items-center w-full">
                        <span className="text-xs font-bold text-white">{day.date}</span>
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono shrink-0">
                           H:{day.tempHigh}°  L:{day.tempLow}°
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-300 font-medium truncate">{day.condition}</p>
                      <p className="text-[11px] text-slate-400 font-medium line-clamp-2">{day.description}</p>
                   </div>
                </div>
             ))}
          </div>
        </div>
      </div>

      {/* Packing list */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
         <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
            <BaggageClaim className="h-4.5 w-4.5 text-pink-400" />
            Recommended Packing Checklist
         </h4>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plan.weather.map((day, i) => (
               <div key={`pack-${i}`} className="bg-white/5 border-l-2 border-l-pink-500 border border-white/10 p-3 rounded-r-xl">
                  <p className="text-[10px] text-pink-400 font-bold mb-1 uppercase tracking-wider">{day.date}</p>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">{day.packingAdvice}</p>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
