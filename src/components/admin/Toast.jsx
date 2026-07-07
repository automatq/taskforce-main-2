import { createContext, useContext, useState, useCallback } from 'react';
import { Icon } from './ui';

const ToastCtx = createContext(null);
export function useToast() {
  return useContext(ToastCtx) || { success() {}, error() {}, info() {} };
}

const STYLE = {
  success: { icon: 'solar:check-circle-bold', ring: 'ring-emerald-400/30', text: 'text-emerald-600 dark:text-emerald-300', glow: 'shadow-[0_8px_30px_-10px_rgba(16,185,129,0.5)]' },
  error: { icon: 'solar:close-circle-bold', ring: 'ring-rose-400/30', text: 'text-rose-600 dark:text-rose-300', glow: 'shadow-[0_8px_30px_-10px_rgba(244,63,94,0.5)]' },
  info: { icon: 'solar:info-circle-bold', ring: 'ring-sky-400/30', text: 'text-sky-600 dark:text-sky-300', glow: 'shadow-[0_8px_30px_-10px_rgba(14,165,233,0.5)]' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const api = {
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[70] flex w-80 flex-col gap-2">
        {toasts.map((t) => {
          const s = STYLE[t.type] || STYLE.info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur-xl ring-1 dark:border-white/10 dark:bg-zinc-900/90 ${s.ring} ${s.glow} animate-[slideIn_.2s_ease]`}
            >
              <Icon name={s.icon} className={`mt-0.5 text-base ${s.text}`} />
              <p className="flex-1 text-sm text-zinc-700 dark:text-zinc-200">{t.message}</p>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
