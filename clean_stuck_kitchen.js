const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const queue = await prisma.detalleComanda.findMany({
        where: {
            estado: { not: 'entregado' },
            comanda: { estado: { notIn: ['cerrada', 'anulada'] } },
            plato: { categoria: { enviarCocina: true } }
        }
    });

    console.log(`Borrando ${queue.length} detalles de cocina atascados...`);

    for (const q of queue) {
        await prisma.detalleComanda.delete({ where: { id: q.id } });
        console.log(`Detalle ID: ${q.id} eliminado.`);

        // Verifica si la comanda queda vacía
        const restantes = await prisma.detalleComanda.count({ where: { comandaId: q.comandaId } });
        if (restantes === 0) {
            const c = await prisma.comanda.findUnique({ where: { id: q.comandaId } });
            if (c) {
                await prisma.comanda.update({ where: { id: c.id }, data: { estado: 'anulada' } });
                await prisma.mesa.update({ where: { id: c.mesaId }, data: { estado: 'libre' } });
                console.log(`Comanda ${c.id} vacía -> Anulada. Mesa liberada.`);
            }
        }
    }

    console.log("Limpieza completada.");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
