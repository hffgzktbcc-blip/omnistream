import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2, AlertTriangle, RefreshCw, Volume2, VolumeX, Maximize } from 'lucide-react';

interface HlsVideoPlayerProps {
  streamUrl: string;
  title: string;
  autoPlay?: boolean;
}

export const HlsVideoPlayer: React.FC<HlsVideoPlayerProps> = ({
  streamUrl,
  title,
  autoPlay = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setLoading(true);
    setError(null);

    // Destroy existing instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
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
              console.warn('HLS Network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS Media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error:', data);
              setError('Unable to load live stream feed. Stream might be offline or geo-restricted.');
              setLoading(false);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS support
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        if (autoPlay) video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        setError('Native player failed to load stream.');
        setLoading(false);
      });
    } else {
      setError('HLS live streaming is not supported in this browser.');
      setLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, retryCount, autoPlay]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/85 backdrop-blur-sm pointer-events-none">
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
          <p className="text-xs font-black text-white uppercase tracking-wider">
            Connecting to Live Native HLS Stream...
          </p>
        </div>
      )}

      {/* Error Fallback */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-[#000c1e]/95 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-white">Stream Error</h3>
          <p className="text-xs text-blue-200/80 max-w-sm">{error}</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Stream</span>
          </button>
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
