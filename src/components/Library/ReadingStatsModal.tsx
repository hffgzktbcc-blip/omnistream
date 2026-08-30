import React from 'react';
import { statsStorage } from '../../services/statsStorage';
import {
  Flame,
  BookOpen,
  Headphones,
  CheckCircle2,
  Trophy,
  X,
  Target,
  Sparkles,
  Calendar
} from 'lucide-react';

interface ReadingStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReadingStatsModal: React.FC<ReadingStatsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const stats = statsStorage.getStats();
  const goalPercentage = Math.min(
    100,
    Math.round((stats.todayPagesRead / stats.dailyGoalPages) * 100)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Reading Insights & Streaks
              </h3>
              <p className="text-xs text-slate-400">Track your daily reading consistency</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Streak & Today's Goal Card */}
        <div className="rounded-2xl bg-gradient-to-tr from-amber-950/40 to-orange-950/30 border border-amber-500/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div>
                <span className="text-xs text-amber-300 font-bold uppercase tracking-wider">
                  Current Streak
                </span>
                <p className="text-lg font-black text-white">
                  {stats.streakDays} Day Reading Streak! 🔥
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400">Goal Target</span>
              <p className="text-sm font-bold text-amber-400">
                {stats.todayPagesRead} / {stats.dailyGoalPages} pages
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                style={{ width: `${goalPercentage}%` }}
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 text-right">
              {goalPercentage}% of today&apos;s goal achieved
            </p>
          </div>
        </div>

        {/* Lifetime Activity Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-3.5 text-center space-y-1">
            <BookOpen className="w-4 h-4 text-blue-400 mx-auto" />
            <p className="text-lg font-black text-white">{stats.totalPagesRead}</p>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              Pages Read
            </span>
          </div>

          <div className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-3.5 text-center space-y-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
            <p className="text-lg font-black text-white">{stats.totalChaptersRead}</p>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              Chapters Finished
            </span>
          </div>

          <div className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-3.5 text-center space-y-1">
            <Headphones className="w-4 h-4 text-amber-400 mx-auto" />
            <p className="text-lg font-black text-white">
              {(stats.totalMinutesListened / 60).toFixed(1)}h
            </p>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              Listening Hours
            </span>
          </div>
        </div>

        {/* Motivation Tip */}
        <div className="p-3.5 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <p className="text-xs text-blue-200 leading-relaxed">
            Reading 20 pages a day equates to over 30 complete books a year!
          </p>
        </div>
      </div>
    </div>
  );
};
