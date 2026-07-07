import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, OrderStatus } from '../types';
import OrderCard from './OrderCard';

interface KitchenColumnProps {
  id: OrderStatus;
  title: string;
  icon: React.ReactNode;
  orders: Order[];
  badgeColor: string;
  borderColor: string;
  isDarkMode: boolean;
  onAdvance: (id: string) => void;
  onRewind: (id: string) => void;
  onAddMinutes: (id: string, mins: number) => void;
}

export default function KitchenColumn({
  id,
  title,
  icon,
  orders,
  badgeColor,
  borderColor,
  isDarkMode,
  onAdvance,
  onRewind,
  onAddMinutes
}: KitchenColumnProps) {
  // Dynamically determine background and border styling based on the state and theme
  let columnStyle = '';
  if (isDarkMode) {
    if (id === 'pendiente') {
      columnStyle = 'bg-[#0D1117] border border-dashed border-slate-800/80';
    } else if (id === 'proceso') {
      columnStyle = 'bg-[#0D1117] border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.02)]';
    } else {
      columnStyle = 'bg-[#0D1117] border border-emerald-500/20 opacity-90';
    }
  } else {
    if (id === 'pendiente') {
      columnStyle = 'bg-slate-50/60 border border-dashed border-slate-200';
    } else if (id === 'proceso') {
      columnStyle = 'bg-slate-50/60 border border-indigo-500/15 shadow-sm';
    } else {
      columnStyle = 'bg-slate-50/60 border border-emerald-500/15';
    }
  }

  return (
    <div
      className={`flex flex-col flex-1 min-w-[280px] lg:min-w-[340px] rounded-2xl p-4 transition-all duration-300 ${columnStyle}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="shrink-0 flex items-center justify-center p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/80">
            {icon}
          </div>
          <h2 className="font-extrabold text-xs md:text-xs tracking-wider uppercase text-slate-800 dark:text-slate-400">
            {title}
          </h2>
        </div>

        {/* Count Badge */}
        <span className={`inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-bold rounded-full ${badgeColor} select-none`}>
          {orders.length}
        </span>
      </div>

      {/* Cards Container - Fluid layout, no rigid internal scrollbars to optimize tablet interaction */}
      <div className="space-y-3 select-none">
        <AnimatePresence mode="popLayout">
          {orders.length > 0 ? (
            orders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              >
                <OrderCard
                  order={order}
                  onAdvance={onAdvance}
                  onRewind={onRewind}
                  onAddMinutes={onAddMinutes}
                  isDarkMode={isDarkMode}
                />
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-44 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500"
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
}
