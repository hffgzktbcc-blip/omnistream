import React, { useState } from 'react';
import { EBook } from '../../types/ebook';
import { api } from '../../services/api';
import { ebookStorage } from '../../services/ebookStorage';
import {
  X,
  Cloud,
  HardDrive,
  Tablet,
  Download,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Send,
  ExternalLink,
  Lock,
  Radio,
  BookOpen
} from 'lucide-react';

interface CloudBookImportModalProps {
  onClose: () => void;
  onBookImported: (book: EBook) => void;
  onSendToKobo?: (book: EBook) => void;
}

export const CloudBookImportModal: React.FC<CloudBookImportModalProps> = ({
  onClose,
  onBookImported,
  onSendToKobo
}) => {
  const [activeTab, setActiveTab] = useState<'gdrive' | 'calibre' | 'kobo_info'>('gdrive');

  // Google Drive State
  const [gdriveUrl, setGdriveUrl] = useState<string>('');
  const [loadingGdrive, setLoadingGdrive] = useState<boolean>(false);
  const [gdriveSuccess, setGdriveSuccess] = useState<string>('');
  const [gdriveError, setGdriveError] = useState<string>('');

  // Calibre State
  const [calibreUrl, setCalibreUrl] = useState<string>(() => {
    return localStorage.getItem('omnistream_calibre_url') || 'http://localhost:8080/opds';
  });
  const [calibreUser, setCalibreUser] = useState<string>('');
  const [calibrePass, setCalibrePass] = useState<string>('');
  const [calibreCatalog, setCalibreCatalog] = useState<{
    title: string;
    url: string;
    entries: any[];
    subCatalogs: any[];
  } | null>(null);
  const [loadingCalibre, setLoadingCalibre] = useState<boolean>(false);
  const [calibreError, setCalibreError] = useState<string>('');
  const [calibreSearch, setCalibreSearch] = useState<string>('');
  const [importingCalibreId, setImportingCalibreId] = useState<string | null>(null);

  // Kobo Custom File Send State
  const [koboKey, setKoboKey] = useState<string>(() => {
    return localStorage.getItem('omnistream_last_kobo_key') || '';
  });
  const [koboStatus, setKoboStatus] = useState<string>('');

  const opdsFeedUrl = typeof window !== 'undefined'
    ? (window.location.port === '5200' ? `${window.location.protocol}//${window.location.hostname}:3001/api/opds` : `${window.location.origin}/api/opds`)
    : '/api/opds';

  const koboPortalUrl = typeof window !== 'undefined'
    ? (window.location.port === '5200' ? `${window.location.protocol}//${window.location.hostname}:3001/kobo` : `${window.location.origin}/kobo`)
    : '/kobo';

  // 1. Google Drive Import Handler
  const handleImportGdrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gdriveUrl.trim()) return;

    setLoadingGdrive(true);
    setGdriveError('');
    setGdriveSuccess('');

    try {
      const book = await api.importFromGoogleDrive(gdriveUrl.trim());
      await ebookStorage.saveBook(book);
      onBookImported(book);
      setGdriveSuccess(`✨ Successfully imported "${book.title}" by ${book.author}!`);
      setGdriveUrl('');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Google Drive import error:', err);
      setGdriveError(err.message || 'Failed to import book from Google Drive.');
    } finally {
      setLoadingGdrive(false);
    }
  };

  // 2. Calibre Connect & Browse Handler
  const handleBrowseCalibre = async (urlToFetch?: string) => {
    const target = urlToFetch || calibreUrl;
    if (!target.trim()) return;

    setLoadingCalibre(true);
    setCalibreError('');

    try {
      localStorage.setItem('omnistream_calibre_url', target);
      const data = await api.browseCalibre(target, calibreUser, calibrePass);
      setCalibreCatalog(data);
    } catch (err: any) {
      console.error('Calibre browse error:', err);
      setCalibreError(err.message || 'Failed to connect to Calibre OPDS server.');
    } finally {
      setLoadingCalibre(false);
    }
  };

  // 3. Calibre Book Import Handler
  const handleImportCalibreBook = async (entry: any) => {
    const format = entry.formats?.find((f: any) => f.type?.includes('epub')) || entry.formats?.[0];
    if (!format?.url) {
      setCalibreError('No compatible EPUB/PDF download link found in this Calibre entry.');
      return;
    }

    setImportingCalibreId(entry.id);
    try {
      const book = await api.importFromCalibre(
        format.url,
        entry.title,
        entry.author,
        calibreUser,
        calibrePass
      );
      await ebookStorage.saveBook(book);
      onBookImported(book);
      setGdriveSuccess(`✨ Imported "${book.title}" from Calibre into your Bookshelf!`);
      setTimeout(() => setGdriveSuccess(''), 4000);
    } catch (err: any) {
      console.error('Calibre book import error:', err);
      setCalibreError(err.message || 'Failed to download and import book from Calibre.');
    } finally {
      setImportingCalibreId(null);
    }
  };

  const filteredCalibreEntries = (calibreCatalog?.entries || []).filter(
    (e: any) =>
      e.title.toLowerCase().includes(calibreSearch.toLowerCase()) ||
      e.author.toLowerCase().includes(calibreSearch.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 sm:p-7 text-white space-y-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Cloud Sync & E-Reader Hub
              </h2>
              <p className="text-xs text-slate-400">
                Load from Google Drive & Calibre or sync wirelessly with Kobo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800 flex-shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('gdrive')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'gdrive'
                ? 'bg-sky-500 text-slate-950 font-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Google Drive</span>
          </button>

          <button
            onClick={() => setActiveTab('calibre')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'calibre'
                ? 'bg-emerald-500 text-slate-950 font-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Calibre / Calibre-Web</span>
          </button>

          <button
            onClick={() => setActiveTab('kobo_info')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'kobo_info'
                ? 'bg-purple-500 text-white font-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tablet className="w-4 h-4" />
            <span>Kobo &amp; OPDS Sync</span>
          </button>
        </div>

        {/* =============================================================
            TAB 1: GOOGLE DRIVE IMPORTER
           ============================================================= */}
        {activeTab === 'gdrive' && (
          <div className="space-y-5 flex-1 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/30 text-xs text-sky-200 space-y-1">
              <span className="font-bold block text-sky-400">Import Books from Google Drive</span>
              <p className="leading-relaxed">
                Paste any shared Google Drive file link for an <b>.EPUB</b>, <b>.PDF</b>, or <b>.TXT</b>. OmniStream will unpack the chapters, extract the cover, and save it permanently to your library.
              </p>
            </div>

            <form onSubmit={handleImportGdrive} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Google Drive Shared Link</label>
                <input
                  type="url"
                  value={gdriveUrl}
                  onChange={(e) => setGdriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/1A2B3C.../view?usp=sharing"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                  required
                />
                <span className="text-[10px] text-slate-400">
                  Ensure the file permission is set to &quot;Anyone with the link can view&quot;.
                </span>
              </div>

              {gdriveError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{gdriveError}</span>
                </div>
              )}

              {gdriveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 animate-in zoom-in-95">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{gdriveSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loadingGdrive}
                className="w-full py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loadingGdrive ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Fetching &amp; Unpacking from Google Drive...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Import into My Bookshelf</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* =============================================================
            TAB 2: CALIBRE & CALIBRE-WEB OPDS BROWSER
           ============================================================= */}
        {activeTab === 'calibre' && (
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden animate-in fade-in">
            {/* Server Connection Bar */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex-shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={calibreUrl}
                    onChange={(e) => setCalibreUrl(e.target.value)}
                    placeholder="http://localhost:8080/opds"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleBrowseCalibre()}
                  disabled={loadingCalibre}
                  className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {loadingCalibre ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                  <span>Connect</span>
                </button>
              </div>

              {/* Optional Basic Auth Collapsible */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-900 text-xs">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={calibreUser}
                  onChange={(e) => setCalibreUser(e.target.value)}
                  placeholder="Username (optional)"
                  className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-white"
                />
                <input
                  type="password"
                  value={calibrePass}
                  onChange={(e) => setCalibrePass(e.target.value)}
                  placeholder="Password"
                  className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-white"
                />
              </div>
            </div>

            {calibreError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2 flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{calibreError}</span>
              </div>
            )}

            {/* Calibre Books & Subcatalogs Display */}
            {calibreCatalog && (
              <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                {/* Search inside Calibre */}
                <div className="relative flex-shrink-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={calibreSearch}
                    onChange={(e) => setCalibreSearch(e.target.value)}
                    placeholder="Search titles or authors in Calibre..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Sub-catalogs / Categories */}
                {calibreCatalog.subCatalogs?.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-shrink-0 text-xs">
                    {calibreCatalog.subCatalogs.map((sub: any) => (
                      <button
                        key={sub.id}
                        onClick={() => handleBrowseCalibre(sub.url)}
                        className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white border border-slate-700 text-slate-300 transition-colors flex-shrink-0 text-[11px] font-semibold"
                      >
                        📁 {sub.title}
                      </button>
                    ))}
                  </div>
                )}

                {/* Book Rows */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredCalibreEntries.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">
                      No books found in this Calibre category.
                    </p>
                  ) : (
                    filteredCalibreEntries.map((entry: any) => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={entry.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300'}
                            alt={entry.title}
                            className="w-10 h-14 object-cover rounded-lg shadow border border-slate-800 flex-shrink-0"
                          />
                          <div className="space-y-0.5 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{entry.title}</h4>
                            <p className="text-[11px] text-slate-400 truncate">{entry.author}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleImportCalibreBook(entry)}
                            disabled={importingCalibreId === entry.id}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow transition-all cursor-pointer disabled:opacity-50"
                          >
                            {importingCalibreId === entry.id ? (
                              <Sparkles className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            <span>Import</span>
                          </button>

                          {onSendToKobo && (
                            <button
                              onClick={() => onSendToKobo({ id: entry.id, title: entry.title, author: entry.author, cover: entry.cover })}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white transition-colors"
                              title="Send straight to Kobo"
                            >
                              <Tablet className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =============================================================
            TAB 3: KOBO WIRELESS SYNC & OPDS FEED
           ============================================================= */}
        {activeTab === 'kobo_info' && (
          <div className="space-y-5 flex-1 animate-in fade-in text-xs leading-relaxed">
            {/* BookDrop Protocol Section */}
            <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-purple-300 flex items-center gap-2">
                  <Tablet className="w-4 h-4" />
                  <span>Kobo Wireless Drop (BookDrop Engine)</span>
                </h3>
                <a
                  href={koboPortalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <span>Open Kobo Screen</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-slate-300">
                Send any book or chapter in your library directly to your Kobo without cables:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                <li>On your Kobo, open <b>Settings &gt; Beta Features &gt; Web Browser</b>.</li>
                <li>Go to <code className="bg-slate-900 px-1.5 py-0.5 rounded text-purple-300 font-mono">{koboPortalUrl}</code>.</li>
                <li>Note the 4-digit key and click <b>&quot;📲 Send to Kobo&quot;</b> on any book in OmniStream.</li>
              </ol>
            </div>

            {/* Built-in OPDS Catalog Server Section */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                <Radio className="w-4 h-4" />
                <span>Built-in OPDS Wireless Server</span>
              </h3>
              <p className="text-slate-300">
                OmniStream hosts an integrated OPDS catalog. Add this URL to <b>KOReader</b>, <b>Kobo</b>, or <b>Moon+ Reader</b>:
              </p>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300 font-mono text-[11px] select-all truncate">
                {opdsFeedUrl}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
