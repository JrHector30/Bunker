import React, { useMemo } from 'react';
import { ChefHat, Search, Filter, X, Volume2, VolumeX, ChevronDown, ChevronUp } from 'lucide-react';
import { useKitchen } from './KitchenContext';
import KitchenClock from './KitchenClock';
import KitchenTimers from './KitchenTimers';
import SimpleCombobox from '../../components/SimpleCombobox';

/**
 * Responsive collapsible header for KDS.
 * Incorporates Brand branding, Digital Clock, Neumorphic Timers panel, Sound Toggles, and search filters.
 */
export default function KitchenHeader() {
  const {
    queue,
    isDarkMode,
    isAudioEnabled,
    setIsAudioEnabled,
    isHeaderExpanded,
    setIsHeaderExpanded,
    selectedTable,
    setSelectedTable,
    searchQuery,
    setSearchQuery,
    triggerFirstInteraction
  } = useKitchen();

  // Extract unique tables from the local queue for filtering dropdown
  const uniqueTables = useMemo(() => {
    const tablesSet = new Set();
    queue.forEach(item => {
      const num = item.comanda?.mesa?.numero;
      if (num) tablesSet.add(String(num));
      if (item.comanda?.mesa?.mesasHijas) {
        item.comanda.mesa.mesasHijas.forEach(h => {
          if (h.numero) tablesSet.add(String(h.numero));
        });
      }
    });
    return Array.from(tablesSet).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [queue]);

  // Construct items and selections for the custom SimpleCombobox dropdown
  const comboboxItems = useMemo(() => {
    const arr = [
      { id: 'TODAS', name: 'Todas las Mesas' }
    ];
    uniqueTables.forEach(t => {
      arr.push({ id: t, name: `Mesa ${t}` });
    });
    return arr;
  }, [uniqueTables]);

  const selectedComboboxItem = useMemo(() => {
    return comboboxItems.find(item => item.id === selectedTable) || comboboxItems[0];
  }, [comboboxItems, selectedTable]);

  const handleComboboxSelect = (item) => {
    triggerFirstInteraction();
    if (item) {
      setSelectedTable(item.id);
    } else {
      setSelectedTable('TODAS');
    }
  };

  const toggleSound = () => {
    triggerFirstInteraction();
    setIsAudioEnabled(prev => !prev);
  };

  const onSearchChange = (e) => {
    triggerFirstInteraction();
    setSearchQuery(e.target.value);
  };

  const onTableChange = (e) => {
    triggerFirstInteraction();
    setSelectedTable(e.target.value);
  };

  const onCollapseToggle = () => {
    triggerFirstInteraction();
    setIsHeaderExpanded(prev => !prev);
  };

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* 1. CABECERA KDS: solo título en celular (< md), consola completa en md+ */}
      <h1 className="md:hidden text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight px-0.5">
        Flujo de Cocina
      </h1>

      {/* Consola Tablet / Desktop (md+) */}
      <header className={`hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:px-5 md:py-4 rounded-3xl border transition-all duration-300 ${isDarkMode
        ? 'bg-[#161B22] border-[#30363D] shadow-2xl shadow-black/40'
        : 'bg-white border-slate-200 shadow-md shadow-slate-100/50'
        }`}>
        {/* Left Section: Brand Logo */}
        <div className="flex items-center gap-3.5 select-none md:w-1/3 justify-center md:justify-start">
          <div className="w-11 h-11 bg-[var(--primary)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--primary)]/20 shrink-0">
            <ChefHat className="w-5.5 h-5.5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Flujo de Cocina
              <span className="text-[9px] font-black px-2 py-0.5 rounded bg-[var(--primary)] text-white tracking-widest uppercase select-none animate-pulse">
                Por Plato
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 uppercase tracking-wider">
              Estación Principal • Tablet Console
            </p>
          </div>
        </div>

        {/* Center Section: Centered Clock */}
        <div className="flex justify-center items-center md:w-1/3 text-center">
          <KitchenClock />
        </div>

        {/* Right Section: Time Instruments & Collapser */}
        <div className="flex flex-col sm:flex-row items-center gap-5 justify-center md:justify-end select-none md:w-1/3 py-1">
          <KitchenTimers isCollapsed={!isHeaderExpanded} />

          <button
            onClick={onCollapseToggle}
            title={isHeaderExpanded ? "Contraer panel" : "Expandir para configurar temporizador y cronómetro"}
            className={`font-sans flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer shadow-sm shrink-0 ${isHeaderExpanded
              ? isDarkMode
                ? 'bg-[#1D2433] hover:bg-[#252E40] border-[#3A455C] text-slate-200'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-650'
              : isDarkMode
                ? 'bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 border-[var(--primary)]/30 text-[var(--primary)]'
                : 'bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 border-[var(--primary)]/20 text-[var(--primary)]'
              }`}
          >
            {isHeaderExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 text-[var(--primary)]" />
                <span>CONTRAER</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 text-[var(--primary)] animate-bounce" />
                <span>EXPANDIR</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. FILTER TOOLBAR */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1 mt-0 select-none">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por plato o número de mesa..."
            value={searchQuery}
            onChange={onSearchChange}
            className={`font-sans w-full pl-10 pr-9 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all border ${isDarkMode
              ? 'bg-[#161B22] border-[#30363D] text-white placeholder-slate-600'
              : 'bg-white border-gray-250 text-gray-900 placeholder-slate-400'
              }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdowns, Audios and Layouts */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-start">
          {/* Botón de Sonido: solo icono en celular (< md), con texto en md+ */}
          <button
            type="button"
            onClick={toggleSound}
            aria-label={isAudioEnabled ? 'Sonido Activado' : 'Sonido Silenciado'}
            title={isAudioEnabled ? 'Sonido Activado' : 'Sonido Silenciado'}
            className={`w-[42px] h-[42px] md:w-auto md:min-h-[42px] inline-flex items-center justify-center gap-2 md:px-4 md:py-2 text-xs font-bold rounded-full border-0 transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95 shadow-sm ${
              isAudioEnabled
                ? 'text-white shadow-md'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300'
            }`}
            style={isAudioEnabled ? { backgroundColor: 'var(--primary, #F26522)' } : undefined}
          >
            {isAudioEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            )}
            <span className="hidden md:inline">
              {isAudioEnabled ? 'Sonido Activado' : 'Sonido Silenciado'}
            </span>
          </button>

          {/* Table filter select */}
          <div className="flex-1 sm:flex-initial flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider shrink-0">
              <Filter className="w-3 h-3 text-[var(--primary)]" />
              <span>Mesa:</span>
            </div>
            <div className="w-full sm:w-[220px]">
              <SimpleCombobox
                items={comboboxItems}
                selectedItem={selectedComboboxItem}
                onSelect={handleComboboxSelect}
                placeholder="Todas las Mesas"
                align="center"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
