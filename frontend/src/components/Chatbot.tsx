import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

export const Chatbot: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: t('common.chatbot_intro') || 'Hello! I am your AI assistant. You can ask me about projects, leads, or financial standings.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error: ' + (data.message || 'Unknown error') }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all z-50 flex items-center justify-center
          ${isOpen ? 'bg-gray-900 text-white rotate-90 scale-90' : 'bg-[#00b800] text-white hover:scale-105 hover:shadow-[#00b800]/40'}`}
      >
        {isOpen ? <X size={24} className="-rotate-90" /> : <MessageSquare size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[350px] md:w-[400px] h-[500px] max-h-[70vh] bg-white rounded-3xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden animate-fade-in scale-in origin-bottom-right">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#00b800] to-emerald-500 p-4 text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <MessageSquare size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">RolAI</h3>
              <p className="text-[10px] text-white/80 uppercase tracking-widest font-black">AI Assistant</p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-gray-900 text-white rounded-br-sm' 
                      : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm p-4 flex items-center gap-2 shadow-sm">
                  <div className="w-2 h-2 bg-[#00b800] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#00b800] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-[#00b800] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1 pr-2 focus-within:border-[#00b800] focus-within:ring-2 focus-within:ring-[#00b800]/20 transition-all">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask RolAI about budgets, standings..."
                className="flex-1 bg-transparent border-none focus:outline-none px-3 py-2 text-sm text-gray-700"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-8 h-8 flex items-center justify-center bg-[#00b800] text-white rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all"
              >
                <Send size={16} className="-ml-0.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
