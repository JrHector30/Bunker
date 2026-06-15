const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function healAnomalies() {
    console.log("Detectando mesas con anomalías (Mesa Libre -> Comanda Enviada)...");
    const activeComandas = await prisma.comanda.findMany({
        where: { estado: { notIn: ['cerrada', 'anulada'] } },
        include: { mesa: true, detalles: true }
    });

    let count = 0;
    for (const c of activeComandas) {
        if (c.mesa.estado === 'libre') {
            await prisma.mesa.update({
                where: { id: c.mesaId },
                data: { estado: 'ocupada' }
            });
            console.log(`Curada Mesa ${c.mesa.numero}. Estado devuelto a 'ocupada'.`);
            count++;
        }
    }
    console.log(`Total anomalías corregidas: ${count}. Actualiza la web.`);
}

healAnomalies().catch(console.error).finally(() => prisma.$disconnect());
