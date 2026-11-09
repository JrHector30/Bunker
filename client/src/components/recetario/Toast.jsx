import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ toasts = [], onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 px-3.5 py-2.5 rounded-lg shadow-xl flex items-start gap-2.5 animate-in slide-in-from-bottom-2 duration-150 transition-colors"
        >
          {toast.type === 'success' && (
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          )}
          {toast.type === 'warning' && (
            <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          )}
          {toast.type === 'info' && (
            <Info className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 text-xs">
            <p className="font-bold text-zinc-900 dark:text-white">{toast.title}</p>
            {toast.description && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{toast.description}</p>
            )}
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 ml-1 shrink-0 cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
