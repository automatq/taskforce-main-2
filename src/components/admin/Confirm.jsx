import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Icon, Button } from './ui';

const ConfirmCtx = createContext(null);
// Returns a function: confirm({ title, message, confirmLabel, danger }) -> Promise<boolean>
export function useConfirm() {
  return useContext(ConfirmCtx) || (async () => window.confirm('Are you sure?'));
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (opts) => new Promise((resolve) => { resolver.current = resolve; setState(opts || {}); }),
    []
  );

  const close = (value) => { resolver.current?.(value); resolver.current = null; setState(null); };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => close(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-200 bg-white/95 p-6 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.15)] dark:border-white/10 dark:bg-zinc-950/95 dark:shadow-[0_24px_80px_rgba(0,0,0,0.7)] animate-[slideIn_.2s_ease]">
            <div className="flex items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${state.danger ? 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-300 dark:ring-rose-400/20' : 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-300 dark:ring-sky-400/20'}`}>
                <Icon name={state.danger ? 'solar:danger-triangle-bold' : 'solar:question-circle-bold'} className="text-lg" />
              </span>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{state.title || 'Are you sure?'}</h3>
                {state.message && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{state.message}</p>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => close(false)}>{state.cancelLabel || 'Cancel'}</Button>
              <Button variant={state.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
                {state.confirmLabel || 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
