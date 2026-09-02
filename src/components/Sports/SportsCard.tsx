import React from 'react';
import { SportsMatch } from '../../types/sports';
import { Play, Radio, Clock, Trophy, Shield } from 'lucide-react';

interface SportsCardProps {
  match: SportsMatch;
  onWatch: (match: SportsMatch) => void;
}

export const SportsCard: React.FC<SportsCardProps> = ({ match, onWatch }) => {
  const isLive = match.status === 'LIVE';

  const homeName = typeof match.homeTeam === 'object' ? match.homeTeam?.name || 'Home Team' : String(match.homeTeam || 'Home Team');
  const awayName = typeof match.awayTeam === 'object' ? match.awayTeam?.name || 'Away Team' : String(match.awayTeam || 'Away Team');
  const homeLogo = typeof match.homeTeam === 'object' ? match.homeTeam?.logo : undefined;
  const awayLogo = typeof match.awayTeam === 'object' ? match.awayTeam?.logo : undefined;
  const homeScore = typeof match.homeTeam === 'object' ? match.homeTeam?.score : undefined;
  const awayScore = typeof match.awayTeam === 'object' ? match.awayTeam?.score : undefined;

  return (
    <div
      onClick={() => onWatch(match)}
      className="group relative flex flex-col rounded-2xl bg-[#00173d]/90 border border-blue-900/60 hover:border-amber-400/80 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/40 hover:-translate-y-1 p-4 justify-between"
    >
      {/* Top Header: League & Status */}
      <div className="flex items-center justify-between border-b border-blue-900/50 pb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-[11px] font-black text-amber-400/90 uppercase tracking-wider truncate">
            {match.league || 'SuperSport Championship'}
          </span>
        </div>

        <div>
          {isLive ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black tracking-wide animate-pulse shadow-md shadow-rose-600/30 flex-shrink-0">
              <Radio className="w-2.5 h-2.5" />
              LIVE NOW
            </span>
          ) : match.status === 'FINISHED' ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-900/80 text-indigo-200 text-[10px] font-black border border-indigo-500/40 flex-shrink-0">
              <Trophy className="w-2.5 h-2.5 text-amber-300" />
              {match.statusText || 'Final Result'}
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 text-[10px] font-bold border border-blue-800/40 flex-shrink-0">
              <Clock className="w-2.5 h-2.5" />
              {match.statusText || 'Scheduled'}
            </span>
          )}
        </div>
      </div>

      {/* Match Teams & Real-Time Scores */}
      <div className="py-4 space-y-3">
        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {homeLogo ? (
              <img
                src={homeLogo}
                alt={homeName}
                className="w-6 h-6 object-contain rounded-full bg-blue-950 p-0.5 flex-shrink-0 border border-blue-800/50"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center text-[10px] font-bold text-amber-300 flex-shrink-0">
                {homeName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
              {homeName}
            </span>
          </div>
          {homeScore !== undefined && (
            <span className="text-base font-black text-amber-400 font-mono flex-shrink-0 pl-2">
              {homeScore}
            </span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {awayLogo ? (
              <img
                src={awayLogo}
                alt={awayName}
                className="w-6 h-6 object-contain rounded-full bg-blue-950 p-0.5 flex-shrink-0 border border-blue-800/50"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center text-[10px] font-bold text-amber-300 flex-shrink-0">
                {awayName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
              {awayName}
            </span>
          </div>
          {awayScore !== undefined && (
            <span className="text-base font-black text-amber-400 font-mono flex-shrink-0 pl-2">
              {awayScore}
            </span>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-2 border-t border-blue-900/50">
        <button className="w-full py-2 px-3 rounded-xl bg-blue-900/60 hover:bg-blue-600 group-hover:bg-blue-600 text-blue-200 group-hover:text-white text-xs font-black tracking-wide flex items-center justify-center gap-1.5 transition-all shadow-md border border-blue-700/40">
          <Play className="w-3.5 h-3.5 fill-current text-amber-300" />
          <span>
            {isLive
              ? 'Watch SuperSport Live'
              : match.status === 'FINISHED'
              ? 'Watch Match Highlights & Replay'
              : 'View Broadcast Channels & Streams'}
          </span>
        </button>
      </div>
    </div>
  );
};
