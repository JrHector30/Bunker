import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Timer, Activity, X } from 'lucide-react';
import { useKitchen } from './KitchenContext';
import useKitchenTimers from './hooks/useKitchenTimers';

export default function KitchenTimers({ isCollapsed = false }) {
  const { isDarkMode, isAudioEnabled, triggerFirstInteraction } = useKitchen();

  // High-frequency localized timers hook
  const {
    timerDigits,
    initialDuration,
    timerRemaining,
    isTimerRunning,
    isAlarmActive,
    setIsTimerRunning,
    stopwatchTime,
    isStopwatchRunning,
    setIsStopwatchRunning,
    setStopwatchTime,
    handleNumpadPress,
    handleNumpadClear,
    handleNumpadBackspace,
    handleStartTimer,
    handleResetTimer,
    handleStopAlarm
  } = useKitchenTimers(isAudioEnabled);

  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);

  // Digital time formatting helpers
  const formatTimerDisplay = (seconds) => {
    const hVal = Math.floor(seconds / 3600);
    const mVal = Math.floor((seconds % 3600) / 60);
    const sVal = seconds % 60;
    if (hVal > 0) {
      return `${String(hVal).padStart(2, '0')}:${String(mVal).padStart(2, '0')}:${String(sVal).padStart(2, '0')}`;
    }
    return `${String(mVal).padStart(2, '0')}:${String(sVal).padStart(2, '0')}`;
  };

  const formatStopwatchDisplay = (seconds) => {
    const mVal = Math.floor(seconds / 60);
    const sVal = seconds % 60;
    return `${String(mVal).padStart(2, '0')}:${String(sVal).padStart(2, '0')}`;
  };

  // SVG parameters
  const size = 120;
  const center = size / 2;
  const radiusProgress = 42;
  const strokeDash = 2 * Math.PI * radiusProgress;

  // Render Bezel Clock Tick marks
  const renderTicks = () => {
    const ticks = [];
    const rStart = 48;
    const rEnd = 53;
    for (let i = 0; i < 60; i++) {
      const angle = (i * 6 * Math.PI) / 180;
      const x1 = center + rStart * Math.cos(angle);
      const y1 = center + rStart * Math.sin(angle);
      const x2 = center + rEnd * Math.cos(angle);
      const y2 = center + rEnd * Math.sin(angle);
      const isMajor = i % 5 === 0;

      ticks.push(
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={isDarkMode ? (isMajor ? '#4B5563' : '#374151') : (isMajor ? '#94A3B8' : '#CBD5E1')}
          strokeWidth={isMajor ? 1.5 : 0.8}
        />
      );
    }
    return ticks;
  };

  // Timer ratios
  const timerRatio = initialDuration > 0 ? timerRemaining / initialDuration : 0;
  const timerOffset = strokeDash - (timerRatio * strokeDash);

  const stopwatchRatio = (stopwatchTime % 60) / 60;
  const stopwatchOffset = strokeDash - (stopwatchRatio * strokeDash);

  const { hh, mm, ss } = (() => {
    const padded = timerDigits.padStart(6, '0');
    const h = parseInt(padded.slice(0, 2), 10);
    const m = parseInt(padded.slice(2, 4), 10);
    const s = parseInt(padded.slice(4, 6), 10);
    return { hh: h, mm: m, ss: s };
  })();

  const onStartTimer = () => {
    triggerFirstInteraction();
    handleStartTimer();
    setIsTimerModalOpen(false);
  };

  const onNumpadPress = (val) => {
    triggerFirstInteraction();
    handleNumpadPress(val);
  };

  const onNumpadClear = () => {
    triggerFirstInteraction();
    handleNumpadClear();
  };

  const onNumpadBackspace = () => {
    triggerFirstInteraction();
    handleNumpadBackspace();
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-row items-stretch gap-5 justify-center select-none">
        {/* TIMER CONTAINER WITH COMPACT CONTROLS */}
        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center select-none w-[110px] h-[110px]">
            <svg className="w-[106px] h-[106px] absolute transform -rotate-90">
              <circle
                cx={53}
                cy={53}
                r={36}
                fill="transparent"
                stroke={isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.5)'}
                strokeWidth="3.5"
              />
              {initialDuration > 0 && (
                <motion.circle
                  cx={53}
                  cy={53}
                  r={36}
                  fill="transparent"
                  stroke={isAlarmActive ? '#EF4444' : '#3B82F6'}
                  strokeWidth="3.5"
                  strokeDasharray={2 * Math.PI * 36}
                  animate={{ strokeDashoffset: (2 * Math.PI * 36) - (timerRatio * (2 * Math.PI * 36)) }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  strokeLinecap="round"
                  style={{ transformOrigin: 'center', transform: 'scaleY(-1)' }}
                  className={isAlarmActive ? 'drop-shadow-[0_0_6px_rgba(239,68,68,0.7)]' : 'drop-shadow-[0_0_4px_rgba(59,130,246,0.6)]'}
                />
              )}
            </svg>
            <button
              onClick={() => {
                triggerFirstInteraction();
                handleNumpadClear();
                setIsTimerModalOpen(true);
              }}
              title="Configurar cuenta"
              className={`w-[74px] h-[74px] rounded-full flex flex-col items-center justify-center border transition-all duration-300 z-10 hover:scale-105 cursor-pointer ${isDarkMode
                ? 'bg-[#1B212D] border-[#2B3241] shadow-[3px_3px_8px_rgba(0,0,0,0.5),-2px_-2px_8px_rgba(255,255,255,0.02)]'
                : 'bg-[#ECEFF4] border-[#E2E6EC] shadow-[3px_3px_8px_rgba(163,177,198,0.45),-3px_-3px_8px_rgba(255,255,255,0.95)]'
                }`}
            >
              <span className={`font-sans text-[11px] font-extrabold tracking-tight ${isAlarmActive ? 'text-red-500 animate-pulse font-black' : isDarkMode ? 'text-white' : 'text-black'
                }`}>
                {formatTimerDisplay(timerRemaining)}
              </span>
              <span className="text-[6.5px] text-[var(--primary)] font-extrabold uppercase tracking-widest leading-none mt-0.5">
                TEMP
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 mt-1 select-none z-20">
            <button
              onClick={() => { triggerFirstInteraction(); handleResetTimer(); }}
              title="Restablecer"
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isDarkMode
                ? 'bg-[#1F2635] border-[#2C3343] hover:bg-[#252D3F] text-slate-300'
                : 'bg-[#EBF0F6] border-[#D6DBE5] hover:bg-[#E2E8F1] text-slate-600 shadow-md'
                }`}
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            {isAlarmActive ? (
              <button
                onClick={() => { triggerFirstInteraction(); handleStopAlarm(); }}
                className="px-2 h-7 rounded-xl flex items-center justify-center bg-red-600 hover:bg-red-500 text-white border border-red-500 shadow-md active:scale-90 cursor-pointer animate-pulse font-black text-[8px] tracking-wider uppercase select-none"
              >
                STOP
              </button>
            ) : (
              <button
                onClick={() => {
                  triggerFirstInteraction();
                  if (timerRemaining <= 0) {
                    setIsTimerModalOpen(true);
                  } else {
                    setIsTimerRunning(!isTimerRunning);
                  }
                }}
                title={isTimerRunning ? "Pausar" : "Iniciar"}
                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isTimerRunning
                  ? 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-white shadow-md'
                  : 'bg-[var(--primary)] hover:bg-[var(--primary)]/90 border-[var(--primary)] text-white shadow-md'
                  }`}
              >
                {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-white ml-0.5" />}
              </button>
            )}
          </div>
        </div>

        {/* STOPWATCH CONTAINER WITH COMPACT CONTROLS */}
        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center select-none w-[110px] h-[110px]">
            <svg className="w-[106px] h-[106px] absolute transform -rotate-90">
              <circle
                cx={53}
                cy={53}
                r={36}
                fill="transparent"
                stroke={isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.5)'}
                strokeWidth="3.5"
              />
              {stopwatchTime > 0 && (
                <motion.circle
                  cx={53}
                  cy={53}
                  r={36}
                  fill="transparent"
                  stroke="var(--primary)"
                  strokeWidth="3.5"
                  strokeDasharray={2 * Math.PI * 36}
                  animate={{ strokeDashoffset: (2 * Math.PI * 36) - (stopwatchRatio * (2 * Math.PI * 36)) }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_4px_var(--primary)]"
                />
              )}
            </svg>
            <button
              onClick={() => { triggerFirstInteraction(); setIsStopwatchRunning(!isStopwatchRunning); }}
              title="Iniciar/Pausar"
              className={`w-[74px] h-[74px] rounded-full flex flex-col items-center justify-center border transition-all duration-300 z-10 hover:scale-105 cursor-pointer ${isDarkMode
                ? 'bg-[#1B212D] border-[#2B3241] shadow-[3px_3px_8px_rgba(0,0,0,0.5),-2px_-2px_8px_rgba(255,255,255,0.02)]'
                : 'bg-[#ECEFF4] border-[#E2E6EC] shadow-[3px_3px_8px_rgba(163,177,198,0.45),-3px_-3px_8px_rgba(255,255,255,0.95)]'
                }`}
            >
              <span className={`font-sans text-[11px] font-extrabold tracking-tight ${isStopwatchRunning ? 'text-[var(--primary)] font-black' : isDarkMode ? 'text-white' : 'text-black'
                }`}>
                {formatStopwatchDisplay(stopwatchTime)}
              </span>
              <span className="text-[6.5px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none mt-0.5">
                CRON
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 mt-1 select-none z-20">
            <button
              onClick={() => { triggerFirstInteraction(); setIsStopwatchRunning(false); setStopwatchTime(0); }}
              title="Restablecer"
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isDarkMode
                ? 'bg-[#1F2635] border-[#2C3343] hover:bg-[#252D3F] text-slate-300'
                : 'bg-[#EBF0F6] border-[#D6DBE5] hover:bg-[#E2E8F1] text-slate-600 shadow-md'
                }`}
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            <button
              onClick={() => { triggerFirstInteraction(); setIsStopwatchRunning(!isStopwatchRunning); }}
              title={isStopwatchRunning ? "Pausar" : "Iniciar"}
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isStopwatchRunning
                ? 'bg-[#EF4444] hover:bg-[#F87171] border-[#EF4444] text-white shadow-md'
                : 'bg-[var(--primary)] hover:bg-[var(--primary)]/90 border-[var(--primary)] text-white shadow-md'
                }`}
            >
              {isStopwatchRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-white ml-0.5" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center w-full">
      {/* ================= TIMER INSTRUMENT ================= */}
      <div className={`flex flex-col items-center p-4 rounded-[2.5rem] border w-48 transition-all duration-300 ${isDarkMode
        ? isAlarmActive
          ? 'bg-[#1e0a0a] border-red-500/40 shadow-2xl shadow-red-950/20'
          : 'bg-[#181D26] border-[#2D333F] shadow-[8px_8px_20px_rgba(0,0,0,0.5),-4px_-4px_15px_rgba(255,255,255,0.01)]'
        : isAlarmActive
          ? 'bg-red-50/70 border-red-200 animate-pulse'
          : 'bg-[#F2F4F8] border-[#E4E7ED] shadow-[6px_6px_16px_rgba(163,177,198,0.4),-6px_-6px_16px_rgba(255,255,255,0.9)]'
        }`}>
        <span className="text-[9px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-3.5 select-none">
          TEMPORIZADOR
        </span>

        <div className="relative flex items-center justify-center select-none w-[124px] h-[124px]">
          <div className={`absolute inset-0 rounded-full border ${isDarkMode ? 'border-slate-800/40' : 'border-slate-200'}`} />
          <svg className="w-[120px] h-[120px] absolute transform -rotate-90">
            {renderTicks()}
            <circle
              cx={center}
              cy={center}
              r={radiusProgress}
              fill="transparent"
              stroke={isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.5)'}
              strokeWidth="4"
            />
            {initialDuration > 0 && (
              <motion.circle
                cx={center}
                cy={center}
                r={radiusProgress}
                fill="transparent"
                stroke={isAlarmActive ? '#EF4444' : 'var(--primary)'}
                strokeWidth="4"
                strokeDasharray={strokeDash}
                animate={{ strokeDashoffset: timerOffset }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                strokeLinecap="round"
                style={{ transformOrigin: 'center', transform: 'scaleY(-1)' }}
                className={isAlarmActive ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]' : 'drop-shadow-[0_0_6px_var(--primary)]'}
              />
            )}
          </svg>

          <button
            onClick={() => { triggerFirstInteraction(); handleNumpadClear(); setIsTimerModalOpen(true); }}
            title="Toca para configurar tiempo"
            className={`w-[84px] h-[84px] rounded-full flex flex-col items-center justify-center border transition-all duration-300 z-10 active:scale-95 cursor-pointer ${isDarkMode
              ? 'bg-[#1B212D] border-[#2B3241] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-3px_-3px_10px_rgba(255,255,255,0.03)] hover:border-[var(--primary)]/30'
              : 'bg-[#ECEFF4] border-[#E2E6EC] shadow-[4px_4px_10px_rgba(163,177,198,0.55),-4px_-4px_10px_rgba(255,255,255,0.95)] hover:border-[var(--primary)]'
              }`}
          >
            <span className={`font-sans text-base font-black tracking-tight ${isAlarmActive ? 'text-red-500 animate-bounce' : isDarkMode ? 'text-white' : 'text-black'
              }`}>
              {formatTimerDisplay(timerRemaining)}
            </span>
          </button>
        </div>

        {/* Neumorphic Control Buttons Row */}
        <div className="flex items-center justify-between w-full px-1.5 mt-3 select-none">
          <button
            onClick={() => { triggerFirstInteraction(); handleResetTimer(); }}
            title="Restablecer"
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isDarkMode
              ? 'bg-[#1F2635] border-[#2C3343] hover:bg-[#252D3F] text-slate-300'
              : 'bg-[#EBF0F6] border-[#D6DBE5] hover:bg-[#E2E8F1] text-slate-600 shadow-md'
              }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {isAlarmActive ? (
            <button
              onClick={() => { triggerFirstInteraction(); handleStopAlarm(); }}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 text-white border border-red-500 shadow-lg active:scale-90 cursor-pointer animate-bounce font-black text-[9px] tracking-wider uppercase select-none z-20"
            >
              STOP
            </button>
          ) : (
            <button
              onClick={() => {
                triggerFirstInteraction();
                if (timerRemaining <= 0) {
                  setIsTimerModalOpen(true);
                } else {
                  setIsTimerRunning(!isTimerRunning);
                }
              }}
              title={isTimerRunning ? "Pausar" : "Iniciar"}
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isTimerRunning
                ? 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-white shadow-md'
                : 'bg-[var(--primary)] hover:bg-[var(--primary)]/90 border-[var(--primary)] text-white shadow-md'
                }`}
            >
              {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>
          )}

          <button
            onClick={() => { triggerFirstInteraction(); handleNumpadClear(); setIsTimerModalOpen(true); }}
            title="Configurar cuenta"
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isDarkMode
              ? 'bg-[#1F2635] border-[#2C3343] hover:bg-[#252D3F] text-slate-300'
              : 'bg-[#EBF0F6] border-[#D6DBE5] hover:bg-[#E2E8F1] text-slate-600 shadow-md'
              }`}
          >
            <Timer className="w-3.5 h-3.5 text-[var(--primary)]" />
          </button>
        </div>
      </div>

      {/* ================= STOPWATCH INSTRUMENT ================= */}
      <div className={`flex flex-col items-center p-4 rounded-[2.5rem] border w-48 transition-all duration-300 ${isDarkMode
        ? 'bg-[#181D26] border-[#2D333F] shadow-[8px_8px_20px_rgba(0,0,0,0.5),-4px_-4px_15px_rgba(255,255,255,0.01)]'
        : 'bg-[#F2F4F8] border-[#E4E7ED] shadow-[6px_6px_16px_rgba(163,177,198,0.4),-6px_-6px_16px_rgba(255,255,255,0.9)]'
        }`}>
        <span className="text-[9px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-3.5 select-none">
          CRONÓMETRO
        </span>

        <div className="relative flex items-center justify-center select-none w-[124px] h-[124px]">
          <div className={`absolute inset-0 rounded-full border ${isDarkMode ? 'border-slate-800/40' : 'border-slate-200'}`} />
          <svg className="w-[120px] h-[120px] absolute transform -rotate-90">
            {renderTicks()}
            <circle
              cx={center}
              cy={center}
              r={radiusProgress}
              fill="transparent"
              stroke={isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.5)'}
              strokeWidth="4"
            />
            {stopwatchTime > 0 && (
              <motion.circle
                cx={center}
                cy={center}
                r={radiusProgress}
                fill="transparent"
                stroke="var(--primary)"
                strokeWidth="4"
                strokeDasharray={strokeDash}
                animate={{ strokeDashoffset: stopwatchOffset }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                strokeLinecap="round"
                className="drop-shadow-[0_0_6px_var(--primary)]"
              />
            )}
          </svg>

          <button
            onClick={() => { triggerFirstInteraction(); setIsStopwatchRunning(!isStopwatchRunning); }}
            className={`w-[84px] h-[84px] rounded-full flex flex-col items-center justify-center border transition-all duration-300 z-10 active:scale-95 cursor-pointer ${isDarkMode
              ? 'bg-[#1B212D] border-[#2B3241] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-3px_-3px_10px_rgba(255,255,255,0.03)] hover:border-[var(--primary)]/30'
              : 'bg-[#ECEFF4] border-[#E2E6EC] shadow-[4px_4px_10px_rgba(163,177,198,0.55),-4px_-4px_10px_rgba(255,255,255,0.95)] hover:border-[var(--primary)]'
              }`}
          >
            <span className={`font-sans text-base font-black tracking-tight ${isStopwatchRunning ? 'text-[var(--primary)]' : isDarkMode ? 'text-white' : 'text-black'
              }`}>
              {formatStopwatchDisplay(stopwatchTime)}
            </span>
            <span className="text-[7px] text-slate-400 dark:text-slate-500 font-extrabold font-sans uppercase tracking-widest mt-0.5">
              {isStopwatchRunning ? "LIVE" : "PAUSED"}
            </span>
          </button>
        </div>

        <div className="mt-4 mb-2 flex flex-col items-center justify-center w-full px-2 py-[1.125rem] select-none text-center">
          <span className="text-[9px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
            TIEMPO ACUMULADO
          </span>
          <span className={`text-xs font-black font-sans mt-1 ${isDarkMode ? 'text-[var(--primary)]' : 'text-black'}`}>
            {Math.floor(stopwatchTime / 3600)}h {Math.floor((stopwatchTime % 3600) / 60)}m {stopwatchTime % 60}s
          </span>
        </div>



        <div className="flex items-center justify-between w-full px-1.5 mt-3 select-none">
          <button
            onClick={() => { triggerFirstInteraction(); setIsStopwatchRunning(false); setStopwatchTime(0); }}
            title="Restablecer"
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isDarkMode
              ? 'bg-[#1F2635] border-[#2C3343] hover:bg-[#252D3F] text-slate-300'
              : 'bg-[#EBF0F6] border-[#D6DBE5] hover:bg-[#E2E8F1] text-slate-600 shadow-md'
              }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => { triggerFirstInteraction(); setIsStopwatchRunning(!isStopwatchRunning); }}
            title={isStopwatchRunning ? "Pausar" : "Iniciar"}
            className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isStopwatchRunning
              ? 'bg-[#EF4444] hover:bg-[#F87171] border-[#EF4444] text-white shadow-md'
              : 'bg-[var(--primary)] hover:bg-[var(--primary)]/90 border-[var(--primary)] text-white shadow-md'
              }`}
          >
            {isStopwatchRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
          </button>

          <div className={`w-9 h-9 rounded-full flex items-center justify-center border select-none ${isStopwatchRunning ? 'animate-pulse' : ''} ${isDarkMode ? 'bg-[#11151D] border-[#1D222E] text-slate-400' : 'bg-[#EBF0F6] border-[#DDA0DD]/10 text-slate-400 shadow-md'
            }`}>
            <Activity className="w-3.5 h-3.5 text-[var(--primary)]" />
          </div>
        </div>
      </div>

      {/* --- TIMER CONFIGURATION MODAL --- */}
      <AnimatePresence>
        {isTimerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTimerModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-sm rounded-3xl p-6 border shadow-2xl select-none ${isDarkMode ? 'bg-[#161B22] border-[#30363D] text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-[var(--primary)]" />
                  <h3 className="font-extrabold text-sm tracking-wider uppercase">Configurar Cuenta</h3>
                </div>
                <button
                  onClick={() => setIsTimerModalOpen(false)}
                  className="border-none p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className={`p-4 rounded-2xl border text-center font-sans mb-5 ${isDarkMode ? 'bg-[#0D1117] border-[#30363D]' : 'bg-slate-50 border-slate-200'
                }`}>
                <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase block mb-1">
                  Tiempo Seleccionado
                </span>
                <div className="text-3xl font-black tracking-tight flex justify-center items-baseline gap-1">
                  <span className={hh > 0 ? 'text-[var(--primary)]' : 'text-gray-350 dark:text-slate-600'}>
                    {String(hh).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-bold text-slate-400 mr-1">h</span>

                  <span className={(hh > 0 || mm > 0) ? 'text-[var(--primary)]' : 'text-gray-350 dark:text-slate-600'}>
                    {String(mm).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-bold text-slate-400 mr-1">m</span>

                  <span className={(hh > 0 || mm > 0 || ss > 0) ? 'text-[var(--primary)]' : 'text-gray-350 dark:text-slate-600'}>
                    {String(ss).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-bold text-slate-400">s</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onNumpadPress(String(num))}
                    className={`h-14 rounded-2xl font-sans text-xl font-black flex items-center justify-center transition-all cursor-pointer border ${isDarkMode
                      ? 'bg-[#0D1117] hover:bg-slate-800 border-[#30363D] active:border-[var(--primary)]'
                      : 'bg-white hover:bg-slate-50 border-slate-200 active:border-[var(--primary)] text-gray-900 shadow-sm'
                      }`}
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => onNumpadPress('00')}
                  className={`h-14 rounded-2xl font-sans text-lg font-black flex items-center justify-center transition-all cursor-pointer border ${isDarkMode ? 'bg-[#0D1117] hover:bg-slate-800 border-[#30363D]' : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                    }`}
                >
                  00
                </button>

                <button
                  type="button"
                  onClick={() => onNumpadPress('0')}
                  className={`h-14 rounded-2xl font-sans text-xl font-black flex items-center justify-center transition-all cursor-pointer border ${isDarkMode ? 'bg-[#0D1117] hover:bg-slate-800 border-[#30363D]' : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                    }`}
                >
                  0
                </button>

                <button
                  type="button"
                  onClick={onNumpadBackspace}
                  onDoubleClick={onNumpadClear}
                  title="Borrar (Doble clic para vaciar todo)"
                  className={`h-14 rounded-2xl font-sans font-bold text-xs flex items-center justify-center transition-all cursor-pointer border ${isDarkMode
                    ? 'bg-rose-950/10 hover:bg-rose-950/20 border-rose-900/30 text-rose-400'
                    : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600 shadow-sm'
                    }`}
                >
                  BORRAR
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsTimerModalOpen(false)}
                  className={`flex-1 h-12 rounded-xl text-xs font-extrabold font-sans uppercase transition-all cursor-pointer border ${isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onStartTimer}
                  disabled={hh === 0 && mm === 0 && ss === 0}
                  className={`flex-1 h-12 rounded-xl text-xs font-black font-sans uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-transparent text-white shadow-lg ${(hh === 0 && mm === 0 && ss === 0)
                    ? 'bg-slate-300 dark:bg-slate-850 text-slate-500 dark:text-slate-600 cursor-not-allowed shadow-none'
                    : 'bg-[var(--primary)] hover:bg-[var(--primary)]/90 shadow-[var(--primary)]/10 hover:shadow-[var(--primary)]/25 active:scale-98'
                    }`}
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>PLAY / INICIAR</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div >
  );
}
