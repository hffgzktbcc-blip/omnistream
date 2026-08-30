import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Sparkles,
  Bot,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  Send,
  Mic,
  MicOff,
  Activity,
  ShieldCheck,
  Radio,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Cpu,
  Layers,
  Wand2,
  ExternalLink,
  Loader2,
  Tv,
  ArrowRight,
  Pin,
  PinOff,
  Palette,
  Compass,
  Sliders
} from 'lucide-react';

interface AntigravityAssistantProps {
  currentTab?: string;
  activeMediaTitle?: string;
  activeMediaId?: string | number;
  onNavigate?: (tab: string) => void;
  onSetPlatform?: (platform: string) => void;
  onSearch?: (query: string) => void;
  onSetAudioPreference?: (audio: 'sub' | 'dub') => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'antigravity';
  text: string;
  thoughts?: string;
  actionResult?: any;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: '🔴 Netflix Mode', query: 'Switch to Netflix platform theme and showcase Top 10.' },
  { label: '🔵 Disney+ Mode', query: 'Switch to Disney+ platform theme and open Marvel/Star Wars vault.' },
  { label: '💠 Prime Video', query: 'Switch to Prime Video platform theme.' },
  { label: '📺 Anime Hub', query: 'Take me to the Anime Hub with simulcast schedules.' },
  { label: '🏥 System Health', query: 'Run a full system health check and diagnostic.' },
  { label: '🧹 Purge Memory Cache', query: 'Clear memory cache to refresh all media feeds.' },
  { label: '📖 Sync to Kobo', query: 'How do I sync e-books to my Kobo wirelessly?' }
];

