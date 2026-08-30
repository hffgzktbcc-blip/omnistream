import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  EBook,
  EBookTheme,
  EBookFontFamily,
  EBookLayoutMode,
  EBookBookmark,
  AmbientSoundType,
  EBookSettings
} from '../../types/ebook';
import { ebookStorage } from '../../services/ebookStorage';
import { highlightsStorage, EBookHighlight } from '../../services/highlightsStorage';
import { bookmarkStorage } from '../../services/bookmarkStorage';
import { ambientAudio } from '../../services/ambientAudioService';
import { usePlayback } from '../../context/PlaybackContext';
import { api } from '../../services/api';
import { SendToKoboModal } from './SendToKoboModal';
import {
  SyncMark,
  blockAtTime,
  timeAtBlock,
  generateAutoSyncMarks,
  syncMarkStorage
} from '../../services/syncMarkService';
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Settings,
  Volume2,
  VolumeX,
  X,
  Bookmark,
  Sparkles,
  Zap,
  Highlighter,
  Trash2,
  Copy,
  Check,
  Clock,
  Play,
  Pause,
  BookOpen,
  Search,
  BookMarked,
  BarChart3,
  Languages,
  BookA,
  Maximize,
  Minimize,
  Sliders,
  Columns2,
  Scroll,
  Download,
  Flame,
  CloudRain,
  FlameKindling,
  Coffee,
  Trees,
  Radio,
  QrCode,
  Gauge,
  RotateCcw,
  FastForward,
  UserCheck,
  History,
  Tablet
} from 'lucide-react';

interface EBookReaderProps {
  book: EBook;
  initialChapterIndex?: number;
  onExit: () => void;
}

// Bionic Reading Fixation Bolding
function applyBionicReading(htmlText: string): string {
  return htmlText.replace(/>([^<]+)</g, (match, text) => {
    const transformed = text
      .split(' ')
      .map((word: string) => {
        if (word.length <= 1) return word;
        const mid = Math.ceil(word.length / 2);
        return `<b>${word.slice(0, mid)}</b>${word.slice(mid)}`;
      })
      .join(' ');
    return `>${transformed}<`;
  });
}

