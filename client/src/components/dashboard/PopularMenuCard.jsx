import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Star,
  UtensilsCrossed,
} from 'lucide-react';
import { DEFAULT_POPULAR_MENU, formatCurrencyAmount } from './dashboardData';

const PERIOD_OPTIONS = ['Hoy', 'Esta Semana', 'Este Mes'];

const DishThumbnail = ({ dish }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !dish.imageUrl) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-50 to-amber-100 text-[#F26522] dark:from-[#2B1910] dark:to-[#1A2232]">
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
      className="h-11 w-11 shrink-0 rounded-lg object-cover"
    />
  );
};

export const PopularMenuCard = ({ popularMenu = {} }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('Hoy');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const rawDishes = popularMenu[selectedPeriod] || [];
  const dishes = rawDishes.length > 0 ? rawDishes : (DEFAULT_POPULAR_MENU[selectedPeriod] || []);

  return (
    <section
      aria-label="Menú Popular"
      className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800/90 dark:bg-[#131A26]"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Menú Popular
        </h2>

        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FA] px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/40 whitespace-nowrap dark:bg-[#1A2232] dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <span>{selectedPeriod}</span>
            <ChevronDown
              className={`h-3 w-3 text-slate-500 transition-transform duration-150 dark:text-slate-400 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isDropdownOpen && (
            <ul
              role="listbox"
              aria-label="Seleccionar período"
              className="absolute right-0 top-8 z-30 w-36 rounded-xl border border-slate-100 bg-white p-1 shadow-lg dark:border-slate-700/80 dark:bg-[#1A2232]"
            >
              {PERIOD_OPTIONS.map((period) => {
                const isSelected = period === selectedPeriod;
                return (
                  <li key={period} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPeriod(period);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full rounded-lg px-3 py-1.5 text-left text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFF1EB] text-[#F26522] font-semibold dark:bg-[#F26522]/15 dark:text-[#FF7A3D]'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      {period}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {dishes.slice(0, 3).map((dish) => (
          <div
            key={dish.id}
            className="flex items-center justify-between gap-2.5 rounded-xl bg-slate-50/70 p-2.5 transition-colors hover:bg-slate-100/70 dark:bg-[#1A2232]/85 dark:hover:bg-[#1E293D]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <DishThumbnail dish={dish} />
              <div className="min-w-0">
                <h3 className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                  {dish.name}
                </h3>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
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
              <span className="text-sm font-bold text-slate-900 tabular-nums dark:text-slate-50">
                {formatCurrencyAmount(dish.revenuePen || 0, 'PEN')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
