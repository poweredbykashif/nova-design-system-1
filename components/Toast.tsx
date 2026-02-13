
import React, { useState, useEffect, useCallback } from 'react';
import { ToastItem, ToastType, ToastPosition } from '../types';
import { IconCheck, IconAlertTriangle, IconInfo, IconXCircle } from './Icons';

interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Entrance animation trigger
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(toast.id), 200); // Faster exit
      }, toast.duration || 4000); // Slightly shorter default duration
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  const handleManualClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(toast.id), 200);
  };

  const icons = {
    success: <IconCheck className="text-brand-success w-3.5 h-3.5" strokeWidth={3} />,
    error: <IconXCircle className="text-brand-error w-3.5 h-3.5" strokeWidth={3} />,
    info: <IconInfo className="text-brand-info w-3.5 h-3.5" strokeWidth={3} />,
  };

  const accents = {
    success: 'bg-brand-success',
    error: 'bg-brand-error',
    info: 'bg-brand-info',
  };

  const tints = {
    success: 'bg-brand-success/5',
    error: 'bg-brand-error/5',
    info: 'bg-brand-info/5',
  };

  return (
    <div
      className={`relative flex items-center gap-3 pl-1 pr-3 py-2.5 min-w-[280px] max-w-sm bg-surface-card border border-white/5 rounded-xl shadow-2xl backdrop-blur-md transition-all duration-300 ease-out transform ${isVisible
        ? 'translate-y-0 opacity-100'
        : '-translate-y-4 opacity-0 scale-95'
        }`}
    >
      {/* Left Accent Pillar */}
      <div className={`shrink-0 w-1 h-6 rounded-full ml-1.5 ${accents[toast.type]}`} />

      {/* Soft Background Tint */}
      <div className={`absolute inset-0 z-[-1] rounded-xl ${tints[toast.type]}`} />

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <div className="shrink-0">
          {icons[toast.type]}
        </div>
        <div className="flex flex-col">
          <h4 className="text-[13px] font-bold text-white leading-tight">{toast.title}</h4>
          {toast.message && <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{toast.message}</p>}
        </div>
      </div>

      <button
        onClick={handleManualClose}
        className="shrink-0 p-1 text-gray-600 hover:text-white transition-colors rounded-md hover:bg-white/5 ml-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Ultra-subtle Progress Bar */}
      {toast.duration !== 0 && (
        <div className="absolute bottom-0 left-0 h-[1.5px] w-full rounded-b-xl overflow-hidden opacity-40">
          <div
            className={`h-full transition-all linear ${accents[toast.type]} ${isVisible ? 'w-0' : 'w-full'}`}
            style={{ transitionDuration: `${toast.duration || 4000}ms` }}
          />
        </div>
      )}
    </div>
  );
};

interface ToastContainerProps {
  position?: ToastPosition;
}

// Singleton-style state for the demo
let toastListeners: ((toasts: ToastItem[]) => void)[] = [];
let toasts: ToastItem[] = [];

export const addToast = (toast: Omit<ToastItem, 'id'>) => {
  const id = Math.random().toString(36).substring(2, 9);
  toasts = [...toasts, { ...toast, id }];
  toastListeners.forEach(listener => listener(toasts));
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ position = 'top-center' }) => {
  const [activeToasts, setActiveToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = (newToasts: ToastItem[]) => setActiveToasts(newToasts);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    setActiveToasts(toasts);
    toastListeners.forEach(listener => listener(toasts));
  }, []);

  const positionClasses = {
    'top-center': 'top-6 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  };

  return (
    <div className={`fixed z-[10000] flex flex-col gap-2 pointer-events-none ${positionClasses[position]}`}>
      {activeToasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  );
};
