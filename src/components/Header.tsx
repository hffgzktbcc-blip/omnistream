import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  BookOpen,
  Search,
  Bookmark,
  Upload,
  Sparkles,
  X,
  Tv,
  Film,
  Headphones,
  Trophy,
  Rss,
  Flame,
  Command,
  Download,
  Play,
  Star,
  Radio,
  Loader2,
  ChevronRight,
  Zap
} from 'lucide-react';
import { statsStorage } from '../services/statsStorage';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Comic } from '../types/comic';
import { Anime } from '../types/anime';
import { MediaItem } from '../types/media';
import { SportsMatch } from '../types/sports';

interface HeaderProps {
  activeTab: 'home' | 'browse' | 'anime' | 'media' | 'sports' | 'rss' | 'library' | 'arr' | 'audiobooks';
  setActiveTab: (
    tab: 'home' | 'browse' | 'anime' | 'media' | 'sports' | 'rss' | 'library' | 'arr' | 'audiobooks'
  ) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  onOpenUpload: () => void;
  onOpenUrlModal: () => void;
  onOpenSample: () => void;
  onOpenStats: () => void;
  onOpenCommandPalette: () => void;
  onOpenAndroidTV: () => void;
  onSelectComic?: (comic: Comic) => void;
  onSelectAnime?: (anime: Anime) => void;
  onSelectMedia?: (media: MediaItem) => void;
  onSelectSportsMatch?: (match: SportsMatch) => void;
}

function formatTitle(title: any): string {
  if (!title) return '';
  if (typeof title === 'string') return title;
  if (typeof title === 'object') {
    return title.english || title.romaji || title.native || 'Anime Series';
  }
  return String(title);
}

