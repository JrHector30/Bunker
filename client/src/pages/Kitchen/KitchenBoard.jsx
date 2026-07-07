import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Flame, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useKitchen } from './KitchenContext';
import KitchenColumn from './KitchenColumn';

/**
 * KDS Columns Board manager.
 * Evaluates window size to automatically swap layouts:
 * - Desktop (>= 1200px): 3 parallel columns
 * - Tablet Landscape (>= 768px and < 1200px): 2 parallel columns (Pendiente & Proceso), with a toggle for Listo
 * - Mobile / Tablet Portrait (< 768px): Focused Tabbed Layout (single column)
 */
export default function KitchenBoard() {
  const {
    queue,
    selectedTable,
    searchQuery,
    activeTabletTab,
    setActiveTabletTab
  } = useKitchen();

  // Resize handler for adaptive responsive layouts
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = windowWidth >= 1200;
  const isTabletLandscape = windowWidth >= 768 && windowWidth < 1200;
  const isTabbedMode = windowWidth < 768;

  // Local selector for tablet landscape columns toggle (since we can only show 2 at a time)
  const [tabletActivePair, setTabletActivePair] = useState('active'); // 'active' (Pendiente+Proceso) or 'ready' (Listo)

  // Filter orders reactively
  const filteredItems = useMemo(() => {
    return queue.filter((item) => {
      const name = item.plato?.nombre || '';
      const table = item.comanda?.mesa?.numero ? String(item.comanda.mesa.numero) : '';

      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        table.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTable = selectedTable === 'TODAS' ||
        table === selectedTable ||
        (item.comanda?.mesa?.mesasHijas && item.comanda.mesa.mesasHijas.some(h => String(h.numero) === selectedTable));

      return matchesSearch && matchesTable;
    });
  }, [queue, searchQuery, selectedTable]);

  // Split items by status
  const pendingItems = useMemo(() => {
    return filteredItems.filter(i => i.estado === 'pendiente' || i.estado === 'enviada');
  }, [filteredItems]);

  const processingItems = useMemo(() => {
    return filteredItems.filter(i => i.estado === 'preparando');
  }, [filteredItems]);

  const readyItems = useMemo(() => {
    return filteredItems.filter(i => i.estado === 'lista' || i.estado === 'listo');
  }, [filteredItems]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 1. TABS SELECTOR (MÓVIL / PORTRAIT TABLET) */}
      {isTabbedMode && (
        <div className="mb-4 grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-200/50 dark:bg-slate-900/60 select-none">
          <button
            onClick={() => setActiveTabletTab('pendiente')}
            className={`py-3 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${activeTabletTab === 'pendiente'
              ? 'bg-white dark:bg-slate-950 text-[var(--primary)] shadow-sm'
              : 'text-slate-500 dark:text-slate-455 hover:text-slate-700 dark:hover:text-white'
              }`}
          >
            <Clock size={16} />
            <span>Pendientes</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 font-bold">
              {pendingItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTabletTab('proceso')}
            className={`py-3 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${activeTabletTab === 'proceso'
              ? 'bg-white dark:bg-slate-950 text-[var(--primary)] shadow-sm'
              : 'text-slate-500 dark:text-slate-455 hover:text-slate-700 dark:hover:text-white'
              }`}
          >
            <Flame size={16} />
            <span>En Proceso</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 font-bold">
              {processingItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTabletTab('listo')}
            className={`py-3 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${activeTabletTab === 'listo'
              ? 'bg-white dark:bg-slate-950 text-emerald-500 shadow-sm'
              : 'text-slate-500 dark:text-slate-455 hover:text-slate-700 dark:hover:text-white'
              }`}
          >
            <CheckCircle2 size={16} />
            <span>Listos</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 font-bold">
              {readyItems.length}
            </span>
          </button>
        </div>
      )}

      {/* 2. TOGGLE SELECTOR (TABLET LANDSCAPE 2-COLUMNS ONLY) */}
      {isTabletLandscape && (
        <div className="mb-4 flex justify-end">
          <div className="flex p-1 rounded-xl bg-slate-200/50 dark:bg-slate-900/60 border border-slate-300/35 dark:border-slate-800/40 select-none">
            <button
              onClick={() => setTabletActivePair('active')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${tabletActivePair === 'active'
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
            >
              Cocinando ({pendingItems.length + processingItems.length})
            </button>
            <button
              onClick={() => setTabletActivePair('ready')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${tabletActivePair === 'ready'
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
            >
              Listos ({readyItems.length})
            </button>
          </div>
        </div>
      )}

      {/* 3. COLUMNS WORKFLOW RENDERER */}
      <div className="flex-1 min-h-[400px]">
        {isDesktop && (
          /* Desktop Grid: 3 parallel columns */
          <div className="grid grid-cols-3 gap-4 h-full items-stretch">
            <KitchenColumn
              id="pendiente"
              title="Pendientes"
              icon={<Clock className="w-5 h-5 text-slate-450 dark:text-slate-500 animate-pulse" />}
              orders={pendingItems}
              badgeColor="bg-slate-200 dark:bg-slate-850 text-black dark:text-black"
            />
            <KitchenColumn
              id="proceso"
              title="En Proceso"
              icon={<Flame className="w-5 h-5 text-orange-500 animate-pulse" />}
              orders={processingItems}
              badgeColor="bg-orange-500/10 text-orange-500 dark:text-orange-400 border border-orange-500/20"
            />
            <KitchenColumn
              id="listo"
              title="Listos"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              orders={readyItems}
              badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            />
          </div>
        )}

        {isTabletLandscape && (
          /* Tablet Landscape Grid: 2 parallel columns */
          <div className="grid grid-cols-2 gap-4 h-full items-stretch">
            {tabletActivePair === 'active' ? (
              <>
                <KitchenColumn
                  id="pendiente"
                  title="Pendientes"
                  icon={<Clock className="w-5 h-5 text-slate-450 dark:text-slate-500 animate-pulse" />}
                  orders={pendingItems}
                  badgeColor="bg-slate-200 dark:bg-slate-850 text-slate-800 dark:text-slate-300"
                />
                <KitchenColumn
                  id="proceso"
                  title="En Proceso"
                  icon={<Flame className="w-5 h-5 text-orange-500 animate-pulse" />}
                  orders={processingItems}
                  badgeColor="bg-orange-500/10 text-orange-500 dark:text-orange-400 border border-orange-500/20"
                />
              </>
            ) : (
              <div className="col-span-2 h-full">
                <KitchenColumn
                  id="listo"
                  title="Listos"
                  icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  orders={readyItems}
                  badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                />
              </div>
            )}
          </div>
        )}

        {isTabbedMode && (
          /* Mobile/Portrait Tabbed layout: Single column */
          <div className="h-full">
            {activeTabletTab === 'pendiente' && (
              <motion.div
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                className="h-full"
              >
                <KitchenColumn
                  id="pendiente"
                  title="Pendientes"
                  icon={<Clock className="w-5 h-5 text-slate-400" />}
                  orders={pendingItems}
                  badgeColor="bg-slate-200 dark:bg-slate-800 text-slate-850 dark:text-slate-300"
                />
              </motion.div>
            )}

            {activeTabletTab === 'proceso' && (
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                className="h-full"
              >
                <KitchenColumn
                  id="proceso"
                  title="En Proceso"
                  icon={<Flame className="w-5 h-5 text-orange-500" />}
                  orders={processingItems}
                  badgeColor="bg-orange-500/10 text-orange-500 dark:text-orange-400 border border-orange-500/20"
                />
              </motion.div>
            )}

            {activeTabletTab === 'listo' && (
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                className="h-full"
              >
                <KitchenColumn
                  id="listo"
                  title="Listos"
                  icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  orders={readyItems}
                  badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                />
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
