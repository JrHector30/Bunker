import React from 'react';
import { 
  Flame, 
  ChefHat, 
  Check, 
  RotateCcw, 
  Clock, 
  AlertTriangle,
  Play,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { Order } from '../types';

interface OrderCardProps {
  order: Order;
  onAdvance: (id: string) => void;
  onRewind: (id: string) => void;
  onAddMinutes: (id: string, mins: number) => void;
  isDarkMode: boolean;
}

export default function OrderCard({ 
  order, 
  onAdvance, 
  onRewind, 
  onAddMinutes,
  isDarkMode 
}: OrderCardProps) {
  // Calculate elapsed time based on creation time + custom simulation offset
  const elapsedMinutes = Math.floor(
    (Date.now() - order.createdAt) / 60000 + order.elapsedMinutesOffset
  );

  // Time-critical levels
  const isYellow = elapsedMinutes > 10 && elapsedMinutes <= 20;
  const isRed = elapsedMinutes > 20;

  // Render timer styling
  let timerTextColor = 'text-slate-500 dark:text-slate-400';
  let timerBgColor = 'bg-slate-100 dark:bg-slate-900/60';
  let pulseBorder = false;

  if (isYellow) {
    timerTextColor = 'text-amber-500 font-bold';
    timerBgColor = 'bg-amber-50 dark:bg-amber-950/20';
  } else if (isRed) {
    timerTextColor = 'text-rose-500 font-extrabold animate-pulse';
    timerBgColor = 'bg-rose-50 dark:bg-rose-950/20';
    pulseBorder = true;
  }

  // Define motion animation properties
  const cardBorderAnim = pulseBorder 
    ? {
        borderColor: ['#ea580c', '#30363d', '#ea580c'],
        boxShadow: [
          '0 0 4px rgba(234, 88, 12, 0.1)',
          '0 0 20px rgba(234, 88, 12, 0.45)',
          '0 0 4px rgba(234, 88, 12, 0.1)'
        ]
      }
    : {
        borderColor: isDarkMode 
          ? isYellow 
            ? 'rgba(245, 158, 11, 0.3)' 
            : '#30363d' 
          : isYellow 
            ? 'rgba(245, 158, 11, 0.4)' 
            : '#e2e8f0',
        boxShadow: isYellow 
          ? '0 0 20px rgba(245, 158, 11, 0.05)' 
          : '0 4px 12px rgba(0, 0, 0, 0.05)'
      };

  return (
    <motion.div
      layoutId={`card-${order.id}`}
      animate={cardBorderAnim}
      transition={{
        borderColor: { repeat: pulseBorder ? Infinity : 0, duration: 2, ease: 'easeInOut' },
        boxShadow: { repeat: pulseBorder ? Infinity : 0, duration: 2, ease: 'easeInOut' },
        layout: { type: 'spring', stiffness: 350, damping: 25 }
      }}
      className={`relative p-3.5 rounded-xl border transition-colors duration-300 flex flex-col justify-between gap-2.5 ${
        isDarkMode 
          ? isRed 
            ? 'bg-[#1c0d0d] text-white shadow-[0_0_30px_rgba(234,88,12,0.15)]' 
            : isYellow 
              ? 'bg-[#1c1917] text-slate-100 shadow-[0_0_20px_rgba(245,158,11,0.03)]' 
              : 'bg-[#161B22] text-slate-200 border-[#30363D]'
          : isRed
            ? 'bg-rose-50/50 text-slate-900 shadow-sm'
            : isYellow
              ? 'bg-amber-50/60 text-slate-900 shadow-sm'
              : 'bg-white text-slate-800'
      } ${pulseBorder ? 'border-2' : 'border'}`}
    >
      {/* Floating Critical Alert Badge */}
      {isRed && (
        <div className="absolute -top-2 -right-1.5 bg-orange-600 text-[8px] font-black tracking-widest px-2 py-0.5 rounded bg-orange-600 text-white shadow-lg animate-bounce select-none uppercase z-10 border border-orange-500">
          Crítico
        </div>
      )}

      {/* Top Section: Title & Timer */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-start gap-1 flex-1 min-w-0">
          <span className="text-orange-500 font-extrabold text-sm md:text-base shrink-0 select-none">
            {order.quantity}x
          </span>
          <h3 className={`font-bold text-xs md:text-sm leading-snug tracking-tight break-words ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            {order.name}
          </h3>
        </div>

        {/* Dynamic Timer Badge & Fast forward adjustments */}
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide transition-colors duration-300 ${timerBgColor} ${timerTextColor}`}>
            <Clock className="w-3 h-3 shrink-0" />
            <span>{elapsedMinutes === 0 ? '0 min' : `Hace ${elapsedMinutes} min`}</span>
            {isRed && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
              </span>
            )}
          </div>

          {/* Dev Quick Age Adjustment Tools */}
          {order.status !== 'listo' && (
            <div className="flex gap-0.5 select-none opacity-20 hover:opacity-100 transition-opacity">
              <button 
                onClick={() => onAddMinutes(order.id, 5)}
                title="Añadir +5 min para probar Alerta"
                className="text-[8px] px-1 py-0.2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
              >
                +5m
              </button>
              <button 
                onClick={() => onAddMinutes(order.id, 10)}
                title="Añadir +10 min para probar Alerta"
                className="text-[8px] px-1 py-0.2 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/20 transition-all cursor-pointer"
              >
                +10m
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modifier / Spec Alerts - rendered inside high-contrast elegant containers if present */}
      {order.modifier && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg text-[10px] font-semibold bg-red-50 dark:bg-red-950/20 border border-red-100/60 dark:border-red-900/40 text-red-600 dark:text-red-400 leading-tight animate-pulse-subtle">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
          <span>{order.modifier}</span>
        </div>
      )}

      {/* Divider */}
      <div className={`border-t my-0.2 ${
        isDarkMode ? 'border-slate-800/60' : 'border-slate-100'
      }`}></div>

      {/* Bottom Section: Metadata, Chef Assigned & Actions */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        <div className="flex items-center gap-1.5">
          {/* Table Indicator Capsule */}
          <span className={`inline-flex items-center justify-center px-2 py-1 text-[10px] font-black tracking-wider rounded-lg border uppercase select-none ${
            isDarkMode 
              ? 'bg-[#0D1117] text-slate-300 border-[#30363D]' 
              : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            {order.table}
          </span>

          {/* Chef Assignment (visible in Proceso & Listo status) */}
          {(order.status === 'proceso' || order.status === 'listo') && order.chef && (
            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              <ChefHat className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="truncate max-w-[50px] md:max-w-[85px]">{order.chef}</span>
            </div>
          )}
        </div>

        {/* Action Button Controls */}
        <div className="flex items-center gap-1.5 select-none">
          {/* Undo/Rewind Button (Available for Proceso and Listos states) */}
          {(order.status === 'proceso' || order.status === 'listo') && (
            <button
              onClick={() => onRewind(order.id)}
              title="Regresar a estado anterior"
              className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 border transition-all cursor-pointer shadow-sm ${
                isDarkMode 
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Advancement Button */}
          {order.status === 'pendiente' && (
            <button
              onClick={() => onAdvance(order.id)}
              className="h-8 px-3.5 rounded-full flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-[10px] tracking-wide transition-all cursor-pointer shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 uppercase"
            >
              <Flame className="w-3.5 h-3.5 fill-white animate-pulse" />
              <span>Empezar</span>
              <ArrowRight className="w-2.5 h-2.5 text-indigo-200" />
            </button>
          )}

          {order.status === 'proceso' && (
            <button
              onClick={() => onAdvance(order.id)}
              className={`h-8 px-3.5 rounded-full flex items-center justify-center gap-1 active:scale-95 text-white font-black text-[10px] tracking-wide transition-all cursor-pointer shadow-md uppercase ${
                isRed 
                  ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/10' 
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/10'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3px]" />
              <span>{isRed ? 'URGENTE: LISTO' : 'LISTO'}</span>
            </button>
          )}

          {order.status === 'listo' && (
            <span className="h-8 px-3 rounded-full flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] tracking-wider border border-emerald-500/20 select-none uppercase">
              <Check className="w-3.5 h-3.5 stroke-[3px]" />
              <span>LISTO</span>
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
