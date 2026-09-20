import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2, AlertTriangle, RefreshCw, ChevronRight, ExternalLink, Tv } from 'lucide-react';

interface HlsVideoPlayerProps {
  streamUrl?: string;
  src?: string;
  title: string;
  autoPlay?: boolean;
  onStreamError?: (error: string) => void;
  onNextServer?: () => void;
  onPopout?: () => void;
}

export const HlsVideoPlayer: React.FC<HlsVideoPlayerProps> = ({
  streamUrl,
  src,
  title,
  autoPlay = true,
  onStreamError,
  onNextServer,
  onPopout
}) => {
  const effectiveUrl = streamUrl || src || '';
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const networkRetriesRef = useRef<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !effectiveUrl) return;

    setLoading(true);
    setError(null);
    networkRetriesRef.current = 0;

    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // 6.5-second watchdog timer: never let user get trapped in endless loading
    const watchdogTimer = setTimeout(() => {
      setLoading((currLoading) => {
        if (currLoading) {
          setError('Live stream connection timed out. Feed might be offline, geo-restricted, or blocked by browser CORS.');
          onStreamError?.('Connection timed out');
          return false;
        }
        return false;
      });
    }, 6500);

    const onPlaybackStarted = () => {
      clearTimeout(watchdogTimer);
      setLoading(false);
      setError(null);
    };

    video.addEventListener('playing', onPlaybackStarted);
    video.addEventListener('loadeddata', onPlaybackStarted);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        manifestLoadingTimeOut: 5000,
        levelLoadingTimeOut: 5000,
        fragLoadingTimeOut: 6000
      });
      hlsRef.current = hls;

      hls.loadSource(effectiveUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        onPlaybackStarted();
        if (autoPlay) {
          video.play().catch(() => {
            // Browser autoplay policy might require mute
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkRetriesRef.current += 1;
              if (networkRetriesRef.current <= 2) {
                console.warn(`[HLS] Network error, retry attempt ${networkRetriesRef.current}/2...`);
                hls.startLoad();
              } else {
                console.error('[HLS] Fatal Network error on stream:', effectiveUrl);
                clearTimeout(watchdogTimer);
                setLoading(false);
                setError('Unable to load live stream. Feed is offline, CORS-restricted, or geo-blocked.');
                hls.destroy();
                onStreamError?.('Network error / CORS blocked');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS] Media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[HLS] Fatal error:', data);
              clearTimeout(watchdogTimer);
              setLoading(false);
              setError('Live stream feed unavailable.');
              hls.destroy();
              onStreamError?.('Fatal playback error');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS support
      video.src = effectiveUrl;
      video.addEventListener('loadedmetadata', onPlaybackStarted);
      video.addEventListener('error', () => {
        clearTimeout(watchdogTimer);
        setLoading(false);
        setError('Native browser player failed to decode live stream.');
        onStreamError?.('Native playback error');
      });
      if (autoPlay) {
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    } else {
      clearTimeout(watchdogTimer);
      setLoading(false);
      setError('HLS live streaming is not supported on this browser.');
    }

    return () => {
      clearTimeout(watchdogTimer);
      video.removeEventListener('playing', onPlaybackStarted);
      video.removeEventListener('loadeddata', onPlaybackStarted);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [effectiveUrl, retryCount, autoPlay, onStreamError]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/90 backdrop-blur-sm pointer-events-none animate-in fade-in duration-150">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
          <div className="text-center space-y-1">
            <p className="text-xs font-black text-white uppercase tracking-wider">
              Connecting to Live HLS Feed...
            </p>
            <p className="text-[10px] text-blue-300/70 font-mono">
              Auto-negotiating stream & low-latency buffer
            </p>
          </div>
        </div>
      )}

      {/* Error Fallback */}
      {error && !loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-[#000c1e]/95 text-center space-y-4 animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mx-auto shadow-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-sm font-black text-white">Stream Temporarily Unavailable</h3>
            <p className="text-xs text-blue-200/80 leading-relaxed">{error}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            {onNextServer && (
              <button
                onClick={onNextServer}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-400/20 transition-all hover:scale-105"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>Switch to Next Server</span>
              </button>
            )}

            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                setRetryCount((c) => c + 1);
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-900/80 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-blue-700/60 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>

            {onPopout && (
              <button
                onClick={onPopout}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Popout</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* HTML5 Native Video Tag */}
      <video
        ref={videoRef}
        controls
        playsInline
        className="w-full h-full object-contain"
      />
    </div>
  );
};

