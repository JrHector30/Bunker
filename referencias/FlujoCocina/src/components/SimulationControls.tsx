import React, { useState } from 'react';
import { 
  Plus, 
  Flame, 
  Clock, 
  RefreshCw, 
  PlusCircle, 
  Sparkles, 
  Volume2, 
  VolumeX,
  Play,
  Pause,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, OrderStatus } from '../types';

interface SimulationControlsProps {
  onAddOrder: (orderData: Partial<Order>) => void;
  onAdvanceAll: (mins: number) => void;
  onReset: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  isDarkMode: boolean;
  timeSpeed: number; // speed multiplier
  setTimeSpeed: (val: number) => void;
}

export default function SimulationControls({
  onAddOrder,
  onAdvanceAll,
  onReset,
  soundEnabled,
  setSoundEnabled,
  isDarkMode,
  timeSpeed,
  setTimeSpeed
}: SimulationControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('Lomo Saltado a la Leña');
  const [quantity, setQuantity] = useState(1);
  const [table, setTable] = useState('MESA 12');
  const [modifier, setModifier] = useState('');

  const dishPresets = [
    { name: 'Ceviche Carretillero', modifier: 'Picante medio' },
    { name: 'Lomo Saltado a la Leña', modifier: 'Bien cocido' },
    { name: 'Tallarín Saltado de Pollo', modifier: '' },
    { name: 'Causa Rellena de Cangrejo', modifier: 'Sin cebolla' },
    { name: 'Inka Cola 1.5L', modifier: 'Helada' },
  ];

  const tablePresets = ['MESA 1', 'MESA 3', 'MESA 6', 'MESA 12', 'MESA 15'];
  const modifierPresets = ['', 'Helada', 'Bien picante', 'Sin cebolla', 'Sin sal', 'Parte pecho'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddOrder({
      name: name.trim(),
      quantity,
      table,
      modifier: modifier.trim() || undefined,
    });

    // Reset simple values
    setModifier('');
  };

  const handleApplyPreset = (preset: typeof dishPresets[0]) => {
    setName(preset.name);
    if (preset.modifier) {
      setModifier(preset.modifier);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 select-none font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className={`w-[360px] md:w-[460px] max-h-[80vh] overflow-y-auto rounded-3xl p-6 border shadow-2xl transition-colors duration-300 mb-3 ${
              isDarkMode 
                ? 'bg-[#0D1117] border-[#30363D] text-white shadow-black/80' 
                : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-base tracking-tight">Panel de Simulación Cocina</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Time Accelerators */}
            <div className="mt-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Envejecer Pedidos (Alertas de Tiempo)</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onAdvanceAll(5)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/10 transition-all cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                  <span>Añadir +5 min</span>
                </button>
                <button
                  onClick={() => onAdvanceAll(10)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/10 transition-all cursor-pointer"
                >
                  <Flame className="w-4 h-4 animate-bounce" />
                  <span>Añadir +10 min</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed text-center">
                * Presiona para sumar minutos a todos los platos pendientes/en proceso y ver las alertas: 
                <span className="text-amber-500 font-semibold"> Amarillo (&gt;10 min)</span> y 
                <span className="text-red-500 font-semibold"> Rojo + Borde Pulsante (&gt;20 min)</span>.
              </p>
            </div>

            {/* Simulation controls */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Velocidad del Tiempo Real</h4>
              <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900">
                <div className="flex gap-1.5">
                  {[1, 5, 20].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setTimeSpeed(speed)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        timeSpeed === speed
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {speed === 1 ? 'Real' : `${speed}x`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">Ticking:</span>
                  <span className={`text-xs font-bold ${timeSpeed > 1 ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400'}`}>
                    {timeSpeed === 1 ? 'Normal' : 'Acelerado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Generator */}
            <form onSubmit={handleSubmit} className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Crear Nuevo Pedido</h4>
                <span className="text-[10px] text-indigo-500 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Auto-Pendiente
                </span>
              </div>

              {/* Presets Grid */}
              <div className="flex flex-wrap gap-1.5">
                {dishPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="text-[10px] px-2 py-1 rounded-lg border border-slate-100 hover:border-indigo-500/30 dark:border-slate-900 hover:dark:border-indigo-500/30 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-500/5 hover:dark:bg-indigo-500/5 transition-colors cursor-pointer truncate max-w-[140px]"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              {/* Form Input Fields */}
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre Plato</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:border-indigo-500"
                      placeholder="Nombre del Plato..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cant.</label>
                    <select
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full px-2 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:border-indigo-500 text-center"
                    >
                      {[1, 2, 3, 4, 5].map((q) => (
                        <option key={q} value={q} className="dark:bg-[#0D1117]">{q}x</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mesa</label>
                    <select
                      value={table}
                      onChange={(e) => setTable(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:border-indigo-500"
                    >
                      {tablePresets.map((t) => (
                        <option key={t} value={t} className="dark:bg-[#0D1117]">{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Especificación (Nota)</label>
                    <input
                      type="text"
                      value={modifier}
                      onChange={(e) => setModifier(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:border-indigo-500"
                      placeholder="Ej. Sin cebolla..."
                      list="modifiers"
                    />
                    <datalist id="modifiers">
                      {modifierPresets.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Plato a Pendientes</span>
              </button>
            </form>

            {/* Quick Reset Tools */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-between gap-3">
              <button
                onClick={onReset}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reiniciar Cocina Demo</span>
              </button>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
                title={soundEnabled ? "Desactivar Sonido Alertas" : "Activar Sonido Alertas"}
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span className="text-[11px] font-bold">Sonido On</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span className="text-[11px] font-bold">Silenciado</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Toggle Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 px-6 rounded-full bg-slate-900 hover:bg-slate-850 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-xl flex items-center gap-2 font-bold text-xs cursor-pointer border border-slate-800 dark:border-slate-200 transition-colors"
      >
        <Sliders className="w-4 h-4 text-indigo-500 animate-spin-slow" />
        <span>SIMULADOR DE TIEMPOS</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
      </motion.button>
    </div>
  );
}
