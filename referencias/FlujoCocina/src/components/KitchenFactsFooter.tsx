import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw } from 'lucide-react';

interface KitchenFactsFooterProps {
  isDarkMode: boolean;
}

const KITCHEN_FACTS = [
  "La sal debe añadirse durante toda la cocción, no solo al final.",
  "Los ingredientes a temperatura ambiente se mezclan más fácilmente que los fríos.",
  "Los cuchillos afilados son más seguros que los desafilados para cortes precisos.",
  "Dejar reposar la carne después de cocinar redistribuye los jugos para un mejor sabor.",
  "El aceite de oliva de alta calidad debe añadirse después de cocinar, no durante."
];

export default function KitchenFactsFooter({ isDarkMode }: KitchenFactsFooterProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Automatically cycle facts randomly every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleRandomize();
    }, 10000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const handleRandomize = () => {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * KITCHEN_FACTS.length);
    } while (nextIndex === currentIndex && KITCHEN_FACTS.length > 1);
    setCurrentIndex(nextIndex);
  };

  return (
    <footer className={`mt-auto pt-8 border-t select-none transition-colors duration-300 ${
      isDarkMode ? 'border-slate-800/80' : 'border-slate-150'
    }`}>
      <div className={`flex flex-col md:flex-row items-center justify-between gap-4 p-4 md:px-6 rounded-2xl border ${
        isDarkMode 
          ? 'bg-[#161B22] border-[#30363D] text-slate-400' 
          : 'bg-white border-slate-200/60 text-slate-500 shadow-sm'
      }`}>
        {/* Left branding info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/5 text-indigo-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[10px] font-black tracking-widest text-indigo-500 uppercase">
              Búnker Kitchen Console
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Gestión operativa optimizada para tablets y pantallas táctiles.
            </span>
          </div>
        </div>

        {/* Center: Interactive Rotating Kitchen Tip */}
        <div className="flex-1 max-w-xl mx-auto flex items-center justify-center gap-3 py-1 px-4 rounded-xl">
          <div className="text-center md:text-left">
            <span className="block text-[9px] font-black tracking-widest text-indigo-500 uppercase text-center md:text-left mb-0.5">
              💡 ¿Sabías que? • Tip del Chef
            </span>
            <div className="h-8 flex items-center justify-center md:justify-start overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentIndex}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 leading-snug tracking-tight"
                >
                  {KITCHEN_FACTS[currentIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
          
          {/* Manual shuffle button */}
          <button
            onClick={handleRandomize}
            title="Siguiente dato interesante"
            className={`p-1.5 rounded-lg border hover:scale-105 active:scale-95 transition-all cursor-pointer ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30' 
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-500/30'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right copyright / status marker */}
        <div className="text-right hidden xl:block select-none">
          <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-wider">
            SISTEMA ACTIVO
          </span>
          <span className="text-[9px] text-emerald-500 dark:text-emerald-400 font-extrabold tracking-widest flex items-center gap-1.5 justify-end">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            ONLINE
          </span>
        </div>
      </div>
    </footer>
  );
}
