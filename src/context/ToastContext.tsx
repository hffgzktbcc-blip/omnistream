import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration: number = 4500) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newToast: ToastMessage = { id, type, title, message, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const showError = useCallback(
    (message: string, title: string = 'Error') => {
      showToast(message, 'error', title, 6000);
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string, title: string = 'Success') => {
      showToast(message, 'success', title, 3500);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, title: string = 'Notice') => {
      showToast(message, 'info', title, 4000);
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, title: string = 'Warning') => {
      showToast(message, 'warning', title, 5000);
    },
    [showToast]
  );

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />;
    }
  };

  const getToastBorder = (type: ToastType) => {
    switch (type) {
      case 'error':
        return 'border-rose-500/40 bg-rose-950/90 text-rose-100 shadow-rose-950/50';
      case 'success':
        return 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100 shadow-emerald-950/50';
      case 'warning':
        return 'border-amber-500/40 bg-amber-950/90 text-amber-100 shadow-amber-950/50';
      case 'info':
      default:
        return 'border-blue-500/40 bg-slate-900/95 text-slate-100 shadow-slate-950/50';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess, showInfo, showWarning }}>
      {children}

      {/* Floating Toasts Viewport */}
      <div
        aria-live="assertive"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-slide-down ${getToastBorder(
              toast.type
            )}`}
          >
            {getToastIcon(toast.type)}
            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="text-xs font-bold leading-tight mb-0.5">{toast.title}</h4>
              )}
              <p className="text-xs font-medium opacity-90 leading-relaxed break-words">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
