const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runCleanup() {
    console.log("Iniciando limpieza de emergencia para solucionar problemas de Cierre de Caja...");

    try {
        // 1. Limpiar Comanda 48
        const comanda48 = await prisma.comanda.findUnique({ where: { id: 48 }, include: { mesa: true } });

        if (comanda48 && comanda48.estado !== 'anulada' && comanda48.estado !== 'cerrada') {
            await prisma.comanda.update({
                where: { id: 48 },
                data: { estado: 'anulada' }
            });
            console.log("-> Comanda ID 48 anulada.");

            // Si la mesa de esta comanda quedara libre, la liberamos
            await prisma.mesa.update({
                where: { id: comanda48.mesaId },
                data: { estado: 'libre' }
            });
            console.log(`-> Mesa asociada a Comanda 48 (Mesa ${comanda48.mesa.numero}) liberada.`);
        } else {
            console.log("-> Comanda ID 48 ya estaba anulada, cerrada o no existe.");
        }

        // 2. Liberar Mesas 15 y 8
        const targetTables = ['15', '8'];

        for (const numero of targetTables) {
            const table = await prisma.mesa.findUnique({ where: { numero } });

            if (table) {
                // Anular todas las comandas activas de la mesa
                const activeOrders = await prisma.comanda.findMany({
                    where: { mesaId: table.id, estado: { notIn: ['cerrada', 'anulada'] } }
                });

                for (const order of activeOrders) {
                    await prisma.comanda.update({
                        where: { id: order.id },
                        data: { estado: 'anulada' }
                    });
                    console.log(`  -> Comanda Fantasma/Huérfana ID ${order.id} anulada en la Mesa ${numero}.`);
                }

                // Liberar la mesa
                await prisma.mesa.update({
                    where: { id: table.id },
                    data: { estado: 'libre' }
                });
                console.log(`-> Mesa ${numero} liberada forzosamente.`);
            } else {
                console.log(`-> Mesa ${numero} no encontrada en la base de datos.`);
            }
        }

        console.log("¡Limpieza de emergencia completada con éxito!");

    } catch (e) {
        console.error("Error durante la limpieza de emergencia:", e);
    } finally {
        await prisma.$disconnect();
    }
}

runCleanup();
