import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { useKitchen } from './KitchenContext';
import useKitchenBatch from './hooks/useKitchenBatch';

/**
 * Floating alerts Stack for batch cooking recommendations.
 * Recommends preparing identical dishes simultaneously, calculating mesa locations and average wait times.
 */
export default function BatchSuggestion() {
    const { queue, timeOffsets, dismissedAlertKeys, setDismissedAlertKeys } = useKitchen();

    // Local filter for pending queue items
    const pendingItems = React.useMemo(() => {
        return queue.filter(i => i.estado === 'pendiente' || i.estado === 'enviada');
    }, [queue]);

    // Grouping calculations
    const suggestions = useKitchenBatch(pendingItems, timeOffsets);

    // Active alert filtered list
    const activeSuggestions = React.useMemo(() => {
        return suggestions.filter(alert => !dismissedAlertKeys.includes(alert.key));
    }, [suggestions, dismissedAlertKeys]);

    const handleDismiss = (key) => {
        setDismissedAlertKeys(prev => [...prev, key]);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none select-none">
            <AnimatePresence>
                {activeSuggestions.map((alert) => (
                    <motion.div
                        key={alert.key}
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        className="pointer-events-auto w-full bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3 border border-amber-400/20"
                    >
                        <div className="p-2 rounded-xl bg-white/20 shrink-0 mt-0.5 animate-pulse">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[10px] font-black tracking-wider uppercase opacity-90">
                                Sugerencia de Lote
                            </h4>
                            
                            <p className="text-xs font-black mt-1 leading-snug">
                                🍽️ {alert.total} "{alert.name}" por preparar.
                            </p>

                            <div className="mt-2 text-[9.5px] opacity-95 font-bold flex flex-col gap-0.5">
                                <div>
                                    <span className="opacity-75 uppercase">Mesas: </span>
                                    <span className="font-extrabold tracking-wide">
                                        {alert.tables.join(' • ')}
                                    </span>
                                </div>
                                <div>
                                    <span className="opacity-75 uppercase">Espera promedio: </span>
                                    <span className="font-extrabold">{alert.avgWait} minutos</span>
                                </div>
                            </div>

                            <p className="text-[8.5px] opacity-80 mt-2 italic leading-tight">
                                Maximiza tiempos: prepara por lote usando una sola mezcla para pedidos acumulados.
                            </p>
                        </div>

                        <button
                            onClick={() => handleDismiss(alert.key)}
                            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer self-start"
                            title="Cerrar aviso"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
