import React, { useState } from 'react';
import {
  Star,
  UtensilsCrossed,
} from 'lucide-react';
import { DEFAULT_POPULAR_MENU, formatCurrencyAmount } from './dashboardData';

const PERIOD_OPTIONS = ['Hoy', 'Esta Semana', 'Este Mes'];

const DishThumbnail = ({ dish }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !dish.imageUrl) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-50 to-amber-100 text-[#F26522] dark:from-[#2B1910] dark:to-[#1A2232]">
        <UtensilsCrossed className="h-4 w-4" />
      </div>
    );
  }

  return (
    <img
      src={dish.imageUrl}
      alt={dish.name}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className="h-10 w-10 shrink-0 rounded-lg object-cover"
    />
  );
};

export const PopularMenuCard = ({ popularMenu = {} }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('Hoy');

  const rawDishes = popularMenu[selectedPeriod] || [];
  const dishes = rawDishes.length >= 3 ? rawDishes : (DEFAULT_POPULAR_MENU[selectedPeriod] || []);

  return (
    <section
      aria-label="Menú Popular"
      className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs sm:p-4 dark:border-slate-800/90 dark:bg-[#131A26]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Menú Popular
        </h2>

        {/* Botones de Período - Estilo Pill SuperAdmin sin borde gris */}
        <div
          role="tablist"
          aria-label="Seleccionar período"
          className="flex items-center gap-1.5 sm:gap-2 flex-wrap"
        >
          {PERIOD_OPTIONS.map((period) => {
            const isSelected = period === selectedPeriod;
            return (
              <button
                key={period}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-0 active:scale-95 whitespace-nowrap select-none ${
                  isSelected
                    ? 'font-bold shadow-md bg-zinc-950 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black'
                    : 'shadow-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                {period}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2.5 flex flex-col gap-2">
        {dishes.slice(0, 3).map((dish) => (
          <div
            key={dish.id}
            className="flex items-center justify-between gap-2.5 rounded-xl bg-slate-50/70 p-2 transition-colors hover:bg-slate-100/70 dark:bg-[#1A2232]/85 dark:hover:bg-[#1E293D]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <DishThumbnail dish={dish} />
              <div className="min-w-0">
                <h3 className="truncate text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">
                  {dish.name}
                </h3>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-slate-500 tabular-nums dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
                    <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" />
                    {dish.rating || '4,8'}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-slate-300 dark:text-slate-600"
                  >
                    •
                  </span>
                  <span className="truncate">{dish.category || 'Carta'}</span>
                  <span
                    aria-hidden="true"
                    className="text-slate-300 dark:text-slate-600"
                  >
                    •
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {dish.orders} ped.
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <span className="text-xs font-bold text-slate-900 tabular-nums dark:text-slate-50">
                {formatCurrencyAmount(dish.revenuePen || 0, 'PEN')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
