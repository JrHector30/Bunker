import React from 'react';
import { KitchenProvider, useKitchen } from './KitchenContext';
import KitchenHeader from './KitchenHeader';
import KitchenStats from './KitchenStats';
import KitchenBoard from './KitchenBoard';
import BatchSuggestion from './BatchSuggestion';
import CuriousFactsSlider from './CuriousFactsSlider';

/**
 * Modular KDS Kitchen Content layout.
 * Displays high-fidelity loading spinner until queue is fetched, then mounts KDS components.
 */
function KitchenContent() {
  const { queue } = useKitchen();

  if (!queue) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#0c0c0e] text-white font-sans select-none">
        <div 
          className="border-3 border-white/10 border-t-[var(--primary)] w-8 h-8 rounded-full animate-spin mb-3.5"
        ></div>
        <p className="text-xs font-semibold opacity-75">Cargando cocina...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 md:p-5 h-full min-h-0 overflow-hidden">
      {/* 1. Header with Clock & Instrument panel */}
      <KitchenHeader />

      {/* 2. Real-time stats dashboard */}
      <KitchenStats />

      {/* 3. Columns workflow grid board */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <KitchenBoard />
      </div>

      {/* 4. Curious Facts Banner */}
      <CuriousFactsSlider />

      {/* 5. Batch preparations flotante alerts */}
      <BatchSuggestion />
    </div>
  );
}

/**
 * Orchestrator Root View.
 * Wraps the components in the global KitchenProvider.
 */
export default function KitchenView() {
  return (
    <KitchenProvider>
      <div className="h-full flex flex-col overflow-hidden" style={{ minHeight: 'calc(100vh - 110px)' }}>
        <KitchenContent />
      </div>
    </KitchenProvider>
  );
}
