const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function emulateReact() {
    const rawTables = await prisma.mesa.findMany({
        include: {
            comandas: {
                where: { estado: { notIn: ['cerrada', 'anulada'] } },
                include: {
                    usuario: true,
                    detalles: {
                        include: {
                            plato: {
                                include: {
                                    categoria: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    // emulate res.json() serialization
    const tables = JSON.parse(JSON.stringify(rawTables));

    const selectedTableId = tables.find(t => t.estado === 'ocupada')?.id;
    if (!selectedTableId) return console.log("No occupied table.");

    console.log("Selected table ID:", selectedTableId);

    // exact React logic
    const modalType = 'view';
    const selectedTable = tables.find(t => t.id === selectedTableId);
    if (!selectedTable || !selectedTable.comandas?.[0]) return console.log("Emulation: return [] (no comanda)");

    const rawDetalles = selectedTable.comandas[0].detalles || [];
    console.log("Raw detalles length:", rawDetalles.length);

    const grouped = [];
    rawDetalles.forEach(detail => {
        const cookName = detail.cocinero?.nombre || '';
        const key = modalType === 'pre-check'
            ? `${detail.platoId}-${detail.observacion || ''}`
            : `${detail.platoId}-${detail.estado}-${detail.observacion || ''}-${cookName}`;
        const existing = grouped.find(g => g.key === key);
        if (existing) {
            existing.cantidad += detail.cantidad;
            existing.detailIds.push(detail.id);
        } else {
            grouped.push({
                key, platoId: detail.platoId, nombre: detail.plato?.nombre || 'Desconocido',
                precio: detail.plato?.precio || 0, estado: detail.estado, cantidad: detail.cantidad,
                detailIds: [detail.id],
                observacion: detail.observacion,
                cocineroNombre: cookName,
                enviarCocina: detail.plato?.categoria?.enviarCocina ?? true // default to true
            });
        }
    });

    console.log("Grouped Items result:", JSON.stringify(grouped, null, 2));
}

emulateReact().catch(console.error).finally(() => prisma.$disconnect());
