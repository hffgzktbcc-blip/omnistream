import React, { useState, useEffect } from 'react';
import { stremioService, StremioAddon } from '../../services/stremioService';
import {
  X,
  Zap,
  ShieldCheck,
  Key,
  ExternalLink,
  Check,
  Trash2,
  Plus,
  Tv,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface StremioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const StremioSettingsModal: React.FC<StremioSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [debridKey, setDebridKey] = useState<string>('');
  const [provider, setProvider] = useState<string>('realdebrid');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [addons, setAddons] = useState<StremioAddon[]>([]);
  const [customAddonUrl, setCustomAddonUrl] = useState<string>('');
  const [addonLoading, setAddonLoading] = useState<boolean>(false);
  const [addonError, setAddonError] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [testingKey, setTestingKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDebridKey(stremioService.getDebridKey());
      setProvider(stremioService.getDebridProvider());
      setAddons(stremioService.getAddons());
      setSavedStatus(null);
      setAddonError(null);
      setTestResult(null);
    }
  }, [isOpen]);

  const handleTestDebridKey = async () => {
    if (!debridKey.trim()) {
      setTestResult({ success: false, message: 'Please paste your API token first.' });
      return;
    }
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/debrid/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: debridKey.trim(), provider })
      });
      const data = await res.json();
      if (data.success) {
        const expStr = data.expiration ? ` • Expires: ${new Date(data.expiration).toLocaleDateString()}` : '';
        setTestResult({
          success: true,
          message: `Connected! Account: ${data.username || 'Active'} | ${data.isPremium ? '💎 Premium Active' : '⚠️ Free Account'}${expStr}`
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to authenticate with provider.'
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `Network error testing token: ${e.message}`
      });
    } finally {
      setTestingKey(false);
    }
  };

  if (!isOpen) return null;

  const handleSaveDebrid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debridKey.trim()) {
      stremioService.clearDebridConfig();
      setSavedStatus('Debrid token removed. Defaulting to free scrapers.');
    } else {
      stremioService.setDebridConfig(debridKey.trim(), provider);
      setSavedStatus('✨ Debrid token active! Direct 4K native streams enabled.');
    }
    onSaved?.();
    setTimeout(() => setSavedStatus(null), 4000);
  };

  const handleToggleAddon = (id: string, currentEnabled: boolean) => {
    stremioService.toggleAddon(id, !currentEnabled);
    setAddons(stremioService.getAddons());
    onSaved?.();
  };

  const handleRemoveAddon = (id: string) => {
    stremioService.removeAddon(id);
    setAddons(stremioService.getAddons());
    onSaved?.();
  };

  const handleAddCustomAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAddonUrl.trim()) return;
    setAddonLoading(true);
    setAddonError(null);

    const res = await stremioService.addCustomAddon(customAddonUrl);
    setAddonLoading(false);

    if (res.success) {
      setCustomAddonUrl('');
      setAddons(stremioService.getAddons());
      setSavedStatus(`Installed ${res.addon?.name}!`);
      onSaved?.();
      setTimeout(() => setSavedStatus(null), 3000);
    } else {
      setAddonError(res.error || 'Failed to validate Stremio addon manifest.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-[#001026] border-2 border-indigo-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient */}
        <div className="h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-amber-400 w-full" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-indigo-900/60 bg-[#00173d] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 shadow-lg shadow-indigo-500/10">
              <Zap className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Stremio & Debrid Engine</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-mono shadow-sm">
                  PRO NATIVE 4K
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                Unlock instant uncompressed 4K HDR playback directly without web iframes or buffering
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-blue-300 hover:text-white rounded-xl hover:bg-blue-900 transition-colors cursor-pointer border border-blue-800/40"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-100">
          {/* Status Feedback Toast */}
          {savedStatus && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2.5 shadow-lg">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{savedStatus}</span>
            </div>
          )}

          {/* SECTION 1: Real-Debrid / Torbox Fast-Lane */}
          <div className="p-5 rounded-2xl bg-[#00173d]/90 border border-indigo-800/60 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wide">
                  Debrid High-Speed Fast-Lane
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/30">
                Zero Ads • Multi-Gigabit CDN
              </span>
            </div>

            <p className="text-xs text-blue-200/80 leading-relaxed">
              Real-Debrid & Torbox stream cached 4K Blu-ray remuxes directly over high-speed CDNs. When configured, OmniStream streams movies & series natively in our hardware player without touching web embed servers.
            </p>

            <form onSubmit={handleSaveDebrid} className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-blue-300 mb-1">Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-blue-950 border border-blue-800 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                  >
                    <option value="realdebrid">Real-Debrid (Popular)</option>
                    <option value="torbox">Torbox (Cloud Storage)</option>
                    <option value="alldebrid">AllDebrid</option>
                    <option value="premiumize">Premiumize</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-blue-300 mb-1">
                    API Token
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      placeholder="Paste your API token here..."
                      value={debridKey}
                      onChange={(e) => setDebridKey(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 rounded-xl bg-blue-950 border border-blue-800 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                <a
                  href="https://real-debrid.com/apitoken"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <span>Get Real-Debrid API Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestDebridKey}
                    disabled={testingKey || !debridKey.trim()}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {testingKey ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                        <span>Test & Verify</span>
                      </>
                    )}
                  </button>

                  {debridKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setDebridKey('');
                        stremioService.clearDebridConfig();
                        setSavedStatus('Debrid key cleared.');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-rose-200 text-xs font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md shadow-amber-400/20"
                  >
                    Save Key
                  </button>
                </div>
              </div>

              {/* Real-time Token Test Diagnostic Card */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2.5 transition-all animate-fade-in ${
                    testResult.success
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold">{testResult.message}</p>
                    {testResult.success && (
                      <p className="text-[10px] text-emerald-400/80 mt-0.5">
                        High-speed cloud seedbox streaming active for both 4K movies & audiobooks.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* SECTION 2: Active Stremio Community Addons */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Configured Stremio Addons ({addons.filter((a) => a.enabled).length} Active)
                </h3>
              </div>
              <span className="text-[10px] text-blue-300/70 font-mono">Open Protocol</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {addons.map((addon) => (
                <div
                  key={addon.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    addon.enabled
                      ? 'bg-[#00173d] border-indigo-500/50 shadow-md'
                      : 'bg-slate-950/50 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white truncate">{addon.name}</span>
                      {addon.id === 'torrentio' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                          Recommended
                        </span>
                      )}
                      {addon.isCustom && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-blue-200/70 truncate mt-0.5">
                      {addon.description || addon.url}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleAddon(addon.id, addon.enabled)}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        addon.enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {addon.enabled ? 'Enabled' : 'Disabled'}
                    </button>

                    {addon.isCustom && (
                      <button
                        onClick={() => handleRemoveAddon(addon.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Addon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: Install Custom Stremio Addon */}
          <div className="p-4 rounded-2xl bg-[#001433] border border-blue-900/60 space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-black text-white">Install Custom Stremio Addon</h4>
            </div>

            <form onSubmit={handleAddCustomAddon} className="flex gap-2">
              <input
                type="text"
                placeholder="Paste manifest URL (e.g. https://addon.strem.fun/manifest.json)..."
                value={customAddonUrl}
                onChange={(e) => setCustomAddonUrl(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-blue-950 border border-blue-800 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={addonLoading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex-shrink-0"
              >
                {addonLoading ? 'Validating...' : 'Install'}
              </button>
            </form>

            {addonError && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1.5 font-mono">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{addonError}</span>
              </p>
            )}
          </div>

          {/* SECTION 4: Android TV & Remote Polish Note */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 to-purple-950/40 border border-blue-900/50 flex items-start gap-3">
            <Tv className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-blue-200/90">
              <span className="font-black text-white block">Optimized for Android TV & Fire TV</span>
              <p className="leading-relaxed">
                Stremio direct streams launch directly in OmniStream’s native cinema player. You can seek with the D-pad (Left/Right for 10s jump), play/pause with OK, and toggle subtitles with zero iframes.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#00173d] border-t border-indigo-900/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
