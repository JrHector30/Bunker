const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAndRemoveGhostOrder() {
    try {
        console.log("Looking for active kitchen details linked to inactive comandas or specific dish...");

        // Find records active in kitchen
        const activeDetails = await prisma.detalleComanda.findMany({
            where: {
                estado: {
                    in: ['pendiente', 'preparando', 'listo']
                }
            },
            include: {
                plato: true,
                comanda: {
                    include: { mesa: true }
                }
            }
        });

        console.log(`Found ${activeDetails.length} active details in kitchen.`);

        let deletedCount = 0;

        for (const detail of activeDetails) {
            console.log(`- Detail ID: ${detail.id} | Plato: ${detail.plato.nombre} | Comanda Status: ${detail.comanda.estado} | Mesa Status: ${detail.comanda.mesa.estado}`);

            // Delete if it's the specific dish or if the parent comanda isn't active
            const isOrphan = detail.comanda.estado === 'anulada' || detail.comanda.estado === 'cerrada' || detail.comanda.mesa.estado === 'libre';
            const isTargetDish = detail.plato.nombre.toUpperCase().includes('ARROZ CON MARISCOS');

            if (isOrphan || isTargetDish) {
                console.log(`  -> Deleting detail ${detail.id} (${detail.plato.nombre})`);
                await prisma.detalleComanda.delete({
                    where: { id: detail.id }
                });
                deletedCount++;
            }
        }

        console.log(`\nProcess finished. Deleted ${deletedCount} ghost records.`);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

findAndRemoveGhostOrder();
