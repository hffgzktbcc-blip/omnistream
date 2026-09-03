import React, { useState, useEffect } from 'react';
import { SonarrSeries, RadarrMovie, ArrQueueItem, ArrCalendarItem, ArrConfig, ArrQualityProfile, ArrRootFolder } from '../../types/arr';
import { arrService } from '../../services/arrService';
import { useToast } from '../../context/ToastContext';
import {
  Tv,
  Film,
  Download,
  Calendar,
  Settings,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Play,
  Filter,
  ArrowUpRight,
  Zap,
  Sliders,
  Check,
  X,
  Radio,
  FileVideo,
  Eye,
  Loader2
} from 'lucide-react';

export const ArrHub: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'sonarr' | 'radarr' | 'queue' | 'calendar' | 'settings'>('sonarr');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Data states
  const [seriesList, setSeriesList] = useState<SonarrSeries[]>([]);
  const [moviesList, setMoviesList] = useState<RadarrMovie[]>([]);
  const [queueItems, setQueueItems] = useState<ArrQueueItem[]>([]);
  const [calendarItems, setCalendarItems] = useState<ArrCalendarItem[]>([]);
  const [config, setConfig] = useState<ArrConfig>({
    sonarrUrl: 'http://localhost:8989',
    sonarrApiKey: '',
    radarrUrl: 'http://localhost:7878',
    radarrApiKey: '',
    autoSearchOnAdd: true
  });

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Connection states
  const [sonarrStatus, setSonarrStatus] = useState<{ connected: boolean; version?: string; checking?: boolean }>({ connected: false });
  const [radarrStatus, setRadarrStatus] = useState<{ connected: boolean; version?: string; checking?: boolean }>({ connected: false });

  // Settings form states
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingSonarr, setTestingSonarr] = useState(false);
  const [testingRadarr, setTestingRadarr] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const cfg = await arrService.getConfig();
      setConfig(cfg);

      // Test connections in background
      if (cfg.sonarrUrl) {
        arrService.testConnection('sonarr', cfg.sonarrUrl, cfg.sonarrApiKey).then((res) => {
          setSonarrStatus({ connected: res.connected, version: res.version });
        });
      }
      if (cfg.radarrUrl) {
        arrService.testConnection('radarr', cfg.radarrUrl, cfg.radarrApiKey).then((res) => {
          setRadarrStatus({ connected: res.connected, version: res.version });
        });
      }

      await loadCurrentTabData(activeTab);
    } catch (err: any) {
      console.warn('Arr initial load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentTabData = async (tab: string) => {
    setRefreshing(true);
    try {
      if (tab === 'sonarr') {
        const series = await arrService.getSonarrSeries();
        setSeriesList(series);
      } else if (tab === 'radarr') {
        const movies = await arrService.getRadarrMovies();
        setMoviesList(movies);
      } else if (tab === 'queue') {
        const [sq, rq] = await Promise.all([
          arrService.getSonarrQueue().catch(() => []),
          arrService.getRadarrQueue().catch(() => [])
        ]);
        setQueueItems([...sq, ...rq]);
      } else if (tab === 'calendar') {
        const [sc, rc] = await Promise.all([
          arrService.getSonarrCalendar().catch(() => []),
          arrService.getRadarrCalendar().catch(() => [])
        ]);
        setCalendarItems([...sc, ...rc].sort((a, b) => {
          const dateA = new Date(a.airDateUtc || a.digitalRelease || a.inCinemas || 0).getTime();
          const dateB = new Date(b.airDateUtc || b.digitalRelease || b.inCinemas || 0).getTime();
          return dateA - dateB;
        }));
      }
    } catch (err) {
      console.warn('Tab load error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTabChange = (tab: 'sonarr' | 'radarr' | 'queue' | 'calendar' | 'settings') => {
    setActiveTab(tab);
    if (tab !== 'settings') {
      loadCurrentTabData(tab);
    }
  };

  const handleTestSonarr = async () => {
    setTestingSonarr(true);
    try {
      const res = await arrService.testConnection('sonarr', config.sonarrUrl, config.sonarrApiKey);
      if (res.connected) {
        setSonarrStatus({ connected: true, version: res.version });
        showToast(`✅ Connected to Sonarr ${res.version || ''}`, 'success');
      } else {
        setSonarrStatus({ connected: false });
        showToast(`❌ Sonarr: ${res.error || 'Connection failed'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setTestingSonarr(false);
    }
  };

  const handleTestRadarr = async () => {
    setTestingRadarr(true);
    try {
      const res = await arrService.testConnection('radarr', config.radarrUrl, config.radarrApiKey);
      if (res.connected) {
        setRadarrStatus({ connected: true, version: res.version });
        showToast(`✅ Connected to Radarr ${res.version || ''}`, 'success');
      } else {
        setRadarrStatus({ connected: false });
        showToast(`❌ Radarr: ${res.error || 'Connection failed'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setTestingRadarr(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await arrService.saveConfig(config);
      showToast('✨ Settings saved successfully!', 'success');
      handleTestSonarr();
      handleTestRadarr();
    } catch (err: any) {
      showToast(`Error saving settings: ${err.message}`, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSearchSeries = async (seriesId: number, title: string) => {
    try {
      await arrService.searchSonarr(seriesId);
      showToast(`🔍 Searching missing episodes for "${title}"...`, 'info');
    } catch (err: any) {
      showToast(`Search error: ${err.message}`, 'error');
    }
  };

  const handleSearchMovie = async (movieId: number, title: string) => {
    try {
      await arrService.searchRadarr([movieId]);
      showToast(`🔍 Searching releases for "${title}"...`, 'info');
    } catch (err: any) {
      showToast(`Search error: ${err.message}`, 'error');
    }
  };

  // Filtered Series
  const filteredSeries = seriesList.filter((s) => {
    const matchesQuery = !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesQuery) return false;
    if (statusFilter === 'continuing') return s.status.toLowerCase() === 'continuing';
    if (statusFilter === 'ended') return s.status.toLowerCase() === 'ended';
    if (statusFilter === 'missing') {
      const total = s.statistics?.totalEpisodeCount || 0;
      const files = s.statistics?.episodeFileCount || 0;
      return files < total;
    }
    return true;
  });

  // Filtered Movies
  const filteredMovies = moviesList.filter((m) => {
    const matchesQuery = !searchQuery || m.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesQuery) return false;
    if (statusFilter === 'downloaded') return m.hasFile;
    if (statusFilter === 'missing') return !m.hasFile && m.monitored;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-8 animate-fade-in">
      {/* -------------------------------------------------------------
          TOP BAR & CONNECTION STATUS
         ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Sonarr & Radarr PVR Automation
              </h1>
              <p className="text-xs text-slate-400">
                Manage your self-hosted TV & movie libraries, download queues, and quality tracking
              </p>
            </div>
          </div>
        </div>

        {/* Live Service Status Badges */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleTabChange('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              sonarrStatus.connected
                ? 'bg-sky-500/10 border-sky-500/40 text-sky-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${sonarrStatus.connected ? 'bg-sky-400 animate-pulse' : 'bg-slate-600'}`} />
            <Tv className="w-3.5 h-3.5" />
            <span>Sonarr {sonarrStatus.connected ? (sonarrStatus.version ? `v${sonarrStatus.version}` : 'Active') : 'Offline'}</span>
          </button>

          <button
            onClick={() => handleTabChange('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              radarrStatus.connected
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${radarrStatus.connected ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
            <Film className="w-3.5 h-3.5" />
            <span>Radarr {radarrStatus.connected ? (radarrStatus.version ? `v${radarrStatus.version}` : 'Active') : 'Offline'}</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          NAVIGATION SUBTABS
         ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => handleTabChange('sonarr')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sonarr'
              ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>TV Series (Sonarr)</span>
          {seriesList.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'sonarr' ? 'bg-slate-950 text-sky-400' : 'bg-slate-800 text-slate-300'}`}>
              {seriesList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('radarr')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'radarr'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Movies (Radarr)</span>
          {moviesList.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'radarr' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'}`}>
              {moviesList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('queue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'queue'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Download Queue</span>
          {queueItems.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'queue' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-300 animate-pulse'}`}>
              {queueItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Release Schedule</span>
        </button>

        <button
          onClick={() => handleTabChange('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ml-auto ${
            activeTab === 'settings'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Connection & Settings</span>
        </button>
      </div>

      {/* -------------------------------------------------------------
          TAB 1: SONARR TV SERIES
         ------------------------------------------------------------- */}
      {activeTab === 'sonarr' && (
        <div className="space-y-6">
          {/* Controls & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tracked TV series..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              {['all', 'continuing', 'ended', 'missing'].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === f
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {f === 'missing' ? 'Missing Episodes' : f}
                </button>
              ))}

              <button
                onClick={() => loadCurrentTabData('sonarr')}
                disabled={refreshing}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                title="Refresh Library"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Series Grid */}
          {!sonarrStatus.connected && seriesList.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shadow-lg">
                <Tv className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">Connect Sonarr</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your local or remote Sonarr server (default port 8989) to view your full TV library, monitor missing episodes, and automate episode downloads.
              </p>
              <button
                onClick={() => handleTabChange('settings')}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs shadow-lg shadow-sky-500/30 inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Configure Sonarr API Key</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {filteredSeries.map((series) => {
                const poster = series.images?.find((img) => img.coverType === 'poster')?.url || series.images?.find((img) => img.coverType === 'poster')?.remoteUrl;
                const stats = series.statistics || { episodeCount: 0, episodeFileCount: 0, totalEpisodeCount: 0, percentOfEpisodes: 0 };
                const isComplete = stats.episodeFileCount >= stats.totalEpisodeCount && stats.totalEpisodeCount > 0;

                return (
                  <div
                    key={series.id}
                    className="group relative rounded-2xl overflow-hidden bg-slate-900/80 border border-slate-800 hover:border-sky-500/50 transition-all flex flex-col shadow-lg"
                  >
                    {/* Poster Image */}
                    <div className="aspect-[2/3] relative overflow-hidden bg-slate-950">
                      {poster ? (
                        <img
                          src={poster.startsWith('http') ? poster : `${config.sonarrUrl}${poster}`}
                          alt={series.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700 font-bold">
                          <Tv className="w-12 h-12 stroke-[1.5]" />
                        </div>
                      )}

                      {/* Status Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow ${
                            series.status.toLowerCase() === 'continuing'
                              ? 'bg-emerald-500/90 text-slate-950'
                              : 'bg-slate-800/90 text-slate-300'
                          }`}
                        >
                          {series.status}
                        </span>
                      </div>

                      <div className="absolute top-2 right-2">
                        <button
                          onClick={() => handleSearchSeries(series.id, series.title)}
                          className="p-1.5 rounded-lg bg-black/70 hover:bg-sky-500 text-slate-300 hover:text-slate-950 backdrop-blur-md transition-all cursor-pointer"
                          title="Search Missing Episodes"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Progress Bar overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-slate-950/90 p-2 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className={isComplete ? 'text-emerald-400 font-bold' : 'text-sky-300'}>
                            {stats.episodeFileCount}/{stats.totalEpisodeCount} eps
                          </span>
                          <span className="text-slate-400">{Math.round(stats.percentOfEpisodes || 0)}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-sky-500'}`}
                            style={{ width: `${Math.min(stats.percentOfEpisodes || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-white truncate" title={series.title}>
                          {series.title}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {series.year} {series.network ? `• ${series.network}` : ''}
                        </p>
                      </div>

                      {series.nextAiring && (
                        <p className="text-[10px] text-sky-400 font-mono truncate pt-1">
                          Next: {new Date(series.nextAiring).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 2: RADARR MOVIES
         ------------------------------------------------------------- */}
      {activeTab === 'radarr' && (
        <div className="space-y-6">
          {/* Controls & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tracked movies..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              {['all', 'downloaded', 'missing'].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === f
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {f}
                </button>
              ))}

              <button
                onClick={() => loadCurrentTabData('radarr')}
                disabled={refreshing}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                title="Refresh Library"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Movies Grid */}
          {!radarrStatus.connected && moviesList.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shadow-lg">
                <Film className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">Connect Radarr</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your local or remote Radarr server (default port 7878) to track upcoming movies, monitor 4K/1080p quality releases, and automate downloads.
              </p>
              <button
                onClick={() => handleTabChange('settings')}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Configure Radarr API Key</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {filteredMovies.map((movie) => {
                const poster = movie.images?.find((img) => img.coverType === 'poster')?.url || movie.images?.find((img) => img.coverType === 'poster')?.remoteUrl;
                const quality = movie.movieFile?.quality?.quality?.name;
                const sizeGb = movie.sizeOnDisk ? (movie.sizeOnDisk / 1073741824).toFixed(1) : null;

                return (
                  <div
                    key={movie.id}
                    className="group relative rounded-2xl overflow-hidden bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col shadow-lg"
                  >
                    {/* Poster */}
                    <div className="aspect-[2/3] relative overflow-hidden bg-slate-950">
                      {poster ? (
                        <img
                          src={poster.startsWith('http') ? poster : `${config.radarrUrl}${poster}`}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700 font-bold">
                          <Film className="w-12 h-12 stroke-[1.5]" />
                        </div>
                      )}

                      {/* Status Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow ${
                            movie.hasFile
                              ? 'bg-emerald-500/90 text-slate-950'
                              : 'bg-amber-500/90 text-slate-950'
                          }`}
                        >
                          {movie.hasFile ? 'Downloaded' : 'Missing'}
                        </span>
                      </div>

                      <div className="absolute top-2 right-2">
                        <button
                          onClick={() => handleSearchMovie(movie.id, movie.title)}
                          className="p-1.5 rounded-lg bg-black/70 hover:bg-amber-500 text-slate-300 hover:text-slate-950 backdrop-blur-md transition-all cursor-pointer"
                          title="Search Movie Releases"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quality Tag */}
                      {quality && (
                        <div className="absolute bottom-2 left-2 right-2">
                          <span className="px-2 py-1 rounded-md bg-black/80 backdrop-blur-md text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30 flex items-center justify-between">
                            <span>{quality}</span>
                            {sizeGb && <span>{sizeGb} GB</span>}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-white truncate" title={movie.title}>
                          {movie.title}
                        </h4>
                        <p className="text-[11px] text-slate-400">{movie.year}</p>
                      </div>

                      {movie.digitalRelease && !movie.hasFile && (
                        <p className="text-[10px] text-amber-400 font-mono truncate pt-1">
                          Digital: {new Date(movie.digitalRelease).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 3: DOWNLOAD QUEUE & ACTIVITY
         ------------------------------------------------------------- */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Active Downloads & Client Activity ({queueItems.length})</span>
            </h3>

            <button
              onClick={() => loadCurrentTabData('queue')}
              disabled={refreshing}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          {queueItems.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400/60 mx-auto" />
              <h4 className="text-base font-bold text-white">All Queues Clear</h4>
              <p className="text-xs text-slate-400">
                No active downloads currently running in Sonarr or Radarr.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {queueItems.map((item) => {
                const totalMb = (item.size / 1048576).toFixed(1);
                const leftMb = (item.sizeleft / 1048576).toFixed(1);
                const doneMb = Math.max(0, parseFloat(totalMb) - parseFloat(leftMb)).toFixed(1);
                const pct = item.size > 0 ? Math.round(((item.size - item.sizeleft) / item.size) * 100) : 0;

                return (
                  <div
                    key={`${item.type}_${item.id}`}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 shadow-md"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            item.type === 'sonarr' ? 'bg-sky-500/20 text-sky-400' : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {item.type}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                          {item.mediaTitle || item.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono text-slate-400 flex-shrink-0">
                        {item.timeleft && <span>ETA: {item.timeleft}</span>}
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase text-[10px]">
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>
                          {doneMb} MB / {totalMb} MB ({pct}%)
                        </span>
                        {item.downloadClient && <span>Client: {item.downloadClient}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 4: RELEASE SCHEDULE & CALENDAR
         ------------------------------------------------------------- */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Upcoming TV Airings & Movie Releases</span>
            </h3>

            <button
              onClick={() => loadCurrentTabData('calendar')}
              disabled={refreshing}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>

          {calendarItems.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
              <Calendar className="w-12 h-12 text-indigo-400/60 mx-auto" />
              <h4 className="text-base font-bold text-white">No Upcoming Releases</h4>
              <p className="text-xs text-slate-400">
                Connect Sonarr and Radarr with monitored shows/movies to view upcoming release schedules.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {calendarItems.map((item, idx) => {
                const airDate = item.airDateUtc || item.digitalRelease || item.inCinemas;
                const formattedDate = airDate ? new Date(airDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Upcoming';

                return (
                  <div
                    key={`${item.type}_${item.id}_${idx}`}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold uppercase text-[10px]">
                        {formattedDate}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {item.type === 'sonarr' ? `S${item.seasonNumber}E${item.episodeNumber}` : 'Movie'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-white truncate">
                        {item.seriesTitle ? `${item.seriesTitle}: ` : ''}{item.title}
                      </h4>
                      {item.overview && (
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {item.overview}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 5: SETTINGS & CONNECTION CONFIG
         ------------------------------------------------------------- */}
      {activeTab === 'settings' && (
        <div className="max-w-3xl mx-auto space-y-8">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Sonarr Configuration Box */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-sky-500/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Sonarr (TV Series PVR)</h3>
                    <p className="text-xs text-slate-400">Default Port: 8989</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestSonarr}
                  disabled={testingSonarr}
                  className="px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {testingSonarr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Test Connection</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Sonarr Server URL</label>
                  <input
                    type="text"
                    value={config.sonarrUrl}
                    onChange={(e) => setConfig({ ...config, sonarrUrl: e.target.value })}
                    placeholder="http://localhost:8989"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Sonarr API Key</label>
                  <input
                    type="password"
                    value={config.sonarrApiKey}
                    onChange={(e) => setConfig({ ...config, sonarrApiKey: e.target.value })}
                    placeholder="Find in Settings > General > Security"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Radarr Configuration Box */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-amber-500/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Radarr (Movies PVR)</h3>
                    <p className="text-xs text-slate-400">Default Port: 7878</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestRadarr}
                  disabled={testingRadarr}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {testingRadarr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Test Connection</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Radarr Server URL</label>
                  <input
                    type="text"
                    value={config.radarrUrl}
                    onChange={(e) => setConfig({ ...config, radarrUrl: e.target.value })}
                    placeholder="http://localhost:7878"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Radarr API Key</label>
                  <input
                    type="password"
                    value={config.radarrApiKey}
                    onChange={(e) => setConfig({ ...config, radarrApiKey: e.target.value })}
                    placeholder="Find in Settings > General > Security"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Automation Preferences */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Automation Preferences</span>
              </h3>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoSearchOnAdd}
                  onChange={(e) => setConfig({ ...config, autoSearchOnAdd: e.target.checked })}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900"
                />
                <span className="font-semibold">Automatically trigger search & download when adding items</span>
              </label>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-teal-400 to-amber-400 hover:scale-105 text-slate-950 font-black text-sm shadow-xl transition-all cursor-pointer flex items-center gap-2"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                <span>Save *arr Configuration</span>
              </button>
            </div>
          </form>

          {/* Quick Guide */}
          <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>How to find your API Key</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 space-y-1">
                <strong className="text-sky-300 block">📺 Sonarr API Key:</strong>
                <p>Open Sonarr web UI &gt; Go to <strong>Settings</strong> &gt; <strong>General</strong> &gt; Look under <strong>Security</strong> &gt; Copy <strong>API Key</strong>.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 space-y-1">
                <strong className="text-amber-300 block">🎬 Radarr API Key:</strong>
                <p>Open Radarr web UI &gt; Go to <strong>Settings</strong> &gt; <strong>General</strong> &gt; Look under <strong>Security</strong> &gt; Copy <strong>API Key</strong>.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
