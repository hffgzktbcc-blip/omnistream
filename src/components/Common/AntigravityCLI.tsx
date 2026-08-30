import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import {
  Terminal,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  Zap,
  Sparkles,
  ShieldCheck,
  Activity,
  Send,
  HelpCircle,
  RotateCcw,
  Cpu,
  Radio,
  ChevronRight
} from 'lucide-react';

interface AntigravityCLIProps {
  currentTab?: string;
  activeMediaTitle?: string;
  activeMediaId?: string | number;
}

interface CommandLog {
  id: string;
  command: string;
  output: string;
  timestamp: string;
  isError?: boolean;
}

export const AntigravityCLI: React.FC<AntigravityCLIProps> = ({
  currentTab = 'home',
  activeMediaTitle = '',
  activeMediaId = ''
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [inputVal, setInputVal] = useState<string>('');
  const [logs, setLogs] = useState<CommandLog[]>([
    {
      id: 'init',
      command: 'agy --version',
      output: `🚀 ANTIGRAVITY IN-APP CLI [v2.4.0-omnistream]
Agentic Developer Engine & Live App Copilot Ready.
Type "help" to view commands or "prompt <instructions>" for direct AI corrections.
Toggle CLI anytime with [Ctrl + \`] or [Alt + A].`,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [loading, setLoading] = useState<boolean>(false);
  const [sysStatus, setSysStatus] = useState<any>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Keyboard Toggle Shortcut: Ctrl + ` or Alt + A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === '`') || (e.altKey && (e.key === 'a' || e.key === 'A'))) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch status on open
  useEffect(() => {
    if (isOpen) {
      api.getAntigravityStatus().then((s) => {
        if (s) setSysStatus(s);
      });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    if (isOpen && !isMinimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen, isMinimized]);

  const handleRunCommand = async (cmdToRun?: string) => {
    const text = (cmdToRun || inputVal).trim();
    if (!text) return;

    if (text.toLowerCase() === 'clear') {
      setLogs([]);
      setInputVal('');
      return;
    }

    setHistory((prev) => [...prev, text]);
    setHistoryIdx(-1);
    setInputVal('');
    setLoading(true);

    const logEntry: CommandLog = {
      id: `cmd_${Date.now()}`,
      command: text,
      output: 'Running...',
      timestamp: new Date().toLocaleTimeString()
    };

    setLogs((prev) => [...prev, logEntry]);

    try {
      const res = await api.execAntigravityCommand(text, {
        currentTab,
        currentMedia: activeMediaTitle || activeMediaId || 'none'
      });

      setLogs((prev) =>
        prev.map((l) =>
          l.id === logEntry.id ? { ...l, output: res.output } : l
        )
      );
    } catch (err: any) {
      setLogs((prev) =>
        prev.map((l) =>
          l.id === logEntry.id
            ? { ...l, output: `❌ Error: ${err.message || 'Execution failed'}`, isError: true }
            : l
        )
      );
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRunCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInputVal(history[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= history.length) {
        setHistoryIdx(-1);
        setInputVal('');
      } else {
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx] || '');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const commands = ['help', 'status', 'health', 'test-streams', 'clear-cache', 'logs', 'anime-sync', 'stats', 'prompt', 'clear'];
      const match = commands.find((c) => c.startsWith(inputVal.toLowerCase().trim()));
      if (match) setInputVal(match);
    }
  };

  return (
    <>
      {/* Floating Antigravity Orb Launcher */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-50 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-mono text-xs font-black shadow-2xl shadow-purple-600/40 border border-white/20 flex items-center gap-2 group transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
          title="Open Antigravity In-App CLI [Ctrl + `]"
        >
          <Terminal className="w-4 h-4 text-cyan-300 animate-pulse" />
          <span className="tracking-wider">AGY &gt;_</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping hidden group-hover:block" />
        </button>
      )}

      {/* Terminal Window Overlay */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ${
            isMinimized
              ? 'bottom-4 right-4 w-80 h-14'
              : 'bottom-4 right-4 w-[92vw] sm:w-[620px] md:w-[720px] h-[540px] max-h-[85vh]'
          } rounded-3xl bg-slate-950/95 border border-purple-500/40 shadow-2xl shadow-purple-950/80 backdrop-blur-2xl flex flex-col overflow-hidden font-mono text-xs animate-in zoom-in-95`}
        >
          {/* Terminal Window Title Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 select-none flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex items-center gap-2 pl-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-white tracking-wide">
                  Antigravity In-App CLI
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  ONLINE
                </span>
              </div>
            </div>

            {/* Context Badge & Window Controls */}
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 hidden sm:inline">
                Tab: <strong className="text-cyan-300">{currentTab}</strong>
              </span>
              <button
                onClick={() => setLogs([])}
                className="p-1 rounded-lg hover:bg-slate-800 hover:text-white"
                title="Clear Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded-lg hover:bg-slate-800 hover:text-white"
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-rose-500/20 hover:text-rose-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Quick Command Action Chips */}
              <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-900/40 border-b border-slate-800/60 overflow-x-auto scrollbar-none flex-shrink-0 text-[11px]">
                <button
                  onClick={() => handleRunCommand('status')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 flex items-center gap-1 whitespace-nowrap transition-colors"
                >
                  <Activity className="w-3 h-3" />
                  <span>Status</span>
                </button>
                <button
                  onClick={() => handleRunCommand('health')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 whitespace-nowrap transition-colors"
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>Health</span>
                </button>
                <button
                  onClick={() => handleRunCommand('test-streams')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 flex items-center gap-1 whitespace-nowrap transition-colors"
                >
                  <Radio className="w-3 h-3" />
                  <span>Test Streams</span>
                </button>
                <button
                  onClick={() => handleRunCommand('clear-cache')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 flex items-center gap-1 whitespace-nowrap transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Flush Cache</span>
                </button>
                <button
                  onClick={() => handleRunCommand('help')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 whitespace-nowrap transition-colors"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Help</span>
                </button>
              </div>

              {/* Terminal Logs & Output Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-slate-300 leading-relaxed select-text">
                {logs.map((log) => (
                  <div key={log.id} className="space-y-1">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold">
                      <ChevronRight className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <span className="text-purple-400">agy:omnistream&gt;</span>
                      <span className="text-white">{log.command}</span>
                      <span className="text-[10px] text-slate-500 ml-auto font-normal">{log.timestamp}</span>
                    </div>
                    <pre
                      className={`pl-5 text-[11px] whitespace-pre-wrap ${
                        log.isError ? 'text-rose-400' : 'text-slate-300'
                      }`}
                    >
                      {log.output}
                    </pre>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-purple-400 animate-pulse pl-5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing in Antigravity runtime...</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Prompt Input Form */}
              <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2 flex-shrink-0">
                <span className="text-purple-400 font-bold select-none pl-1 flex items-center gap-1">
                  <span>agy</span>
                  <span className="text-cyan-400">&gt;</span>
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={handleKeyDownInput}
                  placeholder='Type a command ("help", "status", "test-streams") or "prompt <text>"...'
                  className="flex-1 bg-transparent text-white placeholder-slate-600 focus:outline-none font-mono text-xs"
                />
                <button
                  onClick={() => handleRunCommand()}
                  disabled={loading || !inputVal.trim()}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 shadow transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span className="hidden sm:inline">Exec</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
