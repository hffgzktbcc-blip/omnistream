import React, { useState, useEffect } from 'react';
import { EBook } from '../../types/ebook';
import { api } from '../../services/api';
import {
  X,
  Send,
  Tablet,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Sparkles,
  Zap,
  Info,
  ExternalLink
} from 'lucide-react';

interface SendToKoboModalProps {
  book: EBook;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const SendToKoboModal: React.FC<SendToKoboModalProps> = ({
  book,
  onClose,
  onSuccess
}) => {
  const [deviceKey, setDeviceKey] = useState<string>(() => {
    return localStorage.getItem('omnistream_last_kobo_key') || '';
  });
  const [format, setFormat] = useState<'kepub' | 'epub'>('kepub');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const koboPortalUrl = typeof window !== 'undefined'
    ? (window.location.port === '5200' ? `${window.location.protocol}//${window.location.hostname}:3001/kobo` : `${window.location.origin}/kobo`)
    : '/kobo';

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = deviceKey.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    if (cleanKey.length < 3) {
      setErrorMsg('Please enter a valid 4-character Kobo device key.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      localStorage.setItem('omnistream_last_kobo_key', cleanKey);
      const res = await api.sendToKobo(cleanKey, book, format);
      setSuccessMsg(res.message || `Sent "${book.title}" to Kobo (${cleanKey})!`);
      if (onSuccess) onSuccess(`✨ Sent "${book.title}" to Kobo!`);
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error('Send to Kobo failed:', err);
      setErrorMsg(err.message || 'Failed to send book to Kobo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 sm:p-7 text-white space-y-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Tablet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>Send to Kobo / E-Reader</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold uppercase border border-emerald-500/30">
                  BookDrop Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400">Wireless direct-to-device e-book transfer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Book Card */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
          <img
            src={book.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300'}
            alt={book.title}
            className="w-12 h-16 object-cover rounded-xl shadow border border-slate-800 flex-shrink-0"
          />
          <div className="space-y-0.5 min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-white truncate">{book.title}</h4>
            <p className="text-xs text-slate-400 truncate">{book.author}</p>
            <span className="text-[10px] text-emerald-400 font-semibold block">
              {book.totalChapters || book.chapters?.length || 1} Chapters • Ready to Transfer
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="space-y-5">
          {/* Kobo Device Key Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Kobo Device Key</span>
              <span className="text-[11px] text-emerald-400 font-mono">4 Characters</span>
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={6}
                value={deviceKey}
                onChange={(e) => setDeviceKey(e.target.value.toUpperCase())}
                placeholder="e.g. K9X2"
                className="w-full text-center tracking-[8px] font-mono text-2xl font-black py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors uppercase"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Open the web browser on your Kobo and navigate to the link below to see your key.
            </p>
          </div>

          {/* Format Selection (KEPUB vs EPUB) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Format for Kobo</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFormat('kepub')}
                className={`p-3 rounded-2xl border text-left space-y-1 transition-all ${
                  format === 'kepub'
                    ? 'bg-emerald-500/20 text-white border-emerald-500 shadow-md'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400">Kobo EPUB (.kepub)</span>
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  Recommended. Fast page turns, reading stats & chapter graphs.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormat('epub')}
                className={`p-3 rounded-2xl border text-left space-y-1 transition-all ${
                  format === 'epub'
                    ? 'bg-sky-500/20 text-white border-sky-500 shadow-md'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-sky-400">Standard EPUB (.epub)</span>
                  <Info className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  Universal format compatible with all e-readers and Tolino.
                </p>
              </button>
            </div>
          </div>

          {/* Status Notifications */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Converting & Pushing to Kobo...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send &quot;{book.title.slice(0, 22)}...&quot; to Kobo</span>
              </>
            )}
          </button>
        </form>

        {/* Step-by-Step Kobo Pairing Guide */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-white flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>How to pair with your Kobo E-Reader:</span>
            </span>
            <a
              href={koboPortalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 font-bold"
            >
              <span>Open Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
            <li>On your Kobo: Go to <b>More &gt; Beta Features &gt; Web Browser</b></li>
            <li>
              Type this address into Kobo: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-300 font-mono">{koboPortalUrl}</code>
            </li>
            <li>Note the <b>4-character key</b> on your Kobo screen and type it above.</li>
            <li>Tap <b>&quot;Send to Kobo&quot;</b> — download button appears on your Kobo screen in seconds!</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
