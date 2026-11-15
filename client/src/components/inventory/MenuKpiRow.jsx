import React from 'react';
import { Utensils, TrendingUp, Percent, AlertTriangle } from 'lucide-react';

export const MenuKpiRow = ({
  totalPlatos = 0,
  activosCount = 0,
  margenPromedio = 0,
  costoPromedio = 0,
  highCostCount = 0,
  highCostFilterActive = false,
  onToggleHighCostFilter,
}) => {
  return (
    <section
      aria-label="Indicadores de rentabilidad del menú"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5"
    >
      {/* 1. Total Platos */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] py-3 px-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
            Total Platos
          </p>
          <p className="mt-0.5 text-xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
            {totalPlatos}
          </p>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
            {activosCount} activos
          </p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
          <Utensils className="w-4.5 h-4.5" />
        </div>
      </div>

      {/* 2. Margen Promedio */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] py-3 px-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
            Margen Promedio
          </p>
          <p className="mt-0.5 text-xl font-extrabold text-[#15803D] dark:text-emerald-400 tracking-tight tabular-nums">
            {Number(margenPromedio).toFixed(1)}%
          </p>
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-500">
            Rentabilidad saludable
          </p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-400 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4.5 h-4.5" />
        </div>
      </div>

      {/* 3. Costo Promedio */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] py-3 px-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
            Costo Promedio
          </p>
          <p className="mt-0.5 text-xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
            {Number(costoPromedio).toFixed(1)}%
          </p>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
            Meta ideal &lt; 30%
          </p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#F26522] flex items-center justify-center shrink-0">
          <Percent className="w-4.5 h-4.5" />
        </div>
      </div>

      {/* 4. Alerta de Costo Alto (Clickable Filter) */}
      <button
        type="button"
        onClick={onToggleHighCostFilter}
        aria-pressed={highCostFilterActive}
        className={`text-left bg-white dark:bg-slate-900 rounded-2xl py-3 px-4 flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer border ${
          highCostFilterActive
            ? 'border-red-400 dark:border-red-500 ring-2 ring-red-500/15 shadow-sm'
            : 'border-slate-200/80 dark:border-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-amber-300 dark:hover:border-amber-700'
        }`}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
            Alerta de Costo Alto
          </p>
          <p className="mt-0.5 text-xl font-extrabold text-[#DC2626] dark:text-red-400 tracking-tight tabular-nums">
            {highCostCount} {highCostCount === 1 ? 'plato' : 'platos'}
          </p>
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
            {highCostFilterActive ? 'Filtro activo · Clic para ver todos' : 'Costo > 35% · Clic para filtrar'}
          </p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-[#FEE2E2] dark:bg-red-950/60 text-[#DC2626] dark:text-red-400 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4.5 h-4.5" />
        </div>
      </button>
    </section>
  );
};
export default MenuKpiRow;
