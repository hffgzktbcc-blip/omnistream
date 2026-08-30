import React, { useRef, useState } from 'react';
import { EBook } from '../../types/ebook';
import {
  BookOpen,
  X,
  Upload,
  Download,
  ExternalLink,
  Sparkles,
  Star,
  CheckCircle2,
  Calendar,
  Layers,
  Globe,
  Waves,
  Check,
  Loader2,
  BookMarked,
  Tablet,
  FolderOpen
} from 'lucide-react';
import { downloadEpubDirectly } from '../../services/epubDownloader';
import { ebookStorage } from '../../services/ebookStorage';
import { api } from '../../services/api';
import { SendToKoboModal } from './SendToKoboModal';

interface EBookDetailModalProps {
  book: EBook | null;
  onClose: () => void;
  onStartReading: (book: EBook) => void;
  onUploadCustomEpub: (file: File) => void;
}

export const EBookDetailModal: React.FC<EBookDetailModalProps> = ({
  book,
  onClose,
  onStartReading,
  onUploadCustomEpub
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>('');
  const [downloaded, setDownloaded] = useState(false);
  const [savedToShelf, setSavedToShelf] = useState(false);
  const [isKoboModalOpen, setIsKoboModalOpen] = useState(false);

  if (!book) return null;

  const localMeta = ebookStorage.getMetaById(book.id);
  const isSavedLocally = Boolean(book.isLocalUpload || (book.chapters && book.chapters.length > 0) || localMeta);
  const isPublicDomain = Boolean(
    typeof book.id === 'number' ||
    book.epubUrl?.includes('gutenberg') ||
    book.sourceUrl?.includes('gutenberg') ||
    book.hasFullText
  );

  const handleOceanofpdfFetchAndRead = async () => {
    setDownloading(true);
    setDownloadProgress('🌊 Fetching direct EPUB from OceanofPDF & unpacking chapters...');
    try {
      const fetchedBook = await api.importOceanofpdfBook(book.oceanofpdfUrl || book.title, book.title, book.author);
      if (fetchedBook) {
        await ebookStorage.saveBook(fetchedBook);
        setDownloaded(true);
        onStartReading(fetchedBook);
      } else {
        setDownloadProgress('Trying alternate mirror...');
        const autoBook = await api.autoFetchEBook(book);
        if (autoBook) {
          await ebookStorage.saveBook(autoBook);
          setDownloaded(true);
          onStartReading(autoBook);
        } else {
          setDownloadProgress('OceanofPDF download failed. Please use links below.');
        }
      }
    } catch (e) {
      setDownloadProgress('Error importing from OceanofPDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleAutoFetchAndRead = async () => {
    setDownloading(true);
    setDownloadProgress('⚡ Scraping & packaging complete book chapters...');
    try {
      const fetchedBook = await api.autoFetchEBook(book);
      if (fetchedBook) {
        await ebookStorage.saveBook(fetchedBook);
        setDownloaded(true);
        onStartReading(fetchedBook);
      } else {
        setDownloadProgress('Could not auto-fetch. Please use direct download links.');
      }
    } catch (e) {
      setDownloadProgress('Auto-fetch error.');
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadCustomEpub(file);
      onClose();
    }
  };

  const handleInAppDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadProgress('Fetching full book chapters...');
    try {
      await downloadEpubDirectly(book, (msg) => setDownloadProgress(msg));
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 4000);
    } catch (err) {
      console.error('Direct download failed:', err);
      setDownloadProgress('Download failed, try external mirrors.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveToBookshelf = async () => {
    await ebookStorage.saveBook({
      ...book,
      isLocalUpload: true,
      hasFullText: true,
      updatedAt: Date.now()
    });
    setSavedToShelf(true);
    setTimeout(() => setSavedToShelf(false), 3000);
  };

  const oceanofpdfSearchUrl =
    book.oceanofpdfUrl ||
    `https://oceanofpdf.com/?s=${encodeURIComponent(`${book.title} ${book.author}`)}`;
  
  const annasArchiveUrl =
    book.annasArchiveUrl ||
    `https://annas-archive.org/search?q=${encodeURIComponent(`${book.title} ${book.author}`)}`;

  const libgenUrl =
    book.libgenUrl ||
    `https://libgen.is/search.php?req=${encodeURIComponent(`${book.title} ${book.author}`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hidden File Input for Custom EPUB Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".epub,.pdf,.txt,.md"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Left: Book Cover & Badges */}
        <div className="w-full md:w-5/12 bg-slate-950/80 p-6 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div className="relative aspect-[2/3] w-48 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 group">
            {book.cover ? (
              <img
                src={book.cover}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 p-4 text-center">
                <BookOpen className="w-12 h-12 text-emerald-400 mb-2" />
                <span className="text-xs font-bold line-clamp-2 text-white">{book.title}</span>
              </div>
            )}
            
            {/* Status Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {isSavedLocally && (
                <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[9px] shadow">
                  IN BOOKSHELF
                </span>
              )}
              {isPublicDomain && (
                <span className="px-2 py-0.5 rounded bg-sky-500 text-slate-950 font-black text-[9px] shadow">
                  FULL TEXT READY
                </span>
              )}
            </div>
          </div>

          <div className="w-full space-y-2 mt-4 text-center">
            <p className="text-[11px] text-slate-400">
              {isSavedLocally
                ? '✅ Ready to read offline with Text-to-Speech'
                : isPublicDomain
                ? '📖 Full multi-chapter text ready to read'
                : '📥 Download EPUB from Anna’s Archive & drop here'}
            </p>
          </div>
        </div>

        {/* Right: Book Details & Actions */}
        <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col justify-between overflow-y-auto space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {isPublicDomain ? 'CLASSIC • FULL TEXT' : 'MODERN BESTSELLER'}
              </span>
              {book.rating && (
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {book.rating}
                </span>
              )}
              {book.year && (
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  {book.year}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {book.title}
            </h2>

            <p className="text-xs sm:text-sm font-semibold text-emerald-400">
              By {book.author}
            </p>

            {/* Subjects / Genres */}
            {book.subjects && book.subjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {book.subjects.slice(0, 4).map((sub, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            )}

            {/* Description / Synopsis */}
            <p className="text-xs text-slate-300 leading-relaxed pt-2 line-clamp-4">
              {book.description || 'Full digital edition. Enjoy rich bionic reading, text-to-speech narration, and offline reading.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-4 border-t border-slate-800">
            {/* 1. Read Full Book In-App */}
            {(isPublicDomain || isSavedLocally) ? (
              <button
                onClick={() => {
                  const target = localMeta ? { ...book, ...localMeta } : book;
                  onStartReading(target);
                }}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                <BookOpen className="w-4 h-4" />
                <span>{isSavedLocally ? 'Resume Reading in Bookshelf' : 'Read Full Book In-App (Bionic & TTS)'}</span>
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleOceanofpdfFetchAndRead}
                  disabled={downloading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-sky-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{downloadProgress || 'Downloading from OceanofPDF...'}</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 text-sky-200" />
                      <span>🌊 1-Click OceanofPDF Download & Read</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleAutoFetchAndRead}
                  disabled={downloading}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-xs border border-emerald-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ Alternate Auto-Fetch Mirror</span>
                </button>
              </div>
            )}

            {/* 2. Download / Verified Source Links */}
            {isPublicDomain ? (
              <button
                onClick={handleInAppDownload}
                disabled={downloading}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all hover:scale-[1.02]"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{downloadProgress || 'Downloading EPUB...'}</span>
                  </>
                ) : downloaded ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Downloaded & Added to Bookshelf!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>⚡ Direct Download Complete .EPUB</span>
                  </>
                )}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={annasArchiveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all hover:scale-105"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Anna&apos;s Archive</span>
                </a>
                <a
                  href={oceanofpdfSearchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all hover:scale-105"
                >
                  <Waves className="w-3.5 h-3.5" />
                  <span>OceanOfPDF</span>
                </a>
              </div>
            )}

            {/* 3. Import / Send to Kobo */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Import .EPUB</span>
              </button>
              <button
                onClick={() => setIsKoboModalOpen(true)}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              >
                <Tablet className="w-3.5 h-3.5 text-purple-400" />
                <span>Send to Kobo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

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
