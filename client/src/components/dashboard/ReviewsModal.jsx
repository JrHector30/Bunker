import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { CUSTOMER_REVIEWS, RATINGS_SUMMARY } from './dashboardData';

const REVIEW_TABS = [
  { id: 'all', label: 'Todas' },
  { id: 'positive', label: 'Positivas (97%)' },
  { id: 'negative', label: 'Negativas (3%)' },
];

export const ReviewsModal = ({ onClose }) => {
  const [reviewFilter, setReviewFilter] = useState('all');

  const filteredReviews = CUSTOMER_REVIEWS.filter((rev) => {
    if (reviewFilter === 'all') return true;
    return rev.sentiment === reviewFilter;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] dark:bg-black/65"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#131A26]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Detalle de Reseñas · Búnker
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
              {RATINGS_SUMMARY.score} estrellas promedio sobre{' '}
              {RATINGS_SUMMARY.totalReviews} opiniones verificadas
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar detalle de reseñas"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex w-fit items-center gap-1.5 rounded-xl bg-[#F8F9FA] p-1 dark:bg-[#1A2232]">
          {REVIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReviewFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                reviewFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#253045] dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
          {filteredReviews.map((review) => (
            <article
              key={review.id}
              className="rounded-xl border border-slate-100 bg-[#F8F9FA] p-4 dark:border-slate-800 dark:bg-[#1A2232]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {review.customer}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-slate-300 dark:text-slate-600"
                  >
                    ·
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {review.dish} ({review.channel})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < review.rating
                          ? 'fill-[#F59E0B] text-[#F59E0B]'
                          : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {review.comment}
              </p>
              <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                {review.date}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
