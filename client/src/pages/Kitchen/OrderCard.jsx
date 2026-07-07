import React, { useMemo } from 'react';
import {
  Flame,
  ChefHat,
  Check,
  RotateCcw,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { useKitchen } from './KitchenContext';
import { useAuth } from '../../context/AuthContext';

/**
 * Premium KDS Order Card component.
 * Evaluates warning thresholds (Green, Yellow, Red) and includes plate modifiers parsing with emojis,
 * localized time offsets, and optimized action triggers.
 * Wrapped in React.memo to achieve 60 FPS rendering.
 */
const OrderCard = React.memo(({ item }) => {
  const { user } = useAuth();
  const {
    isDarkMode,
    timeOffsets,
    handleAddMinutes,
    updateItemStatus
  } = useKitchen();

  // Local calculation of elapsed wait time
  const elapsedMinutes = useMemo(() => {
    const start = new Date(item.fechaCreacion || item.comanda?.fecha || Date.now()).getTime();
    const offset = timeOffsets[item.id] || 0;
    return Math.floor((Date.now() - start) / 60000 + offset);
  }, [item.fechaCreacion, item.comanda?.fecha, item.id, timeOffsets]);

  // Warning thresholds (only active if not in Listos/ready state)
  const isFinished = item.estado === 'listo' || item.estado === 'lista';
  const isYellow = !isFinished && elapsedMinutes > 10 && elapsedMinutes <= 20;
  const isRed = !isFinished && elapsedMinutes > 20;

  // Visual classes and colors
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

  // Animation values
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

  // Modifier Emoji parser
  const getModifierDetails = (text) => {
    if (!text) return null;
    const lower = text.toLowerCase();
    let emoji = '📝';
    if (lower.includes('aji') || lower.includes('picante')) emoji = '🌶️';
    else if (lower.includes('cebolla')) emoji = '🧅';
    else if (lower.includes('leche') || lower.includes('queso') || lower.includes('lacteo')) emoji = '🥛';
    else if (lower.includes('marisco') || lower.includes('camaron') || lower.includes('pescado')) emoji = '🍤';

    return { emoji, text };
  };

  const modifier = useMemo(() => getModifierDetails(item.observacion), [item.observacion]);

  // Formatted table label
  const tableLabel = useMemo(() => {
    let num = item.comanda?.mesa?.numero ? String(item.comanda.mesa.numero) : '';
    if (item.comanda?.mesa?.mesasHijas && item.comanda.mesa.mesasHijas.length > 0) {
      const hijas = item.comanda.mesa.mesasHijas.map(h => h.numero).join(' - ');
      num = `${num} - ${hijas}`;
    }
    return `MESA ${num.toUpperCase()}`;
  }, [item.comanda?.mesa?.numero, item.comanda?.mesa?.mesasHijas]);

  // Cook block logic
  const isCookingBlocked = useMemo(() => {
    return (item.estado === 'preparando' || item.estado === 'lista' || item.estado === 'listo') &&
      item.cocineroId &&
      item.cocineroId !== user?.id;
  }, [item.estado, item.cocineroId, user?.id]);

  return (
    <motion.div
      layoutId={`card-${item.id}`}
      animate={cardBorderAnim}
      transition={{
        borderColor: { repeat: pulseBorder ? Infinity : 0, duration: 2, ease: 'easeInOut' },
        boxShadow: { repeat: pulseBorder ? Infinity : 0, duration: 2, ease: 'easeInOut' },
        layout: { type: 'spring', stiffness: 350, damping: 25 }
      }}
      className={`relative p-3.5 rounded-xl border transition-colors duration-300 flex flex-col justify-between gap-2.5 ${isDarkMode
        ? isRed
          ? 'bg-[#1c0d0d] text-white shadow-2xl'
          : isYellow
            ? 'bg-[#1c1917] text-slate-100'
            : 'bg-[#161B22] text-slate-200 border-[#30363D]'
        : isRed
          ? 'bg-rose-50/50 text-gray-900 shadow-sm border-rose-200'
          : isYellow
            ? 'bg-amber-50/60 text-gray-900 shadow-sm border-amber-200'
            : 'bg-white text-gray-900 border-gray-200 shadow-sm'
        } ${pulseBorder ? 'border-2' : 'border'}`}
    >
      {/* Floating Critical Alert Badge */}
      {isRed && (
        <div 
          style={{ position: 'absolute', top: '-8px', right: '-8px', zIndex: 20 }}
          className="bg-red-500 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-md select-none uppercase tracking-wider animate-bounce"
        >
          Crítico
        </div>
      )}

      {/* Top Section: Title & Timer */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          <span className="text-orange-500 font-extrabold text-sm md:text-base shrink-0 select-none">
            {item.cantidad}x
          </span>
          <h3 className={`font-bold text-xs md:text-sm leading-snug tracking-tight break-words ${isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
            {item.plato?.nombre}
          </h3>
        </div>

        {/* Dynamic Timer Badge */}
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


        </div>
      </div>

      {/* Modifier with emojis */}
      {modifier && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg text-[10px] font-semibold bg-red-55 dark:bg-red-950/20 border border-red-100/60 dark:border-red-900/40 text-red-600 dark:text-red-400 leading-tight animate-pulse-subtle">
          <span className="shrink-0 text-xs">{modifier.emoji}</span>
          <span>{modifier.text}</span>
        </div>
      )}

      {/* Divider */}
      <div className={`border-t my-0.2 ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'}`}></div>

      {/* Bottom Section: Metadata, Cook assigned & Actions */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center justify-center px-2 py-1 text-[10px] font-black tracking-wider rounded-lg border uppercase select-none ${isDarkMode
            ? 'bg-[#0D1117] text-slate-300 border-[#30363D]'
            : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
            {tableLabel}
          </span>

          {/* Assigned Chef */}
          {(item.estado === 'preparando' || item.estado === 'lista' || item.estado === 'listo') && item.cocinero && (
            <div className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-slate-400 font-semibold">
              <ChefHat className="w-3 h-3 text-[var(--primary)] shrink-0" />
              <span className="truncate max-w-[65px]">{item.cocinero.nombre}</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 select-none">
          {isCookingBlocked ? (
            <div className="h-8 px-3 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-900/80 text-slate-400 dark:text-slate-500 font-extrabold text-[10px] tracking-wide border border-slate-200 dark:border-slate-800 uppercase">
              Bloqueado
            </div>
          ) : (
            <>
              {/* Rewind */}
              {(item.estado === 'preparando' || item.estado === 'lista' || item.estado === 'listo') && (
                <button
                  onClick={() => {
                    const prevStatus = (item.estado === 'lista' || item.estado === 'listo') ? 'preparando' : 'pendiente';
                    updateItemStatus(item.id, prevStatus, { preserveCook: prevStatus === 'preparando' });
                  }}
                  title="Regresar estado"
                  className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 border transition-all cursor-pointer shadow-sm ${isDarkMode
                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                    }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Advance */}
              {(item.estado === 'pendiente' || item.estado === 'enviada') && (
                <button
                  onClick={() => updateItemStatus(item.id, 'preparando')}
                  className="border-none h-8 px-3.5 rounded-full flex items-center justify-center gap-1 bg-[var(--primary)] hover:bg-[var(--primary)]/90 active:scale-95 text-white font-black text-[10px] tracking-wide transition-all cursor-pointer shadow-md uppercase"
                >
                  <Flame className="w-3.5 h-3.5 fill-white animate-pulse" />
                  <span>Empezar</span>
                  <ArrowRight className="w-2.5 h-2.5 text-white/70" />
                </button>
              )}

              {item.estado === 'preparando' && (
                <button
                  onClick={() => updateItemStatus(item.id, 'listo')}
                  className={`border-none h-8 px-3.5 rounded-full flex items-center justify-center gap-1 active:scale-95 text-white font-black text-[10px] tracking-wide transition-all cursor-pointer shadow-md uppercase ${
                    isRed 
                      ? 'bg-orange-600 hover:bg-orange-550' 
                      : 'bg-[var(--primary)] hover:bg-[var(--primary)]/90'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3px]" />
                  <span>{isRed ? 'URGENTE: LISTO' : 'LISTO'}</span>
                </button>
              )}

              {(item.estado === 'lista' || item.estado === 'listo') && (
                <span className={`h-8 px-3 rounded-full flex items-center gap-1 font-extrabold text-[10px] tracking-wider select-none uppercase transition-colors duration-250 ${
                  isDarkMode 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-[#0ed396] text-white hover:bg-[#0bb37f]'
                }`}>
                  <Check className="w-3.5 h-3.5 stroke-[3px]" />
                  <span>LISTO</span>
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default OrderCard;
