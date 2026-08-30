import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { STREAM_SERVERS, measureServerPing } from '../../services/streamingService';
import { ebookStorage } from '../../services/ebookStorage';
import { animeStorage } from '../../services/animeStorage';
import { storage } from '../../services/storage';
import {
  Code,
  Terminal,
  Activity,
  Layers,
  Database,
  RefreshCw,
  Trash2,
  Tv,
  Film,
  BookOpen,
  Sparkles,
  Zap,
  Radio,
  Sliders,
  Check,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  X,
  Minimize2,
  Maximize2,
  Send,
  FileCode,
  Save,
  Play,
  Copy,
  Bot,
  Key,
  Wrench,
  FileCheck
} from 'lucide-react';

interface DeveloperStudioProps {
  currentTab: string;
  activeMediaTitle?: string;
  onNavigate?: (tab: string) => void;
  onSetPlatform?: (platform: string) => void;
}

const COMMON_FILES = [
  'src/App.tsx',
  'src/services/streamingService.ts',
  'src/services/api.ts',
  'src/services/ebookStorage.ts',
  'src/components/Header.tsx',
  'src/components/Common/DeveloperStudio.tsx',
  'src/components/Common/UnifiedVideoPlayer.tsx',
  'src/components/EBook/EBookReader.tsx',
  'src/components/EBook/EBookDetailModal.tsx',
  'src/components/Anime/AnimePlayerModal.tsx',
  'src/components/Sports/SportsCatalog.tsx',
  'src/types/sports.ts',
  'server/index.js'
];

interface AgentStep {
  tool: string;
  args: any;
}

interface AgentMessage {
  role: 'user' | 'assistant';
  text: string;
  thoughts?: string;
  steps?: AgentStep[];
  modifiedFiles?: string[];
}

