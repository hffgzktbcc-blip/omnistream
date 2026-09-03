import React, { useState, useEffect } from 'react';
import { ArrQualityProfile, ArrRootFolder } from '../../types/arr';
import { arrService } from '../../services/arrService';
import { useToast } from '../../context/ToastContext';
import {
  Tv,
  Film,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Folder,
  Search,
  Loader2,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface AddArrModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: {
    title: string;
    tmdbId?: number | string;
    tvdbId?: number | string;
    type: 'movie' | 'tv' | 'anime';
    posterUrl?: string;
    year?: number | string;
    overview?: string;
  } | null;
}

export const AddArrModal: React.FC<AddArrModalProps> = ({ isOpen, onClose, media }) => {
  const { showToast } = useToast();
  const [targetType, setTargetType] = useState<'sonarr' | 'radarr'>('radarr');
  const [qualityProfiles, setQualityProfiles] = useState<ArrQualityProfile[]>([]);
  const [rootFolders, setRootFolders] = useState<ArrRootFolder[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number>(1);
  const [selectedRootFolder, setSelectedRootFolder] = useState<string>('');
  const [searchImmediately, setSearchImmediately] = useState<boolean>(true);
  const [seasonFolder, setSeasonFolder] = useState<boolean>(true);
  const [monitored, setMonitored] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !media) return;

    // Set initial target based on media type
    const isTv = media.type === 'tv' || media.type === 'anime';
    const type = isTv ? 'sonarr' : 'radarr';
    setTargetType(type);

    loadProfilesAndFolders(type);
  }, [isOpen, media]);

  const loadProfilesAndFolders = async (type: 'sonarr' | 'radarr') => {
    setLoading(true);
    setConnectionError(null);
    try {
      if (type === 'sonarr') {
        const { profiles, rootFolders } = await arrService.getSonarrProfiles();
        setQualityProfiles(profiles.length > 0 ? profiles : [{ id: 1, name: 'HD - 1080p (Default)' }, { id: 2, name: 'Ultra-HD - 4K' }, { id: 3, name: 'Any / Best Available' }]);
        setRootFolders(rootFolders.length > 0 ? rootFolders : [{ id: 1, path: '/data/media/tv', freeSpace: 500000000000 }]);
        if (profiles[0]) setSelectedProfileId(profiles[0].id);
        if (rootFolders[0]) setSelectedRootFolder(rootFolders[0].path);
        else setSelectedRootFolder('/data/media/tv');
      } else {
        const { profiles, rootFolders } = await arrService.getRadarrProfiles();
        setQualityProfiles(profiles.length > 0 ? profiles : [{ id: 1, name: 'HD - 1080p (Default)' }, { id: 2, name: 'Ultra-HD - 4K' }, { id: 3, name: 'Any / Best Available' }]);
        setRootFolders(rootFolders.length > 0 ? rootFolders : [{ id: 1, path: '/data/media/movies', freeSpace: 500000000000 }]);
        if (profiles[0]) setSelectedProfileId(profiles[0].id);
        if (rootFolders[0]) setSelectedRootFolder(rootFolders[0].path);
        else setSelectedRootFolder('/data/media/movies');
      }
    } catch (err: any) {
      setConnectionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: 'sonarr' | 'radarr') => {
    setTargetType(type);
    loadProfilesAndFolders(type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!media) return;

    setSubmitting(true);
    try {
      if (targetType === 'sonarr') {
        const res = await arrService.addSonarrSeries({
          title: media.title,
          tmdbId: media.tmdbId,
          tvdbId: media.tvdbId ? Number(media.tvdbId) : undefined,
          qualityProfileId: selectedProfileId,
          rootFolderPath: selectedRootFolder,
          seasonFolder,
          monitored,
          searchForMissingEpisodes: searchImmediately
        });

        if (res.success) {
          showToast(`✨ Successfully added "${media.title}" to Sonarr!`, 'success');
          onClose();
        } else {
          showToast(`⚠️ Sonarr: ${res.error || res.details || 'Check connection'}`, 'error');
        }
      } else {
        const res = await arrService.addRadarrMovie({
          title: media.title,
          tmdbId: media.tmdbId,
          qualityProfileId: selectedProfileId,
          rootFolderPath: selectedRootFolder,
          monitored,
          searchForMovie: searchImmediately
        });

        if (res.success) {
          showToast(`✨ Successfully added "${media.title}" to Radarr!`, 'success');
          onClose();
        } else {
          showToast(`⚠️ Radarr: ${res.error || res.details || 'Check connection'}`, 'error');
        }
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !media) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-[#0a0f1d] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${targetType === 'sonarr' ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
              {targetType === 'sonarr' ? <Tv className="w-6 h-6" /> : <Film className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                Add to {targetType === 'sonarr' ? 'Sonarr (TV Show)' : 'Radarr (Movie)'}
              </h3>
              <p className="text-xs text-slate-400">Automate download, quality tracking & file organization</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Preview Banner */}
        <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          {media.posterUrl && (
            <img
              src={media.posterUrl}
              alt={media.title}
              className="w-12 h-16 object-cover rounded-xl shadow-md flex-shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-black text-white truncate">{media.title}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              {media.year && <span>{media.year}</span>}
              <span>•</span>
              <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {media.type}
              </span>
              {media.tmdbId && <span>TMDB #{media.tmdbId}</span>}
            </div>
          </div>
        </div>

        {/* Target Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => handleTypeChange('radarr')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              targetType === 'radarr'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Radarr (Movie)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('sonarr')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              targetType === 'sonarr'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Sonarr (TV Show)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quality Profile */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Quality Profile</span>
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
            >
              {qualityProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Root Folder */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-cyan-400" />
              <span>Root Storage Folder</span>
            </label>
            <select
              value={selectedRootFolder}
              onChange={(e) => setSelectedRootFolder(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
            >
              {rootFolders.map((f, idx) => (
                <option key={f.id || idx} value={f.path}>
                  {f.path} {f.freeSpace ? `(${(f.freeSpace / 1073741824).toFixed(1)} GB free)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Options Checkboxes */}
          <div className="space-y-2 pt-1 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={searchImmediately}
                onChange={(e) => setSearchImmediately(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900"
              />
              <span className="font-semibold">Start Automatic Search on Add (Download Now)</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={monitored}
                onChange={(e) => setMonitored(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900"
              />
              <span>Monitor for Future Releases / Upgrades</span>
            </label>

            {targetType === 'sonarr' && (
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seasonFolder}
                  onChange={(e) => setSeasonFolder(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900"
                />
                <span>Create Season Folders (Season 01, Season 02)</span>
              </label>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || loading}
              className={`px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-lg flex items-center gap-2 transition-all hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                targetType === 'sonarr'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 shadow-sky-500/30'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-500/30'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding to {targetType === 'sonarr' ? 'Sonarr' : 'Radarr'}...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Add & Start Download</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
