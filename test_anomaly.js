const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAnomalies() {
    const activeComandas = await prisma.comanda.findMany({
        where: { estado: { notIn: ['cerrada', 'anulada'] } },
        include: { mesa: true, detalles: true }
    });

    for (const c of activeComandas) {
        if (c.mesa.estado === 'libre') {
            console.log(`ANOMALY: Comanda ${c.id} is ${c.estado}, but Mesa ${c.mesa.numero} is 'libre'! Details count: ${c.detalles.length}`);
        }
    }
}

checkAnomalies().catch(console.error).finally(() => prisma.$disconnect());
