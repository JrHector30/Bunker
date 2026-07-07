import { useMemo } from 'react';

/**
 * Custom hook to aggregate pending dishes in real-time.
 * Groups by dish name and calculates:
 * - Accumulated quantity (total)
 * - List of unique tables involved
 * - Average waiting time in minutes
 * 
 * Generates alerts only for dishes with 2 or more items pending.
 */
export default function useKitchenBatch(pendingItems, timeOffsets = {}) {
    return useMemo(() => {
        const groups = {};

        pendingItems.forEach((item) => {
            const name = item.plato?.nombre?.trim();
            if (!name) return;

            if (!groups[name]) {
                groups[name] = {
                    name,
                    total: 0,
                    tables: [],
                    totalWaitMs: 0,
                    itemCount: 0
                };
            }

            const qty = item.cantidad || 1;
            groups[name].total += qty;

            // Extract mesa number
            let tableNum = item.comanda?.mesa?.numero ? String(item.comanda.mesa.numero) : '';
            if (item.comanda?.mesa?.mesasHijas && item.comanda.mesa.mesasHijas.length > 0) {
                const hijas = item.comanda.mesa.mesasHijas.map(h => h.numero).join('-');
                tableNum = `${tableNum}-${hijas}`;
            }

            if (tableNum && !groups[name].tables.includes(tableNum)) {
                groups[name].tables.push(tableNum);
            }

            // Waiting time calculation
            const startTime = new Date(item.fechaCreacion || item.comanda?.fecha || Date.now()).getTime();
            const offset = (timeOffsets[item.id] || 0) * 60000;
            const waitMs = (Date.now() - startTime) + offset;
            
            groups[name].totalWaitMs += waitMs;
            groups[name].itemCount += 1;
        });

        // Filter groups with 2 or more items
        return Object.values(groups)
            .filter((g) => g.total >= 2)
            .map((g) => {
                const avgWaitMin = Math.max(0, Math.floor((g.totalWaitMs / g.itemCount) / 60000));
                
                // Sort tables
                const formattedTables = g.tables
                    .map(t => t.toUpperCase())
                    .sort((a, b) => {
                        const numA = parseInt(a.replace(/\D/g, ''), 10);
                        const numB = parseInt(b.replace(/\D/g, ''), 10);
                        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                        return a.localeCompare(b);
                    });

                return {
                    name: g.name,
                    total: g.total,
                    tables: formattedTables,
                    avgWait: avgWaitMin,
                    key: `${g.name}_${g.total}` // resets dismissed status if total volume changes
                };
            });
    }, [pendingItems, timeOffsets]);
}
