import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Send, X, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ClientPropertyAssistant: React.FC = () => {
  const { token, user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant'; text: string}[]>([]);
  const [listening, setListening] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
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

  // Helper function to extract budget from query
  const extractBudget = (query: string): number | null => {
    const budgetPatterns = [
      /\$([0-9,]+)/g,
      /([0-9,]+)\s*dollars?/gi,
      /budget\s+(?:is\s+|of\s+)?\$?([0-9,]+)/gi,
      /under\s+\$?([0-9,]+)/gi,
      /below\s+\$?([0-9,]+)/gi,
      /max\s+\$?([0-9,]+)/gi,
      /maximum\s+\$?([0-9,]+)/gi
    ];
    
    for (const pattern of budgetPatterns) {
      const matches = query.match(pattern);
      if (matches) {
        const numberStr = matches[0].replace(/[^0-9,]/g, '').replace(/,/g, '');
        const budget = parseInt(numberStr);
        if (!isNaN(budget)) {
          return budget;
        }
      }
    }
    return null;
  };

  // Helper function to extract property preferences
  const extractPreferences = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return {
      bedrooms: lowerQuery.match(/(\d+)\s*(?:bed|bedroom)/)?.[1] ? parseInt(lowerQuery.match(/(\d+)\s*(?:bed|bedroom)/)?.[1] || '0') : null,
      propertyType: lowerQuery.includes('house') ? 'HOUSE' : 
                   lowerQuery.includes('apartment') || lowerQuery.includes('apt') ? 'APARTMENT' :
                   lowerQuery.includes('condo') ? 'CONDO' :
                   lowerQuery.includes('townhouse') ? 'TOWNHOUSE' : null,
      location: lowerQuery.match(/in\s+([a-zA-Z\s]+?)(?:\s|$|,)/)?.[1]?.trim()
    };
  };

  const askPropertyAssistant = async () => {
    if (!input.trim()) return;
    const q = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setInput('');
    
    try {
      setBusy(true);
      
      // First, get property suggestions based on the query
      const propertiesRes = await fetch(`${apiBase}/properties/approved`, { headers });
      const properties = await propertiesRes.json();
      
      // Extract budget and preferences from query
      const budget = extractBudget(q);
      const preferences = extractPreferences(q);
      
      // Smart filtering based on budget and preferences
      let matchedProperties = properties.filter((p: any) => {
        // Budget filter - most important
        if (budget && p.price > budget) {
          return false;
        }
        
        // Property type filter
        if (preferences.propertyType && p.propertyType !== preferences.propertyType) {
          return false;
        }
        
        // Bedroom filter
        if (preferences.bedrooms && p.bedrooms !== preferences.bedrooms) {
          return false;
        }
        
        // Location filter
        if (preferences.location) {
          const locationText = `${p.city} ${p.state} ${p.address}`.toLowerCase();
          if (!locationText.includes(preferences.location.toLowerCase())) {
            return false;
          }
        }
        
        // Fallback to keyword matching if no specific filters matched
        if (!budget && !preferences.propertyType && !preferences.bedrooms && !preferences.location) {
          const keywords = q.toLowerCase().split(' ');
          const searchText = `${p.title} ${p.description} ${p.city} ${p.state} ${p.propertyType}`.toLowerCase();
          return keywords.some(keyword => searchText.includes(keyword));
        }
        
        return true;
      });
      
      // Sort by price (ascending) if budget was specified
      if (budget) {
        matchedProperties.sort((a: any, b: any) => a.price - b.price);
      }
      
      // Limit to top 3 results
      matchedProperties = matchedProperties.slice(0, 3);
      
      setSuggestions(matchedProperties);
      
      // Generate a helpful response using RAG if available
      let answer = '';
      try {
        const contextInfo = budget ? `Budget: $${budget.toLocaleString()}` : '';
        const ragRes = await fetch(`${apiBase}/rag/query`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            question: `Based on this property inquiry: "${q}" ${contextInfo ? `with ${contextInfo}` : ''}, what properties would you recommend and why? Consider location, price, and property type preferences.` 
          })
        });
        if (ragRes.ok) {
          const ragData = await ragRes.json();
          answer = ragData.answer || '';
        }
      } catch (e) {
        console.warn('RAG query failed, using fallback response');
      }
      
      if (!answer) {
        if (matchedProperties.length > 0) {
          const budgetText = budget ? ` within your $${budget.toLocaleString()} budget` : '';
          answer = `I found ${matchedProperties.length} properties${budgetText} that match your criteria. Check out the suggestions below!`;
        } else if (budget) {
          answer = `I couldn't find any properties within your $${budget.toLocaleString()} budget. You might want to consider increasing your budget or looking in different areas with lower property prices.`;
        } else {
          answer = `I couldn't find specific properties matching your criteria right now. Try searching for different locations, property types, or price ranges.`;
        }
      }
      
      setMessages(prev => [...prev, { role: 'assistant', text: answer }]);
      tts(answer);
      
    } catch (e: any) {
      const msg = e?.message || 'Failed to get property suggestions';
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

  const viewProperty = (propertyId: number) => {
    window.open(`/properties/${propertyId}`, '_blank');
  };

  // Only show for authenticated users (not admins)
  if (!isAuthenticated || user?.role === 'ADMIN') {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {!open ? (
        <button onClick={() => setOpen(true)} className="px-4 py-3 rounded-full shadow-lg bg-blue-600 text-white flex items-center space-x-2">
          <Home className="w-5 h-5" />
          <span>Property Assistant</span>
        </button>
      ) : (
        <div className="w-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-semibold">Property Assistant</div>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5"/></button>
          </div>
          
          <div className="p-4 space-y-3 h-80 overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-gray-500 text-sm">
                Ask me about properties! Try: "Show me 3-bedroom houses in downtown" or "What's available under $500k?"
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block px-3 py-2 rounded-lg ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            
            {/* Property Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Suggested Properties:</div>
                {suggestions.map((property, i) => (
                  <div key={i} className="border rounded-lg p-3 bg-blue-50 cursor-pointer hover:bg-blue-100" onClick={() => viewProperty(property.id)}>
                    <div className="font-medium text-sm">{property.title}</div>
                    <div className="text-xs text-gray-600">{property.city}, {property.state}</div>
                    <div className="text-xs text-blue-600 font-medium">${property.price?.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t flex items-center space-x-2">
            <button onClick={toggleMic} className={`p-2 rounded ${listening ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700'}`}>
              {listening ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
            </button>
            <input 
              value={input} 
              onChange={e=>setInput(e.target.value)} 
              onKeyPress={e => e.key === 'Enter' && askPropertyAssistant()}
              className="flex-1 bg-gray-50 rounded px-3 py-2 outline-none border" 
              placeholder="Describe your ideal property..." 
            />
            <button disabled={busy} onClick={askPropertyAssistant} className="p-2 rounded bg-blue-600 text-white disabled:opacity-50">
              <Send className="w-5 h-5"/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPropertyAssistant;
