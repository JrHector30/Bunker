const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanKitchenAndStats() {
    console.log("Iniciando eliminación total de platos en cocina (sin generar mermas ni estadísticas)...");

    // 1. Encontrar todos los detalles activos de cocina
    const activeDetails = await prisma.detalleComanda.findMany({
        where: {
            estado: { notIn: ['entregado'] },
            comanda: { estado: { notIn: ['cerrada', 'anulada'] } },
            plato: { categoria: { enviarCocina: true } }
        }
    });

    console.log(`Borrando ${activeDetails.length} platos en cocina...`);

    // 2. Eliminarlos físicamente (sin triggers de deducción)
    for (const d of activeDetails) {
        await prisma.detalleComanda.delete({ where: { id: d.id } });
    }

    // 3. Auto-liberar mesas que hayan quedado totalmente vacías de ítems (como bebidas)
    const mesasActivas = await prisma.mesa.findMany({
        where: { estado: 'ocupada' },
        include: { comandas: { where: { estado: { notIn: ['cerrada', 'anulada'] } }, include: { detalles: true } } }
    });

    let liberadas = 0;
    for (const m of mesasActivas) {
        if (m.comandas.length > 0) {
            const c = m.comandas[0];
            if (c.detalles.length === 0) {
                // Comanda vacía, anular y liberar mesa
                await prisma.comanda.update({ where: { id: c.id }, data: { estado: 'anulada' } });
                await prisma.mesa.update({ where: { id: m.id }, data: { estado: 'libre' } });
                liberadas++;
            }
        }
    }

    console.log(`Limpieza terminada. Mesas vaciadas y liberadas: ${liberadas}. Ya puedes hacer tus pruebas.`);
}

cleanKitchenAndStats().catch(console.error).finally(() => prisma.$disconnect());
