import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { Send, Sparkles, MessageCircle, RefreshCw, Cpu, User } from "lucide-react";

interface TravelChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isChatting: boolean;
}

const QUICK_PROMPTS = [
  "Can you find a cheaper flight?",
  "Suggest a cozy afternoon coffee stop.",
  "Replace Day 1 afternoon with a local history walk.",
  "What is the weather forecast like?",
];

export default function TravelChat({ messages, onSendMessage, isChatting }: TravelChatProps) {
  const [inputText, setInputText] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isChatting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isChatting) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isChatting) return;
    onSendMessage(prompt);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col h-[520px] relative overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-2.5 pb-4 border-b border-white/10 flex-none relative z-10">
        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white shadow-lg border border-white/10">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide">Itinerary Planner Agent</h3>
          <span className="text-[10px] text-slate-400 font-medium">Orchestrating Flights, Hotels, and Route Swarms</span>
        </div>
      </div>
 
      {/* Messages Scroll Area */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-custom"
      >
        {messages.map((msg) => {
          const isAI = msg.role === "assistant";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${isAI ? "self-start" : "ml-auto flex-row-reverse"}`}
            >
              <div
                className={`flex-none h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isAI
                    ? "bg-white/10 border border-white/15 text-blue-400"
                    : "bg-white/5 border border-white/10 text-slate-300"
                }`}
              >
                {isAI ? <Cpu className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
 
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  isAI
                    ? "bg-white/5 border border-white/10 text-slate-200 rounded-tl-none font-normal"
                    : "bg-blue-600/80 border border-blue-500/50 text-white rounded-tr-none font-medium shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <span className="block text-[9px] text-slate-400 mt-1 pl-0.5 select-none text-right font-light font-sans">
                  {msg.timestamp.split("T")?.[1]?.substring(0, 5) || msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}
 
        {isChatting && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="flex-none h-8 w-8 rounded-full bg-white/10 border border-white/15 text-blue-400 flex items-center justify-center">
              <Cpu className="h-4 w-4 animate-spin" />
            </div>
            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl rounded-tl-none space-y-2">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
                <span>Planner Agent deliberating with Flight, Hotel &amp; Weather Agents...</span>
              </div>
              {/* Animated Typing Dots */}
              <div className="flex gap-1 items-center py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>
 
      {/* Suggested prompting capsules selector */}
      <div className="flex-none pt-3 border-t border-white/10 space-y-2">
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Ask Planner to Adjust:</span>
        <div className="flex flex-wrap gap-1.5 max-h-[70px] overflow-y-auto pb-2 scrollbar-custom">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isChatting}
              onClick={() => handleQuickPrompt(prompt)}
              className="px-2.5 py-1 text-[10px] font-medium border border-white/10 bg-white/5 text-slate-300 hover:border-blue-400 hover:text-white cursor-pointer rounded-lg transition-all disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
 
        {/* Input box form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            required
            disabled={isChatting}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Instruct Itinerary Planner to update stays, routes..."
            className="flex-1 glass-input py-2.5 px-4 rounded-xl text-xs placeholder-slate-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isChatting}
            className="p-2.5 glass-btn-primary rounded-xl transition flex items-center justify-center disabled:opacity-50 cursor-pointer"
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
