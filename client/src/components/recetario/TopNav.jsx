import React from 'react';
import { ArrowLeft, Save, FileDown, RotateCcw, Sun, Moon } from 'lucide-react';
import logoMinimalista from '../../assets/logo_minimalist.png';

export const TopNav = ({
  recipeName,
  recipeCode,
  isDirty,
  mode = 'dark',
  onToggleTheme,
  onSave,
  onExport,
  onReset,
  onBack,
}) => {
  return (
    <header className="h-12 border-b border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0d10] px-4 flex items-center justify-between select-none shrink-0 transition-colors">
      {/* Zone 1: Back Button, Brand Wordmark (Búnker) & Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Botón de Volver al Sistema */}
        <button
          onClick={onBack}
          title="Volver al panel principal"
          className="h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors active:scale-95"
        >
          <ArrowLeft className="size-3.5" />
          <span className="hidden sm:inline">Volver</span>
        </button>

        <span className="text-zinc-300 dark:text-zinc-700 text-xs">/</span>

        {/* Brand Búnker */}
        <div className="flex items-center gap-2">
          <div className="size-6 rounded bg-zinc-900 dark:bg-zinc-800 text-white flex items-center justify-center p-1 shadow-xs shrink-0">
            <img src={logoMinimalista} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Búnker
          </span>
        </div>

        <span className="text-zinc-300 dark:text-zinc-700 text-xs hidden md:inline">/</span>

        {/* Clean Breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Carta & Cocina</span>
          <span className="text-zinc-300 dark:text-zinc-700">/</span>
          <span className="text-zinc-800 dark:text-zinc-300 font-medium">Recetarios (Costeo)</span>
          <span className="text-zinc-300 dark:text-zinc-700">/</span>
          <span className="text-zinc-700 dark:text-zinc-200 font-semibold text-[11px] bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700/50">
            {recipeCode}
          </span>
        </div>
      </div>

      {/* Zone 2: Telemetry / Status */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-zinc-700 dark:text-zinc-300">Bodega Central Sincronizada</span>
        </div>
        <span className="text-zinc-300 dark:text-zinc-700">|</span>
        <span className="text-[11px] text-zinc-600 dark:text-zinc-400">Moneda: Soles (PEN S/.)</span>
        {isDirty && (
          <>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span className="text-amber-600 dark:text-amber-400 text-[11px] font-semibold flex items-center gap-1 animate-pulse">
              Cambios sin guardar
            </span>
          </>
        )}
      </div>

      {/* Zone 3: Actions & Theme Switcher */}
      <div className="flex items-center gap-2">
        {/* Botón para alternar Modo Claro / Oscuro con Búnker */}
        <button
          onClick={onToggleTheme}
          title={mode === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
          className="h-8 px-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          {mode === 'dark' ? (
            <>
              <Sun className="size-3.5 text-amber-400" />
              <span className="hidden sm:inline">Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="size-3.5 text-zinc-700" />
              <span className="hidden sm:inline">Modo Oscuro</span>
            </>
          )}
        </button>

        {isDirty && (
          <button
            onClick={onReset}
            title="Revertir cambios a la última versión guardada"
            className="h-8 px-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700/50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">Revertir</span>
          </button>
        )}

        <button
          onClick={onExport}
          title="Ver o imprimir ficha técnica de escandallo"
          className="h-8 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700/70 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <FileDown className="size-3.5 text-zinc-500 dark:text-zinc-400" />
          <span>Ficha Técnica</span>
        </button>

        {/* ÚNICO BOTÓN DE GUARDAR CONSERVADO: Guardar Escandallo */}
        <button
          onClick={onSave}
          title="Guardar escandallo y actualizar costos en Búnker"
          className="h-8 px-3.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Save className="size-3.5" />
          <span>Guardar Escandallo</span>
        </button>
      </div>
    </header>
  );
};

export default TopNav;
