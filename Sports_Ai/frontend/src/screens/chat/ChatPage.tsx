import { useState, useRef, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { chatApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestedActions?: Array<{ label: string; action: string }>;
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am your **SportsAI Concierge**. Ask me about any team, player, or upcoming match, and I will give you real-time data, odds, and betting insights.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await chatApi.sendMessage(input);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        suggestedActions: data.suggestedActions,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting to my brain right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-64px)] lg:h-screen max-w-5xl mx-auto p-4 lg:p-8">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase">AI Concierge</h1>
            <p className="text-gray-400 font-medium">Real-time intelligence on teams & players</p>
          </div>
          <div className="hidden md:flex items-center space-x-2 bg-green-500/10 border-2 border-green-500/20 px-4 py-2 rounded-xl">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-500 text-xs font-black uppercase">Live Intelligence Active</span>
          </div>
        </header>

        {/* Chat Container */}
        <div className="flex-1 bg-gray-800 border-4 border-gray-700 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-600">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] lg:max-w-[75%] ${
                    msg.role === 'user'
                      ? 'p-5 rounded-2xl bg-green-600 text-white border-2 border-green-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]'
                      : 'space-y-4' // Container for assistant cards
                  }`}
                >
                  {msg.role === 'user' ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="assistant-message-container space-y-4">
                      {/* Split by ## to create cards, or use custom renderer that wraps sections */}
                      <div className="bg-gray-700/50 p-6 rounded-3xl border-2 border-gray-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                              h2: ({node, ...props}) => (
                                <div className="mt-6 first:mt-0 mb-3 p-3 bg-gray-900/50 border-2 border-gray-600 rounded-2xl flex items-center space-x-3 shadow-inner">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span className="font-black uppercase text-[10px] tracking-[0.2em] text-green-400">
                                    {props.children}
                                  </span>
                                </div>
                              ),
                              p: ({node, ...props}) => (
                                <p className="mb-3 last:mb-0 leading-relaxed text-gray-200 font-medium">
                                  {props.children}
                                </p>
                              ),
                              strong: ({node, ...props}) => (
                                <strong className="text-white font-black px-1 bg-green-500/10 rounded border-b-2 border-green-500/50">
                                  {props.children}
                                </strong>
                              ),
                              ul: ({node, ...props}) => (
                                <ul className="space-y-2 mb-4 list-none p-0">
                                  {props.children}
                                </ul>
                              ),
                              li: ({node, ...props}) => (
                                <li className="flex items-start space-x-2 bg-gray-800/40 p-3 rounded-xl border border-gray-600/50">
                                  <span className="text-green-500 mt-1">▹</span>
                                  <span className="text-sm text-gray-300">{props.children}</span>
                                </li>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {msg.suggestedActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => window.location.href = action.action}
                          className="px-3 py-1.5 bg-black/20 hover:bg-black/40 border border-white/10 rounded-lg text-xs font-bold transition-all"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className={`mt-2 text-[10px] font-bold uppercase opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 p-5 rounded-2xl border-2 border-gray-600 border-dashed animate-pulse flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-gray-900/50 border-t-4 border-gray-700">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Barcelona, LeBron James, or today's big game..."
                disabled={isLoading}
                className="w-full bg-gray-800 border-4 border-gray-700 rounded-2xl px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-all font-bold pr-16 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-3 p-3 bg-green-500 hover:bg-green-400 disabled:bg-gray-600 text-black rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
            <div className="mt-3 flex items-center justify-center space-x-4">
              <button 
                type="button"
                onClick={() => setInput('What is the next Barcelona match?')}
                className="text-xs text-gray-500 hover:text-green-400 font-bold transition-colors"
              >
                Next Barça Match
              </button>
              <span className="text-gray-700">•</span>
              <button 
                type="button"
                onClick={() => setInput('Analyze Lakers vs Warriors')}
                className="text-xs text-gray-500 hover:text-green-400 font-bold transition-colors"
              >
                Analyze NBA
              </button>
              <span className="text-gray-700">•</span>
              <button 
                type="button"
                onClick={() => setInput('Are there any arbitrage bets for tomorrow?')}
                className="text-xs text-gray-500 hover:text-green-400 font-bold transition-colors"
              >
                Find Arbitrage
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
