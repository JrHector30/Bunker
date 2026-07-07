import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useKitchen } from './KitchenContext';
import OrderCard from './OrderCard';

/**
 * KDS Individual Status Column.
 * Groups order cards and displays appropriate header titles, counts, and background styling.
 * Centralized state subscriptions prevent prop drilling.
 */
const KitchenColumn = React.memo(({ id, title, icon, orders, badgeColor }) => {
  const { isDarkMode } = useKitchen();

  // Determine container styling based on status and theme mode
  let columnStyle = '';
  if (isDarkMode) {
    if (id === 'pendiente') {
      columnStyle = 'bg-[#0D1117] border border-dashed border-slate-800/80';
    } else if (id === 'proceso') {
      columnStyle = 'bg-[#0D1117] border border-[var(--primary)]/20 shadow-[0_0_20px_rgba(99,102,241,0.02)]';
    } else {
      columnStyle = 'bg-[#0D1117] border border-emerald-500/20 opacity-90';
    }
  } else {
    if (id === 'pendiente') {
      columnStyle = 'bg-white border border-dashed border-gray-200 shadow-sm';
    } else if (id === 'proceso') {
      columnStyle = 'bg-white border border-[var(--primary)]/20 shadow-sm';
    } else {
      columnStyle = 'bg-white border border-gray-200 shadow-sm';
    }
  }

  return (
    <div
      className={`flex flex-col flex-1 min-w-[280px] lg:min-w-[340px] rounded-2xl p-4 transition-all duration-300 ${columnStyle}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="shrink-0 flex items-center justify-center p-1.5 rounded-lg bg-gray-150/40 dark:bg-slate-900/80 text-gray-700 dark:text-slate-400">
            {icon}
          </div>
          <h2 className="font-extrabold text-xs tracking-wider uppercase text-gray-900 dark:text-slate-400">
            {title}
          </h2>
        </div>

        <span className={`inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-bold rounded-full ${badgeColor} select-none`}>
          {orders.length}
        </span>
      </div>

      {/* Cards Container - Fluid layout, optimized for virtualization libraries mapping */}
      <div className="space-y-3 select-none flex-1 overflow-y-auto px-1.5 pt-2.5 pb-4">
        <AnimatePresence mode="popLayout">
          {orders.length > 0 ? (
            orders.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              >
                <OrderCard item={item} />
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500"
            >
              <div className="mb-2 p-2.5 rounded-full bg-slate-100/50 dark:bg-slate-900/50">
                {icon}
              </div>
              <p className="text-xs font-medium">Sin platos en esta sección</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default KitchenColumn;
