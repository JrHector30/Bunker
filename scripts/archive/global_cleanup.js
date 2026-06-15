const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function globalCleanup() {
    console.log("--- INICIANDO LIMPIEZA GLOBAL DE DB ---");

    // 1. Encontrar mesas LIBRES que tengan comandas en estado ACTIVO (enviada, etc)
    const mesasLibresConComandas = await prisma.mesa.findMany({
        where: { estado: 'libre' },
        include: { comandas: { where: { estado: { notIn: ['cerrada', 'anulada'] } } } }
    });

    let fixedTables = 0;
    for (const m of mesasLibresConComandas) {
        if (m.comandas.length > 0) {
            console.log(`Mesa ${m.numero} está LIBRE pero tiene ${m.comandas.length} comandas activas. Forzando a OCUPADA.`);
            await prisma.mesa.update({ where: { id: m.id }, data: { estado: 'ocupada' } });
            fixedTables++;
        }
    }

    // 2. Encontrar comandas ANULADAS o CERRADAS que tengan detalles que NO sean 'anulado'
    const comandasVencidas = await prisma.comanda.findMany({
        where: { estado: { in: ['cerrada', 'anulada'] } },
        include: { detalles: { where: { estado: { notIn: ['anulado', 'entregado'] } } } }
    });

    let fixedDetails = 0;
    for (const c of comandasVencidas) {
        if (c.detalles.length > 0) {
            console.log(`Comanda ${c.id} está ${c.estado} pero tiene ${c.detalles.length} detalles activos. Forzando a ANULADO.`);
            for (const d of c.detalles) {
                await prisma.detalleComanda.update({ where: { id: d.id }, data: { estado: 'anulado' } });
                fixedDetails++;
            }
        }
    }

    // 3. Verificar KDS - Detalles activos huérfanos sin comanda activa
    const kdsHuerfanos = await prisma.detalleComanda.findMany({
        where: { estado: { in: ['pendiente', 'preparando', 'listo'] }, comanda: { estado: 'anulada' } }
    });

    let kdsLimpios = 0;
    for (const d of kdsHuerfanos) {
        await prisma.detalleComanda.update({ where: { id: d.id }, data: { estado: 'anulado' } });
        kdsLimpios++;
    }

    console.log("--- RESUMEN ---");
    console.log(`Mesas desincronizadas reparadas: ${fixedTables}`);
    console.log(`Detalles dentro de comandas vencidas anulados: ${fixedDetails}`);
    console.log(`Platos fantasma en Cocina (KDS) limpiados: ${kdsLimpios}`);
    console.log("-----------------------------------------");
}

globalCleanup().catch(console.error).finally(() => prisma.$disconnect());