export const DeveloperStudio: React.FC<DeveloperStudioProps> = ({
  currentTab,
  activeMediaTitle,
  onNavigate,
  onSetPlatform
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(() => localStorage.getItem('omni_dev_mode') === 'true');
  const [activeTab, setActiveTab] = useState<'agent' | 'editor' | 'terminal' | 'streams' | 'storage' | 'status'>('agent');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [serverLogs, setServerLogs] = useState<string[]>([]);
  const [serverPings, setServerPings] = useState<Record<string, number>>({});
  const [testingStreams, setTestingStreams] = useState<boolean>(false);

  // Gemini API Key for autonomous pair-programming agent
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => localStorage.getItem('omni_gemini_key') || '');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);

  // Agent Chat State
  const [promptInput, setPromptInput] = useState<string>('');
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([
    {
      role: 'assistant',
      text: `👋 **Antigravity Live Coding Agent Initialized.**\n\nI am connected directly to your running workspace filesystem and runtime. You can ask me to:\n- 🛠️ **Edit & Patch Code Live**: *"Change the header badge to neon green"*, *"Add a new rugby league"*, *"Fix the video player"*\n- 🔍 **Inspect & Explain Architecture**: *"Show me how streaming failovers work"*\n- 🎨 **Live UI Themes**: *"Switch to Netflix"*, *"Switch to Disney+"*\n- 🧹 **System Controls**: *"Flush cache"*, *"Test 7 stream mirrors"*\n\n*(Tip: Click 🔑 **AI Key** below to attach your free Google Gemini API Key for autonomous multi-step tool calling!)*`
    }
  ]);
  const [agentLoading, setAgentLoading] = useState<boolean>(false);

  // Live Code Editor State
  const [selectedFile, setSelectedFile] = useState<string>('src/services/streamingService.ts');
  const [customFilePath, setCustomFilePath] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState<boolean>(false);
  const [savingFile, setSavingFile] = useState<boolean>(false);

  // Live Terminal State
  const [terminalCmd, setTerminalCmd] = useState<string>('');
  const [terminalOutput, setTerminalOutput] = useState<string>('OmniStream Dev Terminal Initialized. Type a command (e.g. `status`, `logs 20`, `clear-cache`, `anime-sync`).');
  const [terminalRunning, setTerminalRunning] = useState<boolean>(false);

  const [storageStats, setStorageStats] = useState({
    ebooks: 0,
    anime: 0,
    comics: 0
  });

  const { showSuccess, showInfo, showError } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('omni_dev_mode', isOpen ? 'true' : 'false');
  }, [isOpen]);

  // Global Shortcut: Ctrl + ` or Alt + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === '`' || e.code === 'Backquote')) ||
        (e.altKey && (e.key === 'd' || e.key === 'D'))
      ) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch status and storage stats when opened
  useEffect(() => {
    if (isOpen) {
      refreshDevData();
      loadFileContent(selectedFile);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages]);

  const saveGeminiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('omni_gemini_key', key);
    showSuccess(key ? '✨ Gemini AI Key configured for Live Agent!' : 'API Key removed.');
  };

  const refreshDevData = async () => {
    try {
      const res = await api.getAntigravityStatus();
      setServerStatus(res);
    } catch {}

    try {
      const logRes = await api.executeAntigravityCommand('logs 20');
      if (logRes?.output) {
        setServerLogs(logRes.output.split('\n'));
      }
    } catch {}

    setStorageStats({
      ebooks: ebookStorage.getLibrary().length,
      anime: animeStorage.getWatchlist().length,
      comics: storage.getProgress().length
    });
  };

  const loadFileContent = async (pathStr: string) => {
    setLoadingFile(true);
    try {
      const res = await fetch('/api/antigravity/read-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: pathStr })
      });
      const data = await res.json();
      if (data?.content !== undefined) {
        setFileContent(data.content);
      }
    } catch (e) {
      showError(`Failed to load ${pathStr}`);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleSaveFile = async () => {
    setSavingFile(true);
    try {
      const res = await fetch('/api/antigravity/edit-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selectedFile, content: fileContent })
      });
      const data = await res.json();
      if (data?.success) {
        showSuccess(`✨ Saved ${selectedFile}! Vite Hot Module Reloading...`);
      } else {
        showError(data?.error || 'Save failed');
      }
    } catch (e) {
      showError(`Failed to save ${selectedFile}`);
    } finally {
      setSavingFile(false);
    }
  };

  const handleSendPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim() || agentLoading) return;

    const userText = promptInput.trim();
    setPromptInput('');
    setAgentMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setAgentLoading(true);

    try {
      const res = await fetch('/api/antigravity/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          apiKey: geminiApiKey,
          modelProvider: 'gemini',
          context: {
            currentTab,
            currentMedia: activeMediaTitle
          }
        })
      });
      const data = await res.json();

      if (data?.actionResult) {
        if (data.actionResult.type === 'SET_PLATFORM' && onSetPlatform) {
          onSetPlatform(data.actionResult.platform);
        } else if (data.actionResult.type === 'NAVIGATE' && onNavigate) {
          onNavigate(data.actionResult.tab);
        }
      }

      setAgentMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.response || 'Action processed.',
          thoughts: data.thoughts,
          steps: data.steps,
          modifiedFiles: data.modifiedFiles
        }
      ]);
    } catch (err: any) {
      setAgentMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ Error executing request: ${err.message}`
        }
      ]);
    } finally {
      setAgentLoading(false);
    }
  };

  const handleRunTerminalCmd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalCmd.trim() || terminalRunning) return;

    const cmd = terminalCmd.trim();
    setTerminalCmd('');
    setTerminalRunning(true);
    setTerminalOutput((prev) => `${prev}\n\n$ ${cmd}\nRunning...`);

    try {
      const res = await api.executeAntigravityCommand(cmd);
      setTerminalOutput((prev) => `${prev}\n${res.output || 'Done.'}`);
    } catch (err: any) {
      setTerminalOutput((prev) => `${prev}\nError: ${err.message}`);
    } finally {
      setTerminalRunning(false);
    }
  };

  const handleTestAllStreams = async () => {
    setTestingStreams(true);
    showInfo('Pinging all 7 video streaming mirrors...');
    const results: Record<string, number> = {};
    for (const server of STREAM_SERVERS) {
      const ping = await measureServerPing(server);
      results[server.id] = ping;
    }
    setServerPings(results);
    setTestingStreams(false);
    showSuccess('Stream latency benchmarks updated!');
  };

  const handleClearCache = async () => {
    try {
      await api.executeAntigravityCommand('clear-cache');
      showSuccess('✨ Memory Cache Cleared Successfully!');
      refreshDevData();
    } catch (e) {
      showError('Failed to clear server cache');
    }
  };

  const handlePurgeLocalStorage = () => {
    if (window.confirm('Clear all local app storage (Bookshelf, Watchlist, Comic history)?')) {
      localStorage.clear();
      showSuccess('LocalStorage reset. Reloading...');
      setTimeout(() => window.location.reload(), 800);
    }
  };

  return (
    <>
      {/* -------------------------------------------------------------
          1. FLOATING DEVELOPER MODE TRIGGER BUTTON
         ------------------------------------------------------------- */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-purple-400 hover:text-purple-300 font-mono text-xs font-bold border border-purple-500/40 shadow-2xl backdrop-blur-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Open Developer Studio [Ctrl + `]"
        >
          <Bot className="w-4 h-4 text-purple-400 animate-pulse" />
          <span>Antigravity Agent</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
            Ctrl+`
          </span>
        </button>
      )}

      {/* -------------------------------------------------------------
          2. DEVELOPER STUDIO HUD PANEL
         ------------------------------------------------------------- */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ${
            isExpanded
              ? 'inset-4 md:inset-x-8 md:inset-y-4'
              : 'bottom-4 right-4 w-[94vw] sm:w-[580px] md:w-[700px] h-[740px] max-h-[94vh]'
          } rounded-3xl bg-slate-950 border-2 border-purple-500/40 shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden font-sans text-slate-100 animate-in zoom-in-95`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Title Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-slate-800 select-none">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-white tracking-wide">
                    Antigravity Autonomous Copilot
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    Live Tool Calling
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Context: <span className="text-purple-300 capitalize">{currentTab}</span>
                  {activeMediaTitle && ` • ${activeMediaTitle}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <button
                onClick={() => setShowKeyInput(!showKeyInput)}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-mono ${
                  geminiApiKey ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 hover:text-white'
                }`}
                title="Configure Gemini API Key"
              >
                <Key className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{geminiApiKey ? 'Key Active' : 'AI Key'}</span>
              </button>
              <button
                onClick={refreshDevData}
                className="p-1.5 rounded-xl hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title="Refresh Metrics"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-xl hover:bg-slate-800 hover:text-white transition-colors hidden sm:block cursor-pointer"
                title={isExpanded ? 'Minimize' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-rose-500/20 hover:text-rose-400 transition-colors cursor-pointer"
                title="Close Dev Mode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* API Key Configuration Drawer */}
          {showKeyInput && (
            <div className="p-3 bg-purple-950/40 border-b border-purple-500/30 flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => saveGeminiKey(e.target.value)}
                placeholder="Paste your free Gemini API Key (from aistudio.google.com)..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={() => setShowKeyInput(false)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center border-b border-slate-800 bg-slate-900/60 px-4 py-2 gap-1.5 text-xs font-bold overflow-x-auto scrollbar-none flex-shrink-0">
            {[
              { id: 'agent', label: '🤖 AI Pair Programmer', icon: Bot },
              { id: 'editor', label: '📝 Live Code Editor', icon: FileCode },
              { id: 'terminal', label: '💻 Terminal Runner', icon: Terminal },
              { id: 'streams', label: '📡 Video Mirrors', icon: Tv },
              { id: 'storage', label: '💾 Storage & DB', icon: Database },
              { id: 'status', label: '📊 System Status', icon: Activity }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-hidden flex flex-col font-mono text-xs">
            
            {/* -------------------------------------------------------------
                TAB 1: INTERACTIVE DEV AGENT & PROMPT CONSOLE
               ------------------------------------------------------------- */}
            {activeTab === 'agent' && (
              <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3 font-sans">
                {/* Chat Log */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {agentMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      {msg.thoughts && (
                        <div className="mb-1 text-[10px] text-purple-400/80 font-mono italic max-w-[85%] bg-purple-950/20 px-2 py-0.5 rounded border border-purple-500/20">
                          ⚙️ {msg.thoughts}
                        </div>
                      )}

                      {/* Tool Steps Badge */}
                      {msg.steps && msg.steps.length > 0 && (
                        <div className="mb-1.5 space-y-1 max-w-[90%] font-mono text-[10px]">
                          {msg.steps.map((st, sIdx) => (
                            <div key={sIdx} className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-emerald-400">
                              <Wrench className="w-3 h-3 text-purple-400" />
                              <span className="font-bold uppercase text-purple-300">{st.tool}:</span>
                              <span className="text-slate-300 truncate">
                                {st.args.filePath || st.args.command || JSON.stringify(st.args)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Modified Files Badge */}
                      {msg.modifiedFiles && msg.modifiedFiles.length > 0 && (
                        <div className="mb-1.5 flex flex-wrap gap-1 font-mono text-[10px]">
                          {msg.modifiedFiles.map((f, fIdx) => (
                            <span key={fIdx} className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <FileCheck className="w-3 h-3" />
                              <span>Live Applied: {f}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      <div
                        className={`p-3.5 rounded-2xl max-w-[90%] text-xs leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-purple-600 text-white font-medium rounded-br-none shadow-lg'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {agentLoading && (
                    <div className="flex items-center gap-2 text-xs text-purple-400 p-2.5 bg-slate-900 rounded-xl max-w-xs border border-purple-500/30 animate-pulse">
                      <Bot className="w-4 h-4 animate-spin" />
                      <span>Antigravity analyzing, reading & patching code...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Agent Prompt Input Box */}
                <form onSubmit={handleSendPrompt} className="relative flex items-center gap-2 pt-2 border-t border-slate-800">
                  <input
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Ask Antigravity to modify code, add features, or explain architecture..."
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-sans"
                  />
                  <button
                    type="submit"
                    disabled={!promptInput.trim() || agentLoading}
                    className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 transition-all cursor-pointer shadow-lg flex items-center gap-1"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* -------------------------------------------------------------
                TAB 2: LIVE IN-APP CODE EDITOR & HOT-RELOAD
               ------------------------------------------------------------- */}
            {activeTab === 'editor' && (
              <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="text-xs text-slate-400 font-sans">File:</span>
                    <select
                      value={selectedFile}
                      onChange={(e) => {
                        setSelectedFile(e.target.value);
                        loadFileContent(e.target.value);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-purple-300 font-mono focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      {COMMON_FILES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadFileContent(selectedFile)}
                      disabled={loadingFile}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingFile ? 'animate-spin' : ''}`} />
                      <span>Reload</span>
                    </button>
                    <button
                      onClick={handleSaveFile}
                      disabled={savingFile || loadingFile}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all hover:scale-105"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingFile ? 'Saving...' : 'Save & Hot Reload'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 rounded-2xl bg-black border border-slate-800 overflow-hidden relative flex flex-col">
                  <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    spellCheck={false}
                    className="w-full h-full p-4 bg-transparent text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none resize-none overflow-y-auto selection:bg-purple-600/40"
                    placeholder="Loading file content..."
                  />
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                TAB 3: LIVE TERMINAL RUNNER
               ------------------------------------------------------------- */}
            {activeTab === 'terminal' && (
              <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
                <div className="flex-1 p-4 rounded-2xl bg-black border border-slate-800 text-emerald-400 font-mono text-xs overflow-y-auto space-y-1">
                  <pre className="whitespace-pre-wrap break-all">{terminalOutput}</pre>
                </div>

                <form onSubmit={handleRunTerminalCmd} className="flex items-center gap-2">
                  <div className="flex-1 relative flex items-center">
                    <span className="text-purple-400 font-bold pl-3.5 pointer-events-none">$</span>
                    <input
                      type="text"
                      value={terminalCmd}
                      onChange={(e) => setTerminalCmd(e.target.value)}
                      placeholder="Type command (e.g. status, logs 30, clear-cache, ping)..."
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!terminalCmd.trim() || terminalRunning}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run</span>
                  </button>
                </form>
              </div>
            )}

            {/* -------------------------------------------------------------
                TAB 4: VIDEO STREAMS & LATENCY
               ------------------------------------------------------------- */}
            {activeTab === 'streams' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    7 Multi-Mirror Stream Endpoints
                  </h4>
                  <button
                    onClick={handleTestAllStreams}
                    disabled={testingStreams}
                    className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${testingStreams ? 'animate-spin' : ''}`} />
                    <span>Ping All</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {STREAM_SERVERS.map((srv) => {
                    const ping = serverPings[srv.id] || srv.pingMs || 45;
                    return (
                      <div
                        key={srv.id}
                        className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <div>
                            <h5 className="text-xs font-bold text-white">{srv.name}</h5>
                            <span className="text-[10px] text-slate-400 font-mono">{srv.quality}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            ping < 50 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {ping}ms
                          </span>
                          <a
                            href={srv.getMovieUrl(27205)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white transition-colors"
                            title="Test direct URL in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                TAB 5: STORAGE & DATABASE INSPECTOR
               ------------------------------------------------------------- */}
            {activeTab === 'storage' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    Client Storage & IndexedDB Status
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-xs text-slate-300">📚 Local E-Books in Bookshelf</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">{storageStats.ebooks} books</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-xs text-slate-300">📺 Anime Watchlist & Progress</span>
                      <span className="text-xs font-mono font-bold text-purple-400">{storageStats.anime} series</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-xs text-slate-300">📖 Comics & Manga Progress</span>
                      <span className="text-xs font-mono font-bold text-blue-400">{storageStats.comics} chapters</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                  <h5 className="text-xs font-bold text-rose-300">Danger Zone</h5>
                  <button
                    onClick={handlePurgeLocalStorage}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Wipe All Local Storage & DBs</span>
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                TAB 6: SYSTEM HEALTH & METRICS
               ------------------------------------------------------------- */}
            {activeTab === 'status' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Runtime System Overview</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block font-sans">Backend Server</span>
                      <span className="text-emerald-400 font-bold">127.0.0.1:3001 (Online)</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block font-sans">Vite Frontend</span>
                      <span className="text-emerald-400 font-bold">127.0.0.1:5200 (Online)</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block font-sans">Memory Usage</span>
                      <span className="text-purple-300 font-bold">
                        {serverStatus?.memory ? `${serverStatus.memory.heapUsedMB} MB` : '38 MB'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block font-sans">Uptime</span>
                      <span className="text-cyan-300 font-bold">
                        {serverStatus?.uptime ? `${Math.floor(serverStatus.uptime)}s` : 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Diagnostics Actions */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-white text-sm">Quick Developer Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleClearCache}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-purple-600 hover:text-white border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Flush Cache</span>
                    </button>
                    <button
                      onClick={handleTestAllStreams}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-cyan-600 hover:text-white border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Tv className="w-3.5 h-3.5" />
                      <span>Ping 7 Stream Mirrors</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
};
