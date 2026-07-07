import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Timer, Activity, X, Bell, BellOff } from 'lucide-react';

interface KitchenTimerStopwatchProps {
  isDarkMode: boolean;
  soundEnabled: boolean;
  isCollapsed?: boolean;
}

// Lazy sound player using Web Audio API for maximum compatibility
class AlarmSoundPlayer {
  private audioCtx: AudioContext | null = null;
  private intervalId: number | null = null;

  start() {
    if (this.intervalId) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      this.audioCtx = new AudioContextClass();

      const playBeep = () => {
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        const time = this.audioCtx.currentTime;
        const freq = Math.floor(time) % 2 === 0 ? 880 : 660;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.4, time + 0.05);
        gain.gain.linearRampToValueAtTime(0.4, time + 0.25);
        gain.gain.linearRampToValueAtTime(0, time + 0.3);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(time + 0.3);
      };

      playBeep();
      this.intervalId = window.setInterval(playBeep, 600);
    } catch (e) {
      console.error("Failed to start alarm sound:", e);
    }
  }

  stop() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) { }
      this.audioCtx = null;
    }
  }
}

export default function KitchenTimerStopwatch({ isDarkMode, soundEnabled, isCollapsed = false }: KitchenTimerStopwatchProps) {
  const soundPlayerRef = useRef<AlarmSoundPlayer>(new AlarmSoundPlayer());

  // --- TIMER STATES ---
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [timerDigits, setTimerDigits] = useState('1530'); // Default to 15:30 as in screen model

  // Active Timer state
  const [initialDuration, setInitialDuration] = useState(930); // 15 mins 30 secs
  const [timerRemaining, setTimerRemaining] = useState(930);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isAlarmActive, setIsAlarmActive] = useState(false);

  // --- STOPWATCH STATES ---
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);

  // Helper to parse typed digits
  const getParsedDigits = (digits: string) => {
    const padded = digits.padStart(6, '0');
    const hh = parseInt(padded.slice(0, 2), 10);
    const mm = parseInt(padded.slice(2, 4), 10);
    const ss = parseInt(padded.slice(4, 6), 10);
    return { hh, mm, ss };
  };

  const { hh, mm, ss } = getParsedDigits(timerDigits);

  // Timer Tick effect
  useEffect(() => {
    let interval: number | null = null;
    if (isTimerRunning && timerRemaining > 0) {
      interval = window.setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setIsAlarmActive(true);
            if (soundEnabled) {
              soundPlayerRef.current.start();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isTimerRunning, timerRemaining, soundEnabled]);

  // Stopwatch Tick effect
  useEffect(() => {
    let interval: number | null = null;
    if (isStopwatchRunning) {
      interval = window.setInterval(() => {
        setStopwatchTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isStopwatchRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      soundPlayerRef.current.stop();
    };
  }, []);

  // Timer Handlers
  const handleNumpadPress = (val: string) => {
    if (val === '00') {
      if (timerDigits.length >= 5) return;
      setTimerDigits((prev) => (prev + '00').slice(0, 6));
    } else {
      if (timerDigits.length >= 6) return;
      setTimerDigits((prev) => prev + val);
    }
  };

  const handleNumpadClear = () => {
    setTimerDigits('');
  };

  const handleNumpadBackspace = () => {
    setTimerDigits((prev) => prev.slice(0, -1));
  };

  const handleStartTimer = () => {
    const totalSecs = hh * 3600 + mm * 60 + ss;
    if (totalSecs <= 0) return;

    setInitialDuration(totalSecs);
    setTimerRemaining(totalSecs);
    setIsTimerRunning(true);
    setIsAlarmActive(false);
    setIsTimerModalOpen(false);
  };

  const handleResetTimer = () => {
    setTimerRemaining(initialDuration);
    setIsTimerRunning(false);
    setIsAlarmActive(false);
    soundPlayerRef.current.stop();
  };

  const handleStopAlarm = () => {
    setIsAlarmActive(false);
    soundPlayerRef.current.stop();
    setTimerRemaining(initialDuration);
    setIsTimerRunning(false);
  };

  const formatTimerDisplay = (seconds: number) => {
    const hVal = Math.floor(seconds / 3600);
    const mVal = Math.floor((seconds % 3600) / 60);
    const sVal = seconds % 60;
    if (hVal > 0) {
      return `${String(hVal).padStart(2, '0')}:${String(mVal).padStart(2, '0')}:${String(sVal).padStart(2, '0')}`;
    }
    return `${String(mVal).padStart(2, '0')}:${String(sVal).padStart(2, '0')}`;
  };

  const formatStopwatchDisplay = (seconds: number) => {
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

  // Timer ratio: decreases counter-clockwise
  const timerRatio = initialDuration > 0 ? timerRemaining / initialDuration : 0;
  const timerOffset = strokeDash - (timerRatio * strokeDash);

  // Stopwatch ratio: increases clockwise
  const stopwatchRatio = (stopwatchTime % 60) / 60;
  const stopwatchOffset = strokeDash - (stopwatchRatio * strokeDash);

  if (isCollapsed) {
    return (
      <div className="flex flex-row items-stretch gap-5 justify-center select-none">
        {/* TIMER CONTAINER WITH COMPACT CONTROLS */}
        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center select-none w-[110px] h-[110px]">
            <svg className="w-[106px] h-[106px] absolute transform -rotate-90">
              {/* Background track circle */}
              <circle
                cx={53}
                cy={53}
                r={36}
                fill="transparent"
                stroke={isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.5)'}
                strokeWidth="3.5"
              />
              {/* Glowing progress arc */}
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
            {/* Inner Plate */}
            <button
              onClick={() => {
                setTimerDigits('');
                setIsTimerModalOpen(true);
              }}
              title="Configurar cuenta"
              className={`w-[74px] h-[74px] rounded-full flex flex-col items-center justify-center border transition-all duration-300 z-10 hover:scale-105 cursor-pointer ${isDarkMode
                ? 'bg-[#1B212D] border-[#2B3241] shadow-[3px_3px_8px_rgba(0,0,0,0.5),-2px_-2px_8px_rgba(255,255,255,0.02)]'
                : 'bg-[#ECEFF4] border-[#E2E6EC] shadow-[3px_3px_8px_rgba(163,177,198,0.45),-3px_-3px_8px_rgba(255,255,255,0.95)]'
                }`}
            >
              <span className={`font-mono text-[11px] font-extrabold tracking-tight ${isAlarmActive ? 'text-red-500 animate-pulse font-black' : isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                {formatTimerDisplay(timerRemaining)}
              </span>
              <span className="text-[6.5px] text-indigo-500 dark:text-indigo-400 font-extrabold uppercase tracking-widest leading-none mt-0.5">
                TEMP
              </span>
            </button>
          </div>

          {/* Compact controls under Timer */}
          <div className="flex items-center gap-1.5 mt-1 select-none z-20">
            {/* Reset */}
            <button
              onClick={handleResetTimer}
              title="Restablecer"
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isDarkMode
                ? 'bg-[#1F2635] border-[#2C3343] hover:bg-[#252D3F] text-slate-300'
                : 'bg-[#EBF0F6] border-[#D6DBE5] hover:bg-[#E2E8F1] text-slate-600 shadow-md'
                }`}
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            {/* Play/Pause/Stop */}
            {isAlarmActive ? (
              <button
                onClick={handleStopAlarm}
                className="px-2 h-7 rounded-xl flex items-center justify-center bg-red-600 hover:bg-red-500 text-white border border-red-500 shadow-md active:scale-90 cursor-pointer animate-pulse font-black text-[8px] tracking-wider uppercase select-none"
              >
                STOP
              </button>
            ) : (
              <button
                onClick={() => {
                  if (timerRemaining <= 0) {
                    setIsTimerModalOpen(true);
                  } else {
                    setIsTimerRunning(!isTimerRunning);
                  }
                }}
                title={isTimerRunning ? "Pausar" : "Iniciar"}
                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isTimerRunning
                  ? 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-white shadow-md'
                  : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white shadow-md'
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
              {/* Glowing progress arc */}
              {stopwatchTime > 0 && (
                <motion.circle
                  cx={53}
                  cy={53}
                  r={36}
                  fill="transparent"
                  stroke="#6366F1"
                  strokeWidth="3.5"
                  strokeDasharray={2 * Math.PI * 36}
                  animate={{ strokeDashoffset: (2 * Math.PI * 36) - (stopwatchRatio * (2 * Math.PI * 36)) }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_4px_rgba(99,102,241,0.65)]"
                />
              )}
            </svg>
            {/* Inner Plate */}
            <button
              onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
              title="Iniciar/Pausar"
              className={`w-[74px] h-[74px] rounded-full flex flex-col items-center justify-center border transition-all duration-300 z-10 hover:scale-105 cursor-pointer ${isDarkMode
                ? 'bg-[#1B212D] border-[#2B3241] shadow-[3px_3px_8px_rgba(0,0,0,0.5),-2px_-2px_8px_rgba(255,255,255,0.02)]'
                : 'bg-[#ECEFF4] border-[#E2E6EC] shadow-[3px_3px_8px_rgba(163,177,198,0.45),-3px_-3px_8px_rgba(255,255,255,0.95)]'
                }`}
            >
              <span className={`font-mono text-[11px] font-extrabold tracking-tight ${isStopwatchRunning ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-800 dark:text-white'
                }`}>
                {formatStopwatchDisplay(stopwatchTime)}
              </span>
              <span className="text-[6.5px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none mt-0.5">
                CRON
              </span>
            </button>
          </div>

          {/* Compact controls under Stopwatch */}
          <div className="flex items-center gap-1.5 mt-1 select-none z-20">
            {/* Reset */}
            <button
              onClick={() => {
                setIsStopwatchRunning(false);
                setStopwatchTime(0);
              }}
              title="Restablecer"
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isDarkMode
                ? 'bg-[#1F2635] border-[#2C3343] hover:bg-[#252D3F] text-slate-300'
                : 'bg-[#EBF0F6] border-[#D6DBE5] hover:bg-[#E2E8F1] text-slate-600 shadow-md'
                }`}
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
              title={isStopwatchRunning ? "Pausar" : "Iniciar"}
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isStopwatchRunning
                ? 'bg-[#EF4444] hover:bg-[#F87171] border-[#EF4444] text-white shadow-md'
                : 'bg-[#6366F1] hover:bg-[#4F46E5] border-[#6366F1] text-white shadow-md'
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
        {/* Title */}
        <span className="text-[9px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-3.5 select-none">
          TEMPORIZADOR
        </span>

        {/* 3D Gauge Circle */}
        <div className="relative flex items-center justify-center select-none w-[124px] h-[124px]">
          {/* Subtle Outer Track Bezel */}
          <div className={`absolute inset-0 rounded-full border ${isDarkMode ? 'border-slate-800/40' : 'border-slate-200'
            }`} />

          {/* SVG representation with ticks and progress */}
          <svg className="w-[120px] h-[120px] absolute transform -rotate-90">
            {renderTicks()}

            {/* Background track circle */}
            <circle
              cx={center}
              cy={center}
              r={radiusProgress}
              fill="transparent"
              stroke={isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.5)'}
              strokeWidth="4"
            />

            {/* Glowing progress arc */}
            {initialDuration > 0 && (
              <motion.circle
                cx={center}
                cy={center}
                r={radiusProgress}
                fill="transparent"
                stroke={isAlarmActive ? '#EF4444' : '#3B82F6'}
                strokeWidth="4"
                strokeDasharray={strokeDash}
                animate={{ strokeDashoffset: timerOffset }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                strokeLinecap="round"
                // Flip vertically to make it run counter-clockwise
                style={{ transformOrigin: 'center', transform: 'scaleY(-1)' }}
                className={isAlarmActive ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]' : 'drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]'}
              />
            )}
          </svg>

          {/* Inner Elevated Disk (Neumorphic Plate) */}
          <button
            onClick={() => {
              setTimerDigits('');
              setIsTimerModalOpen(true);
            }}
            title="Toca para configurar tiempo"
            className={`w-[84px] h-[84px] rounded-full flex flex-col items-center justify-center border transition-all duration-300 z-10 active:scale-95 cursor-pointer ${isDarkMode
              ? 'bg-[#1B212D] border-[#2B3241] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-3px_-3px_10px_rgba(255,255,255,0.03)] hover:border-indigo-500/30'
              : 'bg-[#ECEFF4] border-[#E2E6EC] shadow-[4px_4px_10px_rgba(163,177,198,0.55),-4px_-4px_10px_rgba(255,255,255,0.95)] hover:border-indigo-400'
              }`}
          >
            {/* Digital Display */}
            <span className={`font-mono text-base font-black tracking-tight ${isAlarmActive
              ? 'text-red-500 animate-bounce'
              : isDarkMode
                ? 'text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.1)]'
                : 'text-slate-800'
              }`}>
              {formatTimerDisplay(timerRemaining)}
            </span>
          </button>
        </div>

        {/* 3D Wheel Picker Representation (shown when idle) */}
        <div
          onClick={() => {
            setTimerDigits('');
            setIsTimerModalOpen(true);
          }}
          className={`mt-4 mb-2 flex flex-col items-center w-full px-2 py-1.5 rounded-xl border cursor-pointer select-none transition-all ${isDarkMode
            ? 'bg-[#11151D] border-[#232833] hover:border-slate-700'
            : 'bg-[#EAEEF3] border-[#E2E5EB] hover:border-slate-300'
            }`}
        >
          {/* Faded top values */}
          <div className="flex justify-between w-full px-4 text-[9px] font-bold text-slate-400/30 dark:text-slate-500/20 font-mono select-none">
            <span>{String((hh + 1) % 24).padStart(2, '0')}</span>
            <span>{String((mm + 1) % 60).padStart(2, '0')}</span>
            <span>{String((ss + 1) % 60).padStart(2, '0')}</span>
          </div>

          {/* Highlighted active values with scroll vertical curves */}
          <div className="flex justify-between items-center w-full px-4 font-mono select-none py-0.5 border-y border-dashed border-slate-300/40 dark:border-slate-800/40 my-0.5">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{String(hh).padStart(2, '0')}</span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600">:</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{String(mm).padStart(2, '0')}</span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600">:</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{String(ss).padStart(2, '0')}</span>
          </div>

          {/* Faded bottom values */}
          <div className="flex justify-between w-full px-4 text-[9px] font-bold text-slate-400/30 dark:text-slate-500/20 font-mono select-none">
            <span>{String((hh - 1 + 24) % 24).padStart(2, '0')}</span>
            <span>{String((mm - 1 + 60) % 60).padStart(2, '0')}</span>
            <span>{String((ss - 1 + 60) % 60).padStart(2, '0')}</span>
          </div>

          {/* Labels */}
          <div className="flex justify-between w-full px-4 text-[8px] font-extrabold text-slate-400 dark:text-slate-500 mt-1 select-none">
            <span className="w-4 text-center">h</span>
            <span className="w-4 text-center">min</span>
            <span className="w-4 text-center">s</span>
          </div>
        </div>

        {/* Neumorphic Control Buttons Row */}
        <div className="flex items-center justify-between w-full px-1.5 mt-3 select-none">
          {/* Button 1: Reset */}
          <button
            onClick={handleResetTimer}
            title="Restablecer"
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isDarkMode
              ? 'bg-[#1F2635] border-[#2C3343] hover:bg-[#252D3F] text-slate-300'
              : 'bg-[#EBF0F6] border-[#D6DBE5] hover:bg-[#E2E8F1] text-slate-600 shadow-[2px_2px_6px_rgba(163,177,198,0.4),-2px_-2px_6px_rgba(255,255,255,0.9)]'
              }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Button 2: Play/Pause/Stop (Larger Center Button) */}
          {isAlarmActive ? (
            <button
              onClick={handleStopAlarm}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 text-white border border-red-500 shadow-lg shadow-red-500/30 active:scale-90 cursor-pointer animate-bounce font-black text-[9px] tracking-wider uppercase select-none z-20"
            >
              STOP
            </button>
          ) : (
            <button
              onClick={() => {
                if (timerRemaining <= 0) {
                  setIsTimerModalOpen(true);
                } else {
                  setIsTimerRunning(!isTimerRunning);
                }
              }}
              title={isTimerRunning ? "Pausar" : "Iniciar"}
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isTimerRunning
                ? 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-white shadow-lg shadow-amber-500/20'
                : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-600/25'
                }`}
            >
              {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>
          )}

          {/* Button 3: Alert / Modal trigger */}
          <button
            onClick={() => {
              setTimerDigits('');
              setIsTimerModalOpen(true);
            }}
            title="Configurar cuenta"
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isDarkMode
              ? 'bg-[#1F2635] border-[#2C3343] hover:bg-[#252D3F] text-slate-300'
              : 'bg-[#EBF0F6] border-[#D6DBE5] hover:bg-[#E2E8F1] text-slate-600 shadow-[2px_2px_6px_rgba(163,177,198,0.4),-2px_-2px_6px_rgba(255,255,255,0.9)]'
              }`}
          >
            <Timer className="w-3.5 h-3.5 text-indigo-500" />
          </button>
        </div>
      </div>

      {/* ================= STOPWATCH INSTRUMENT ================= */}
      <div className={`flex flex-col items-center p-4 rounded-[2.5rem] border w-48 transition-all duration-300 ${isDarkMode
        ? 'bg-[#181D26] border-[#2D333F] shadow-[8px_8px_20px_rgba(0,0,0,0.5),-4px_-4px_15px_rgba(255,255,255,0.01)]'
        : 'bg-[#F2F4F8] border-[#E4E7ED] shadow-[6px_6px_16px_rgba(163,177,198,0.4),-6px_-6px_16px_rgba(255,255,255,0.9)]'
        }`}>
        {/* Title */}
        <span className="text-[9px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-3.5 select-none">
          CRONÓMETRO
        </span>

        {/* 3D Gauge Circle */}
        <div className="relative flex items-center justify-center select-none w-[124px] h-[124px]">
          {/* Subtle Outer Track Bezel */}
          <div className={`absolute inset-0 rounded-full border ${isDarkMode ? 'border-slate-800/40' : 'border-slate-200'
            }`} />

          {/* SVG representation with ticks and progress */}
          <svg className="w-[120px] h-[120px] absolute transform -rotate-90">
            {renderTicks()}

            {/* Background track circle */}
            <circle
              cx={center}
              cy={center}
              r={radiusProgress}
              fill="transparent"
              stroke={isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.5)'}
              strokeWidth="4"
            />

            {/* Glowing progress arc */}
            {stopwatchTime > 0 && (
              <motion.circle
                cx={center}
                cy={center}
                r={radiusProgress}
                fill="transparent"
                stroke="#6366F1"
                strokeWidth="4"
                strokeDasharray={strokeDash}
                animate={{ strokeDashoffset: stopwatchOffset }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                strokeLinecap="round"
                className="drop-shadow-[0_0_6px_rgba(99,102,241,0.65)]"
              />
            )}
          </svg>

          {/* Inner Elevated Disk (Neumorphic Plate) */}
          <button
            onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
            className={`w-[84px] h-[84px] rounded-full flex flex-col items-center justify-center border transition-all duration-300 z-10 active:scale-95 cursor-pointer ${isDarkMode
              ? 'bg-[#1B212D] border-[#2B3241] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-3px_-3px_10px_rgba(255,255,255,0.03)] hover:border-indigo-500/30'
              : 'bg-[#ECEFF4] border-[#E2E6EC] shadow-[4px_4px_10px_rgba(163,177,198,0.55),-4px_-4px_10px_rgba(255,255,255,0.95)] hover:border-indigo-400'
              }`}
          >
            {/* Digital Display */}
            <span className={`font-mono text-base font-black tracking-tight ${isStopwatchRunning ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white'
              }`}>
              {formatStopwatchDisplay(stopwatchTime)}
            </span>
            <span className="text-[7px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest mt-0.5">
              {isStopwatchRunning ? "LIVE" : "PAUSED"}
            </span>
          </button>
        </div>

        {/* Small spacer or stats bar to balance height with the timer */}
        <div className="mt-4 mb-2 flex flex-col items-center justify-center w-full px-2 py-[1.125rem] select-none text-center">
          <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            TIEMPO ACUMULADO
          </span>
          <span className="text-xs font-black text-slate-700 dark:text-indigo-300 font-mono mt-1">
            {Math.floor(stopwatchTime / 3600)}h {Math.floor((stopwatchTime % 3600) / 60)}m {stopwatchTime % 60}s
          </span>
        </div>

        {/* Neumorphic Control Buttons Row */}
        <div className="flex items-center justify-between w-full px-1.5 mt-3 select-none">
          {/* Button 1: Reset */}
          <button
            onClick={() => {
              setIsStopwatchRunning(false);
              setStopwatchTime(0);
            }}
            title="Restablecer"
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isDarkMode
              ? 'bg-[#1F2635] border-[#2C3343] hover:bg-[#252D3F] text-slate-300'
              : 'bg-[#EBF0F6] border-[#D6DBE5] hover:bg-[#E2E8F1] text-slate-600 shadow-[2px_2px_6px_rgba(163,177,198,0.4),-2px_-2px_6px_rgba(255,255,255,0.9)]'
              }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Button 2: Play/Pause (Larger Center Button) */}
          <button
            onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
            title={isStopwatchRunning ? "Pausar" : "Iniciar"}
            className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer ${isStopwatchRunning
              ? 'bg-[#EF4444] hover:bg-[#F87171] border-[#EF4444] text-white shadow-lg shadow-red-500/20'
              : 'bg-[#6366F1] hover:bg-[#4F46E5] border-[#6366F1] text-white shadow-lg shadow-indigo-500/25'
              }`}
          >
            {isStopwatchRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
          </button>

          {/* Button 3: Alarm / Indicator status */}
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center border select-none ${isStopwatchRunning ? 'animate-pulse' : ''
              } ${isDarkMode
                ? 'bg-[#11151D] border-[#1D222E] text-slate-400'
                : 'bg-[#EBF0F6] border-[#DDA0DD]/10 text-slate-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.03)]'
              }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* --- TIMER NUMPAD CONFIGURATION MODAL --- */}
      <AnimatePresence>
        {isTimerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTimerModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-sm rounded-3xl p-6 border shadow-2xl select-none ${isDarkMode
                ? 'bg-[#161B22] border-[#30363D] text-white'
                : 'bg-white border-slate-200 text-slate-800'
                }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-dashed border-slate-200 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-extrabold text-sm tracking-wider uppercase">Configurar Cuenta Regresiva</h3>
                </div>
                <button
                  onClick={() => setIsTimerModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Time Display with tactile style */}
              <div className={`p-4 rounded-2xl border text-center font-mono mb-5 ${isDarkMode ? 'bg-[#0D1117] border-[#30363D]' : 'bg-slate-50 border-slate-200'
                }`}>
                <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase block mb-1">
                  Tiempo Seleccionado
                </span>
                <div className="text-3xl font-black tracking-tight flex justify-center items-baseline gap-1">
                  <span className={hh > 0 ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600'}>
                    {String(hh).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-bold text-slate-400 mr-1">h</span>

                  <span className={(hh > 0 || mm > 0) ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600'}>
                    {String(mm).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-bold text-slate-400 mr-1">m</span>

                  <span className={(hh > 0 || mm > 0 || ss > 0) ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600'}>
                    {String(ss).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-bold text-slate-400">s</span>
                </div>
              </div>

              {/* Responsive Tactile Numpad Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumpadPress(String(num))}
                    className={`h-14 rounded-2xl font-mono text-xl font-black flex items-center justify-center transition-all cursor-pointer border ${isDarkMode
                      ? 'bg-[#0D1117] hover:bg-slate-850 border-[#30363D] active:border-indigo-500'
                      : 'bg-white hover:bg-slate-50 border-slate-200 active:border-indigo-500 shadow-sm'
                      }`}
                  >
                    {num}
                  </button>
                ))}

                {/* Double Zero Button */}
                <button
                  type="button"
                  onClick={() => handleNumpadPress('00')}
                  className={`h-14 rounded-2xl font-mono text-lg font-black flex items-center justify-center transition-all cursor-pointer border ${isDarkMode
                    ? 'bg-[#0D1117] hover:bg-slate-850 border-[#30363D]'
                    : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                    }`}
                >
                  00
                </button>

                {/* Zero Button */}
                <button
                  type="button"
                  onClick={() => handleNumpadPress('0')}
                  className={`h-14 rounded-2xl font-mono text-xl font-black flex items-center justify-center transition-all cursor-pointer border ${isDarkMode
                    ? 'bg-[#0D1117] hover:bg-slate-850 border-[#30363D]'
                    : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                    }`}
                >
                  0
                </button>

                {/* Clear / Backspace Button */}
                <button
                  type="button"
                  onClick={handleNumpadBackspace}
                  onDoubleClick={handleNumpadClear}
                  title="Borrar (Doble clic para vaciar todo)"
                  className={`h-14 rounded-2xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer border ${isDarkMode
                    ? 'font-sans bg-rose-950/10 hover:bg-rose-950/20 border-rose-900/30 text-rose-400'
                    : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600 shadow-sm'
                    }`}
                >
                  BORRAR
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsTimerModalOpen(false)}
                  className={`flex-1 h-12 rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer border ${isDarkMode
                    ? 'border-slate-800 hover:bg-slate-850 text-slate-400'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleStartTimer}
                  disabled={hh === 0 && mm === 0 && ss === 0}
                  className={`flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-transparent text-white shadow-lg ${(hh === 0 && mm === 0 && ss === 0)
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/10 hover:shadow-indigo-600/25 active:scale-98'
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
    </div>
  );
}
