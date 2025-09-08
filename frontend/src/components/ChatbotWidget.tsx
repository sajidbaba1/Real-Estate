import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Mic, Square, Volume2, Send, Loader2, X } from 'lucide-react';
import api, { propertyApi } from '../services/api';

// Simple intent detection for demo
function detectIntent(text: string) {
  const t = text.toLowerCase();
  if (/(how many|count|number of)/.test(t)) return 'count';
  if (/list|show|approved/.test(t)) return 'list_approved';
  if (/property\s+#?(\d+)/.test(t)) return 'get_by_id';
  if (/search|find/.test(t)) return 'search';
  return 'chat';
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

const ChatbotWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const supportsSTT = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const supportsTTS = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!supportsSTT) return;
    const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setQuery(text);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
  }, [supportsSTT]);

  const speak = (text: string) => {
    if (!supportsTTS) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.pitch = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const runGemini = async (prompt: string): Promise<string> => {
    if (!GEMINI_API_KEY) {
      return 'Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in .env.local.';
    }
    // Use a current public model; 404 can occur if model name is invalid for your API key/project
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const body = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      if (res.status === 404) {
        return 'Gemini returned 404 (model not found). Try another model like gemini-1.5-pro or check your API key project permissions.';
      }
      throw new Error(`Gemini error ${res.status}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    return text;
  };

  const handleSend = async () => {
    const q = query.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setQuery('');
    setLoading(true);

    try {
      const intent = detectIntent(q);
      let answer = '';

      if (intent === 'count') {
        // Try to determine if user means approved only
        const lower = q.toLowerCase();
        if (/(approved|public|listed)/.test(lower)) {
          const approved = await propertyApi.getApprovedCount();
          answer = `There are currently ${approved} approved properties.`;
        } else {
          const total = await propertyApi.getTotalCount();
          answer = `There are currently ${total} properties in the database.`;
        }
      } else 
      if (intent === 'list_approved') {
        const items = await propertyApi.getAllProperties();
        const top = items.slice(0, 5)
          .map((p) => `#${p.id}: ${p.title} • ${p.city}, ${p.state} • $${Number(p.price).toLocaleString()}`)
          .join('\n');
        answer = items.length ? `Here are approved properties:\n${top}\nYou can ask: "Show property #<id>"` : 'No approved properties found.';
      } else if (intent === 'get_by_id') {
        const match = q.toLowerCase().match(/property\s+#?(\d+)/);
        const id = match ? Number(match[1]) : NaN;
        if (id) {
          try {
            const p = await propertyApi.getPropertyById(id);
            answer = `Property #${p.id}: ${p.title}\n${p.address}, ${p.city}, ${p.state} ${p.zipCode}\nPrice: $${Number(p.price).toLocaleString()}\nStatus: ${p.status}\nType: ${p.propertyType}`;
          } catch {
            answer = `I could not find property #${id}.`;
          }
        } else {
          answer = 'Please specify a property id, e.g., "Show property #7"';
        }
      } else if (intent === 'search') {
        // naive keyword search by city or keyword
        const items = await propertyApi.searchProperties({ keyword: q });
        if (items.length) {
          const top = items.slice(0, 5)
            .map((p) => `#${p.id}: ${p.title} • ${p.city}, ${p.state} • $${Number(p.price).toLocaleString()}`)
            .join('\n');
          answer = `Search results:\n${top}`;
        } else {
          answer = 'No results matched your search.';
        }
      } else {
        // fallback to Gemini LLM
        answer = await runGemini(`You are a real estate assistant for our app. Answer briefly. Question: ${q}`);
      }

      setMessages((m) => [...m, { role: 'assistant', text: answer }]);
      speak(answer);
    } catch (e: any) {
      const err = e?.message || 'Something went wrong.';
      setMessages((m) => [...m, { role: 'assistant', text: err }]);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    if (!supportsSTT) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    setListening(true);
    try {
      recognitionRef.current?.start();
    } catch (_) {
      setListening(false);
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 rounded-full bg-primary-600 text-white p-4 shadow-lg hover:bg-primary-700"
        aria-label="Open AI Chatbot"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-96 max-w-[90vw] bg-white rounded-xl shadow-2xl border">
          <div className="px-4 py-3 border-b font-semibold">AI Assistant</div>
          <div className="p-4 max-h-80 overflow-auto space-y-3 text-sm">
            {messages.length === 0 && (
              <div className="text-gray-500">Ask me to list approved properties, show a property by id, or search by keyword/city.</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block px-3 py-2 rounded-lg ${m.role === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center text-gray-500 text-sm"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Thinking…</div>
            )}
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              className="flex-1 input-field"
              placeholder="Type your message…"
            />
            <button onClick={handleSend} className="btn-primary px-3" aria-label="Send"><Send className="w-4 h-4" /></button>
            <button onClick={listening ? undefined : startListening} className={`px-2 py-2 rounded ${listening ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`} aria-label="Voice input">
              {listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button onClick={() => supportsTTS && speechSynthesis.cancel()} className="px-2 py-2 rounded bg-gray-100 text-gray-700" aria-label="Stop speech">
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
