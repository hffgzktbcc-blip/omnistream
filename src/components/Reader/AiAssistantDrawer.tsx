import React, { useState, useEffect } from 'react';
import { Comic, Chapter } from '../../types/comic';
import { aiService, ComicIntelResponse } from '../../services/aiService';
import {
  X,
  Sparkles,
  Bot,
  Volume2,
  VolumeX,
  Send,
  HelpCircle,
  Users,
  BookOpen,
  Loader2,
  Lightbulb
} from 'lucide-react';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  comic: Comic;
  chapter: Chapter;
  currentPage: number;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  comic,
  chapter,
  currentPage
}) => {
  const [intel, setIntel] = useState<ComicIntelResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'recap' | 'characters' | 'qa'>('recap');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [question, setQuestion] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([]);
  const [asking, setAsking] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      aiService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    setLoading(true);
    aiService.getComicIntel(comic.title, chapter.title)
      .then((data) => setIntel(data))
      .finally(() => setLoading(false));
  }, [isOpen, comic.title, chapter.title]);

  const toggleVoiceover = () => {
    if (isSpeaking) {
      aiService.stopSpeaking();
      setIsSpeaking(false);
    } else {
      if (intel) {
        setIsSpeaking(true);
        aiService.speakText(intel.summary, () => setIsSpeaking(false));
      }
    }
  };

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || asking) return;

    const userQ = question.trim();
    setQuestion('');
    setChatHistory((prev) => [...prev, { sender: 'user', text: userQ }]);
    setAsking(true);

    try {
      const answer = await aiService.askQuestion(comic.title, userQ);
      setChatHistory((prev) => [...prev, { sender: 'ai', text: answer }]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'ai', text: 'Sorry, I could not retrieve an answer right now.' }
      ]);
    } finally {
      setAsking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900/95 border-l border-slate-800 shadow-2xl backdrop-blur-2xl flex flex-col animate-slide-up"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white">AI Comic Companion</h3>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Lore, character intel & voiceover</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 p-1.5 gap-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('recap')}
          className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'recap'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Story Recap</span>
        </button>

        <button
          onClick={() => setActiveTab('characters')}
          className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'characters'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Characters</span>
        </button>

        <button
          onClick={() => setActiveTab('qa')}
          className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'qa'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Ask AI</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-7 h-7 text-purple-500 animate-spin" />
            <span className="text-xs">Analyzing story arcs and characters...</span>
          </div>
        ) : (
          <>
            {/* 1. STORY RECAP TAB */}
            {activeTab === 'recap' && intel && (
              <div className="space-y-4">
                {/* Voiceover Bar */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white text-xs">Voiceover Narration</span>
                  </div>
                  <button
                    onClick={toggleVoiceover}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-[11px] transition-all ${
                      isSpeaking
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                    }`}
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Stop Voice</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Read Aloud</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Recap Body */}
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                    Current Arc Summary
                  </h4>
                  <p className="text-slate-200 leading-relaxed bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                    {intel.summary}
                  </p>
                </div>

                {/* Themes */}
                <div className="space-y-1.5">
                  <h4 className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Key Plot Themes</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {intel.keyThemes.map((theme, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Reading Tip */}
                {intel.readingTip && (
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-950/20 border border-blue-500/20 text-blue-300">
                    <Lightbulb className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-snug">{intel.readingTip}</p>
                  </div>
                )}
              </div>
            )}

            {/* 2. CHARACTERS TAB */}
            {activeTab === 'characters' && intel && (
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Key Characters & Roles
                </h4>
                {intel.characters.map((c, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{c.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-semibold">
                        {c.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{c.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 3. ASK AI TAB */}
            {activeTab === 'qa' && (
              <div className="flex flex-col h-full space-y-3">
                <div className="flex-1 space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-purple-300 text-[11px]">
                    Ask me anything about <strong className="text-white">{comic.title}</strong>, character motivations, power scaling, or plot questions!
                  </div>

                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl leading-relaxed text-xs ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white ml-6'
                          : 'bg-slate-950 border border-slate-800 text-slate-200 mr-4'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}

                  {asking && (
                    <div className="flex items-center gap-2 text-slate-400 p-2 text-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                      <span>AI is thinking...</span>
                    </div>
                  )}
                </div>

                {/* Input form */}
                <form onSubmit={handleSendQuestion} className="flex gap-2 pt-2 border-t border-slate-800">
                  <input
                    type="text"
                    placeholder="Ask about this chapter..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="flex-1 bg-slate-950 text-slate-200 text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={!question.trim() || asking}
                    className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white shadow-md transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
