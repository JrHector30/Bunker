import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Scale,
  AlertCircle,
  CheckCircle2,
  Layers,
  HelpCircle,
  Search,
  ChevronDown
} from 'lucide-react';

export const LeftMetricsPanel = ({
  recipe,
  recipes = [],
  onSelectRecipe,
  onUpdatePvp,
  onUpdatePortions,
  isDirty,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [showDishList, setShowDishList] = useState(false);

  if (!recipe) return null;

  // Financial Calculations
  const totalCost = (recipe.items || []).reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const costPerPortion = recipe.portions > 0 ? totalCost / recipe.portions : totalCost;
  const pvp = recipe.pvp || 0;
  const grossMargin = pvp - costPerPortion;
  const marginPercent = pvp > 0 ? (grossMargin / pvp) * 100 : 0;
  const foodCostPercent = pvp > 0 ? (costPerPortion / pvp) * 100 : 0;

  // Target food cost comparison (Default 28% for gastronomy)
  const targetFoodCost = recipe.targetFoodCost || 28.0;
  const targetVariance = foodCostPercent - targetFoodCost;
  const suggestedPvp = targetFoodCost > 0 ? costPerPortion / (targetFoodCost / 100) : pvp;

  // Find highest cost ingredient (Pareto)
  const topIngredient = [...(recipe.items || [])].sort((a, b) => b.subtotal - a.subtotal)[0];
  const topIngredientPercent = totalCost > 0 && topIngredient ? (topIngredient.subtotal / totalCost) * 100 : 0;

  // Determine Food Cost health status
  const getFoodCostBadge = (val) => {
    if (val <= 30.0) {
      return {
        label: 'Margen Óptimo',
        bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        border: 'border-emerald-200 dark:border-emerald-800/50',
        text: 'text-emerald-700 dark:text-emerald-400',
        barColor: 'bg-emerald-500',
      };
    } else if (val <= 35.0) {
      return {
        label: 'Rango Precaución',
        bg: 'bg-amber-50 dark:bg-amber-950/60',
        border: 'border-amber-200 dark:border-amber-800/50',
        text: 'text-amber-700 dark:text-amber-400',
        barColor: 'bg-amber-500',
      };
    } else {
      return {
        label: 'Costo Crítico (>35%)',
        bg: 'bg-rose-50 dark:bg-rose-950/60',
        border: 'border-rose-200 dark:border-rose-800/50',
        text: 'text-rose-700 dark:text-rose-400',
        barColor: 'bg-rose-500',
      };
    }
  };

  const status = getFoodCostBadge(foodCostPercent);

  // Filtered dishes for combobox
  const filteredRecipes = recipes.filter(
    (r) =>
      r.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <aside className="w-full lg:w-[32%] xl:w-[30%] shrink-0 border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-[#0d0e12] flex flex-col justify-between overflow-y-auto transition-colors">
      <div className="p-3.5 space-y-3.5">
        {/* 1. Selector de Plato Rápido */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold tracking-wider uppercase text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
            <span>Ficha del Plato</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">{recipe.code}</span>
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDishList(!showDishList)}
              className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/70 rounded-lg text-xs text-left flex items-center justify-between transition-colors shadow-2xs cursor-pointer"
            >
              <div className="truncate flex items-center gap-1.5">
                <span className="font-semibold text-zinc-900 dark:text-white">{recipe.name}</span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">({recipe.category})</span>
              </div>
              <ChevronDown className="size-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
            </button>

            {/* Dropdown search modal */}
            {showDishList && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-xl z-40 overflow-hidden">
                <div className="p-1.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  <div className="relative">
                    <Search className="size-3 text-zinc-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      placeholder="Buscar plato o código..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full h-7 pl-6 pr-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/40 p-1">
                  {filteredRecipes.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        onSelectRecipe(r.id);
                        setShowDishList(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center justify-between transition-colors cursor-pointer ${r.id === recipe.id
                        ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                        }`}
                    >
                      <span className="truncate">{r.name}</span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 tabular-nums">S/. {r.pvp.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Parámetros Operativos: PVP y Raciones */}
        <div className="grid grid-cols-2 gap-2">
          {/* PVP Editable */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                PVP (Soles)
              </label>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500">Carta</span>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-xs font-semibold text-zinc-400 dark:text-zinc-500">S/.</span>
              <input
                type="number"
                step="0.50"
                min="0"
                value={recipe.pvp}
                onChange={(e) => onUpdatePvp(parseFloat(e.target.value) || 0)}
                className="w-full h-8 pl-8 pr-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 rounded-lg text-xs font-bold text-zinc-900 dark:text-white focus:outline-none transition-colors tabular-nums shadow-2xs"
              />
            </div>
          </div>

          {/* Porciones / Rendimiento */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Raciones
              </label>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500">Batch</span>
            </div>
            <input
              type="number"
              min="1"
              max="50"
              value={recipe.portions}
              onChange={(e) => onUpdatePortions(parseInt(e.target.value, 10) || 1)}
              className="w-full h-8 px-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 rounded-lg text-xs font-bold text-center text-zinc-900 dark:text-white focus:outline-none transition-colors tabular-nums shadow-2xs"
            />
          </div>
        </div>

        {/* 3. Métricas Financieras (KPI Cards Compactas) */}
        <div className="space-y-2 -translate-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <span>Métricas de Rentabilidad</span>
            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-normal">Tiempo real</span>
          </div>

          {/* KPI 1: Costo Total de Producción */}
          <div className="p-2.5 bg-white dark:bg-[#121318] border border-zinc-200 dark:border-zinc-800/80 rounded-lg shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Costo Total Producción</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {(recipe.items || []).length} insumos
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums">
                S/. {totalCost.toFixed(2)}
              </span>
              <div className="text-[11px] text-zinc-600 dark:text-zinc-300">
                <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">Por ración: </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">S/. {costPerPortion.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* KPI 2: Margen Bruto */}
          <div className="p-2.5 bg-white dark:bg-[#121318] border border-zinc-200 dark:border-zinc-800/80 rounded-lg shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Margen Bruto (Utilidad)</span>
              <span className={`text-[10px] font-bold tabular-nums ${grossMargin > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {marginPercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums">
                S/. {grossMargin.toFixed(2)}
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                PVP - Costo
              </span>
            </div>
          </div>

          {/* KPI 3: Food Cost % (Indicador Estrella) */}
          <div className="p-2.5 bg-white dark:bg-[#121318] border border-zinc-200 dark:border-zinc-800/80 rounded-lg space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-300">Food Cost %</span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">(Meta: {targetFoodCost}%)</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${status.bg} ${status.border} ${status.text}`}>
                {status.label}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className={`text-2xl font-extrabold tracking-tight tabular-nums ${status.text}`}>
                {foodCostPercent.toFixed(1)}%
              </span>
              <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                {targetVariance <= 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                    {(targetVariance).toFixed(1)}% vs meta
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold tabular-nums">
                    +{targetVariance.toFixed(1)}% sobre meta
                  </span>
                )}
              </span>
            </div>

            {/* Micro visual gauge */}
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800/90 rounded-full overflow-hidden flex">
                <div
                  className={`h-full ${status.barColor} transition-all duration-300`}
                  style={{ width: `${Math.min(foodCostPercent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                <span>0%</span>
                <span>Meta: 28%</span>
                <span>40% Max</span>
              </div>
            </div>

            {/* PVP Recomendado */}
            <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[11px]">
              <span className="text-zinc-600 dark:text-zinc-400">PVP sugerido al {targetFoodCost}%:</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-200 tabular-nums">
                S/. {suggestedPvp.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Diagnóstico de Insumo Crítico (Pareto) */}
        {topIngredient && (
          <div className="p-2.5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-lg space-y-1 text-xs shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <span>Insumo de Mayor Costo</span>
              <span className="text-zinc-700 dark:text-zinc-300 tabular-nums">{topIngredientPercent.toFixed(1)}% del plato</span>
            </div>
            <div className="flex items-center justify-between text-zinc-900 dark:text-zinc-200 font-semibold">
              <span className="truncate pr-2">{topIngredient.name}</span>
              <span className="text-zinc-900 dark:text-white shrink-0 tabular-nums">
                S/. {topIngredient.subtotal.toFixed(2)}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {topIngredientPercent > 50
                ? 'Alta concentración de costo en este insumo. Monitorear precio de compra con el proveedor.'
                : 'Distribución equilibrada entre ingredientes de la receta.'}
            </p>
          </div>
        )}
      </div>

      {/* Pie de panel sin botón redundante: muestra auditoría y estado */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800/80 bg-white/60 dark:bg-[#0a0b0e] shrink-0 text-center">
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
          Última actualización: <span className="text-zinc-700 dark:text-zinc-300">{recipe.lastUpdated}</span>
        </p>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
          Autor: {recipe.author}
        </p>
      </div>
    </aside>
  );
};

export default LeftMetricsPanel;
