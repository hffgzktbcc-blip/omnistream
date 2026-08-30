import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Headphones, Library, Sparkles, UploadCloud } from 'lucide-react';

interface GlobalDropzoneProps {
  onFilesDropped: (files: FileList | File[]) => void;
}

export const GlobalDropzone: React.FC<GlobalDropzoneProps> = ({ onFilesDropped }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      if (e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        setIsDragging(false);
        dragCounter.current = 0;
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFilesDropped(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onFilesDropped]);

  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 pointer-events-none">
      <div className="w-full max-w-2xl p-8 sm:p-12 rounded-3xl border-2 border-dashed border-emerald-500/80 bg-gradient-to-b from-emerald-950/40 via-slate-900/80 to-slate-950/90 shadow-2xl shadow-emerald-500/20 text-center flex flex-col items-center space-y-6 transform scale-105 transition-transform">
        
        {/* Animated Glow Icon */}
        <div className="relative">
          <div className="absolute -inset-3 rounded-full bg-emerald-500/30 blur-xl animate-pulse" />
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center relative shadow-lg">
            <UploadCloud className="w-10 h-10 text-emerald-400 animate-bounce" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>Drop Files to Import</span>
            <Sparkles className="w-6 h-6 text-amber-400 fill-amber-400" />
          </h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            OmniStream will instantly parse chapters, auto-enrich HD covers, and save directly to your local library.
          </p>
        </div>

        {/* Supported Types Badges */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-lg pt-2 text-xs">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center gap-1.5 text-emerald-300">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <span className="font-bold">E-Books</span>
            <span className="text-[10px] text-slate-400">.EPUB, .PDF, .TXT</span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col items-center gap-1.5 text-amber-300">
            <Headphones className="w-5 h-5 text-amber-400" />
            <span className="font-bold">Audiobooks</span>
            <span className="text-[10px] text-slate-400">.MP3, .M4B, .M4A</span>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col items-center gap-1.5 text-indigo-300">
            <Library className="w-5 h-5 text-indigo-400" />
            <span className="font-bold">Comics</span>
            <span className="text-[10px] text-slate-400">.CBZ, .CBR, .ZIP</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-medium pt-2">
          ✨ Zero server uploads — Stored privately in your browser&apos;s high-speed IndexedDB
        </div>
      </div>
    </div>
  );
};
