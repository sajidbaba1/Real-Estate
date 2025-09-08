import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Send, X, Home, Maximize2, Minimize2, Move, Download, Settings, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const EnhancedPropertyAssistant: React.FC = () => {
  const { token, user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant'; text: string; timestamp: Date}[]>([]);
  const [listening, setListening] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatRef = useRef<HTMLDivElement>(null);

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
    setMessages(prev => [...prev, { role: 'user', text: q, timestamp: new Date() }]);
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
      
      setMessages(prev => [...prev, { role: 'assistant', text: answer, timestamp: new Date() }]);
      tts(answer);
      
    } catch (e: any) {
      const msg = e?.message || 'Failed to get property suggestions';
      setMessages(prev => [...prev, { role: 'assistant', text: msg, timestamp: new Date() }]);
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

  // Drag functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (fullscreen) return;
    setIsDragging(true);
    const rect = chatRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, [fullscreen]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || fullscreen) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - 384; // 384px = w-96
    const maxY = window.innerHeight - 400;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, dragOffset, fullscreen]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Chat functions
  const clearChat = () => {
    setMessages([]);
    setSuggestions([]);
  };

  const exportChat = () => {
    const chatData = {
      timestamp: new Date().toISOString(),
      messages: messages,
      suggestions: suggestions
    };
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `property-chat-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
    if (!fullscreen) {
      // Reset position when going fullscreen
      setPosition({ x: 0, y: 0 });
    } else {
      // Reset to default position when exiting fullscreen
      setPosition({ x: 24, y: 24 });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && e.ctrlKey) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault();
            askPropertyAssistant();
            break;
          case 'k':
            e.preventDefault();
            clearChat();
            break;
          case 'f':
            e.preventDefault();
            toggleFullscreen();
            break;
          case 's':
            e.preventDefault();
            exportChat();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, messages]);

  // Only show for authenticated users (not admins)
  if (!isAuthenticated || user?.role === 'ADMIN') {
    return null;
  }

  const chatStyle = fullscreen 
    ? { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }
    : { position: 'fixed' as const, left: position.x, top: position.y, width: '384px' };

  return (
    <>
      {!open && (
        <button 
          onClick={() => setOpen(true)} 
          className="fixed bottom-6 left-6 z-50 px-4 py-3 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2 transition-all duration-200 hover:scale-105"
        >
          <Home className="w-5 h-5" />
          <span>Property Assistant</span>
        </button>
      )}
      
      {open && (
        <div 
          ref={chatRef}
          style={chatStyle}
          className={`bg-white shadow-2xl border border-gray-200 flex flex-col z-50 transition-all duration-300 ${
            fullscreen ? 'rounded-none' : 'rounded-xl'
          } ${isDragging ? 'cursor-grabbing' : ''}`}
        >
          <div 
            className={`flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white ${
              fullscreen ? 'rounded-none' : 'rounded-t-xl'
            } ${!fullscreen ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center space-x-2">
              <Home className="w-5 h-5" />
              <div className="font-semibold">Property Assistant</div>
              {!fullscreen && <Move className="w-4 h-4 opacity-70" />}
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className="text-white/80 hover:text-white transition-colors"
                title="Settings (Ctrl+,)"
              >
                <Settings className="w-4 h-4"/>
              </button>
              <button 
                onClick={toggleFullscreen} 
                className="text-white/80 hover:text-white transition-colors"
                title={fullscreen ? 'Exit Fullscreen (Ctrl+F)' : 'Fullscreen (Ctrl+F)'}
              >
                {fullscreen ? <Minimize2 className="w-4 h-4"/> : <Maximize2 className="w-4 h-4"/>}
              </button>
              <button 
                onClick={() => setOpen(false)} 
                className="text-white/80 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-4 h-4"/>
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="px-4 py-3 border-b bg-gray-50">
              <div className="text-sm font-medium text-gray-700 mb-2">Quick Actions</div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={clearChat}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  title="Clear Chat (Ctrl+K)"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
                <button 
                  onClick={exportChat}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  title="Export Chat (Ctrl+S)"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Shortcuts: Ctrl+Enter (Send), Ctrl+K (Clear), Ctrl+F (Fullscreen), Ctrl+S (Export)
              </div>
            </div>
          )}
          
          <div className={`p-4 space-y-3 overflow-y-auto ${
            fullscreen ? 'flex-1' : 'h-80'
          }`}>
            {messages.length === 0 && (
              <div className="text-gray-500 text-sm">
                Ask me about properties! Try: "Show me 3-bedroom houses in downtown" or "What's available under $500k?"
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block px-3 py-2 rounded-lg max-w-xs lg:max-w-md ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div>{m.text}</div>
                  <div className={`text-xs mt-1 opacity-70 ${
                    m.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {m.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Property Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Suggested Properties:</div>
                {suggestions.map((property, i) => (
                  <div 
                    key={i} 
                    className="border rounded-lg p-3 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-all duration-200 hover:shadow-md" 
                    onClick={() => viewProperty(property.id)}
                  >
                    <div className="font-medium text-sm">{property.title}</div>
                    <div className="text-xs text-gray-600">{property.city}, {property.state}</div>
                    <div className="text-xs text-blue-600 font-medium">${property.price?.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {property.bedrooms} bed • {property.propertyType}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t bg-gray-50">
            <div className="flex items-center space-x-2">
              <button 
                onClick={toggleMic} 
                className={`p-2 rounded transition-all duration-200 ${
                  listening 
                    ? 'bg-red-100 text-red-600 animate-pulse' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={listening ? 'Stop Recording' : 'Start Voice Input'}
              >
                {listening ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
              </button>
              <input 
                value={input} 
                onChange={e=>setInput(e.target.value)} 
                onKeyPress={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    askPropertyAssistant();
                  }
                }}
                className="flex-1 bg-white rounded-lg px-3 py-2 outline-none border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
                placeholder="Describe your ideal property..." 
                disabled={busy}
              />
              <button 
                disabled={busy || !input.trim()} 
                onClick={askPropertyAssistant} 
                className="p-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-all duration-200"
                title="Send Message (Ctrl+Enter)"
              >
                {busy ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5"/>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EnhancedPropertyAssistant;
