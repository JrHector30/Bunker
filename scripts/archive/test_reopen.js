const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addOrderToTableOne() {
    try {
        console.log("Checking table 1 status...");
        const table = await prisma.mesa.findUnique({ where: { id: 1 }, include: { comandas: true } });
        console.log("Table 1:", table.estado, "Total comandas:", table.comandas.length);

        console.log("Creating new active order...");
        let order = await prisma.comanda.findFirst({
            where: { mesaId: 1, estado: { notIn: ['cerrada', 'anulada'] } }
        });

        if (!order) {
            order = await prisma.comanda.create({
                data: {
                    mesaId: 1,
                    usuarioId: 1,
                    estado: 'enviada',
                    detalles: {
                        create: [
                            { platoId: 1, cantidad: 2, estado: 'pendiente' }
                        ]
                    }
                },
                include: { detalles: true }
            });
            await prisma.mesa.update({ where: { id: 1 }, data: { estado: 'ocupada' } });
            console.log("New order created:", order.id);
        } else {
            console.log("Found existing active order:", order.id);
        }

        console.log("Fetching GET /api/tables logic...");
        const tables = await prisma.mesa.findMany({
            where: { id: 1 },
            include: {
                comandas: {
                    where: { estado: { notIn: ['cerrada', 'anulada'] } },
                    include: {
                        detalles: { include: { plato: true } }
                    }
                }
            }
        });

        console.log("Active comandas on table 1:");
        tables[0].comandas.forEach(c => {
            console.log(`- Comanda ID: ${c.id}, Estado: ${c.estado}, Detalles count: ${c.detalles.length}`);
        });

    } catch (e) { console.error(e); }
}

addOrderToTableOne().finally(() => prisma.$disconnect());
