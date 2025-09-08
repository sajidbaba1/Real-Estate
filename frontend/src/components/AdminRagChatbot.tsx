import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Send, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AdminRagChatbot: React.FC = () => {
  const { token, user, isAuthenticated } = useAuth();
  const isAdmin = !!isAuthenticated && user?.role === 'ADMIN';

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant'; text: string}[]>([]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const RAW_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8888/api';
  const base = (RAW_BASE as string).replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInput(transcript);
        setListening(false);
      };
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
    }
  }, []);

  const tts = (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const ask = async () => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      alert('Admin login required for analytics chatbot.');
      return;
    }
    if (!input.trim()) return;
    const q = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setInput('');
    try {
      setBusy(true);
      const res = await fetch(`${apiBase}/rag/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question: q })
      });
      if (!res.ok) throw new Error(`Query failed (${res.status})`);
      const data = await res.json();
      const answer: string = data.answer || 'No answer.';
      setMessages(prev => [...prev, { role: 'assistant', text: answer }]);
      tts(answer);
    } catch (e: any) {
      const msg = e?.message || 'Failed to query analytics assistant';
      setMessages(prev => [...prev, { role: 'assistant', text: msg }]);
    } finally {
      setBusy(false);
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (!listening) {
      try { recognitionRef.current.start(); setListening(true); } catch {}
    } else {
      try { recognitionRef.current.stop(); setListening(false); } catch {}
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="fixed bottom-24 left-6 z-50">
      {!open ? (
        <button onClick={() => setOpen(true)} className="px-4 py-3 rounded-full shadow-lg bg-primary-600 text-white">
          Analytics Assistant
        </button>
      ) : (
        <div className="w-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-semibold">Admin Analytics Assistant</div>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5"/></button>
          </div>
          <div className="p-4 space-y-3 h-80 overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-gray-500 text-sm">Ask about revenue, purchases, trends, activity...</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block px-3 py-2 rounded-lg ${m.role === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900'}`}>{m.text}</div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t flex items-center space-x-2">
            <button onClick={toggleMic} className={`p-2 rounded ${listening ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700'}`}>{listening ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}</button>
            <input value={input} onChange={e=>setInput(e.target.value)} className="flex-1 bg-gray-50 rounded px-3 py-2 outline-none border" placeholder="Ask a question..." />
            <button disabled={busy} onClick={ask} className="p-2 rounded bg-primary-600 text-white disabled:opacity-50"><Send className="w-5 h-5"/></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRagChatbot;
