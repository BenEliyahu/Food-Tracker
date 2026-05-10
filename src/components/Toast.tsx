import { useState, useEffect } from 'react';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ICONS = { success: '✓', error: '✕', info: 'ℹ' };
const COLORS = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  info: 'bg-gray-700',
};

export default function Toast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, []);

  return (
    <div className="fixed top-5 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast-enter ${COLORS[t.type]} text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2`}
        >
          <span className="text-base">{ICONS[t.type]}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
