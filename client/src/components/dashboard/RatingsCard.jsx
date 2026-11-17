import React from 'react';
import { Star, Info } from 'lucide-react';
import { RATINGS_SUMMARY } from './dashboardData';
import { useNotification } from '../../context/NotificationContext';

export const RatingsCard = ({ onOpenReviewsModal }) => {
  const { showToast } = useNotification();
  const onNotify = (msg) => showToast(msg, 'info');

  return (
    <section
      aria-label="Calificación y Reseñas"
      className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs sm:p-4 dark:border-slate-800/90 dark:bg-[#131A26]"
    >
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Calificación y Reseñas
      </h2>

      {/* Rating Summary Bar */}
      <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4].map((s) => (
            <Star
              key={s}
              className="w-4 h-4 fill-amber-400 text-amber-400"
            />
          ))}
          <Star className="w-4 h-4 fill-amber-400/70 text-amber-400" />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-slate-900 dark:text-white tabular-nums">
            4,80 Estrellas
          </span>
          <button
            type="button"
            onClick={() =>
              onNotify('Promedio calculado sobre 128 reseñas verificadas.')
            }
            aria-label="Información sobre calificación"
            className="inline-flex items-center justify-center bg-transparent border-0 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Positive vs Negative breakdown */}
      <div className="my-2.5 grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
        <div className="flex flex-col items-center justify-center px-2 text-center">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full bg-[#22C55E]"
              aria-hidden="true"
            />
            <span className="text-sm font-bold text-slate-900 tabular-nums dark:text-slate-100">
              {RATINGS_SUMMARY.positivePercent}%
            </span>
          </div>
          <span className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
            Reseñas Positivas
          </span>
        </div>

        <div className="flex flex-col items-center justify-center px-2 text-center">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full bg-[#EF4444]"
              aria-hidden="true"
            />
            <span className="text-sm font-bold text-slate-900 tabular-nums dark:text-slate-100">
              {RATINGS_SUMMARY.negativePercent}%
            </span>
          </div>
          <span className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
            Reseñas Negativas
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenReviewsModal}
        className="w-full min-h-[44px] py-2.5 px-4 rounded-full border border-slate-200 dark:border-zinc-700 bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold text-slate-800 dark:text-zinc-100 transition-all cursor-pointer shadow-sm active:scale-95"
      >
        Ver Detalle de Reseñas
      </button>
    </section>
  );
};
