import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, DollarSign, CheckCircle, XCircle, Loader2, ShoppingCart, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import webSocketService, { WebSocketMessage } from '../services/websocketService';

interface ChatMessage {
  id: number;
  content: string;
  messageType: string;
  priceAmount?: number;
  sender: {
    id: number;
    firstName: string;
    lastName: string;
  };
  sentAt: string;
  isRead: boolean;
}

interface PropertyInquiry {
  id: number;
  status: string;
  agreedPrice?: number;
  offeredPrice?: number;
  property: {
    id: number;
    title: string;
    price: number;
  };
  client: {
    id: number;
    firstName: string;
    lastName: string;
  };
  owner: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface ChatComponentProps {
  inquiryId: number;
  inquiry: PropertyInquiry;
  messages: ChatMessage[];
  onMessagesUpdate?: (messages: ChatMessage[]) => void;
  onInquiryUpdate?: (inquiry: PropertyInquiry) => void;
}

const ChatComponent: React.FC<ChatComponentProps> = ({
  inquiryId,
  inquiry,
  messages: initialMessages,
  onMessagesUpdate,
  onInquiryUpdate
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || []);
  const [newMessage, setNewMessage] = useState('');
  const [priceOffer, setPriceOffer] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const isClient = user?.id === inquiry.client.id;
  const isOwner = user?.id === inquiry.owner.id;
  const canSendMessages = inquiry.status !== 'PURCHASED' && inquiry.status !== 'CANCELLED' && inquiry.status !== 'CLOSED';
  const canMakePurchase = inquiry.status === 'AGREED' && isClient;
  const canConfirmPurchase = inquiry.status === 'AGREED' && isOwner;

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket event handlers
  const handleNewMessage = useCallback((wsMessage: WebSocketMessage) => {
    if (wsMessage.inquiryId === inquiryId && wsMessage.message) {
      setMessages(prev => {
        const exists = prev.some(msg => msg.id === wsMessage.message.id);
        if (!exists) {
          const newMessages = [...prev, wsMessage.message];
          onMessagesUpdate?.(newMessages);
          return newMessages;
        }
        return prev;
      });
    }
  }, [inquiryId, onMessagesUpdate]);

  const handleTypingIndicator = useCallback((wsMessage: WebSocketMessage) => {
    if (wsMessage.inquiryId === inquiryId) {
      setOtherUserTyping(wsMessage.isTyping || false);
      if (wsMessage.isTyping) {
        setTimeout(() => setOtherUserTyping(false), 3000); // Auto-clear after 3 seconds
      }
    }
  }, [inquiryId]);

  const handleStatusUpdate = useCallback((wsMessage: WebSocketMessage) => {
    if (wsMessage.inquiryId === inquiryId && wsMessage.status) {
      const updatedInquiry = { ...inquiry, status: wsMessage.status };
      onInquiryUpdate?.(updatedInquiry);
    }
  }, [inquiryId, inquiry, onInquiryUpdate]);

  const handlePurchaseUpdate = useCallback((wsMessage: WebSocketMessage) => {
    if (wsMessage.inquiryId === inquiryId) {
      if (wsMessage.type === 'PURCHASE_REQUEST' || wsMessage.type === 'PURCHASE_CONFIRMED') {
        // Refresh messages to show purchase-related messages
        fetchMessages();
      }
    }
  }, [inquiryId]);

  // Setup WebSocket listeners
  useEffect(() => {
    const unsubscribeMessage = webSocketService.onMessage(handleNewMessage);
    const unsubscribeTyping = webSocketService.onTyping(handleTypingIndicator);
    const unsubscribeStatus = webSocketService.onStatus(handleStatusUpdate);
    const unsubscribePurchase = webSocketService.onPurchase(handlePurchaseUpdate);
    const unsubscribeConnection = webSocketService.onConnectionChange(setConnected);

    // Set initial connection status
    setConnected(webSocketService.connected);

    return () => {
      unsubscribeMessage();
      unsubscribeTyping();
      unsubscribeStatus();
      unsubscribePurchase();
      unsubscribeConnection();
    };
  }, [handleNewMessage, handleTypingIndicator, handleStatusUpdate, handlePurchaseUpdate]);

  // Mark messages as read when component mounts or messages change
  useEffect(() => {
    if (messages.length > 0 && webSocketService.connected) {
      webSocketService.markMessagesAsRead(inquiryId);
    }
  }, [inquiryId, messages.length]);

  const fetchMessages = async () => {
    try {
      const RAW_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8888';
      const base = RAW_BASE.replace(/\/+$/, '');
      const apiBase = base.endsWith('/api') ? base : `${base}/api`;
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBase}/inquiries/${inquiryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        onMessagesUpdate?.(data.messages || []);
        if (data.inquiry) {
          onInquiryUpdate?.(data.inquiry);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (content: string, messageType = 'TEXT', priceAmount?: number) => {
    if (!content.trim() || sending || !canSendMessages) return;

    setSending(true);
    try {
      const success = webSocketService.sendMessage(inquiryId, content, messageType, priceAmount);
      if (success) {
        setNewMessage('');
        setPriceOffer('');
      } else {
        // Fallback to HTTP if WebSocket fails
        await sendMessageHttp(content, messageType, priceAmount);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const sendMessageHttp = async (content: string, messageType = 'TEXT', priceAmount?: number) => {
    try {
      const RAW_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8888';
      const base = RAW_BASE.replace(/\/+$/, '');
      const apiBase = base.endsWith('/api') ? base : `${base}/api`;
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBase}/inquiries/${inquiryId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          messageType,
          priceAmount
        })
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        setPriceOffer('');
      }
    } catch (error) {
      console.error('Error sending message via HTTP:', error);
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      webSocketService.sendTypingIndicator(inquiryId, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      webSocketService.sendTypingIndicator(inquiryId, false);
    }, 1000);
  };

  const handleSendMessage = () => {
    sendMessage(newMessage);
  };

  const handleSendPriceOffer = () => {
    if (!priceOffer.trim()) return;
    const amount = parseFloat(priceOffer);
    if (isNaN(amount) || amount <= 0) return;

    const messageType = isClient ? 'PRICE_OFFER' : 'PRICE_COUNTER';
    const content = `${isClient ? 'I offer' : 'Counter offer:'} ₹${amount.toLocaleString()} for this property.`;
    sendMessage(content, messageType, amount);
  };

  const handleAcceptPrice = () => {
    if (!inquiry.offeredPrice) return;
    const content = `I accept your offer of ₹${inquiry.offeredPrice.toLocaleString()}.`;
    sendMessage(content, 'PRICE_ACCEPT', inquiry.offeredPrice);
  };

  const handleRejectPrice = () => {
    const content = `I cannot accept this offer. Please make a different offer.`;
    sendMessage(content, 'PRICE_REJECT');
  };

  const handlePurchaseRequest = () => {
    if (!inquiry.agreedPrice) return;
    webSocketService.sendPurchaseRequest(inquiryId, inquiry.agreedPrice, 
      `I would like to proceed with purchasing this property for ₹${inquiry.agreedPrice.toLocaleString()}.`);
  };

  const handleConfirmPurchase = () => {
    if (!inquiry.agreedPrice) return;
    webSocketService.confirmPurchase(inquiryId, 
      `I confirm the sale of this property for ₹${inquiry.agreedPrice.toLocaleString()}.`);
  };

  const formatMessageTime = (sentAt: string) => {
    return new Date(sentAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case 'PRICE_OFFER':
      case 'PRICE_COUNTER':
        return <DollarSign className="w-4 h-4" />;
      case 'PRICE_ACCEPT':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'PRICE_REJECT':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'PURCHASE_REQUEST':
      case 'PURCHASE_CONFIRM':
        return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-96 bg-white border rounded-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Chat with {isClient ? inquiry.owner.firstName : inquiry.client.firstName}
          </h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        {/* Status indicators */}
        <div className="mt-2 flex items-center space-x-4 text-sm">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            inquiry.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
            inquiry.status === 'NEGOTIATING' ? 'bg-yellow-100 text-yellow-800' :
            inquiry.status === 'AGREED' ? 'bg-green-100 text-green-800' :
            inquiry.status === 'PURCHASED' ? 'bg-purple-100 text-purple-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {inquiry.status}
          </span>
          
          {inquiry.agreedPrice && (
            <span className="text-green-600 font-medium">
              Agreed: ₹{inquiry.agreedPrice.toLocaleString()}
            </span>
          )}
          
          {inquiry.offeredPrice && inquiry.status === 'NEGOTIATING' && (
            <span className="text-blue-600 font-medium">
              Latest Offer: ₹{inquiry.offeredPrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwnMessage = message.sender.id === user?.id;
          return (
            <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isOwnMessage 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <div className="flex items-center space-x-2 mb-1">
                  {getMessageTypeIcon(message.messageType)}
                  <span className="text-xs font-medium">
                    {message.sender.firstName}
                  </span>
                  <span className="text-xs opacity-75">
                    {formatMessageTime(message.sentAt)}
                  </span>
                </div>
                
                <p className="text-sm">{message.content}</p>
                
                {message.priceAmount && (
                  <div className="mt-2 text-xs font-semibold">
                    ₹{message.priceAmount.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
                </div>
                <span className="text-xs text-gray-600">typing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Action buttons for price negotiation */}
      {canSendMessages && inquiry.status === 'NEGOTIATING' && isOwner && inquiry.offeredPrice && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Respond to offer of ₹{inquiry.offeredPrice.toLocaleString()}:
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handleAcceptPrice}
                className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
              >
                Accept
              </button>
              <button
                onClick={handleRejectPrice}
                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase actions */}
      {canMakePurchase && (
        <div className="px-4 py-2 border-t bg-green-50">
          <button
            onClick={handlePurchaseRequest}
            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Purchase for ₹{inquiry.agreedPrice?.toLocaleString()}</span>
          </button>
        </div>
      )}

      {canConfirmPurchase && (
        <div className="px-4 py-2 border-t bg-blue-50">
          <button
            onClick={handleConfirmPurchase}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Confirm Sale for ₹{inquiry.agreedPrice?.toLocaleString()}</span>
          </button>
        </div>
      )}

      {/* Input area */}
      {canSendMessages && (
        <div className="px-4 py-3 border-t space-y-2">
          {/* Price offer input */}
          <div className="flex space-x-2">
            <input
              type="number"
              value={priceOffer}
              onChange={(e) => setPriceOffer(e.target.value)}
              placeholder="Price offer..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendPriceOffer}
              disabled={!priceOffer.trim() || sending}
              className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center space-x-1"
            >
              <DollarSign className="w-4 h-4" />
              <span>{isClient ? 'Offer' : 'Counter'}</span>
            </button>
          </div>
          
          {/* Message input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-1"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {!canSendMessages && (
        <div className="px-4 py-3 border-t bg-gray-50 text-center text-sm text-gray-500">
          {inquiry.status === 'PURCHASED' && 'This inquiry has been completed.'}
          {inquiry.status === 'CANCELLED' && 'This inquiry has been cancelled.'}
          {inquiry.status === 'CLOSED' && 'This inquiry has been closed.'}
        </div>
      )}
    </div>
  );
};

export default ChatComponent;
