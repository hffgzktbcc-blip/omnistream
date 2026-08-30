import React from 'react';
import { SportsMatch } from '../../types/sports';
import { Play, Radio, Clock, Trophy } from 'lucide-react';

interface SportsCardProps {
  match: SportsMatch;
  onWatch: (match: SportsMatch) => void;
}

export const SportsCard: React.FC<SportsCardProps> = ({ match, onWatch }) => {
  const isLive = match.status === 'LIVE';

  return (
    <div
      onClick={() => onWatch(match)}
      className="group relative flex flex-col rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-rose-500/50 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-rose-500/10 hover:-translate-y-1 p-4 justify-between"
    >
      {/* Header: League & Status */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider line-clamp-1">
            {match.league}
          </span>
        </div>

        <div>
          {isLive ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30 text-[10px] font-black animate-pulse">
              <Radio className="w-2.5 h-2.5" />
              LIVE
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium border border-slate-700/50">
              <Clock className="w-2.5 h-2.5" />
              {match.statusText || 'Upcoming'}
            </span>
          )}
        </div>
      </div>

      {/* Match Competitors & Scores */}
      <div className="py-4 space-y-3">
        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {match.homeTeam.logo ? (
              <img
                src={match.homeTeam.logo}
                alt={match.homeTeam.name}
                className="w-6 h-6 object-contain rounded-full bg-slate-800 p-0.5"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                {match.homeTeam.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-white transition-colors">
              {match.homeTeam.name}
            </span>
          </div>
          {match.homeTeam.score !== undefined && (
            <span className="text-sm font-black text-rose-400 font-mono">
              {match.homeTeam.score}
            </span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {match.awayTeam.logo ? (
              <img
                src={match.awayTeam.logo}
                alt={match.awayTeam.name}
                className="w-6 h-6 object-contain rounded-full bg-slate-800 p-0.5"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                {match.awayTeam.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-white transition-colors">
              {match.awayTeam.name}
            </span>
          </div>
          {match.awayTeam.score !== undefined && (
            <span className="text-sm font-black text-rose-400 font-mono">
              {match.awayTeam.score}
            </span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-800/60">
        <button className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-600 group-hover:bg-rose-600 text-slate-200 group-hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md">
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isLive ? 'Watch Live Stream' : 'View Match Streams'}</span>
        </button>
      </div>
    </div>
  );
};
