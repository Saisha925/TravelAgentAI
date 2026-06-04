import React, { useState, useEffect, useRef } from "react";
import { AgentLog } from "../types";
import { Terminal, Cpu, Database, CloudRain, MapPin, Network, Play, RefreshCw, Send, ChevronRight, ChevronDown } from "lucide-react";

interface AgentConsoleProps {
  logs: AgentLog[];
  isGenerating: boolean;
}

export default function AgentConsole({ logs, isGenerating }: AgentConsoleProps) {
  const [playbackLogs, setPlaybackLogs] = useState<AgentLog[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Playback delayed simulation when generating a fresh plan
  useEffect(() => {
    if (isGenerating) {
      setPlaybackLogs([]);
      setActiveStep(0);
      return;
    }

    if (logs.length === 0) {
      setPlaybackLogs([]);
      return;
    }

    // Playback logs sequentially with a premium delayed tick
    setPlaybackLogs([logs[0]]);
    setActiveStep(1);

    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= logs.length) {
          clearInterval(interval);
          return prev;
        }
        setPlaybackLogs((curr) => [...curr, logs[prev]]);
        return prev + 1;
      });
    }, 700); // 700ms tick feels active yet deliberate

    return () => clearInterval(interval);
  }, [logs, isGenerating]);

  // Scroll to bottom of terminal console
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [playbackLogs]);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const getAgentTheme = (agent: string) => {
    switch (agent) {
      case "Itinerary Planner Agent":
        return { bg: "bg-indigo-600/10 text-indigo-400 border-indigo-500/20", icon: <Cpu className="h-4.5 w-4.5" /> };
      case "Flight Search Agent":
        return { bg: "bg-sky-600/10 text-sky-400 border-sky-500/20", icon: <Terminal className="h-4.5 w-4.5" /> };
      case "Hotel Recommendation Agent":
        return { bg: "bg-teal-600/10 text-teal-400 border-teal-500/20", icon: <Database className="h-4.5 w-4.5" /> };
      case "Weather Information Agent":
        return { bg: "bg-amber-600/10 text-amber-400 border-amber-500/20", icon: <CloudRain className="h-4.5 w-4.5" /> };
      case "System Coordinator":
        return { bg: "bg-slate-600/10 text-slate-300 border-slate-500/20", icon: <Network className="h-4.5 w-4.5" /> };
      default:
        return { bg: "bg-slate-600/10 text-slate-400 border-slate-500/20", icon: <Terminal className="h-4.5 w-4.5" /> };
    }
  };

  const getTypeTheme = (type: AgentLog["type"]) => {
    switch (type) {
      case "tool_call":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "tool_response":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "collaboration":
        return "bg-violet-500/10 text-violet-400 border border-violet-500/20";
      case "system":
        return "bg-slate-500/10 text-slate-300 border border-slate-500/20";
      default:
        return "bg-slate-800 text-slate-400";
    }
  };

  const isSimulating = activeStep < logs.length;

  return (
    <div className="glass-panel text-slate-100 rounded-2xl overflow-hidden flex flex-col h-[520px] relative">
      {/* Console Topbar */}
      <div className="bg-white/5 px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Terminal className="h-5 w-5 text-blue-400" />
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white">Multi-Agent ADK Trace System</h3>
            <span className="text-[10px] text-slate-400 font-mono">Live Session logs &amp; MCP server responses</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isGenerating || isSimulating ? (
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-amber-500 uppercase">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Orchestrating...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Online / Synced</span>
            </div>
          )}
        </div>
      </div>

      {/* Terminal grid layout logs */}
      <div
        ref={containerRef}
        className="flex-1 p-5 overflow-y-auto space-y-4 font-mono text-xs scrollbar-custom"
      >
        {isGenerating && (
          <div className="flex flex-col items-center justify-center h-full space-y-3.5 text-slate-400">
            <Cpu className="h-7 w-7 text-blue-500 animate-pulse" />
            <p className="text-[11px] uppercase tracking-widest text-slate-500">Contacting ADK agent swarm ...</p>
          </div>
        )}

        {!isGenerating && playbackLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full space-y-2 text-slate-500 italic">
            <Terminal className="h-6 w-6 opacity-30" />
            <span className="text-[11px]">No logs generated. Initiate plan above to execute simulation loops.</span>
          </div>
        )}

        {!isGenerating &&
          playbackLogs.map((log) => {
            const agentStyle = getAgentTheme(log.agentName);
            const typeStyle = getTypeTheme(log.type);
            const isExpanded = expandedLogId === log.id;

            return (
              <div
                key={log.id}
                className="border border-white/5 bg-white/5 hover:bg-white/10 p-3 rounded-xl space-y-2.5 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 text-[11px] font-semibold">
                    {/* Agent badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border leading-none ${agentStyle.bg}`}>
                      {agentStyle.icon}
                      <span>{log.agentName}</span>
                    </div>

                    {/* Arrow directional indicator */}
                    {log.targetAgentOrMcp && (
                      <>
                        <span className="text-slate-600 font-bold">&gt;&gt;</span>
                        <span className="text-slate-400 font-medium">{log.targetAgentOrMcp}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Log status category */}
                    <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-semibold leading-none ${typeStyle}`}>
                      {log.type.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-slate-500 font-light font-sans">{log.timestamp.split("T")?.[1]?.substring(0, 8)}</span>
                  </div>
                </div>

                {/* message main */}
                <div className="text-slate-300 leading-relaxed pl-1 text-[11px] flex gap-1 items-start">
                  <span className="text-blue-500 select-none font-bold">$</span>
                  <span>{log.message}</span>
                </div>

                {/* Tool call payload details */}
                {log.payload && (
                  <div className="pl-4">
                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-white transition bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md border border-white/5"
                    >
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      <span>{isExpanded ? "Hide payload" : "View JSON payload"}</span>
                    </button>

                    {isExpanded && (
                      <pre className="mt-2 text-[10px] p-3 rounded-lg border border-white/5 bg-slate-950/60 text-slate-300 overflow-x-auto select-all max-w-full font-mono">
                        {log.payload}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}

        {!isGenerating && isSimulating && (
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-[11px] pl-3 py-1 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
            <span>Agent swarm debating optimal choices...</span>
          </div>
        )}
      </div>

      {/* Footer / Console Legend */}
      <div className="bg-white/5 px-5 py-3.5 border-t border-white/10 text-[10px] text-slate-400 flex flex-wrap gap-4 items-center font-sans tracking-wide">
        <span className="font-semibold text-slate-300 uppercase tracking-widest text-[9px]">Swarms &amp; MCPs:</span>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          <span>Itinerary Sup.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
          <span>Flights Ag.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />
          <span>Hotels Ag.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span>Weather Ag.</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
          <Database className="h-3.5 w-3.5 text-slate-500" />
          <span>MCP Service Nodes API Mapping active</span>
        </div>
      </div>
    </div>
  );
}
