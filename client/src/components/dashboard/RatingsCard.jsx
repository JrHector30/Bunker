import React, { useState } from 'react';
import { Info, Star } from 'lucide-react';
import { RATINGS_SUMMARY } from './dashboardData';

export const RatingsCard = ({ onOpenReviewsModal }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <section
      aria-label="Calificación y Reseñas"
      className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800/90 dark:bg-[#131A26]"
    >
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Calificación y Reseñas
      </h2>

      {/* Stars and score container */}
      <div className="relative mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-[#F8F9FA] px-3 py-2.5 dark:bg-[#1A2232]">
        <div
          className="flex items-center gap-0.5"
          aria-label={`${RATINGS_SUMMARY.score} de ${RATINGS_SUMMARY.totalStars} estrellas`}
        >
          {Array.from({ length: RATINGS_SUMMARY.totalStars }).map((_, idx) => {
            const isFilled = idx < RATINGS_SUMMARY.filledStars;
            return (
              <Star
                key={idx}
                className={`h-3.5 w-3.5 ${
                  isFilled
                    ? 'fill-[#F59E0B] text-[#F59E0B]'
                    : 'fill-slate-300 text-slate-300 dark:fill-slate-600 dark:text-slate-600'
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-slate-800 tabular-nums whitespace-nowrap dark:text-slate-100">
            {RATINGS_SUMMARY.score} Estrellas
          </span>
          <button
            type="button"
            aria-label="Información sobre el cálculo de calificación"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            onClick={() => setShowTooltip((prev) => !prev)}
            className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/40 dark:text-slate-500 dark:hover:text-slate-200"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>

        {showTooltip && (
          <div
            role="tooltip"
            className="absolute right-2 top-11 z-20 w-56 rounded-xl border border-slate-100 bg-slate-900 px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            Promedio ponderado de {RATINGS_SUMMARY.totalReviews} opiniones verificadas en salón y comensales (últimos 30 días).
          </div>
        )}
      </div>

      {/* Positive vs Negative breakdown */}
      <div className="my-3 grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
        <div className="flex flex-col items-center justify-center px-2 text-center">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full bg-[#22C55E]"
              aria-hidden="true"
            />
            <span className="text-base font-bold text-slate-900 tabular-nums dark:text-slate-100">
              {RATINGS_SUMMARY.positivePercent}%
            </span>
          </div>
          <span className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Reseñas Positivas
          </span>
        </div>

        <div className="flex flex-col items-center justify-center px-2 text-center">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full bg-[#EF4444]"
              aria-hidden="true"
            />
            <span className="text-base font-bold text-slate-900 tabular-nums dark:text-slate-100">
              {RATINGS_SUMMARY.negativePercent}%
            </span>
          </div>
          <span className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Reseñas Negativas
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenReviewsModal}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/40 whitespace-nowrap dark:border-slate-700 dark:bg-[#1A2232] dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800 cursor-pointer"
      >
        Ver Detalle de Reseñas
      </button>
    </section>
  );
};