function formatCover(coverImage: any): string {
  if (!coverImage) return 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=200';
  if (typeof coverImage === 'string') return coverImage;
  if (typeof coverImage === 'object') {
    return (
      coverImage.large ||
      coverImage.extraLarge ||
      coverImage.medium ||
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=200'
    );
  }
  return String(coverImage);
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onSearch,
  searchQuery,
  onOpenUpload,
  onOpenUrlModal,
  onOpenSample,
  onOpenStats,
  onOpenCommandPalette,
  onOpenAndroidTV,
  onSelectComic,
  onSelectAnime,
  onSelectMedia,
  onSelectSportsMatch
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showLiveDropdown, setShowLiveDropdown] = useState(false);
  const [liveSearching, setLiveSearching] = useState(false);
  const [liveResults, setLiveResults] = useState<{
    media: MediaItem[];
    anime: Anime[];
    comics: Comic[];
    sports: SportsMatch[];
  }>({
    media: [],
    anime: [],
    comics: [],
    sports: []
  });

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);
  const stats = statsStorage.getStats();
  const { showInfo } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Close live search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowLiveDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live real-time search debouncing
  useEffect(() => {
    const q = localSearch.trim();
    if (!q || q.length < 2) {
      setLiveResults({ media: [], anime: [], comics: [], sports: [] });
      setLiveSearching(false);
      return;
    }

    setLiveSearching(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const [mediaRes, animeRes, comicsRes, sportsRes] = await Promise.allSettled([
          api.searchMedia(q),
          api.searchAnime(q),
          api.searchComics(q),
          api.searchSports(q)
        ]);

        setLiveResults({
          media: mediaRes.status === 'fulfilled' ? mediaRes.value.slice(0, 3) : [],
          anime: animeRes.status === 'fulfilled' ? animeRes.value.slice(0, 3) : [],
          comics: comicsRes.status === 'fulfilled' ? comicsRes.value.slice(0, 3) : [],
          sports: sportsRes.status === 'fulfilled' ? sportsRes.value.slice(0, 2) : []
        });
      } catch (err) {
        console.warn('Live search error:', err);
      } finally {
        setLiveSearching(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [localSearch]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setCanInstall(false);
      }
      setDeferredPrompt(null);
    } else {
      showInfo('To install: Use Chrome/Brave Install icon in address bar, or in Safari use File > Add to Dock.', 'Install OmniStream');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowLiveDropdown(false);
    onSearch(localSearch);
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    setShowLiveDropdown(false);
    onSearch('');
  };

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'anime':
        return 'Search anime (Solo Leveling, One Piece, Demon Slayer, Dandadan...)';
      case 'media':
        return 'Search movies & series (Deadpool & Wolverine, Dune, Arcane...)';
      case 'browse':
        return 'Search manga & comics (Solo Leveling, Jujutsu Kaisen, Berserk...)';
      case 'audiobooks':
        return 'Search audiobooks (Dune, Project Hail Mary, Good Omens...)';
      case 'sports':
        return 'Search sports matches (Six Nations Rugby, Premier League, NBA, UFC...)';
      case 'rss':
        return 'Search news feeds...';
      default:
        return 'Search movies, anime, manga, sports, audiobooks...';
    }
  };

  const hasLiveResults =
    liveResults.media.length > 0 ||
    liveResults.anime.length > 0 ||
    liveResults.comics.length > 0 ||
    liveResults.sports.length > 0;

  return (
    <header className="sticky top-0 z-40 bg-[#0B0F17]/95 backdrop-blur-md border-b border-slate-800/80 px-3 lg:px-6 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo */}
        <div
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer flex-shrink-0 group"
          onClick={() => {
            setActiveTab('home');
            handleClearSearch();
          }}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold group-hover:scale-105 transition-transform">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm sm:text-base text-white tracking-wide">
                OmniStream
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Global Instant Search Bar & Live Dropdown */}
        <div ref={searchContainerRef} className="flex-1 max-w-md relative hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={localSearch}
              onFocus={() => setShowLiveDropdown(true)}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setShowLiveDropdown(true);
              }}
              placeholder={getSearchPlaceholder()}
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-blue-500 rounded-xl py-2 pl-9 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner font-sans"
            />
            {liveSearching ? (
              <Loader2 className="w-4 h-4 text-blue-400 absolute left-3 top-2.5 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            )}
            {localSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Dynamic Live Floating Quick Search Overlay */}
          {showLiveDropdown && localSearch.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-[#00122e]/95 backdrop-blur-xl border border-blue-900/80 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in max-h-[75vh] overflow-y-auto">
              {liveSearching && !hasLiveResults ? (
                <div className="p-6 text-center text-xs text-blue-300 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Searching movies, anime, manga, sports across 1,380 sources...</span>
                </div>
              ) : hasLiveResults ? (
                <div className="p-3 space-y-3.5">
                  {/* Movies & TV Results */}
                  {liveResults.media.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-2 text-[10px] font-black text-rose-400 uppercase tracking-wider">
                        <span>🎬 Movies & Series</span>
                      </div>
                      {liveResults.media.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setShowLiveDropdown(false);
                            if (onSelectMedia) onSelectMedia(item);
                            else {
                              setActiveTab('media');
                              onSearch(item.title);
                            }
                          }}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-blue-950/80 cursor-pointer transition-colors group"
                        >
                          <img
                            src={item.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=200'}
                            alt={item.title}
                            className="w-8 h-11 object-cover rounded-lg flex-shrink-0 bg-slate-900"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white group-hover:text-amber-300 truncate">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-blue-200/70 font-mono mt-0.5">
                              <span>{item.type?.toUpperCase() || 'MOVIE'}</span>
                              <span>•</span>
                              <span>{item.year || '2026'}</span>
                              {item.rating && (
                                <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                                  <Star className="w-2.5 h-2.5 fill-current" /> {item.rating}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Anime Results */}
                  {liveResults.anime.length > 0 && (
                    <div className="space-y-1.5 border-t border-blue-900/50 pt-2">
                      <div className="flex items-center justify-between px-2 text-[10px] font-black text-purple-400 uppercase tracking-wider">
                        <span>⛩️ Anime Simulcasts</span>
                      </div>
                      {liveResults.anime.map((item) => {
                        const animeTitle = formatTitle(item.title);
                        const cover = formatCover(item.coverImage);

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setShowLiveDropdown(false);
                              if (onSelectAnime) onSelectAnime(item);
                              else {
                                setActiveTab('anime');
                                onSearch(animeTitle);
                              }
                            }}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-blue-950/80 cursor-pointer transition-colors group"
                          >
                            <img
                              src={cover}
                              alt={animeTitle}
                              className="w-8 h-11 object-cover rounded-lg flex-shrink-0 bg-slate-900"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white group-hover:text-amber-300 truncate">
                                {animeTitle}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] text-blue-200/70 font-mono mt-0.5">
                                <span>{item.episodes ? `${item.episodes} EPS` : 'ONGOING'}</span>
                                <span>•</span>
                                <span>{item.status || 'Simulcast'}</span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white flex-shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Manga / Comics Results */}
                  {liveResults.comics.length > 0 && (
                    <div className="space-y-1.5 border-t border-blue-900/50 pt-2">
                      <div className="flex items-center justify-between px-2 text-[10px] font-black text-sky-400 uppercase tracking-wider">
                        <span>📖 Manga & Comics</span>
                      </div>
                      {liveResults.comics.map((item) => {
                        const comicTitle = formatTitle(item.title);
                        const cover = formatCover(item.cover || item.coverImage);

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setShowLiveDropdown(false);
                              if (onSelectComic) onSelectComic(item);
                              else {
                                setActiveTab('browse');
                                onSearch(comicTitle);
                              }
                            }}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-blue-950/80 cursor-pointer transition-colors group"
                          >
                            <img
                              src={cover}
                              alt={comicTitle}
                              className="w-8 h-11 object-cover rounded-lg flex-shrink-0 bg-slate-900"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white group-hover:text-amber-300 truncate">
                                {comicTitle}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] text-blue-200/70 font-mono mt-0.5">
                                <span>{item.author || 'MangaDex / Mihon'}</span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white flex-shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Live Sports Results */}
                  {liveResults.sports.length > 0 && (
                    <div className="space-y-1.5 border-t border-blue-900/50 pt-2">
                      <div className="flex items-center justify-between px-2 text-[10px] font-black text-amber-400 uppercase tracking-wider">
                        <span>🏆 SuperSport Live Matches</span>
                      </div>
                      {liveResults.sports.map((match) => {
                        const homeName =
                          typeof match.homeTeam === 'object'
                            ? match.homeTeam?.name || 'Home'
                            : String(match.homeTeam || 'Home');
                        const awayName =
                          typeof match.awayTeam === 'object'
                            ? match.awayTeam?.name || 'Away'
                            : String(match.awayTeam || 'Away');

                        return (
                          <div
                            key={match.id}
                            onClick={() => {
                              setShowLiveDropdown(false);
                              if (onSelectSportsMatch) onSelectSportsMatch(match);
                              else {
                                setActiveTab('sports');
                                onSearch(homeName);
                              }
                            }}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-blue-950/80 cursor-pointer transition-colors group"
                          >
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white group-hover:text-amber-300 truncate">
                                {homeName} vs {awayName}
                              </h4>
                              <span className="text-[10px] text-blue-200/70 font-mono">
                                {match.league} • {match.statusText || match.status}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900 text-amber-300 flex-shrink-0">
                              Watch
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={handleSearchSubmit}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>View all matching results for "{localSearch}"</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-blue-300">
                  No matching titles found. Press Enter to perform a global multi-scraper search.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary Navigation Hubs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          {/* Home */}
          <button
            onClick={() => {
              setActiveTab('home');
              handleClearSearch();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'home'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          {/* Movies & TV */}
          <button
            onClick={() => {
              setActiveTab('media');
              handleClearSearch();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'media'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-rose-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Movies & TV</span>
          </button>

          {/* Anime */}
          <button
            onClick={() => {
              setActiveTab('anime');
              handleClearSearch();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'anime'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Anime</span>
          </button>

          {/* Comics & Manga */}
          <button
            onClick={() => {
              setActiveTab('browse');
              handleClearSearch();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'browse'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 ring-1 ring-sky-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Manga & Comics</span>
          </button>

          {/* Audiobooks (AudioBay + Shelf) */}
          <button
            onClick={() => {
              setActiveTab('audiobooks');
              handleClearSearch();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'audiobooks'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 ring-1 ring-amber-400 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Audiobooks</span>
          </button>

          {/* Live Sports */}
          <button
            onClick={() => {
              setActiveTab('sports');
              handleClearSearch();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'sports'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-rose-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Sports</span>
          </button>

          {/* Sonarr & Radarr Hub */}
          <button
            onClick={() => {
              setActiveTab('arr');
              handleClearSearch();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'arr'
                ? 'bg-gradient-to-r from-sky-500 to-amber-500 text-slate-950 shadow-md shadow-sky-500/30 ring-1 ring-amber-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span>Sonarr & Radarr</span>
          </button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <button
            onClick={onOpenAndroidTV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/50 text-amber-300 font-bold text-xs transition-colors cursor-pointer shadow-sm shadow-amber-400/10"
            title="Connect / Stream on Android TV Box"
          >
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Android TV</span>
          </button>

          <button
            onClick={onOpenCommandPalette}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer hidden sm:flex items-center gap-1 text-xs"
            title="Command Palette (Ctrl + K)"
          >
            <Command className="w-3.5 h-3.5" />
            <span className="text-[10px] text-slate-500 font-mono">⌘K</span>
          </button>

          <button
            onClick={onOpenStats}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Library & Watch Stats"
          >
            <Bookmark className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
