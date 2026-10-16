'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<ToastMessage, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a graceful fallback if used outside provider
    return {
      toast: () => {},
      success: (msg: string) => console.log('[Toast Success]:', msg),
      error: (msg: string) => console.error('[Toast Error]:', msg),
      info: (msg: string) => console.info('[Toast Info]:', msg),
      warning: (msg: string) => console.warn('[Toast Warning]:', msg),
    };
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = toast.duration ?? 4000;

    setToasts((prev) => [...prev, { ...toast, id }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((message: string, title?: string) => {
    addToast({ type: 'success', message, title: title || 'Success' });
  }, [addToast]);

  const error = useCallback((message: string, title?: string) => {
    addToast({ type: 'error', message, title: title || 'Error' });
  }, [addToast]);

  const info = useCallback((message: string, title?: string) => {
    addToast({ type: 'info', message, title: title || 'Notice' });
  }, [addToast]);

  const warning = useCallback((message: string, title?: string) => {
    addToast({ type: 'warning', message, title: title || 'Warning' });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info, warning }}>
      {children}
      {/* Floating Stacking Toasts Container */}
      <aside
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-[#121212]/95 backdrop-blur-md border border-[#2B2B2B] shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            {/* Status Icon */}
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && (
                <div className="w-5 h-5 rounded-full bg-[#2FB36F]/15 text-[#2FB36F] flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              )}
              {t.type === 'error' && (
                <div className="w-5 h-5 rounded-full bg-[#D85C5C]/15 text-[#D85C5C] flex items-center justify-center text-xs font-bold">
                  ✕
                </div>
              )}
              {t.type === 'warning' && (
                <div className="w-5 h-5 rounded-full bg-[#D6A83A]/15 text-[#D6A83A] flex items-center justify-center text-xs font-bold">
                  !
                </div>
              )}
              {t.type === 'info' && (
                <div className="w-5 h-5 rounded-full bg-[#6B8FD6]/15 text-[#6B8FD6] flex items-center justify-center text-xs font-bold">
                  ℹ
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {t.title && (
                <div className="text-xs font-semibold text-[#F2F0EA] leading-tight mb-0.5">
                  {t.title}
                </div>
              )}
              <div className="text-xs text-[#B0ADA5] leading-relaxed break-words">
                {t.message}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 rounded-md text-[#716F69] hover:text-[#F2F0EA] hover:bg-[#1C1C1C] transition-colors"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </aside>
    </ToastContext.Provider>
  );
}
