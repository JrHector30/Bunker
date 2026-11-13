import React, { useState } from 'react';
import { Star } from 'lucide-react';
import CloseButton from '../ui/CloseButton';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] dark:bg-black/65 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#131A26]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Detalle de Reseñas · Búnker
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
              {RATINGS_SUMMARY.score} estrellas promedio sobre {RATINGS_SUMMARY.totalReviews} opiniones verificadas
            </p>
          </div>
          <CloseButton onClick={onClose} className="scale-90 shrink-0" />
        </div>

        {/* Filter tabs */}
        <div className="mt-4 flex w-fit items-center gap-1.5 rounded-xl bg-[#F8FAFC] p-1 border border-slate-200/60 dark:border-slate-800 dark:bg-[#1A2232]">
          {REVIEW_TABS.map((tab) => {
            const isActive = reviewFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReviewFilter(tab.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer select-none ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-[#253045] dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Reviews List */}
        <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {filteredReviews.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No hay opiniones registradas para este filtro.
            </p>
          ) : (
            filteredReviews.map((rev) => (
              <article
                key={rev.id}
                className="rounded-2xl border border-slate-100/80 bg-[#F8FAFC] p-4 transition-colors dark:border-slate-800/80 dark:bg-[#1A2232]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {rev.customer}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 ml-1.5 font-medium">
                      · {rev.dish} ({rev.channel})
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < rev.rating
                            ? 'fill-[#F59E0B] text-[#F59E0B]'
                            : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {rev.comment}
                </p>
                <span className="mt-2.5 block text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  {rev.date}
                </span>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewsModal;