// Split HTML chapter into paragraph blocks for pagination & sync
function extractParagraphBlocks(html: string): string[] {
  if (!html) return [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const nodes = doc.body.querySelectorAll('p, div.paragraph, h1, h2, h3, h4, h5, h6, blockquote, li');
    const blocks: string[] = [];
    nodes.forEach((node) => {
      const text = node.textContent?.trim();
      if (text && text.length > 5) {
        blocks.push(node.innerHTML.trim());
      }
    });
    if (blocks.length > 0) return blocks;
  } catch {}

  // Fallback regex split
  const clean = html.replace(/<div class="prose-body[^>]*>/gi, '').replace(/<\/div>/gi, '');
  const rawBlocks = clean
    .split(/<\/p>|<\/div>|<br\s*\/?>\s*<br\s*\/?>|\n\n+/)
    .map((p) => p.replace(/^<p[^>]*>|^<div[^>]*>/i, '').trim())
    .filter((p) => p.length > 5);

  return rawBlocks.length > 0 ? rawBlocks : [html];
}

export const EBookReader: React.FC<EBookReaderProps> = ({
  book,
  initialChapterIndex,
  onExit
}) => {
  // Load Saved Reader Preferences
  const savedSettings = useMemo(() => ebookStorage.getSettings(), []);

  // 1. Exact Last Read State Restoration
  const initialChapter =
    initialChapterIndex !== undefined
      ? initialChapterIndex
      : book.currentChapter
      ? Math.max(0, book.currentChapter - 1)
      : 0;

  const [currentChapterIdx, setCurrentChapterIdx] = useState<number>(initialChapter);
  const [pageIndex, setPageIndex] = useState<number>(book.currentPageIndex || 0);
  const blocksPerPage = 8;

  // 2. Persistent Customization Settings ("Settings Remembers")
  const [theme, setTheme] = useState<EBookTheme>(savedSettings.theme);
  const [fontSize, setFontSize] = useState<number>(savedSettings.fontSize);
  const [fontFamily, setFontFamily] = useState<EBookFontFamily>(savedSettings.fontFamily);
  const [lineHeight, setLineHeight] = useState<number>(savedSettings.lineHeight);
  const [maxWidth, setMaxWidth] = useState<number>(savedSettings.maxWidth);
  const [textAlign, setTextAlign] = useState<'left' | 'justify'>(savedSettings.textAlign);
  const [layoutMode, setLayoutMode] = useState<EBookLayoutMode>(savedSettings.layoutMode);
  const [bionicReading, setBionicReading] = useState<boolean>(savedSettings.bionicReading);
  const [speechRate, setSpeechRate] = useState<number>(savedSettings.speechRate || 1.0);
  const [ambientSound, setAmbientSound] = useState<AmbientSoundType>(savedSettings.ambientSound || 'off');
  const [ambientVolume, setAmbientVolume] = useState<number>(savedSettings.ambientVolume ?? 0.35);
  const [rsvpWpm, setRsvpWpm] = useState<number>(savedSettings.rsvpWpm || 350);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Auto-persist settings whenever any reader preference changes
  const savePreference = (updates: Partial<EBookSettings>) => {
    ebookStorage.saveSettings(updates);
  };

  // Drawers & Modals
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<'toc' | 'bookmarks' | 'highlights' | 'search' | 'analytics' | 'ambient'>('toc');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isRsvpOpen, setIsRsvpOpen] = useState<boolean>(false);
  const [isPreviouslyOnOpen, setIsPreviouslyOnOpen] = useState<boolean>(false);
  const [previouslyOnSummary, setPreviouslyOnSummary] = useState<string>('');
  const [loadingPreviouslyOn, setLoadingPreviouslyOn] = useState<boolean>(false);
  const [tocSearch, setTocSearch] = useState<string>('');
  const [inBookSearch, setInBookSearch] = useState<string>('');
  const [copiedNotebook, setCopiedNotebook] = useState<boolean>(false);

  // Text Selection & Readest Quick Action Toolbar
  const [selectionRange, setSelectionRange] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Active Lookup Modal (Dictionary / Translation / AI Explain)
  const [activeLookup, setActiveLookup] = useState<{
    type: 'dictionary' | 'translate' | 'ai' | 'character';
    title: string;
    loading: boolean;
    data: any;
  } | null>(null);

  // Notes & Highlights
  const [highlights, setHighlights] = useState<EBookHighlight[]>([]);
  const [highlightFilter, setHighlightFilter] = useState<string>('all');
  const [bookmarks, setBookmarks] = useState<EBookBookmark[]>([]);

  // Live Reading Analytics
  const [sessionStartTime] = useState<number>(Date.now());
  const [sessionElapsedMins, setSessionElapsedMins] = useState<number>(0);

  // Playback Context for Immersion Reading (Audiobook Sync)
  const { activeMedia, seekTo } = usePlayback();
  const isAudiobookPlaying = activeMedia?.type === 'audiobook' ? activeMedia.isPlaying : false;
  const currentAudioTime = activeMedia?.type === 'audiobook' ? activeMedia.currentTime : 0;
  const audioDuration = activeMedia?.type === 'audiobook' ? activeMedia.duration : 3600;

  // TTS Speech Synthesis State
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // RSVP Speed Reader State
  const [rsvpWords, setRsvpWords] = useState<string[]>([]);
  const [rsvpIndex, setRsvpIndex] = useState<number>(0);
  const [isRsvpPlaying, setIsRsvpPlaying] = useState<boolean>(false);

  // SyncMarks state
  const [syncMarks, setSyncMarks] = useState<SyncMark[]>([]);
  const [immersionMode] = useState<boolean>(true);
  const [following, setFollowing] = useState<boolean>(true);
  const [manualBlock, setManualBlock] = useState<number | null>(book.currentBlockIndex || null);
  const [isKoboModalOpen, setIsKoboModalOpen] = useState<boolean>(false);
  const lastScrolledTo = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const bookIdStr = String(book.id);
  const chapters = book.chapters || [];
  const currentChapter = chapters[currentChapterIdx] || {
    id: 'ch_1',
    title: book.title || 'Chapter 1',
    content: `<p class="leading-relaxed">${book.description || 'Loading book content...'}</p>`,
    order: 1
  };

  const paragraphBlocks = useMemo(() => {
    return extractParagraphBlocks(currentChapter.content || '');
  }, [currentChapter.content]);

  const totalPages = Math.max(1, Math.ceil(paragraphBlocks.length / blocksPerPage));
  const currentPaginatedBlocks = useMemo(() => {
    const start = pageIndex * blocksPerPage;
    return paragraphBlocks.slice(start, start + blocksPerPage);
  }, [paragraphBlocks, pageIndex, blocksPerPage]);

  // Handle Ambient Soundscape Playback
  useEffect(() => {
    if (ambientSound !== 'off') {
      ambientAudio.play(ambientSound, ambientVolume);
    } else {
      ambientAudio.stop();
    }
    return () => {
      ambientAudio.stop();
    };
  }, [ambientSound, ambientVolume]);

  // Load voices for TTS
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const v = window.speechSynthesis.getVoices();
        setAvailableVoices(v);
        if (v.length > 0 && !selectedVoice) {
          const defaultEn = v.find((voice) => voice.lang.includes('en')) || v[0];
          setSelectedVoice(defaultEn.name);
        }
      }
    };
    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoice]);

  // Session reading timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionElapsedMins(Math.floor((Date.now() - sessionStartTime) / 60000));
    }, 30000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  // Load Saved Highlights & Bookmarks
  useEffect(() => {
    setHighlights(highlightsStorage.getHighlights(book.id));
    setBookmarks(bookmarkStorage.getBookmarks(book.id));
  }, [book.id]);

  // Save Progress & Exact Last Read Position
  useEffect(() => {
    ebookStorage.updateProgress(
      book.id,
      currentChapterIdx + 1,
      chapters.length,
      manualBlock ?? undefined,
      pageIndex
    );
    if (containerRef.current && layoutMode === 'scroll') {
      if (book.currentBlockIndex && book.currentBlockIndex > 0) {
        setTimeout(() => {
          const el = document.getElementById(`block-${book.currentBlockIndex}`);
          if (el) el.scrollIntoView({ block: 'center' });
        }, 150);
      }
    }
  }, [currentChapterIdx, pageIndex, manualBlock, book.id, chapters.length, layoutMode, book.currentBlockIndex]);

  // Load SyncMarks for immersion reading
  useEffect(() => {
    let marks = syncMarkStorage.getMarks(bookIdStr);
    if (marks.length === 0 && paragraphBlocks.length > 0) {
      marks = generateAutoSyncMarks(bookIdStr, `part_${currentChapterIdx + 1}`, paragraphBlocks.length, audioDuration);
      syncMarkStorage.saveMarks(bookIdStr, marks);
    }
    setSyncMarks(marks);
  }, [bookIdStr, currentChapterIdx, paragraphBlocks.length, audioDuration]);

  // Auto-calculated synced block
  const syncedBlock = useMemo(() => {
    return blockAtTime(syncMarks, currentAudioTime);
  }, [syncMarks, currentAudioTime]);

  const activeBlock = following ? syncedBlock : manualBlock;

  // Auto-scroll in continuous mode
  useEffect(() => {
    if (layoutMode !== 'scroll' || !following || activeBlock === null || !immersionMode) return;
    if (lastScrolledTo.current === activeBlock) return;
    lastScrolledTo.current = activeBlock;

    const targetEl = document.getElementById(`block-${activeBlock}`);
    if (targetEl) {
      targetEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [activeBlock, following, immersionMode, layoutMode]);

  // Reading calculations
  const chapterWordCount = useMemo(() => {
    return currentChapter.content.replace(/<[^>]*>?/gm, ' ').split(/\s+/).filter(Boolean).length;
  }, [currentChapter.content]);
  const estimatedMins = Math.max(1, Math.ceil(chapterWordCount / 220));
  const bookTotalWords = chapterWordCount * (chapters.length || 1);
  const estimatedBookMins = Math.max(1, Math.ceil(bookTotalWords / 220));

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        if (layoutMode === 'paginated') {
          if (pageIndex < totalPages - 1) {
            setPageIndex((p) => p + 1);
          } else if (currentChapterIdx < chapters.length - 1) {
            setCurrentChapterIdx((c) => c + 1);
            setPageIndex(0);
          }
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (layoutMode === 'paginated') {
          if (pageIndex > 0) {
            setPageIndex((p) => p - 1);
          } else if (currentChapterIdx > 0) {
            setCurrentChapterIdx((c) => c - 1);
            setPageIndex(0);
          }
        }
      } else if (e.key === 'b' || e.key === 'B') {
        setBionicReading((b) => {
          savePreference({ bionicReading: !b });
          return !b;
        });
      } else if (e.key === 't' || e.key === 'T') {
        setDrawerOpen((d) => !d);
      } else if (e.key === 'Escape') {
        setDrawerOpen(false);
        setIsSettingsOpen(false);
        setIsQrModalOpen(false);
        setIsRsvpOpen(false);
        setIsPreviouslyOnOpen(false);
        setActiveLookup(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [layoutMode, pageIndex, totalPages, currentChapterIdx, chapters.length]);

  // Text selection handler
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length >= 2) {
      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionRange({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top - 55
      });
    } else {
      setSelectionRange(null);
    }
  };

  // 1. Add Highlight
  const handleAddHighlight = (color: 'yellow' | 'emerald' | 'sky' | 'purple' | 'rose') => {
    if (!selectionRange) return;
    const newHl = highlightsStorage.addHighlight({
      bookId: book.id,
      chapterIndex: currentChapterIdx,
      text: selectionRange.text,
      color
    });
    setHighlights((prev) => [...prev, newHl]);
    setSelectionRange(null);
    window.getSelection()?.removeAllRanges();
  };

  // 2. Dictionary Lookup
  const handleLookupDictionary = async () => {
    if (!selectionRange) return;
    const word = selectionRange.text.trim().split(/\s+/)[0].replace(/[^a-zA-Z]/g, '');
    setActiveLookup({
      type: 'dictionary',
      title: `Definition: "${word}"`,
      loading: true,
      data: null
    });
    setSelectionRange(null);

    const data = await api.lookupDictionary(word);
    setActiveLookup({
      type: 'dictionary',
      title: `Definition: "${word}"`,
      loading: false,
      data
    });
  };

  // 3. Translation
  const handleTranslate = async (toLang: string = 'en') => {
    if (!selectionRange) return;
    const text = selectionRange.text;
    setActiveLookup({
      type: 'translate',
      title: `Translation`,
      loading: true,
      data: null
    });
    setSelectionRange(null);

    const data = await api.lookupTranslate(text, toLang);
    setActiveLookup({
      type: 'translate',
      title: `Translation (${toLang.toUpperCase()})`,
      loading: false,
      data
    });
  };

  // 4. AI Explain
  const handleAiExplain = async (mode: 'explain' | 'summarize' | 'analyze' = 'explain') => {
    if (!selectionRange) return;
    const text = selectionRange.text;
    setActiveLookup({
      type: 'ai',
      title: mode === 'summarize' ? 'AI Summary' : mode === 'analyze' ? 'Literary Themes' : 'AI Analysis',
      loading: true,
      data: null
    });
    setSelectionRange(null);

    const explanation = await api.lookupAiExplain(text, mode);
    setActiveLookup({
      type: 'ai',
      title: mode === 'summarize' ? 'AI Summary' : mode === 'analyze' ? 'Literary Themes' : 'AI Analysis',
      loading: false,
      data: { explanation, original: text }
    });
  };

  // 5. AI Character Recap ("Who is this?")
  const handleCharacterRecap = async () => {
    if (!selectionRange) return;
    const charName = selectionRange.text.trim();
    setActiveLookup({
      type: 'character',
      title: `Character: ${charName}`,
      loading: true,
      data: null
    });
    setSelectionRange(null);

    const promptText = `In the book "${book.title}", give a spoiler-free summary of who the character "${charName}" is, their relationships, and their role up to Chapter ${currentChapterIdx + 1}.`;
    const explanation = await api.lookupAiExplain(promptText, 'explain');
    setActiveLookup({
      type: 'character',
      title: `Character: ${charName}`,
      loading: false,
      data: { explanation: explanation || `${charName} is a key figure in ${book.title}.`, original: charName }
    });
  };

  // 6. Previously On... Chapter Catch-Up
  const handlePreviouslyOn = async () => {
    setIsPreviouslyOnOpen(true);
    if (previouslyOnSummary) return;
    setLoadingPreviouslyOn(true);

    const prevChapters = chapters.slice(0, currentChapterIdx).slice(-3);
    const prevText = prevChapters.map((c) => c.content.replace(/<[^>]*>?/gm, ' ').slice(0, 800)).join('\n\n');
    const promptText = prevText
      ? `Provide a quick 3-bullet "Previously On..." catch-up recap of what happened in earlier chapters of "${book.title}":\n\n${prevText}`
      : `Provide a quick introduction recap for "${book.title}" by ${book.author}.`;

    const summary = await api.lookupAiExplain(promptText, 'summarize');
    setPreviouslyOnSummary(summary);
    setLoadingPreviouslyOn(false);
  };

  // 7. RSVP Speed Reader Launch
  const handleLaunchRsvp = () => {
    const rawWords = currentChapter.content
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter((w) => w.length > 0);

    setRsvpWords(rawWords);
    setRsvpIndex(0);
    setIsRsvpPlaying(true);
    setIsRsvpOpen(true);
  };

  // RSVP Word Flash Ticker
  useEffect(() => {
    if (!isRsvpOpen || !isRsvpPlaying || rsvpWords.length === 0) return;

    const intervalMs = Math.round(60000 / rsvpWpm);
    const timer = setInterval(() => {
      setRsvpIndex((prev) => {
        if (prev >= rsvpWords.length - 1) {
          setIsRsvpPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isRsvpOpen, isRsvpPlaying, rsvpWords.length, rsvpWpm]);

  // Speak selection
  const handleSpeakSelection = () => {
    if (!selectionRange) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(selectionRange.text);
      utterance.rate = speechRate;
      if (selectedVoice) {
        const v = availableVoices.find((voice) => voice.name === selectedVoice);
        if (v) utterance.voice = v;
      }
      window.speechSynthesis.speak(utterance);
    }
    setSelectionRange(null);
  };

  // Copy quote
  const handleCopyQuote = () => {
    if (!selectionRange) return;
    navigator.clipboard.writeText(`"${selectionRange.text}"\n— ${book.title} by ${book.author}`);
    setSelectionRange(null);
  };

  // Bookmark toggle
  const isCurrentBookmarked = bookmarkStorage.isBookmarked(book.id, currentChapterIdx);
  const handleToggleBookmark = () => {
    if (isCurrentBookmarked) {
      const existing = bookmarks.find((b) => b.chapterIndex === currentChapterIdx);
      if (existing) {
        bookmarkStorage.removeBookmark(existing.id);
        setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
      }
    } else {
      const newBm = bookmarkStorage.addBookmark({
        bookId: book.id,
        chapterIndex: currentChapterIdx,
        chapterTitle: currentChapter.title,
        excerpt: paragraphBlocks[0]?.slice(0, 100) || 'Bookmark excerpt'
      });
      setBookmarks((prev) => [newBm, ...prev]);
    }
  };

  // Text-To-Speech Chapter Player
  const toggleTTS = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const plainText = currentChapter.content.replace(/<[^>]*>?/gm, ' ');
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = speechRate;
    if (selectedVoice) {
      const v = availableVoices.find((voice) => voice.name === selectedVoice);
      if (v) utterance.voice = v;
    }
    utterance.onend = () => {
      setIsSpeaking(false);
      if (currentChapterIdx < chapters.length - 1) {
        setCurrentChapterIdx((c) => c + 1);
        setPageIndex(0);
      }
    };
    utterance.onerror = () => setIsSpeaking(false);
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Export highlights to markdown
  const handleExportHighlights = () => {
    const md =
      `# Reading Notes & Highlights: ${book.title}\nBy ${book.author}\n\n` +
      highlights
        .map(
          (h) =>
            `> "${h.text}"\n${h.note ? `**Note:** ${h.note}\n` : ''}*Chapter ${h.chapterIndex + 1} • ${new Date(h.createdAt).toLocaleDateString()}*\n`
        )
        .join('\n');

    navigator.clipboard.writeText(md);
    setCopiedNotebook(true);
    setTimeout(() => setCopiedNotebook(false), 2000);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Theme Styling
  const getThemeStyles = () => {
    switch (theme) {
      case 'amoled':
        return 'bg-black text-slate-100 border-slate-900';
      case 'sepia':
        return 'bg-[#F4ECD8] text-[#4A3525] border-[#E2D4B7]';
      case 'paper':
        return 'bg-[#FAF7F2] text-[#2D3748] border-[#E8E1D5]';
      case 'light':
        return 'bg-white text-slate-900 border-slate-200';
      case 'emerald':
        return 'bg-[#062419] text-[#D1FAE5] border-[#0A3D2B]';
      case 'eink':
        return 'bg-white text-black border-slate-300 contrast-125';
      default: // nord / dark
        return 'bg-[#0F172A] text-slate-200 border-slate-800';
    }
  };

  const getHeaderBg = () => {
    switch (theme) {
      case 'amoled':
        return 'bg-black/90 border-slate-900';
      case 'sepia':
        return 'bg-[#EBDDC0]/90 text-[#4A3525] border-[#D8C7A5]';
      case 'paper':
        return 'bg-[#F2ECE1]/90 text-[#2D3748] border-[#E0D7C8]';
      case 'light':
        return 'bg-slate-100/90 text-slate-900 border-slate-200';
      case 'emerald':
        return 'bg-[#041A12]/90 text-[#D1FAE5] border-[#083022]';
      case 'eink':
        return 'bg-white text-black border-black';
      default:
        return 'bg-slate-950/80 text-slate-100 border-slate-800/80';
    }
  };

  const getFontFamilyClass = () => {
    switch (fontFamily) {
      case 'serif':
      case 'merriweather':
        return 'font-serif';
      case 'georgia':
        return 'font-serif';
      case 'mono':
        return 'font-mono';
      case 'dyslexic':
        return 'font-sans tracking-wide';
      default:
        return 'font-sans';
    }
  };

  // Filter TOC Chapters
  const filteredChapters = chapters.filter(
    (c) =>
      c.title.toLowerCase().includes(tocSearch.toLowerCase()) ||
      String(c.order).includes(tocSearch)
  );

  // In-Book Full-Text Search Results
  const searchResults = useMemo(() => {
    if (!inBookSearch.trim() || inBookSearch.length < 2) return [];
    const q = inBookSearch.toLowerCase();
    const matches: { chapterIdx: number; chapterTitle: string; snippet: string }[] = [];

    chapters.forEach((ch, cIdx) => {
      const clean = ch.content.replace(/<[^>]*>?/gm, ' ');
      const idx = clean.toLowerCase().indexOf(q);
      if (idx !== -1) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(clean.length, idx + 100);
        matches.push({
          chapterIdx: cIdx,
          chapterTitle: ch.title,
          snippet: `...${clean.slice(start, end)}...`
        });
      }
    });
    return matches.slice(0, 30);
  }, [inBookSearch, chapters]);

  const filteredHighlights = highlights.filter(
    (h) => highlightFilter === 'all' || h.color === highlightFilter
  );

  // Mobile Sync Handoff Link
  const mobileSyncUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?ebookId=${book.id}&ch=${currentChapterIdx + 1}&pg=${pageIndex + 1}`
    : '';

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col ${getThemeStyles()} ${getFontFamilyClass()} transition-colors duration-300 select-text overflow-hidden`}
      onMouseUp={handleMouseUp}
    >
      {/* -------------------------------------------------------------
          1. READEST FLOATING SELECTION TOOLBAR
         ------------------------------------------------------------- */}
      {selectionRange && (
        <div
          style={{
            top: `${Math.max(12, selectionRange.y)}px`,
            left: `${selectionRange.x}px`
          }}
          className="fixed -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-150 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Highlight Color Circles */}
          <div className="flex items-center gap-1 pr-1.5 border-r border-slate-700">
            <button
              onClick={() => handleAddHighlight('yellow')}
              className="w-5 h-5 rounded-full bg-amber-400 hover:scale-125 transition-transform shadow"
              title="Yellow Highlight"
            />
            <button
              onClick={() => handleAddHighlight('emerald')}
              className="w-5 h-5 rounded-full bg-emerald-400 hover:scale-125 transition-transform shadow"
              title="Emerald Highlight"
            />
            <button
              onClick={() => handleAddHighlight('sky')}
              className="w-5 h-5 rounded-full bg-sky-400 hover:scale-125 transition-transform shadow"
              title="Sky Blue Highlight"
            />
            <button
              onClick={() => handleAddHighlight('rose')}
              className="w-5 h-5 rounded-full bg-rose-400 hover:scale-125 transition-transform shadow"
              title="Rose Highlight"
            />
            <button
              onClick={() => handleAddHighlight('purple')}
              className="w-5 h-5 rounded-full bg-purple-400 hover:scale-125 transition-transform shadow"
              title="Purple Highlight"
            />
          </div>

          {/* Dictionary Lookup Button */}
          <button
            onClick={handleLookupDictionary}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-amber-400 text-xs font-bold flex items-center gap-1 transition-colors"
            title="Dictionary Definition"
          >
            <BookA className="w-4 h-4" />
            <span className="text-[11px] hidden sm:inline">Define</span>
          </button>

          {/* Translation Button */}
          <button
            onClick={() => handleTranslate('en')}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-sky-400 text-xs font-bold flex items-center gap-1 transition-colors"
            title="Translate to English"
          >
            <Languages className="w-4 h-4" />
            <span className="text-[11px] hidden sm:inline">Translate</span>
          </button>

          {/* AI Character Recap ("Who is this?") */}
          <button
            onClick={handleCharacterRecap}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-emerald-400 text-xs font-bold flex items-center gap-1 transition-colors"
            title="Spoiler-free character recap"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] hidden sm:inline">Who is this?</span>
          </button>

          {/* AI Insights Button */}
          <button
            onClick={() => handleAiExplain('explain')}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-purple-400 text-xs font-bold flex items-center gap-1 transition-colors"
            title="AI Passage Insights"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-[11px] hidden sm:inline">AI Explain</span>
          </button>

          {/* Speak Selection */}
          <button
            onClick={handleSpeakSelection}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition-colors"
            title="Speak Selection"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Copy Quote */}
          <button
            onClick={handleCopyQuote}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Copy Quote with Citation"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------
          2. LOOKUP MODAL (DICTIONARY, TRANSLATION, AI EXPLAIN, CHARACTER)
         ------------------------------------------------------------- */}
      {activeLookup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setActiveLookup(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-white space-y-4 animate-in zoom-in-95 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                {activeLookup.type === 'dictionary' && <BookA className="w-5 h-5 text-amber-400" />}
                {activeLookup.type === 'translate' && <Languages className="w-5 h-5 text-sky-400" />}
                {activeLookup.type === 'ai' && <Sparkles className="w-5 h-5 text-purple-400" />}
                {activeLookup.type === 'character' && <UserCheck className="w-5 h-5 text-emerald-400" />}
                <span>{activeLookup.title}</span>
              </h3>
              <button
                onClick={() => setActiveLookup(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeLookup.loading ? (
              <div className="py-8 text-center space-y-2">
                <Sparkles className="w-6 h-6 text-purple-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Consulting reading intelligence engine...</p>
              </div>
            ) : activeLookup.type === 'dictionary' && activeLookup.data ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-bold text-amber-300">{activeLookup.data.word}</h4>
                    {activeLookup.data.phonetic && (
                      <p className="text-xs text-slate-400">{activeLookup.data.phonetic}</p>
                    )}
                  </div>
                  {activeLookup.data.audio && (
                    <button
                      onClick={() => {
                        const audio = new Audio(activeLookup.data.audio);
                        audio.play();
                      }}
                      className="p-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-black transition-colors"
                      title="Audio Pronunciation"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {activeLookup.data.meanings?.map((m: any, idx: number) => (
                  <div key={idx} className="space-y-1.5 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 text-xs">
                    <span className="font-extrabold uppercase text-[10px] text-amber-400 tracking-wider">
                      {m.partOfSpeech}
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-slate-200">
                      {m.definitions?.map((def: string, i: number) => (
                        <li key={i} className="leading-relaxed">{def}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : activeLookup.type === 'translate' && activeLookup.data ? (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 text-xs space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Original:</span>
                  <p className="text-slate-300 italic">{activeLookup.data.original}</p>
                </div>
                <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/40 text-sm space-y-1">
                  <span className="text-[10px] text-sky-400 uppercase font-bold">Translation:</span>
                  <p className="text-white font-medium">{activeLookup.data.translated}</p>
                </div>
              </div>
            ) : activeLookup.type === 'character' && activeLookup.data ? (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs sm:text-sm text-emerald-100 leading-relaxed space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                    <UserCheck className="w-4 h-4" />
                    <span>Spoiler-Free Character Dossier (Up to Ch. {currentChapterIdx + 1})</span>
                  </div>
                  <p>{activeLookup.data.explanation}</p>
                </div>
              </div>
            ) : activeLookup.type === 'ai' && activeLookup.data ? (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 text-xs sm:text-sm text-purple-100 leading-relaxed">
                  {activeLookup.data.explanation}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No lookup information available.</p>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          3. "PREVIOUSLY ON..." CHAPTER RECAP MODAL
         ------------------------------------------------------------- */}
      {isPreviouslyOnOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsPreviouslyOnOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-white space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2 text-amber-400">
                <History className="w-5 h-5" />
                <span>Previously On: {book.title}</span>
              </h3>
              <button
                onClick={() => setIsPreviouslyOnOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingPreviouslyOn ? (
              <div className="py-8 text-center space-y-2">
                <Sparkles className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Generating chapter catch-up summary...</p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm leading-relaxed text-slate-200 space-y-2">
                <p className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                  Catching Up (Before Chapter {currentChapterIdx + 1})
                </p>
                <p>{previouslyOnSummary || 'Ready to resume your reading session.'}</p>
              </div>
            )}

            <button
              onClick={() => setIsPreviouslyOnOpen(false)}
              className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors shadow-lg"
            >
              Resume Reading Chapter {currentChapterIdx + 1}
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          4. RSVP SPEED READER MODAL (SPRITZ MODE)
         ------------------------------------------------------------- */}
      {isRsvpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsRsvpOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-white space-y-6 animate-in zoom-in-95 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black flex items-center gap-2 text-emerald-400">
                <Gauge className="w-4 h-4" />
                <span>RSVP Speed Reader ({rsvpWpm} WPM)</span>
              </h3>
              <button
                onClick={() => setIsRsvpOpen(false)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Spritz Word Display Box */}
            <div className="h-32 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center relative overflow-hidden shadow-inner">
              {/* Fixation Crosshairs */}
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-red-500/30 -translate-x-1/2" />
              <div className="text-3xl sm:text-4xl font-mono font-black tracking-wide text-white">
                {rsvpWords[rsvpIndex] ? (
                  (() => {
                    const word = rsvpWords[rsvpIndex];
                    const mid = Math.floor((word.length - 1) / 3);
                    return (
                      <span>
                        <span>{word.slice(0, mid)}</span>
                        <span className="text-amber-400 underline">{word[mid]}</span>
                        <span>{word.slice(mid + 1)}</span>
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-slate-500 text-sm">End of Chapter</span>
                )}
              </div>
            </div>

            {/* RSVP Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setRsvpIndex((i) => Math.max(0, i - 15))}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Rewind 15 words"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsRsvpPlaying(!isRsvpPlaying)}
                className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {isRsvpPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                <span>{isRsvpPlaying ? 'Pause' : 'Start Reading'}</span>
              </button>

              <button
                onClick={() => setRsvpIndex((i) => Math.min(rsvpWords.length - 1, i + 15))}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Forward 15 words"
              >
                <FastForward className="w-4 h-4" />
              </button>
            </div>

            {/* WPM Speed Slider */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Reading Speed</span>
                <span className="text-emerald-400 font-mono">{rsvpWpm} WPM</span>
              </div>
              <input
                type="range"
                min={200}
                max={750}
                step={25}
                value={rsvpWpm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setRsvpWpm(val);
                  savePreference({ rsvpWpm: val });
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          5. 1-CLICK QR CODE MOBILE SYNC MODAL
         ------------------------------------------------------------- */}
      {isQrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-white space-y-4 animate-in zoom-in-95 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black flex items-center gap-2 text-sky-400">
                <QrCode className="w-4 h-4" />
                <span>Sync to Mobile Phone</span>
              </h3>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-lg mx-auto">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mobileSyncUrl)}`}
                alt="Scan to read on mobile"
                className="w-48 h-48 rounded"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-300 font-semibold">
                Scan with your phone camera to continue reading:
              </p>
              <p className="text-[11px] text-emerald-400 font-mono truncate">
                Ch. {currentChapterIdx + 1} • Page {pageIndex + 1}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          6. TOP NAVIGATION HEADER
         ------------------------------------------------------------- */}
      <header className={`p-3 sm:p-4 border-b backdrop-blur-md flex items-center justify-between gap-3 ${getHeaderBg()} flex-shrink-0 transition-colors`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (isSpeaking) window.speechSynthesis.cancel();
              ambientAudio.stop();
              onExit();
            }}
            className="p-2 rounded-xl hover:bg-slate-800/40 transition-colors flex items-center gap-1 text-xs font-bold"
            title="Exit Reader"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Library</span>
          </button>

          <div className="h-4 w-px bg-slate-700/50 hidden sm:block" />

          {/* Table of Contents Drawer Trigger */}
          <button
            onClick={() => {
              setDrawerTab('toc');
              setDrawerOpen(true);
            }}
            className="p-2 rounded-xl hover:bg-slate-800/40 transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Table of Contents (T)"
          >
            <Menu className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline line-clamp-1 max-w-[200px] text-left">
              {currentChapter.title}
            </span>
          </button>
        </div>

        {/* Center: Book Title & Quick Catch-Up Button */}
        <div className="flex items-center gap-2">
          <div className="text-center hidden lg:block max-w-xs truncate">
            <h2 className="text-xs font-bold line-clamp-1">{book.title}</h2>
            <p className="text-[10px] opacity-70">
              Ch. {currentChapterIdx + 1} of {chapters.length || 1} • ~{estimatedMins} min left
            </p>
          </div>

          {/* Catch-Up Recap Button */}
          <button
            onClick={handlePreviouslyOn}
            className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-black transition-all text-xs font-bold hidden sm:flex items-center gap-1"
            title="3-Sentence catch-up summary of previous chapters"
          >
            <History className="w-3.5 h-3.5" />
            <span>Previously On...</span>
          </button>
        </div>

        {/* Right Header Action Icons */}
        <div className="flex items-center gap-1.5">
          {/* Ambient Soundscapes Toggle */}
          <button
            onClick={() => {
              setDrawerTab('ambient');
              setDrawerOpen(true);
            }}
            className={`p-2 rounded-xl transition-colors ${
              ambientSound !== 'off'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 animate-pulse'
                : 'hover:bg-slate-800/40 opacity-80 hover:opacity-100'
            }`}
            title="Ambient Soundscapes (Rain, Fireplace, Cafe)"
          >
            <CloudRain className="w-4 h-4" />
          </button>

          {/* RSVP Speed Reader */}
          <button
            onClick={handleLaunchRsvp}
            className="p-2 rounded-xl hover:bg-slate-800/40 transition-colors text-amber-400 hidden sm:flex"
            title="RSVP Speed Reader (Spritz Mode)"
          >
            <Gauge className="w-4 h-4" />
          </button>

          {/* Quick Bookmark Toggle */}
          <button
            onClick={handleToggleBookmark}
            className={`p-2 rounded-xl transition-colors ${
              isCurrentBookmarked
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'hover:bg-slate-800/40 opacity-80 hover:opacity-100'
            }`}
            title={isCurrentBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
          >
            <Bookmark className={`w-4 h-4 ${isCurrentBookmarked ? 'fill-current' : ''}`} />
          </button>

          {/* Bionic Reading Mode */}
          <button
            onClick={() => {
              setBionicReading(!bionicReading);
              savePreference({ bionicReading: !bionicReading });
            }}
            className={`p-2 rounded-xl transition-colors font-bold text-xs flex items-center gap-1 ${
              bionicReading
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'hover:bg-slate-800/40 opacity-80 hover:opacity-100'
            }`}
            title="Toggle Bionic Reading Mode (B)"
          >
            <Zap className="w-4 h-4" />
            <span className="text-[10px] hidden sm:inline">Bionic</span>
          </button>

          {/* Text-To-Speech (TTS) */}
          <button
            onClick={toggleTTS}
            className={`p-2 rounded-xl transition-colors ${
              isSpeaking
                ? 'bg-purple-600 text-white animate-pulse shadow-lg shadow-purple-600/30'
                : 'hover:bg-slate-800/40 opacity-80 hover:opacity-100'
            }`}
            title="Read Chapter Aloud (TTS)"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-purple-400" />}
          </button>

          {/* Mobile QR Sync */}
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="p-2 rounded-xl hover:bg-slate-800/40 transition-colors hidden sm:flex"
            title="Sync position to Mobile via QR Code"
          >
            <QrCode className="w-4 h-4 text-sky-400" />
          </button>

          {/* Send to Kobo Wireless (BookDrop) */}
          <button
            onClick={() => setIsKoboModalOpen(true)}
            className="p-2 rounded-xl hover:bg-slate-800/40 transition-colors text-purple-300 hidden sm:flex items-center gap-1"
            title="Wireless Send Book to Kobo (BookDrop)"
          >
            <Tablet className="w-4 h-4" />
            <span className="text-[10px] hidden md:inline font-bold">Kobo</span>
          </button>

          {/* Typography & Layout Settings */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2 rounded-xl transition-colors ${
              isSettingsOpen ? 'bg-emerald-500 text-slate-950 font-bold' : 'hover:bg-slate-800/40'
            }`}
            title="Reader Customization & Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl hover:bg-slate-800/40 transition-colors hidden sm:flex"
            title="Fullscreen Mode"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------
          7. READEST DRAWER (TOC, BOOKMARKS, HIGHLIGHTS, SEARCH, AMBIENT, STATS)
         ------------------------------------------------------------- */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="w-full max-w-sm h-full bg-slate-900 text-white border-r border-slate-800 shadow-2xl flex flex-col p-5 space-y-4 animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header & Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-2xl border border-slate-800 text-[11px] font-bold overflow-x-auto scrollbar-none">
                {[
                  { id: 'toc', label: 'TOC' },
                  { id: 'search', label: 'Search' },
                  { id: 'bookmarks', label: 'Bookmarks' },
                  { id: 'highlights', label: 'Notes' },
                  { id: 'ambient', label: 'Audio' },
                  { id: 'analytics', label: 'Stats' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDrawerTab(t.id as any)}
                    className={`px-2.5 py-1.5 rounded-xl transition-all flex-shrink-0 ${
                      drawerTab === t.id ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white ml-2 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB 1: TABLE OF CONTENTS */}
            {drawerTab === 'toc' && (
              <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tocSearch}
                    onChange={(e) => setTocSearch(e.target.value)}
                    placeholder="Filter chapters..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {filteredChapters.map((ch, idx) => {
                    const originalIdx = chapters.findIndex((c) => c.id === ch.id);
                    const isCurrent = originalIdx === currentChapterIdx;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => {
                          setCurrentChapterIdx(originalIdx);
                          setPageIndex(0);
                          setDrawerOpen(false);
                        }}
                        className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all ${
                          isCurrent
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                        }`}
                      >
                        <span className="line-clamp-1">{ch.title}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-black flex-shrink-0">
                            READING
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: IN-BOOK FULL-TEXT SEARCH */}
            {drawerTab === 'search' && (
              <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={inBookSearch}
                    onChange={(e) => setInBookSearch(e.target.value)}
                    placeholder="Search full book text..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {searchResults.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                    <Search className="w-8 h-8 opacity-40" />
                    <p className="text-xs">
                      {inBookSearch ? 'No matches found in this book.' : 'Type any phrase or character name to search all chapters.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {searchResults.map((m, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setCurrentChapterIdx(m.chapterIdx);
                          setPageIndex(0);
                          setDrawerOpen(false);
                        }}
                        className="w-full p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 text-left space-y-1 transition-all"
                      >
                        <span className="text-[11px] font-bold text-emerald-400 block">{m.chapterTitle}</span>
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{m.snippet}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: BOOKMARKS */}
            {drawerTab === 'bookmarks' && (
              <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{bookmarks.length} Bookmarks Saved</span>
                  <button
                    onClick={handleToggleBookmark}
                    className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Bookmark Here</span>
                  </button>
                </div>

                {bookmarks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                    <BookMarked className="w-8 h-8 opacity-40" />
                    <p className="text-xs">No bookmarks saved yet for this book.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {bookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        onClick={() => {
                          setCurrentChapterIdx(bm.chapterIndex);
                          setPageIndex(0);
                          setDrawerOpen(false);
                        }}
                        className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 cursor-pointer space-y-1.5 group transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400 line-clamp-1">
                            {bm.chapterTitle}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              bookmarkStorage.removeBookmark(bm.id);
                              setBookmarks((prev) => prev.filter((b) => b.id !== bm.id));
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                          &quot;{bm.excerpt}&quot;
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: HIGHLIGHTS & NOTES */}
            {drawerTab === 'highlights' && (
              <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px]">
                    {['all', 'yellow', 'emerald', 'sky', 'purple', 'rose'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setHighlightFilter(c)}
                        className={`px-2 py-0.5 rounded-md font-bold uppercase transition-all ${
                          highlightFilter === c ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleExportHighlights}
                    className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center gap-1"
                    title="Export all highlights to Markdown"
                  >
                    {copiedNotebook ? <Check className="w-3 h-3 text-emerald-400" /> : <Download className="w-3 h-3" />}
                    <span>{copiedNotebook ? 'Copied' : 'Export'}</span>
                  </button>
                </div>

                {filteredHighlights.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                    <Highlighter className="w-8 h-8 opacity-40" />
                    <p className="text-xs">Select any text in the book to highlight & add notes.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {filteredHighlights.map((hl) => (
                      <div
                        key={hl.id}
                        className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`w-3 h-3 rounded-full ${
                              hl.color === 'yellow'
                                ? 'bg-amber-400'
                                : hl.color === 'emerald'
                                ? 'bg-emerald-400'
                                : hl.color === 'sky'
                                ? 'bg-sky-400'
                                : hl.color === 'rose'
                                ? 'bg-rose-400'
                                : 'bg-purple-400'
                            }`}
                          />
                          <span className="text-[10px] text-slate-500">
                            Ch. {hl.chapterIndex + 1}
                          </span>
                          <button
                            onClick={() => {
                              highlightsStorage.removeHighlight(hl.id);
                              setHighlights((prev) => prev.filter((h) => h.id !== hl.id));
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-200 italic leading-relaxed">
                          &quot;{hl.text}&quot;
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: AMBIENT SOUNDSCAPES */}
            {drawerTab === 'ambient' && (
              <div className="flex-1 flex flex-col space-y-4 overflow-y-auto pr-1 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="font-black text-sky-400 text-sm flex items-center gap-1.5">
                    <CloudRain className="w-4 h-4" />
                    <span>Ambient Sound Generator</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {[
                      { id: 'off', label: 'Off', icon: VolumeX },
                      { id: 'rain', label: 'Rain Window', icon: CloudRain },
                      { id: 'fireplace', label: 'Fireplace', icon: FlameKindling },
                      { id: 'cafe', label: 'Cozy Cafe', icon: Coffee },
                      { id: 'forest', label: 'Forest Wind', icon: Trees },
                      { id: 'whitenoise', label: 'Brown Noise', icon: Radio }
                    ].map((s) => {
                      const Icon = s.icon;
                      const active = ambientSound === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            const newSound = s.id as AmbientSoundType;
                            setAmbientSound(newSound);
                            savePreference({ ambientSound: newSound });
                          }}
                          className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                            active
                              ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-lg shadow-sky-500/20'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {ambientSound !== 'off' && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-400">
                      <span>Soundscape Volume</span>
                      <span className="text-sky-400 font-mono">{Math.round(ambientVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={ambientVolume}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAmbientVolume(val);
                        savePreference({ ambientVolume: val });
                      }}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: LIVE READING ANALYTICS */}
            {drawerTab === 'analytics' && (
              <div className="flex-1 flex flex-col space-y-4 overflow-y-auto pr-1 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="font-black text-emerald-400 text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>Session Statistics</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Session Time</span>
                      <span className="text-base font-black text-white">{sessionElapsedMins} mins</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Reading Speed</span>
                      <span className="text-base font-black text-emerald-400">~220 WPM</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="font-black text-sky-400 text-sm flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4" />
                    <span>Book Progress</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-slate-400">
                      <span>Chapter Words:</span>
                      <span className="text-white font-bold">{chapterWordCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Time in Chapter:</span>
                      <span className="text-white font-bold">~{estimatedMins} mins</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Full Book Est.:</span>
                      <span className="text-white font-bold">~{estimatedBookMins} mins</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          8. TYPOGRAPHY & LAYOUT SETTINGS POPUP ("Settings Remembers")
         ------------------------------------------------------------- */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex items-start justify-end p-4 pt-16 animate-in fade-in"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-slate-900/95 border border-slate-700 shadow-2xl p-5 text-white space-y-5 backdrop-blur-2xl animate-in zoom-in-95 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Reader Customization & Presets</span>
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Layout Mode: Paginated vs Scroll */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">View Layout</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setLayoutMode('scroll');
                    savePreference({ layoutMode: 'scroll' });
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    layoutMode === 'scroll'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <Scroll className="w-4 h-4" />
                  <span>Vertical Scroll</span>
                </button>
                <button
                  onClick={() => {
                    setLayoutMode('paginated');
                    savePreference({ layoutMode: 'paginated' });
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    layoutMode === 'paginated'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <Columns2 className="w-4 h-4" />
                  <span>Paginated Book</span>
                </button>
              </div>
            </div>

            {/* Theme Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">Theme Color</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'dark', label: 'Nord Dark', bg: 'bg-[#0F172A]', border: 'border-slate-700' },
                  { id: 'amoled', label: 'OLED Black', bg: 'bg-black', border: 'border-slate-800' },
                  { id: 'sepia', label: 'Sepia', bg: 'bg-[#F4ECD8]', border: 'border-[#D8C7A5]' },
                  { id: 'paper', label: 'Warm Paper', bg: 'bg-[#FAF7F2]', border: 'border-[#E0D7C8]' },
                  { id: 'light', label: 'Light', bg: 'bg-white', border: 'border-slate-300' },
                  { id: 'emerald', label: 'Emerald', bg: 'bg-[#062419]', border: 'border-emerald-900' },
                  { id: 'eink', label: 'E-Ink', bg: 'bg-white', border: 'border-black' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      const newTheme = t.id as EBookTheme;
                      setTheme(newTheme);
                      savePreference({ theme: newTheme });
                    }}
                    className={`py-2 px-1 rounded-xl text-[10px] font-extrabold flex flex-col items-center gap-1 border transition-all ${
                      theme === t.id ? 'ring-2 ring-emerald-400 scale-105 shadow-md' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full ${t.bg} ${t.border} border`} />
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">Font Family</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'sans', label: 'Inter Sans', font: 'font-sans' },
                  { id: 'serif', label: 'Merriweather', font: 'font-serif' },
                  { id: 'mono', label: 'Monospace', font: 'font-mono' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      const newFont = f.id as EBookFontFamily;
                      setFontFamily(newFont);
                      savePreference({ fontFamily: newFont });
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${f.font} ${
                      fontFamily === f.id
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-1 border-t border-slate-800">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Font Size</span>
                  <span className="text-emerald-400 font-mono">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={14}
                  max={30}
                  value={fontSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFontSize(val);
                    savePreference({ fontSize: val });
                  }}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Line Spacing</span>
                  <span className="text-emerald-400 font-mono">{lineHeight}</span>
                </div>
                <input
                  type="range"
                  min={1.4}
                  max={2.4}
                  step={0.1}
                  value={lineHeight}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLineHeight(val);
                    savePreference({ lineHeight: val });
                  }}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Content Max Width</span>
                  <span className="text-emerald-400 font-mono">{maxWidth}px</span>
                </div>
                <input
                  type="range"
                  min={600}
                  max={1100}
                  step={40}
                  value={maxWidth}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMaxWidth(val);
                    savePreference({ maxWidth: val });
                  }}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Narrator TTS Speed</span>
                  <span className="text-emerald-400 font-mono">{speechRate}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={speechRate}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSpeechRate(val);
                    savePreference({ speechRate: val });
                  }}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          9. MAIN READING CONTAINER (PAGINATED & SCROLL MODES)
         ------------------------------------------------------------- */}
      <main
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 flex justify-center relative select-text"
      >
        <div
          style={{
            maxWidth: `${maxWidth}px`,
            fontSize: `${fontSize}px`,
            lineHeight: `${lineHeight}`,
            textAlign
          }}
          className="w-full space-y-6 pb-24 transition-all"
        >
          {/* Chapter Title Banner */}
          <div className="text-center pb-6 border-b border-current opacity-20 space-y-1">
            <span className="text-xs uppercase tracking-widest font-black opacity-60">
              {book.title}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">{currentChapter.title}</h1>
          </div>

          {/* MODE A: PAGINATED BOOK SPREAD VIEW */}
          {layoutMode === 'paginated' ? (
            <div className="space-y-6 min-h-[50vh] flex flex-col justify-between animate-in fade-in duration-200">
              <div className="space-y-6">
                {currentPaginatedBlocks.map((block, idx) => {
                  const globalBlockIdx = pageIndex * blocksPerPage + idx;
                  const isActive = activeBlock === globalBlockIdx && isAudiobookPlaying;
                  const displayedHtml = bionicReading ? applyBionicReading(block) : block;

                  return (
                    <div
                      key={globalBlockIdx}
                      id={`block-${globalBlockIdx}`}
                      onClick={() => setManualBlock(globalBlockIdx)}
                      className={`transition-all rounded-2xl p-2 -mx-2 leading-relaxed cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500/20 border-l-4 border-emerald-500 px-3 shadow-md'
                          : ''
                      }`}
                      dangerouslySetInnerHTML={{ __html: displayedHtml }}
                    />
                  );
                })}
              </div>

              {/* Paginated Navigation Bar */}
              <div className="pt-8 border-t border-current opacity-30 flex items-center justify-between text-xs font-bold">
                <button
                  onClick={() => {
                    if (pageIndex > 0) setPageIndex((p) => p - 1);
                    else if (currentChapterIdx > 0) {
                      setCurrentChapterIdx((c) => c - 1);
                      setPageIndex(0);
                    }
                  }}
                  disabled={pageIndex === 0 && currentChapterIdx === 0}
                  className="px-4 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-current flex items-center gap-1.5 disabled:opacity-30 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <span className="font-mono">
                  Page {pageIndex + 1} of {totalPages}
                </span>

                <button
                  onClick={() => {
                    if (pageIndex < totalPages - 1) setPageIndex((p) => p + 1);
                    else if (currentChapterIdx < chapters.length - 1) {
                      setCurrentChapterIdx((c) => c + 1);
                      setPageIndex(0);
                    }
                  }}
                  disabled={pageIndex >= totalPages - 1 && currentChapterIdx >= chapters.length - 1}
                  className="px-4 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-current flex items-center gap-1.5 disabled:opacity-30 transition-all cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* MODE B: CONTINUOUS VERTICAL SCROLL VIEW */
            <div className="space-y-6 animate-in fade-in duration-200">
              {paragraphBlocks.map((block, idx) => {
                const isActive = activeBlock === idx && isAudiobookPlaying;
                const displayedHtml = bionicReading ? applyBionicReading(block) : block;

                return (
                  <div
                    key={idx}
                    id={`block-${idx}`}
                    onClick={() => setManualBlock(idx)}
                    className={`transition-all rounded-2xl p-2 -mx-2 leading-relaxed cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/20 border-l-4 border-emerald-500 px-3 shadow-md'
                        : ''
                    }`}
                    dangerouslySetInnerHTML={{ __html: displayedHtml }}
                  />
                );
              })}

              {/* Next / Prev Chapter Controls */}
              <div className="pt-12 border-t border-current opacity-30 flex items-center justify-between gap-4">
                <button
                  onClick={() => {
                    if (currentChapterIdx > 0) {
                      setCurrentChapterIdx((c) => c - 1);
                      setPageIndex(0);
                    }
                  }}
                  disabled={currentChapterIdx === 0}
                  className="py-3 px-5 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-current font-bold text-xs flex items-center gap-2 disabled:opacity-30 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Chapter</span>
                </button>

                <button
                  onClick={() => {
                    if (currentChapterIdx < chapters.length - 1) {
                      setCurrentChapterIdx((c) => c + 1);
                      setPageIndex(0);
                    }
                  }}
                  disabled={currentChapterIdx >= chapters.length - 1}
                  className="py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-30 transition-all shadow-lg cursor-pointer"
                >
                  <span>Next Chapter</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* -------------------------------------------------------------
          10. BOTTOM COMPACT READING PROGRESS & CONTROLS FOOTER
         ------------------------------------------------------------- */}
      <footer className={`p-2 sm:p-3 border-t backdrop-blur-md flex items-center justify-between gap-3 text-xs font-semibold ${getHeaderBg()} flex-shrink-0 transition-colors`}>
        <div className="flex items-center gap-2 opacity-70">
          <span>Ch. {currentChapterIdx + 1}/{chapters.length || 1}</span>
          <span>•</span>
          <span>~{estimatedMins}m in chapter</span>
        </div>

        {/* Global Book Progress Slider */}
        <div className="flex items-center gap-2 max-w-xs w-full">
          <input
            type="range"
            min={0}
            max={Math.max(0, chapters.length - 1)}
            value={currentChapterIdx}
            onChange={(e) => {
              setCurrentChapterIdx(Number(e.target.value));
              setPageIndex(0);
            }}
            className="w-full accent-emerald-500 cursor-pointer h-1.5"
          />
          <span className="font-mono text-[11px] opacity-80 min-w-[32px] text-right">
            {Math.round(((currentChapterIdx + 1) / (chapters.length || 1)) * 100)}%
          </span>
        </div>
      </footer>

      {/* Send to Kobo Modal */}
      {isKoboModalOpen && (
        <SendToKoboModal
          book={book}
          onClose={() => setIsKoboModalOpen(false)}
        />
      )}
    </div>
  );
};
