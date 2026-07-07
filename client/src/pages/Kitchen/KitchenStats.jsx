import React, { useMemo } from 'react';
import { useKitchen } from './KitchenContext';
import { Clock, Flame, CheckCircle, Hourglass } from 'lucide-react';

/**
 * Top KDS dashboard statistics bar.
 * Calculates metrics from the existing local queue in memory (zero database overhead).
 */
export default function KitchenStats() {
    const { queue, timeOffsets, isDarkMode } = useKitchen();

    const stats = useMemo(() => {
        const pending = queue.filter(i => i.estado === 'pendiente' || i.estado === 'enviada');
        const processing = queue.filter(i => i.estado === 'preparando');
        const ready = queue.filter(i => i.estado === 'lista' || i.estado === 'listo');

        let totalWaitMs = 0;
        let count = 0;

        const activeItems = [...pending, ...processing];
        activeItems.forEach(item => {
            const start = new Date(item.fechaCreacion || item.comanda?.fecha || Date.now()).getTime();
            const offset = (timeOffsets[item.id] || 0) * 60000;
            const waitMs = (Date.now() - start) + offset;
            totalWaitMs += Math.max(0, waitMs);
            count++;
        });

        const avgWaitMin = count > 0 ? Math.floor((totalWaitMs / count) / 60000) : 0;

        return {
            pendingCount: pending.length,
            processingCount: processing.length,
            readyCount: ready.length,
            avgWait: avgWaitMin
        };
    }, [queue, timeOffsets]);

    const cardBg = isDarkMode ? 'bg-[#161B22] border-[#30363D]' : 'bg-white border-gray-200 shadow-sm';
    const textLabel = 'text-[9px] font-extrabold text-gray-600 dark:text-slate-500 uppercase tracking-widest';
    const textValue = 'text-lg md:text-xl font-black leading-none mt-1';

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 select-none">
            {/* PENDIENTES */}
            <div className={`flex items-center gap-3 p-3.5 rounded-2xl border ${cardBg}`}>
                <div className="p-2 rounded-xl bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-slate-400 shrink-0">
                    <Clock size={18} />
                </div>
                <div>
                    <div className={textLabel}>Pendientes</div>
                    <div className={textValue} style={{ color: 'var(--text-main)' }}>{stats.pendingCount}</div>
                </div>
            </div>

            {/* EN PROCESO */}
            <div className={`flex items-center gap-3 p-3.5 rounded-2xl border ${cardBg}`}>
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 shrink-0 animate-pulse">
                    <Flame size={18} />
                </div>
                <div>
                    <div className={textLabel}>En Proceso</div>
                    <div className={textValue} style={{ color: 'var(--text-main)' }}>{stats.processingCount}</div>
                </div>
            </div>

            {/* LISTOS */}
            <div className={`flex items-center gap-3 p-3.5 rounded-2xl border ${cardBg}`}>
                <div className="p-2 rounded-xl bg-[#10b981]/10 text-[#10b981] shrink-0">
                    <CheckCircle size={18} />
                </div>
                <div>
                    <div className={textLabel}>Listos</div>
                    <div className={textValue} style={{ color: 'var(--text-main)' }}>{stats.readyCount}</div>
                </div>
            </div>

            {/* ESPERA PROMEDIO */}
            <div className={`flex items-center gap-3 p-3.5 rounded-2xl border ${cardBg}`}>
                <div className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
                    <Hourglass size={18} />
                </div>
                <div>
                    <div className={textLabel}>Espera Promedio</div>
                    <div className={textValue} style={{ color: 'var(--text-main)' }}>
                        {stats.avgWait} <span className="text-xs font-bold text-gray-500 dark:text-slate-500">min</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