export const AntigravityAssistant: React.FC<AntigravityAssistantProps> = ({
  currentTab = 'home',
  activeMediaTitle = '',
  activeMediaId = '',
  onNavigate,
  onSetPlatform,
  onSearch,
  onSetAudioPreference
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    return localStorage.getItem('antigravity_open') === 'true';
  });
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    return localStorage.getItem('antigravity_pinned') === 'true';
  });
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'controls'>('chat');
  const [inputVal, setInputVal] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'antigravity',
      text: `👋 **Hi! I'm Antigravity, your in-app developer & AI companion.**\n\nI can make **live modifications** right now: switch platform themes (*Netflix, Disney+, Prime, Max*), navigate tabs, test video streams, purge cache, or adjust player settings.\n\n*Tip: Click the 📌 Pin icon at the top to keep me locked open while you browse!*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [expandedThoughts, setExpandedThoughts] = useState<{ [key: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Sync open & pinned state to localStorage
  useEffect(() => {
    localStorage.setItem('antigravity_open', isOpen ? 'true' : 'false');
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('antigravity_pinned', isPinned ? 'true' : 'false');
  }, [isPinned]);

  // Global Keyboard Toggle Shortcut: Ctrl + Space or Alt + A or Ctrl + `
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.code === 'Space') ||
        (e.altKey && (e.key === 'a' || e.key === 'A')) ||
        (e.ctrlKey && e.key === '`')
      ) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen && activeSubTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading, activeSubTab]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Web Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputVal((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const { showWarning } = useToast();

  const toggleVoiceDictation = () => {
    if (!recognitionRef.current) {
      showWarning('Speech recognition is not supported in this browser.', 'Voice Dictation');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  // Process and execute in-app actions returned by Antigravity AI
  const executeActionResult = (action: any) => {
    if (!action) return;

    if (action.type === 'SET_PLATFORM') {
      if (onSetPlatform) onSetPlatform(action.platform);
      if (onNavigate && action.tab) onNavigate(action.tab);
    } else if (action.type === 'NAVIGATE') {
      if (onNavigate && action.tab) onNavigate(action.tab);
    } else if (action.type === 'SEARCH') {
      if (onSearch && action.query) onSearch(action.query);
    } else if (action.type === 'SET_AUDIO') {
      if (onSetAudioPreference && action.audio) onSetAudioPreference(action.audio);
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputVal).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setLoading(true);

    try {
      const res = await api.sendAntigravityChatMessage(
        textToSend,
        {
          currentTab,
          currentMedia: activeMediaTitle || activeMediaId || 'none'
        },
        messages.slice(-6)
      );

      // Execute any live in-app modifications returned by the assistant
      if (res.actionResult) {
        executeActionResult(res.actionResult);
      }

      const agyMsg: ChatMessage = {
        id: `agy_${Date.now()}`,
        sender: 'antigravity',
        text: res.response || 'Action completed successfully.',
        thoughts: res.thoughts,
        actionResult: res.actionResult,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, agyMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'antigravity',
          text: `⚠️ Sorry, I encountered an issue: ${err.message || 'Connection failed'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleThoughts = (id: string) => {
    setExpandedThoughts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2 text-xs sm:text-sm leading-relaxed select-text">
        {lines.map((line, idx) => {
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-black text-purple-300 text-sm pt-1">
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('## ') || line.startsWith('# ')) {
            return (
              <h3 key={idx} className="font-black text-white text-base pt-1">
                {line.replace(/^[#]+\s/, '')}
              </h3>
            );
          }
          if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
            const content = line.trim().replace(/^[-•]\s/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="text-purple-400 font-black">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(content) }} />
              </div>
            );
          }
          if (/^\d+\.\s/.test(line.trim())) {
            return (
              <div key={idx} className="pl-1" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
            );
          }
          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }
          return <p key={idx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />;
        })}
      </div>
    );
  };

  const formatInlineMarkdown = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-slate-300">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-900 text-purple-300 font-mono text-[11px] border border-purple-500/30">$1</code>');
  };

  return (
    <>
      {/* -------------------------------------------------------------
          1. FLOATING ANTIGRAVITY LAUNCHER ORB
         ------------------------------------------------------------- */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs shadow-2xl shadow-purple-600/50 border border-white/20 flex items-center gap-2.5 group transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xl"
          title="Open Antigravity AI Assistant [Ctrl + Space]"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-cyan-200 animate-spin" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="tracking-wide">Antigravity AI</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-purple-200 font-mono hidden sm:inline">
            Ctrl+Space
          </span>
        </button>
      )}

      {/* -------------------------------------------------------------
          2. ANTIGRAVITY ASSISTANT SLIDE-OVER COPILOT PANEL
         ------------------------------------------------------------- */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ${
            isExpanded
              ? 'inset-4 md:inset-x-16 md:inset-y-8'
              : 'bottom-4 right-4 w-[94vw] sm:w-[480px] md:w-[520px] h-[660px] max-h-[92vh]'
          } rounded-3xl bg-slate-950/95 border-2 ${
            isPinned ? 'border-purple-500 shadow-purple-950/90' : 'border-purple-500/40 shadow-2xl'
          } shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-in zoom-in-95 font-sans`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Title Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex-shrink-0 select-none">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-white tracking-wide">
                    Antigravity Assistant
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                    v2.4 Core
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live Copilot
                  </span>
                  <span>•</span>
                  <span>
                    Tab: <strong className="text-cyan-300 capitalize">{currentTab}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Controls: Pin, Clear, Expand, Close */}
            <div className="flex items-center gap-1 text-slate-400">
              {/* Pin Toggle Button */}
              <button
                onClick={() => setIsPinned(!isPinned)}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  isPinned
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
                title={isPinned ? 'Pinned (Never closes on click)' : 'Pin Open'}
              >
                {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
              </button>

              <button
                onClick={() =>
                  setMessages([
                    {
                      id: 'welcome',
                      sender: 'antigravity',
                      text: `Conversation cleared. What live modifications would you like to make?`,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  ])
                }
                className="p-1.5 rounded-xl hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title="Clear Chat History"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-xl hover:bg-slate-800 hover:text-white transition-colors hidden sm:block cursor-pointer"
                title={isExpanded ? 'Minimize Window' : 'Expand Window'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  if (isPinned) {
                    const confirmClose = window.confirm('Antigravity is pinned open. Close it anyway?');
                    if (!confirmClose) return;
                  }
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-xl hover:bg-rose-500/20 hover:text-rose-400 transition-colors cursor-pointer"
                title="Close Copilot"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub-Tabs: AI Chat vs Live App Modder */}
          <div className="flex items-center border-b border-slate-800 bg-slate-950/60 px-4 py-1.5 gap-2 text-xs font-bold flex-shrink-0">
            <button
              onClick={() => setActiveSubTab('chat')}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                activeSubTab === 'chat'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💬 AI Copilot
            </button>
            <button
              onClick={() => setActiveSubTab('controls')}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                activeSubTab === 'controls'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚡ Live App Controls
            </button>
          </div>

          {/* Quick Prompts Carousel */}
          {activeSubTab === 'chat' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 border-b border-slate-800/80 overflow-x-auto scrollbar-none flex-shrink-0">
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.query)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-purple-600 hover:text-white border border-purple-500/20 text-slate-300 text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer shadow-sm"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* -------------------------------------------------------------
              TAB 1: CONVERSATIONAL CHAT FEED
             ------------------------------------------------------------- */}
          {activeSubTab === 'chat' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`space-y-2 max-w-[85%] sm:max-w-[78%]`}>
                      <div
                        className={`p-4 rounded-2xl shadow-lg ${
                          isUser
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-900 border border-purple-500/30 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {/* AI Reasoning Accordion */}
                        {msg.thoughts && (
                          <div className="mb-2 pb-2 border-b border-slate-800">
                            <button
                              onClick={() => toggleThoughts(msg.id)}
                              className="flex items-center gap-1.5 text-[11px] text-purple-400 hover:text-purple-300 font-bold transition-colors cursor-pointer"
                            >
                              <Wand2 className="w-3.5 h-3.5" />
                              <span>Live Action Trace</span>
                              {expandedThoughts[msg.id] ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>

                            {expandedThoughts[msg.id] && (
                              <div className="mt-1.5 p-2 rounded-xl bg-slate-950 border border-purple-500/20 text-[11px] font-mono text-purple-200 leading-relaxed">
                                {msg.thoughts}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Main Message */}
                        {renderFormattedText(msg.text)}

                        {/* Bottom Timestamp & Copy */}
                        <div className="flex items-center justify-between pt-2 text-[10px] text-slate-400 opacity-80">
                          <span>{msg.timestamp}</span>
                          {!isUser && (
                            <button
                              onClick={() => handleCopyText(msg.id, msg.text)}
                              className="hover:text-white transition-colors cursor-pointer"
                              title="Copy Response"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 shadow">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-3 text-purple-400 animate-fade-in pl-1">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/40 flex items-center justify-center text-purple-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-900 border border-purple-500/20 text-xs font-semibold text-purple-300 flex items-center gap-2">
                    <span>Executing live in-app adjustments...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* -------------------------------------------------------------
              TAB 2: LIVE IN-APP CONTROLS & MODDING PANEL
             ------------------------------------------------------------- */}
          {activeSubTab === 'controls' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-6 animate-in fade-in">
              {/* Platform Theme Modder */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Palette className="w-4 h-4" />
                  <span>Instant Platform Transformation</span>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (onSetPlatform) onSetPlatform('netflix');
                      if (onNavigate) onNavigate('media');
                    }}
                    className="p-3 rounded-2xl bg-red-950/60 border border-red-600/40 hover:border-red-500 text-left space-y-1 transition-all hover:scale-105 cursor-pointer shadow-md"
                  >
                    <div className="text-sm font-black text-red-500">NETFLIX</div>
                    <div className="text-[10px] text-slate-300">Billboard &amp; Top 10 Rails</div>
                  </button>

                  <button
                    onClick={() => {
                      if (onSetPlatform) onSetPlatform('disney');
                      if (onNavigate) onNavigate('media');
                    }}
                    className="p-3 rounded-2xl bg-blue-950/60 border border-blue-600/40 hover:border-blue-500 text-left space-y-1 transition-all hover:scale-105 cursor-pointer shadow-md"
                  >
                    <div className="text-sm font-black text-blue-400">Disney+</div>
                    <div className="text-[10px] text-slate-300">Marvel &amp; Star Wars Vault</div>
                  </button>

                  <button
                    onClick={() => {
                      if (onSetPlatform) onSetPlatform('prime');
                      if (onNavigate) onNavigate('media');
                    }}
                    className="p-3 rounded-2xl bg-sky-950/60 border border-sky-600/40 hover:border-sky-500 text-left space-y-1 transition-all hover:scale-105 cursor-pointer shadow-md"
                  >
                    <div className="text-sm font-black text-sky-400">Prime Video</div>
                    <div className="text-[10px] text-slate-300">Amazon Originals</div>
                  </button>

                  <button
                    onClick={() => {
                      if (onSetPlatform) onSetPlatform('max');
                      if (onNavigate) onNavigate('media');
                    }}
                    className="p-3 rounded-2xl bg-purple-950/60 border border-purple-600/40 hover:border-purple-500 text-left space-y-1 transition-all hover:scale-105 cursor-pointer shadow-md"
                  >
                    <div className="text-sm font-black text-purple-400">Max (HBO)</div>
                    <div className="text-[10px] text-slate-300">Prestige Collection</div>
                  </button>
                </div>
              </div>

              {/* Navigation Shortcuts */}
              <div className="space-y-2.5 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Compass className="w-4 h-4" />
                  <span>Instant Hub Jump</span>
                </h4>
                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  <button
                    onClick={() => onNavigate && onNavigate('anime')}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-purple-600 hover:text-white border border-slate-800 text-slate-300 transition-colors"
                  >
                    Anime Hub
                  </button>
                  <button
                    onClick={() => onNavigate && onNavigate('ebooks')}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-purple-600 hover:text-white border border-slate-800 text-slate-300 transition-colors"
                  >
                    E-Books
                  </button>
                  <button
                    onClick={() => onNavigate && onNavigate('browse')}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-purple-600 hover:text-white border border-slate-800 text-slate-300 transition-colors"
                  >
                    Comics &amp; Manga
                  </button>
                </div>
              </div>

              {/* Memory & Cache Diagnostics */}
              <div className="space-y-2.5 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  <span>System Self-Healing</span>
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSendMessage('Clear memory cache to refresh all media feeds.')}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-amber-600 hover:text-white border border-slate-800 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Flush Cache</span>
                  </button>
                  <button
                    onClick={() => handleSendMessage('Run a full system health check and diagnostic.')}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-emerald-600 hover:text-white border border-slate-800 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Diagnostics</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Context Footer Banner */}
          {activeMediaTitle && (
            <div className="px-4 py-1.5 bg-slate-900/60 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center gap-2 flex-shrink-0">
              <Tv className="w-3 h-3 text-purple-400" />
              <span>
                Active Context: <strong className="text-white">{activeMediaTitle}</strong>
              </span>
            </div>
          )}

          {/* Message Input Form */}
          {activeSubTab === 'chat' && (
            <div className="p-3 sm:p-4 bg-slate-900/95 border-t border-slate-800 flex items-end gap-2 flex-shrink-0">
              {/* Voice Dictation Button */}
              <button
                onClick={toggleVoiceDictation}
                className={`p-3 rounded-2xl transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
                title={isListening ? 'Listening... click to stop' : 'Voice Input (Speech-to-Text)'}
              >
                {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              {/* Input Text Area */}
              <textarea
                ref={inputRef}
                rows={1}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isListening
                    ? 'Listening to your voice...'
                    : 'Make live changes, switch platform, ask questions...'
                }
                className="flex-1 max-h-32 min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-950 border border-purple-500/30 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-purple-400 resize-none font-sans"
              />

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={loading || !inputVal.trim()}
                className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 disabled:opacity-40 transition-all cursor-pointer flex-shrink-0 hover:scale-105 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
