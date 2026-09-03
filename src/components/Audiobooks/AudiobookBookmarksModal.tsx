import React, { useState } from 'react';
import { X, Bookmark, Plus, Trash2, Clock, Play } from 'lucide-react';
import { Audiobook, AudiobookBookmark } from '../../types/audiobook';
import { audiobookStorage } from '../../services/audiobookStorage';

interface AudiobookBookmarksModalProps {
  book: Audiobook | null;
  isOpen: boolean;
  onClose: () => void;
  currentTime: number;
  currentTrackIndex: number;
  currentTrackName?: string;
  onSeekTo: (seconds: number, trackIndex?: number) => void;
}

export const AudiobookBookmarksModal: React.FC<AudiobookBookmarksModalProps> = ({
  book,
  isOpen,
  onClose,
  currentTime,
  currentTrackIndex,
  currentTrackName,
  onSeekTo
}) => {
  const [noteText, setNoteText] = useState('');
  const [bookmarks, setBookmarks] = useState<AudiobookBookmark[]>(() => {
    return book ? audiobookStorage.getBookmarks(book.id) : [];
  });

  if (!isOpen || !book) return null;

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleAddBookmark = () => {
    const newBm: AudiobookBookmark = {
      id: 'bm_' + Date.now(),
      timestamp: Math.floor(currentTime),
      note: noteText.trim() || currentTrackName || `Mark at ${formatTime(currentTime)}`,
      createdAt: Date.now(),
      partIndex: currentTrackIndex
    };

    const updated = audiobookStorage.saveBookmark(book.id, newBm);
    setBookmarks(updated);
    setNoteText('');
  };

  const handleDelete = (id: string) => {
    const updated = audiobookStorage.deleteBookmark(book.id, id);
    setBookmarks(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f1422] border border-blue-900/50 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Audiobook Bookmarks</h3>
              <p className="text-xs text-slate-400 truncate max-w-[220px]">{book.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Add at Current Position */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5" /> {formatTime(currentTime)}
            </span>
            <span className="text-[10px] text-slate-500">Shortcut: Press 'B' while playing</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Optional note / thoughts on this moment..."
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddBookmark();
              }}
            />
            <button
              onClick={handleAddBookmark}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>

        {/* List of Bookmarks */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {bookmarks.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs">
              No bookmarks saved yet. Use the input above to pin key moments!
            </div>
          ) : (
            bookmarks.map((bm) => (
              <div
                key={bm.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition group"
              >
                <div
                  className="flex-1 min-w-0 cursor-pointer pr-3"
                  onClick={() => {
                    onSeekTo(bm.timestamp, bm.partIndex);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {formatTime(bm.timestamp)}
                    </span>
                    {bm.partIndex !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        Track {bm.partIndex + 1}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white truncate mt-0.5 font-medium">{bm.note}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onSeekTo(bm.timestamp, bm.partIndex);
                      onClose();
                    }}
                    className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 transition cursor-pointer"
                    title="Jump to bookmark"
                  >
                    <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                  </button>
                  <button
                    onClick={() => handleDelete(bm.id)}
                    className="p-2 rounded-xl hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                    title="Delete bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
