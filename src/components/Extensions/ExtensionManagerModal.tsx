import React, { useState } from 'react';
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
  Info
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
  const [activeTab, setActiveTab] = useState<'installed' | 'available' | 'add'>('installed');
  const [customRepoUrl, setCustomRepoUrl] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const refreshList = () => {
    setExtensions(extensionManager.getExtensions());
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

  const handleAddCustomRepo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRepoUrl) return;
    try {
      extensionManager.addCustomRepository(customRepoUrl);
      setCustomRepoUrl('');
      refreshList();
      setActiveTab('installed');
      setStatusMessage('Custom repository added successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('Invalid repository URL format.');
    }
  };

  const installedList = extensions.filter((e) => e.installed);
  const availableList = extensions.filter((e) => !e.installed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
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
                  v2.4
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage your manga, comic, and webtoon scraper providers
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
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-800/80 bg-slate-900/60">
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
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'available'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Extension Store ({availableList.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'add'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            + Add Custom Repo
          </button>
        </div>

        {/* Toast / Status */}
        {statusMessage && (
          <div className="mx-6 mt-3 px-3 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {activeTab === 'installed' && (
            <>
              {installedList.map((ext) => (
                <div
                  key={ext.id}
                  className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between gap-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="text-2xl flex-shrink-0">{ext.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
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

                    {ext.type === 'custom' && (
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
            </>
          )}

          {activeTab === 'available' && (
            <>
              {availableList.length > 0 ? (
                availableList.map((ext) => (
                  <div
                    key={ext.id}
                    className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="text-2xl flex-shrink-0">{ext.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{ext.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            v{ext.version}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{ext.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleInstall(ext)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all cursor-pointer flex-shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Install</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-xs">All official extensions are installed and up to date!</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'add' && (
            <div className="space-y-4 py-2">
              {/* 1-Click Keiyoushi Preset */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🌐</span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Keiyoushi Community Repository</h4>
                      <p className="text-[11px] text-slate-400">The premier community extension repository (500+ sources for Manga, Manhwa, Comics & Webtoons)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      extensionManager.addCustomRepository('https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json');
                      refreshList();
                      setActiveTab('installed');
                      setStatusMessage('Added Keiyoushi Community Repository!');
                      setTimeout(() => setStatusMessage(null), 3000);
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>1-Click Add Keiyoushi</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddCustomRepo} className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-800/40 text-blue-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Info className="w-4 h-4 text-blue-400" />
                    <span>Custom Tachiyomi / Mihon / Tachimanga Repositories</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Enter any `index.min.json` repository URL or Suwayomi Server endpoint to dynamically link third-party extension sources into OmniStream.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Repository Index URL</label>
                  <input
                    type="url"
                    value={customRepoUrl}
                    onChange={(e) => setCustomRepoUrl(e.target.value)}
                    placeholder="https://raw.githubusercontent.com/.../index.min.json"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 text-xs text-white placeholder-slate-500 focus:outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Custom Repository</span>
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
