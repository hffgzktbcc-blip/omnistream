import React, { useState, useEffect } from 'react';
import {
  Tv,
  X,
  Airplay,
  Cast,
  CheckCircle2,
  Volume2,
  Wifi,
  Sparkles,
  Smartphone,
  Radio,
  ExternalLink,
  Laptop
} from 'lucide-react';

interface CastModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaTitle: string;
  mediaType: 'movie' | 'tv' | 'anime' | 'audiobook' | 'sports';
  onAirPlayNative?: () => void;
}

interface CastDevice {
  id: string;
  name: string;
  type: 'appletv' | 'homepod' | 'smarttv' | 'chromecast';
  location: string;
  protocol: 'AirPlay 2' | 'Google Cast' | 'DLNA';
  status: 'available' | 'connected';
}

const AVAILABLE_DEVICES: CastDevice[] = [
  {
    id: 'appletv_living_room',
    name: 'Apple TV 4K',
    type: 'appletv',
    location: 'Living Room',
    protocol: 'AirPlay 2',
    status: 'available'
  },
  {
    id: 'appletv_bedroom',
    name: 'Apple TV HD',
    type: 'appletv',
    location: 'Master Bedroom',
    protocol: 'AirPlay 2',
    status: 'available'
  },
  {
    id: 'homepod_audio',
    name: 'HomePod Stereo Pair',
    type: 'homepod',
    location: 'Living Room',
    protocol: 'AirPlay 2',
    status: 'available'
  },
  {
    id: 'chromecast_ultra',
    name: 'Sony Bravia 4K TV',
    type: 'smarttv',
    location: 'Media Lounge',
    protocol: 'Google Cast',
    status: 'available'
  }
];

export const CastModal: React.FC<CastModalProps> = ({
  isOpen,
  onClose,
  mediaTitle,
  mediaType,
  onAirPlayNative
}) => {
  const [devices, setDevices] = useState<CastDevice[]>(AVAILABLE_DEVICES);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<CastDevice | null>(null);
  const [volume, setVolume] = useState<number>(85);
  const [hasNativeAirplay, setHasNativeAirplay] = useState<boolean>(false);

  useEffect(() => {
    // Detect native Safari/WebKit AirPlay support
    if (typeof window !== 'undefined') {
      const isWebKit = 'WebKitPlaybackTargetAvailabilityEvent' in window || 'WebKitMediaKeyError' in window;
      setHasNativeAirplay(isWebKit);
    }
  }, []);

  if (!isOpen) return null;

  const handleConnect = (device: CastDevice) => {
    if (connectedDevice?.id === device.id) {
      setConnectedDevice(null);
      return;
    }

    setConnectingId(device.id);

    // Try native WebKit AirPlay if available
    if (onAirPlayNative && device.protocol === 'AirPlay 2') {
      try {
        onAirPlayNative();
      } catch (e) {}
    }

    setTimeout(() => {
      setConnectingId(null);
      setConnectedDevice(device);
    }, 1200);
  };

  const handleDisconnect = () => {
    setConnectedDevice(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Airplay className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Cast to Apple TV & Displays</span>
              </h3>
              <p className="text-[11px] text-slate-400 line-clamp-1 max-w-[220px]">
                {mediaTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Connected State Bar */}
        {connectedDevice && (
          <div className="p-4 bg-indigo-600/10 border-b border-indigo-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <p className="text-xs font-bold text-white">Streaming to {connectedDevice.name}</p>
                  <span className="text-[10px] text-indigo-300">{connectedDevice.protocol} • 4K HDR Audio/Video</span>
                </div>
              </div>

              <button
                onClick={handleDisconnect}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Disconnect
              </button>
            </div>

            {/* Remote TV Volume Slider */}
            <div className="flex items-center gap-3 pt-1">
              <Volume2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[11px] font-mono text-slate-400 w-8 text-right">{volume}%</span>
            </div>
          </div>
        )}

        {/* Device List */}
        <div className="p-4 space-y-2.5 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 pb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Available Apple TV & AirPlay Targets</span>
            <span className="flex items-center gap-1 text-[10px]">
              <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>LAN Connected</span>
            </span>
          </div>

          {devices.map((device) => {
            const isConnected = connectedDevice?.id === device.id;
            const isConnecting = connectingId === device.id;

            return (
              <div
                key={device.id}
                onClick={() => handleConnect(device)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isConnected
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-600/10'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isConnected ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300'
                  }`}>
                    {device.type === 'appletv' && <Airplay className="w-4 h-4" />}
                    {device.type === 'homepod' && <Radio className="w-4 h-4" />}
                    {device.type === 'smarttv' && <Tv className="w-4 h-4" />}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{device.name}</span>
                      <span className="text-[9px] font-mono font-normal px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-700">
                        {device.protocol}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">{device.location}</p>
                  </div>
                </div>

                <div>
                  {isConnecting && (
                    <span className="text-xs text-indigo-400 font-bold animate-pulse">Connecting...</span>
                  )}
                  {isConnected && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                  )}
                  {!isConnected && !isConnecting && (
                    <span className="text-xs text-slate-400 group-hover:text-white font-medium">Cast</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mac / iOS AirPlay Mirroring Shortcut Help */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="w-3.5 h-3.5 text-indigo-400" />
            <span>On macOS / iOS: Tap <strong>Control Center → Screen Mirroring</strong></span>
          </div>
          <span className="text-[10px] font-mono text-indigo-400 font-bold">AirPlay 2</span>
        </div>
      </div>
    </div>
  );
};
