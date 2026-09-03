import React from 'react';
import { X, Moon, Clock, Check } from 'lucide-react';

interface AudiobookTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTimer: number | null; // minutes or -1 for end of chapter, or null
  secondsLeft: number | null;
  onSetTimer: (minutes: number | null) => void;
}

export const AudiobookTimerModal: React.FC<AudiobookTimerModalProps> = ({
  isOpen,
  onClose,
  activeTimer,
  secondsLeft,
  onSetTimer
}) => {
  if (!isOpen) return null;

  const options = [
    { label: 'Off', value: null },
    { label: '5 Minutes', value: 5 },
    { label: '15 Minutes', value: 15 },
    { label: '30 Minutes', value: 30 },
    { label: '45 Minutes', value: 45 },
    { label: '60 Minutes', value: 60 },
    { label: 'End of Chapter', value: -1 }
  ];

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f1422] border border-blue-900/50 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Sleep Timer</h3>
              {secondsLeft && secondsLeft > 0 ? (
                <p className="text-[11px] text-amber-400 font-mono font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 animate-spin" /> Stopping in {formatCountdown(secondsLeft)}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">Auto pause playback</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-1.5">
          {options.map((opt) => {
            const isSelected = activeTimer === opt.value;
            return (
              <button
                key={opt.label}
                onClick={() => {
                  onSetTimer(opt.value);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-slate-200 border border-slate-800/80'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 text-slate-950 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
