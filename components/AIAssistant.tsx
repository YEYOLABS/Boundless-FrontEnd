import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot, User, Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  contextData: any;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose, contextData }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [messages, setMessages] = useState<{ role: 'ai' | 'user', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = async (customMessage?: string) => {
    const textToSend = customMessage || input;
    if (!textToSend.trim()) return;

    if (!customMessage) setInput('');
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setIsTyping(true);

    try {
      // Fix: Follow @google/genai guidelines by using process.env.API_KEY directly in the constructor.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = `
        You are FleetOps Intelligence. Analyst for a luxury tour company.
        BRD LOGIC:
        1. 🟢 GREEN: Healthy.
        2. 🟡 AMBER: Service due < 1000km, wheel alignment > 8000km, or tyre tread < 3mm.
        3. 🔴 RED: Overdue service or safety failure.
        4. Roles: Ops (Vehicles), Agent (Tours), Owner (All).
        
        Current System Data: ${JSON.stringify(contextData)}
        User: ${user?.name} (${user?.role})
        
        RULES: Plain text only. Use ALL CAPS for critical safety warnings.
      `;

      // Fix: Use gemini-3-flash-preview for text tasks and correctly access the .text property.
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: textToSend,
        config: { systemInstruction, temperature: 0.5 }
      });

      setMessages(prev => [...prev, { role: 'ai', text: response.text || "Analysis failed." }]);
    } catch (err: any) {
      console.error("AI Error:", err);
      // Fix: Generic error message to avoid asking the user to update or manage the API_KEY.
      setMessages(prev => [...prev, { role: 'ai', text: "Operational analysis is currently unavailable. Please contact system support if the problem persists." }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white/95 backdrop-blur-xl shadow-2xl z-[100] border-l border-slate-200 flex flex-col animate-slideIn">
      <div className="p-6 border-b border-slate-100 bg-indigo-600 text-white flex justify-between items-center shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
            <Bot size={20} className="text-indigo-200" />
          </div>
          <div>
            <h3 className="font-bold tracking-tight">Ops Intelligence</h3>
            <p className="text-[10px] uppercase font-bold text-indigo-200 tracking-widest">Safety Compliance Engine</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-sm'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
            </div>
          </div>
        ))}
        {isTyping && <Loader2 size={16} className="animate-spin text-indigo-600 mx-auto" />}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-6 bg-white border-t border-slate-100 shrink-0">
        <div className="relative">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about safety compliance..."
            className="w-full pl-5 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20">
            <Send size={18} />
          </button>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
          <button type="button" onClick={() => handleSend("Identify vehicles with tyre treads < 3mm.")} className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-widest shrink-0">Tyre Check</button>
          <button type="button" onClick={() => handleSend("List all vehicles overdue for wheel alignment.")} className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-widest shrink-0">Alignment Audit</button>
        </div>
      </form>
    </div>
  );
};

export default AIAssistant;