import React from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const RecipeHeader = ({
  recipe,
  recipes = [],
  onSelectRecipe,
  activeTab = 'bom',
  onTabChange,
  isDishSelectorOpen,
  setIsDishSelectorOpen,
}) => {
  if (!recipe) return null;

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#09090b] px-4 py-2.5 shrink-0 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Recipe Context and Name Switcher */}
        <div className="relative">
          <div className="flex items-center gap-2 text-[10px] tracking-wider uppercase font-semibold text-zinc-500 dark:text-zinc-400">
            <span>ESCANDALLO & COSTEO</span>
            <span className="text-zinc-300 dark:text-zinc-600">/</span>
            <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{recipe.code}</span>
            <span className="text-zinc-300 dark:text-zinc-600">/</span>
            <span className="text-zinc-600 dark:text-zinc-400">{recipe.category}</span>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <button
              onClick={() => setIsDishSelectorOpen(!isDishSelectorOpen)}
              className="flex items-center gap-2 group text-left hover:opacity-90 transition-opacity cursor-pointer"
            >
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                {recipe.name}
                <ChevronDown className="size-4 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-transform" />
              </h1>
            </button>

            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
              <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
              {recipe.status === 'active' ? 'Receta activa' : 'En revisión'}
            </span>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
            {recipe.notes || 'Ficha técnica y costeo directo de ingredientes por ración estándar.'}
          </p>

          {/* Quick Dropdown Dish Selector */}
          {isDishSelectorOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
                <span>Seleccionar Plato de la Carta</span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{recipes.length} platos</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 p-1">
                {recipes.map((r) => {
                  const isCurrent = r.id === recipe.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        onSelectRecipe(r.id);
                        setIsDishSelectorOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-white font-semibold border border-blue-200 dark:border-blue-500/30'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">{r.code}</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{r.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <span>{r.category}</span>
                          <span>·</span>
                          <span className="tabular-nums">PVP: S/. {r.pvp.toFixed(2)}</span>
                          <span>·</span>
                          <span>{r.items.length} insumos</span>
                        </div>
                      </div>
                      {isCurrent && <Check className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Mode Switcher Tabs (Only BOM & Ficha Técnica) */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-900/90 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => onTabChange('bom')}
              className={`px-3 py-1 font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'bom'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Escandallo (BOM)
            </button>
            <button
              type="button"
              onClick={() => onTabChange('tech')}
              className={`px-3 py-1 font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'tech'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Ficha Técnica
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeHeader;
