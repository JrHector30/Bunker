import React from 'react';
import { X } from 'lucide-react';
import { formatCurrencyAmount } from './dashboardData';

export const KpiDetailModal = ({ metric, currency = 'PEN', onClose }) => {
  if (!metric) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] dark:bg-black/65"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#131A26]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {metric.title}
            </h3>
            <p className="mt-0.5 text-2xl font-bold text-[#F26522] tabular-nums dark:text-[#FF7A3D]">
              {metric.isCurrency
                ? formatCurrencyAmount(metric.value, currency)
                : (metric.value || 0).toLocaleString('es-PE')}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar desglose"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {(metric.detailBreakdown || []).map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span className="text-slate-500 dark:text-slate-400">
                {item.label}
              </span>
              <span className="font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                {item.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
