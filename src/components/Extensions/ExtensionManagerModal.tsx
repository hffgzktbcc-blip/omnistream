import React, { useState, useEffect } from 'react';
import { ExtensionSource, extensionManager } from '../../services/extensionManager';
import {
  Puzzle,
  X,
  Plus,
  CheckCircle,
  Download,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Globe,
  RefreshCw,
  Sparkles,
  Info,
  Search,
  Loader2,
  Check
} from 'lucide-react';

interface ExtensionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSourcesChanged: () => void;
}

export const ExtensionManagerModal: React.FC<ExtensionManagerModalProps> = ({
  isOpen,
  onClose,
  onSourcesChanged
}) => {
  const [extensions, setExtensions] = useState<ExtensionSource[]>(
    extensionManager.getExtensions()
  );
  const [storeExtensions, setStoreExtensions] = useState<ExtensionSource[]>(
    extensionManager.getStoreExtensions()
  );
  const [activeTab, setActiveTab] = useState<'installed' | 'available' | 'add'>('installed');
  const [customRepoUrl, setCustomRepoUrl] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [langFilter, setLangFilter] = useState('ALL');
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setExtensions(extensionManager.getExtensions());
      const store = extensionManager.getStoreExtensions();
      if (store.length > 0) {
        setStoreExtensions(store);
      } else {
        // Auto-fetch Keiyoushi repository index if store is empty
        handleFetchKeiyoushi(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const refreshList = () => {
    setExtensions(extensionManager.getExtensions());
    setStoreExtensions(extensionManager.getStoreExtensions());
    onSourcesChanged();
  };

  const handleToggle = (id: string) => {
    extensionManager.toggleExtension(id);
    refreshList();
  };

  const handleInstall = (ext: ExtensionSource) => {
    extensionManager.installExtension(ext);
    refreshList();
    setStatusMessage(`Installed ${ext.name}`);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleUninstall = (id: string) => {
    extensionManager.uninstallExtension(id);
    refreshList();
    setStatusMessage('Extension uninstalled');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleFetchKeiyoushi = async (showToast: boolean = true) => {
    setLoadingRepo(true);
    try {
      const result = await extensionManager.fetchAndImportRepository(
        'https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.json'
      );
      refreshList();
      if (showToast) {
        setStatusMessage(`Successfully loaded ${result.count} extensions from ${result.repoName}!`);
        setActiveTab('available');
      }
    } catch (err: any) {
      console.warn('Keiyoushi fetch error:', err);
      if (showToast) setStatusMessage(`Repository error: ${err.message}`);
    } finally {
      setLoadingRepo(false);
      if (showToast) setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleAddCustomRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRepoUrl) return;
    setLoadingRepo(true);
    try {
      const result = await extensionManager.fetchAndImportRepository(customRepoUrl);
      setCustomRepoUrl('');
      refreshList();
      setActiveTab('available');
      setStatusMessage(`Discovered and loaded ${result.count} extensions from ${result.repoName}!`);
    } catch (err: any) {
      setStatusMessage(`Failed to import repository: ${err.message}`);
    } finally {
      setLoadingRepo(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const installedList = extensions.filter((e) => e.installed);
  const installedIds = new Set(installedList.map((e) => e.id));

  const availableList = storeExtensions
    .filter((e) => !installedIds.has(e.id))
    .filter((e) => {
      if (langFilter !== 'ALL' && e.lang !== langFilter) return false;
      if (storeSearch) {
        return (
          e.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
          e.author?.toLowerCase().includes(storeSearch.toLowerCase()) ||
          e.description?.toLowerCase().includes(storeSearch.toLowerCase())
        );
      }
      return true;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Puzzle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Mihon / Tachiyomi Extension Hub</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {storeExtensions.length > 0 ? `${storeExtensions.length} Sources` : 'Live'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Browse and install scraper extensions from Keiyoushi & community repositories
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('installed')}
              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'installed'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Installed Sources ({installedList.length})
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'available'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Extension Store</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">
                {storeExtensions.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'add'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              + Repositories
            </button>
          </div>

          {activeTab === 'available' && (
            <button
              onClick={() => handleFetchKeiyoushi(true)}
              disabled={loadingRepo}
              className="px-3 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loadingRepo ? 'animate-spin' : ''}`} />
              <span>Refresh Index</span>
            </button>
          )}
        </div>

        {/* Toast / Status */}
        {statusMessage && (
          <div className="mx-6 mt-3 px-3 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {/* TAB 1: INSTALLED EXTENSIONS */}
          {activeTab === 'installed' && (
            <div className="space-y-3">
              {installedList.map((ext) => (
                <div
                  key={ext.id}
                  className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between gap-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {ext.icon && ext.icon.startsWith('http') ? (
                      <img
                        src={ext.icon}
                        alt={ext.name}
                        className="w-10 h-10 rounded-xl object-contain bg-slate-800 p-1 flex-shrink-0 border border-slate-700"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-2xl flex-shrink-0">{ext.icon}</span>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate">{ext.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          v{ext.version}
                        </span>
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 border border-blue-800/50 px-1.5 py-0.5 rounded">
                          {ext.lang}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{ext.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(ext.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        ext.enabled
                          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {ext.enabled ? 'Enabled' : 'Disabled'}
                    </button>

                    {ext.type === 'community' && (
                      <button
                        onClick={() => handleUninstall(ext.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Uninstall"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: EXTENSION STORE (1,380+ Community Scrapers) */}
          {activeTab === 'available' && (
            <div className="space-y-4">
              {/* Store Search & Filters */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    placeholder="Search 1,380+ community scrapers (e.g. MangaSee, Bato, Flame, Kakalot, ComicExtra)..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  {['ALL', 'EN', 'JA', 'ES', 'FR'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLangFilter(lang)}
                      className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex-1 sm:flex-initial ${
                        langFilter === lang
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extensions List */}
              {loadingRepo ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Fetching and parsing community extension index...</p>
                </div>
              ) : availableList.length > 0 ? (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {availableList.slice(0, 100).map((ext) => (
                    <div
                      key={ext.id}
                      className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between gap-4 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {ext.icon && ext.icon.startsWith('http') ? (
                          <img
                            src={ext.icon}
                            alt={ext.name}
                            className="w-8 h-8 rounded-lg object-contain bg-slate-800 p-0.5 flex-shrink-0 border border-slate-700"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-xl flex-shrink-0">📖</span>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-white truncate">{ext.name}</h4>
                            <span className="text-[9px] font-mono text-slate-500 bg-slate-800 px-1 py-0.2 rounded">
                              v{ext.version}
                            </span>
                            <span className="text-[9px] font-bold text-blue-400 bg-blue-950/40 px-1 py-0.2 rounded">
                              {ext.lang}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{ext.description}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleInstall(ext)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all cursor-pointer flex-shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Install</span>
                      </button>
                    </div>
                  ))}
                  {availableList.length > 100 && (
                    <p className="text-center text-[11px] text-slate-500 pt-2">
                      Showing top 100 of {availableList.length} matching community extensions. Refine your search above to see more.
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-xs">No uninstalled extensions found for this filter.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REPOSITORIES */}
          {activeTab === 'add' && (
            <div className="space-y-4 py-2">
              {/* 1-Click Keiyoushi Preset */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/30 space-y-3 shadow-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🌐</span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Keiyoushi Community Repository</h4>
                      <p className="text-[11px] text-slate-400">
                        Official community index containing 1,380+ manga, comic & webtoon scraper extensions
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleFetchKeiyoushi(true)}
                    disabled={loadingRepo}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex-shrink-0 disabled:opacity-50"
                  >
                    {loadingRepo ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>{loadingRepo ? 'Indexing...' : '1-Click Index Keiyoushi'}</span>
                  </button>
                </div>
              </div>

              {/* Custom Repo Form */}
              <form onSubmit={handleAddCustomRepo} className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-800/40 text-blue-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Info className="w-4 h-4 text-blue-400" />
                    <span>Custom Tachiyomi / Mihon / Tachimanga Repositories</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Paste any custom `index.json` or `index.min.json` repository URL to dynamically index third-party extensions into OmniStream.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Repository Index URL</label>
                  <input
                    type="url"
                    value={customRepoUrl}
                    onChange={(e) => setCustomRepoUrl(e.target.value)}
                    placeholder="https://raw.githubusercontent.com/.../index.json"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 text-xs text-white placeholder-slate-500 focus:outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingRepo}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loadingRepo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{loadingRepo ? 'Parsing Repository...' : 'Add & Index Custom Repository'}</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>{installedList.filter((e) => e.enabled).length} of {installedList.length} sources active</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
