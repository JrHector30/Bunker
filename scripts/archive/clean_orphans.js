const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanOrphans() {
    try {
        console.log("Searching for orphan orders...");

        // Find all active comandas
        const activeComandas = await prisma.comanda.findMany({
            where: {
                estado: {
                    notIn: ['cerrada', 'anulada']
                }
            },
            include: {
                mesa: true,
                detalles: true
            }
        });

        let orphanCount = 0;

        for (const comanda of activeComandas) {
            // If the table is libre, or there are 0 details, it's an orphan/ghost order
            if (comanda.mesa.estado === 'libre' || comanda.detalles.length === 0) {
                console.log(`Found orphan comanda ID ${comanda.id} on Mesa ${comanda.mesa.numero}. Status: ${comanda.estado}. Details: ${comanda.detalles.length}. Table Status: ${comanda.mesa.estado}. Fixing...`);

                // Update to anulada
                await prisma.comanda.update({
                    where: { id: comanda.id },
                    data: { estado: 'anulada' }
                });
                orphanCount++;
            }
        }

        console.log(`\nCleanup complete. Fixed ${orphanCount} orphan orders.`);
    } catch (e) {
        console.error("Error running cleanup", e);
    } finally {
        await prisma.$disconnect();
    }
}

cleanOrphans();
