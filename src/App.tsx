import React, { useState, useEffect, useRef } from 'react';
import { Comic, Chapter, ComicPage } from './types/comic';
import { Anime } from './types/anime';
import { MediaItem } from './types/media';
import { SportsMatch } from './types/sports';
import { api } from './services/api';
import { readLocalComicArchive } from './services/archiveReader';
import { animeStorage } from './services/animeStorage';
import { storage } from './services/storage';
import { resolveAnimeTmdbId } from './services/streamingService';
import { PlaybackProvider, usePlayback } from './context/PlaybackContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Header } from './components/Header';
import { ComicCatalog } from './components/ComicCatalog';
import { ComicDetailModal } from './components/ComicDetailModal';
import { LibraryView } from './components/LibraryView';
import { UrlScrapeModal } from './components/UrlScrapeModal';
import { ReaderContainer } from './components/Reader/ReaderContainer';
import { AnimeCatalog } from './components/Anime/AnimeCatalog';
import { AnimeDetailModal } from './components/Anime/AnimeDetailModal';
import { MediaCatalog } from './components/Media/MediaCatalog';
import { MediaDetailModal } from './components/Media/MediaDetailModal';
import { UnifiedVideoPlayer, UnifiedPlayerSession } from './components/Common/UnifiedVideoPlayer';
import { SportsCatalog } from './components/Sports/SportsCatalog';
import { SportsPlayerModal } from './components/Sports/SportsPlayerModal';
import { RSSPuller } from './components/RSS/RSSPuller';
import { MiniPlayer } from './components/Common/MiniPlayer';
import { CommandPalette } from './components/Common/CommandPalette';
import { ReadingStatsModal } from './components/Library/ReadingStatsModal';
import { GlobalDropzone } from './components/Common/GlobalDropzone';
import { HomeDashboard } from './components/Home/HomeDashboard';
import { offlineStorage } from './services/offlineStorage';
import { ExtensionManagerModal } from './components/Extensions/ExtensionManagerModal';
import { AndroidTVModal } from './components/Common/AndroidTVModal';
import { TVRemoteHelper } from './components/Common/TVRemoteHelper';
import { MobileBottomNav } from './components/Common/MobileBottomNav';
import { ArrHub } from './components/Arr/ArrHub';
import { AddArrModal } from './components/Arr/AddArrModal';
import { tvNavigation } from './services/tvNavigation';
import { AudiobookCatalog } from './components/Audiobooks/AudiobookCatalog';
import { AudiobookDetailModal } from './components/Audiobooks/AudiobookDetailModal';
import { AudioPlayerBar } from './components/Audiobooks/AudioPlayerBar';
import { JacketCoverModal } from './components/Audiobooks/JacketCoverModal';
import { AudiobookTimerModal } from './components/Audiobooks/AudiobookTimerModal';
import { AudiobookBookmarksModal } from './components/Audiobooks/AudiobookBookmarksModal';
import { Audiobook, AudioTrack, AudiobookListeningProgress } from './types/audiobook';
import { Loader2, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'home' | 'browse' | 'anime' | 'media' | 'sports' | 'rss' | 'library' | 'arr' | 'audiobooks'
  >('home');
  const [arrModalMedia, setArrModalMedia] = useState<any | null>(null);

  // Audiobooks State (AudioBay & Shelf)
  const [selectedAudiobook, setSelectedAudiobook] = useState<Audiobook | null>(null);
  const [playingAudiobook, setPlayingAudiobook] = useState<{
    book: Audiobook;
    tracks: AudioTrack[];
    trackIndex: number;
    initialTime?: number;
  } | null>(null);
  const [showJacketModal, setShowJacketModal] = useState<boolean>(false);
  const [showTimerModal, setShowTimerModal] = useState<boolean>(false);
  const [showBookmarksModal, setShowBookmarksModal] = useState<boolean>(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepSecondsLeft, setSleepSecondsLeft] = useState<number | null>(null);

  // Comic State
  const [comics, setComics] = useState<Comic[]>([]);
  const [loadingComics, setLoadingComics] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);

  // Anime State
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loadingAnime, setLoadingAnime] = useState<boolean>(false);
  const [activeAnimeCategory, setActiveAnimeCategory] = useState<string>('trending');
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);

  // Movie & TV State
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState<boolean>(false);
  const [activeMediaCategory, setActiveMediaCategory] = useState<string>('trending');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  // Unified Video Player Session State (Anime, Movies & TV)
  const [activePlayerSession, setActivePlayerSession] = useState<UnifiedPlayerSession | null>(null);

  // Live Sports State
  const [sportsMatches, setSportsMatches] = useState<SportsMatch[]>([]);
  const [loadingSports, setLoadingSports] = useState<boolean>(false);
  const [activeSport, setActiveSport] = useState<string>('all');
  const [activeSportsFilter, setActiveSportsFilter] = useState<'all' | 'live' | 'upcoming' | 'finished'>('all');
  const [selectedSportsMatch, setSelectedSportsMatch] = useState<SportsMatch | null>(null);

  // Search & Modals
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showUrlModal, setShowUrlModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [showExtensionsModal, setShowExtensionsModal] = useState<boolean>(false);
  const [showAndroidTVModal, setShowAndroidTVModal] = useState<boolean>(false);
  const [pageLoading, setPageLoading] = useState<boolean>(false);
  const [loadingTitle, setLoadingTitle] = useState<string>('Loading...');

  const loadingAbortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { activeMedia, isMinimized, closePlayer } = usePlayback();
  const { showError, showSuccess, showWarning, showInfo } = useToast();

  // Active Reader State (Comics)
  const [activeReader, setActiveReader] = useState<{
    comic: Comic;
    chapter: Chapter;
    pages: ComicPage[];
    initialPage?: number;
    initialPanel?: number;
  } | null>(null);

  // Initialize Android TV & Remote D-Pad Navigation Engine
  useEffect(() => {
    tvNavigation.init();
    return () => tvNavigation.cleanup();
  }, []);

  // Listener for custom shortcut
  useEffect(() => {
    const handleToggle = () => setShowCommandPalette((prev) => !prev);
    window.addEventListener('toggle-command-palette', handleToggle);
    return () => window.removeEventListener('toggle-command-palette', handleToggle);
  }, []);

  // Initial Mount: Load all media feeds for Home Dashboard
  useEffect(() => {
    loadComics('all');
    loadAnime('trending');
    loadMedia('trending');
    loadSports('all');
  }, []);

  // Load comics
  useEffect(() => {
    if (activeTab === 'browse' || activeTab === 'home') {
      loadComics(activeCategory);
    }
  }, [activeCategory, activeTab]);

  // Load anime
  useEffect(() => {
    if (activeTab === 'anime' || activeTab === 'home') {
      loadAnime(activeAnimeCategory);
    }
  }, [activeAnimeCategory, activeTab]);

  // Load Movies & TV
  useEffect(() => {
    if (activeTab === 'media' || activeTab === 'home') {
      loadMedia(activeMediaCategory);
    }
  }, [activeMediaCategory, activeTab]);

  // Load Sports
  useEffect(() => {
    if (activeTab === 'sports' || activeTab === 'home') {
      loadSports(activeSport);
    }
  }, [activeSport, activeTab]);

  const loadComics = async (category: string) => {
    if (category === 'uploads') {
      const custom = storage.getCustomComics();
      setComics(custom);
      setLoadingComics(false);
      return;
    }
    setLoadingComics(true);
    try {
      const data = await api.getPopularComics(category);
      setComics(data);
    } catch (err) {
      console.error('Failed to load comics:', err);
    } finally {
      setLoadingComics(false);
    }
  };

  const loadAnime = async (category: string) => {
    setLoadingAnime(true);
    try {
      const data = await api.getTrendingAnime(category);
      setAnimeList(data);
    } catch (err) {
      console.error('Failed to load anime:', err);
    } finally {
      setLoadingAnime(false);
    }
  };

  const loadMedia = async (category: string) => {
    setLoadingMedia(true);
    try {
      const data = await api.getTrendingMedia(category);
      setMediaList(data);
    } catch (err) {
      console.error('Failed to load media:', err);
    } finally {
      setLoadingMedia(false);
    }
  };

  const loadSports = async (sport: string) => {
    setLoadingSports(true);
    try {
      const data = await api.getSportsMatches(sport);
      setSportsMatches(data);
    } catch (err) {
      console.error('Failed to load sports:', err);
    } finally {
      setLoadingSports(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      if (activeTab === 'browse') loadComics(activeCategory);
      if (activeTab === 'anime') loadAnime(activeAnimeCategory);
      if (activeTab === 'media') loadMedia(activeMediaCategory);
      if (activeTab === 'sports') loadSports(activeSport);
      return;
    }

    if (activeTab === 'browse' || activeTab === 'home') {
      setLoadingComics(true);
      try {
        const results = await api.searchComics(query);
        setComics(results);
      } catch (err) {
        console.error('Comic search failed:', err);
      } finally {
        setLoadingComics(false);
      }
    }

    if (activeTab === 'anime' || activeTab === 'home') {
      setLoadingAnime(true);
      try {
        const results = await api.searchAnime(query);
        setAnimeList(results);
      } catch (err) {
        console.error('Anime search failed:', err);
      } finally {
        setLoadingAnime(false);
      }
    }

    if (activeTab === 'media' || activeTab === 'home') {
      setLoadingMedia(true);
      try {
        const results = await api.searchMedia(query);
        setMediaList(results);
      } catch (err) {
        console.error('Media search failed:', err);
      } finally {
        setLoadingMedia(false);
      }
    }

    if (activeTab === 'sports' || activeTab === 'home') {
      setLoadingSports(true);
      try {
        const results = await api.searchSportsMatches(query);
        setSportsMatches(results);
      } catch (err) {
        console.error('Sports search failed:', err);
      } finally {
        setLoadingSports(false);
      }
    }
  };

  const handleStartReading = async (
    comic: Comic,
    chapter: Chapter,
    initialPage: number = 1,
    initialPanel: number = 0
  ) => {
    setSelectedComic(null);

    // If local comic with pre-parsed pages or sample comic, open immediately
    if (comic.pages && comic.pages.length > 0) {
      setActiveReader({
        comic,
        chapter,
        pages: comic.pages,
        initialPage,
        initialPanel
      });
      return;
    }

    // Check if offline downloaded in IndexedDB
    const offlinePages = await offlineStorage.getOfflineChapterPages(chapter.id);
    if (offlinePages && offlinePages.length > 0) {
      setActiveReader({
        comic,
        chapter,
        pages: offlinePages,
        initialPage,
        initialPanel
      });
      return;
    }

    setLoadingTitle(`Opening "${chapter.title || `Chapter ${chapter.chapter}`}"...`);
    setPageLoading(true);

    const controller = new AbortController();
    loadingAbortRef.current = controller;

    try {
      const pages = await api.getChapterPages(comic.source || 'mangadex', chapter.id, { signal: controller.signal });
      if (!pages || pages.length === 0) {
        showError('No pages found for this chapter.');
        setPageLoading(false);
        return;
      }

      setActiveReader({
        comic,
        chapter,
        pages,
        initialPage,
        initialPanel
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to load chapter pages:', err);
      showError('Failed to load chapter pages. Please try again.');
    } finally {
      setPageLoading(false);
    }
  };

  const handlePlayAnimeEpisode = (anime: Anime, episodeNum: number, audioType: 'sub' | 'dub' = 'sub') => {
    setSelectedAnime(null);
    const resolvedTmdb = resolveAnimeTmdbId(anime.id);
    setActivePlayerSession({
      type: 'anime',
      title: anime.title.english || anime.title.romaji,
      cover: anime.coverImage?.extraLarge || anime.coverImage?.large || '',
      tmdbId: resolvedTmdb,
      imdbId: anime.idMalformed ? String(anime.idMalformed) : undefined,
      season: 1,
      episode: episodeNum,
      audioType,
      animeData: anime,
      currentEpisodeTitle: `Episode ${episodeNum}`
    });
  };

  const handlePlayMedia = (item: MediaItem, season?: number, episode?: number) => {
    setSelectedMedia(null);
    const isTv = item.media_type === 'tv' || Boolean(item.first_air_date) || Boolean(season);
    setActivePlayerSession({
      type: isTv ? 'tv' : 'movie',
      title: item.title || item.name || 'Video',
      cover: item.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
        : item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : '',
      tmdbId: item.id,
      imdbId: item.imdb_id,
      season: season || (isTv ? 1 : undefined),
      episode: episode || (isTv ? 1 : undefined),
      mediaData: item,
      currentEpisodeTitle: isTv ? `S${season || 1} E${episode || 1}` : undefined
    });
  };

  const handleLaunchSample = async () => {
    setLoadingTitle('Loading Batman Sample Comic...');
    setPageLoading(true);
    try {
      const sample = await api.getSampleComic();
      setSelectedComic(sample);
    } catch (err) {
      console.error('Failed to load sample comic:', err);
      showError('Failed to load sample comic.');
    } finally {
      setPageLoading(false);
    }
  };

  const handleScrapeSuccess = (comic: Comic) => {
    setShowUrlModal(false);
    setSelectedComic(comic);
    showSuccess(`Scraped "${comic.title}"!`);
  };

  const handleUniversalFilesDrop = async (files: FileList | File[]) => {
    const file = files[0];
    if (!file) return;

    const ext = file.name.toLowerCase().split('.').pop() || '';
    if (['cbz', 'zip', 'cbr'].includes(ext)) {
      try {
        const { comic, pages } = await readLocalComicArchive(file);
        comic.pages = pages;
        storage.saveCustomComic(comic);
        setComics((prev) => [comic, ...prev.filter((c) => c.id !== comic.id)]);
        setActiveReader({
          comic,
          chapter: comic.chapters[0] || { id: 'local_main', chapter: '1', title: comic.title, pages: pages.length },
          pages,
          initialPage: 1,
          initialPanel: 0
        });
        showSuccess(`Loaded & opened "${comic.title}"!`);
      } catch (err: any) {
        showError(err.message || 'Failed to parse comic archive.');
      }
    } else {
      showInfo('File accepted. Supported: .cbz, .zip, .cbr', 'Drop Received');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUniversalFilesDrop(files);
      e.target.value = '';
    }
  };

  const cancelLoading = () => {
    if (loadingAbortRef.current) {
      loadingAbortRef.current.abort();
    }
    setPageLoading(false);
  };

  // 1. ACTIVE COMIC READER VIEW
  if (activeReader) {
    return (
      <ReaderContainer
        comic={activeReader.comic}
        chapter={activeReader.chapter}
        pages={activeReader.pages}
        initialPage={activeReader.initialPage}
        initialPanel={activeReader.initialPanel}
        onExit={() => setActiveReader(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans">
      {/* Hidden Universal File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".cbz,.zip,.cbr,.mp3,.m4b,.m4a,.aac"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* CANCELABLE PAGE LOADING OVERLAY */}
      {pageLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Opening Content</h3>
              <p className="text-xs text-slate-400">{loadingTitle}</p>
            </div>

            <button
              onClick={cancelLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-rose-600 hover:text-white border border-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              <span>Cancel & Return</span>
            </button>
          </div>
        </div>
      )}

      {/* Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSearch={handleSearch}
        searchQuery={searchQuery}
        onOpenUpload={() => fileInputRef.current?.click()}
        onOpenUrlModal={() => setShowUrlModal(true)}
        onOpenSample={handleLaunchSample}
        onOpenStats={() => setShowStatsModal(true)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenAndroidTV={() => setShowAndroidTVModal(true)}
        onSelectComic={(c) => setSelectedComic(c)}
        onSelectAnime={(a) => setSelectedAnime(a)}
        onSelectMedia={(m) => setSelectedMedia(m)}
        onSelectSportsMatch={(m) => setSelectedSportsMatch(m)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-20 md:pb-6">
        {/* 0. UNIFIED HOME DASHBOARD */}
        {activeTab === 'home' && (
          <HomeDashboard
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              setSearchQuery('');
            }}
            onSelectComic={(c) => setSelectedComic(c)}
            onSelectAnime={(a) => setSelectedAnime(a)}
            onSelectMedia={(item) => setSelectedMedia(item)}
            onSelectSportsMatch={(m) => setSelectedSportsMatch(m)}
            trendingComics={comics}
            trendingAnime={animeList}
            trendingMedia={mediaList}
            liveSports={sportsMatches}
          />
        )}

        {/* 1. COMICS & WEBTOONS */}
        {activeTab === 'browse' && (
          <ComicCatalog
            comics={comics}
            loading={loadingComics}
            onSelectComic={(c) => setSelectedComic(c)}
            onSelectCategory={(cat) => {
              setActiveCategory(cat);
              setSearchQuery('');
            }}
            activeCategory={activeCategory}
            searchQuery={searchQuery}
            onSearchQuery={handleSearch}
            onOpenSample={handleLaunchSample}
            onOpenUpload={() => fileInputRef.current?.click()}
            onOpenUrlModal={() => setShowUrlModal(true)}
            onOpenExtensions={() => setShowExtensionsModal(true)}
          />
        )}

        {/* 2. ANIME STREAMING */}
        {activeTab === 'anime' && (
          <AnimeCatalog
            animeList={animeList}
            loading={loadingAnime}
            onSelectAnime={(a) => setSelectedAnime(a)}
            onPlayEpisode={handlePlayAnimeEpisode}
            onSelectCategory={(cat) => {
              setActiveAnimeCategory(cat);
              setSearchQuery('');
            }}
            activeCategory={activeAnimeCategory}
            searchQuery={searchQuery}
            onSearchQuery={handleSearch}
          />
        )}

        {/* 3. MOVIES & TV SHOWS */}
        {activeTab === 'media' && (
          <MediaCatalog
            mediaList={mediaList}
            loading={loadingMedia}
            onSelectMedia={(item) => setSelectedMedia(item)}
            onSelectCategory={(cat) => {
              setActiveMediaCategory(cat);
              setSearchQuery('');
            }}
            activeCategory={activeMediaCategory}
            searchQuery={searchQuery}
            onSearchQuery={handleSearch}
          />
        )}

        {/* 4. LIVE SPORTS STREAMING HUB */}
        {activeTab === 'sports' && (
          <SportsCatalog
            matches={sportsMatches}
            loading={loadingSports}
            onWatchMatch={(match) => setSelectedSportsMatch(match)}
            activeSport={activeSport}
            onSelectSport={(sport) => {
              setActiveSport(sport);
              setSearchQuery('');
            }}
            activeFilter={activeSportsFilter}
            onSelectFilter={setActiveSportsFilter}
            searchQuery={searchQuery}
            onSearchQuery={handleSearch}
          />
        )}

        {/* 6. LIVE RSS PULLER & FEEDS */}
        {activeTab === 'rss' && <RSSPuller />}

        {/* 7. USER LIBRARY */}
        {activeTab === 'library' && (
          <LibraryView
            onOpenComic={(comic, chapterId, pageNum, panelIdx) => {
              const ch = comic.chapters?.find((c) => c.id === chapterId) || comic.chapters?.[0] || {
                id: chapterId || 'ch1',
                chapter: '1',
                title: comic.title
              };
              handleStartReading(comic, ch, pageNum || 1, panelIdx || 0);
            }}
            onOpenEBook={() => {}}
          />
        )}

        {/* 8. SONARR & RADARR AUTOMATION */}
        {activeTab === 'arr' && <ArrHub />}

        {/* 9. AUDIOBOOKS HUB (AudioBay + Shelf) */}
        {activeTab === 'audiobooks' && (
          <AudiobookCatalog
            onSelectBook={(book) => setSelectedAudiobook(book)}
            onResumeListening={(progress) => {
              // Build a minimal Audiobook from progress and re-open detail
              const resumeBook: Audiobook = {
                id: progress.bookId,
                title: progress.title,
                author: progress.author,
                cover: progress.cover,
                description: '',
                narrator: '',
                categories: []
              };
              setSelectedAudiobook(resumeBook);
            }}
          />
        )}
      </main>

      {/* Persistent Floating MiniPlayer */}
      <MiniPlayer />

      {/* Universal Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab as any);
          setSearchQuery('');
        }}
        onSearchGlobal={handleSearch}
        onOpenUpload={() => fileInputRef.current?.click()}
        onOpenSample={handleLaunchSample}
        onOpenUrlModal={() => setShowUrlModal(true)}
      />

      {/* Reading Goals & Streaks Insights Modal */}
      <ReadingStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />

      {/* Comic Detail Modal */}
      {selectedComic && (
        <ComicDetailModal
          comic={selectedComic}
          onClose={() => setSelectedComic(null)}
          onStartReading={(comic, chapter) => handleStartReading(comic, chapter)}
        />
      )}

      {/* Anime Detail Modal */}
      {selectedAnime && (
        <AnimeDetailModal
          anime={selectedAnime}
          onClose={() => setSelectedAnime(null)}
          onPlayEpisode={handlePlayAnimeEpisode}
          onReadManga={(mangaTitle) => {
            setActiveTab('browse');
            handleSearch(mangaTitle);
          }}
          onAddToArr={(media) => setArrModalMedia(media)}
        />
      )}

      {/* Movie & TV Detail Modal */}
      {selectedMedia && (
        <MediaDetailModal
          item={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onPlayMedia={handlePlayMedia}
          onAddToArr={(media) => setArrModalMedia(media)}
        />
      )}

      {/* 1-Click Add to Sonarr / Radarr Modal */}
      <AddArrModal
        isOpen={!!arrModalMedia}
        onClose={() => setArrModalMedia(null)}
        media={arrModalMedia}
      />

      {/* Flagship Unified Cinema Video Player (Anime, Movies & TV Shows) */}
      {activePlayerSession && (
        <UnifiedVideoPlayer
          session={activePlayerSession}
          onClose={() => setActivePlayerSession(null)}
          onUpdateSession={(updates) =>
            setActivePlayerSession((prev) => (prev ? { ...prev, ...updates } : null))
          }
        />
      )}

      {/* Sports Live Stream Player Modal */}
      {selectedSportsMatch && (
        <SportsPlayerModal
          match={selectedSportsMatch}
          onClose={() => setSelectedSportsMatch(null)}
        />
      )}

      {/* URL Scraper Modal */}
      <UrlScrapeModal
        isOpen={showUrlModal}
        onClose={() => setShowUrlModal(false)}
        onScrapeSuccess={handleScrapeSuccess}
      />

      {/* Mihon / Tachiyomi Extension Hub Modal */}
      <ExtensionManagerModal
        isOpen={showExtensionsModal}
        onClose={() => setShowExtensionsModal(false)}
        onSourcesChanged={() => loadComics(activeCategory)}
      />

      {/* Android TV & 10-Foot Remote Hub Modal */}
      <AndroidTVModal
        isOpen={showAndroidTVModal}
        onClose={() => setShowAndroidTVModal(false)}
      />

      {/* ──── AUDIOBOOK MODALS & PLAYER (AudioBay + Shelf) ──── */}

      {/* Audiobook Detail Modal */}
      <AudiobookDetailModal
        book={selectedAudiobook}
        isOpen={!!selectedAudiobook}
        onClose={() => setSelectedAudiobook(null)}
        onPlayTrack={(book, tracks, trackIndex) => {
          setPlayingAudiobook({ book, tracks, trackIndex });
          setSelectedAudiobook(null);
        }}
        onOpenJacketPicker={() => setShowJacketModal(true)}
        onOpenBookmarks={() => setShowBookmarksModal(true)}
      />

      {/* Jacket Cover Picker (Shelf feature) */}
      <JacketCoverModal
        book={selectedAudiobook || playingAudiobook?.book || null}
        isOpen={showJacketModal}
        onClose={() => setShowJacketModal(false)}
        onSelectCover={(newCover) => {
          // Update the cover on the playing book if active
          if (playingAudiobook) {
            setPlayingAudiobook({
              ...playingAudiobook,
              book: { ...playingAudiobook.book, cover: newCover }
            });
          }
          setShowJacketModal(false);
        }}
      />

      {/* Sleep Timer Modal (Shelf feature) */}
      <AudiobookTimerModal
        isOpen={showTimerModal}
        onClose={() => setShowTimerModal(false)}
        activeTimer={sleepTimerMinutes}
        secondsLeft={sleepSecondsLeft}
        onSetTimer={(minutes) => {
          setSleepTimerMinutes(minutes);
          if (minutes !== null && minutes > 0) {
            setSleepSecondsLeft(minutes * 60);
          } else {
            setSleepSecondsLeft(null);
          }
          setShowTimerModal(false);
        }}
      />

      {/* Bookmarks Modal (Shelf feature) */}
      <AudiobookBookmarksModal
        book={playingAudiobook?.book || null}
        isOpen={showBookmarksModal}
        onClose={() => setShowBookmarksModal(false)}
        currentTime={0}
        currentTrackIndex={playingAudiobook?.trackIndex || 0}
        currentTrackName={playingAudiobook?.tracks[playingAudiobook.trackIndex]?.name}
        onSeekTo={(seconds, trackIndex) => {
          if (playingAudiobook && trackIndex !== undefined) {
            setPlayingAudiobook({
              ...playingAudiobook,
              trackIndex,
              initialTime: seconds
            });
          }
          setShowBookmarksModal(false);
        }}
      />

      {/* Persistent Audio Player Bar (always visible when playing) */}
      {playingAudiobook && (
        <AudioPlayerBar
          book={playingAudiobook.book}
          tracks={playingAudiobook.tracks}
          currentTrackIndex={playingAudiobook.trackIndex}
          initialTime={playingAudiobook.initialTime}
          onClose={() => setPlayingAudiobook(null)}
          onOpenTimer={() => setShowTimerModal(true)}
          onOpenBookmarks={() => setShowBookmarksModal(true)}
          onTrackChange={(idx) =>
            setPlayingAudiobook((prev) =>
              prev ? { ...prev, trackIndex: idx, initialTime: 0 } : null
            )
          }
          sleepMinutes={sleepTimerMinutes}
          sleepSecondsLeft={sleepSecondsLeft}
        />
      )}

      {/* Mobile Bottom Navigation Bar (Screens < 768px) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenStats={() => setShowStatsModal(true)}
        onOpenAndroidTV={() => setShowAndroidTVModal(true)}
      />

      {/* On-Screen TV Remote Navigation Dock */}
      <TVRemoteHelper
        onJumpToHome={() => setActiveTab('home')}
        onJumpToSearch={() => {
          const searchInput = document.querySelector<HTMLInputElement>('header input[type="text"]');
          if (searchInput) {
            searchInput.focus();
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }}
        isVideoPlaying={!!activePlayerSession}
      />

      {/* App-Wide Universal Drag and Drop Ingestion */}
      <GlobalDropzone onFilesDropped={handleUniversalFilesDrop} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <PlaybackProvider>
        <AppContent />
      </PlaybackProvider>
    </ToastProvider>
  );
};
