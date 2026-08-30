import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Right Arrow / Space', action: 'Next Page / Next Panel' },
    { key: 'Left Arrow / Shift+Space', action: 'Previous Page / Previous Panel' },
    { key: 'P', action: 'Toggle Smart Guided Panel View' },
    { key: 'S', action: 'Single Page Mode' },
    { key: 'D', action: 'Double Page Spread Mode' },
    { key: 'V', action: 'Vertical Scroll / Webtoon Mode' },
    { key: 'F', action: 'Toggle Fullscreen' },
    { key: 'B', action: 'Add Bookmark' },
    { key: 'Esc', action: 'Exit Reader / Close Menus' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Keyboard Shortcuts</h3>
            <p className="text-[11px] text-slate-400">Quick controls for seamless reading</p>
          </div>
        </div>

        <div className="divide-y divide-slate-800 text-xs">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between py-2.5">
              <span className="text-slate-300">{s.action}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-blue-400 font-mono font-semibold text-[11px] shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
