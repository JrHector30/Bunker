const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
    const tables = await prisma.mesa.findMany({
        where: { estado: 'ocupada' },
        include: {
            comandas: {
                where: { estado: { notIn: ['cerrada', 'anulada'] } },
                include: {
                    detalles: {
                        include: {
                            plato: true
                        }
                    }
                }
            }
        }
    });

    console.log(JSON.stringify(tables, null, 2));
}

checkTables().catch(console.error).finally(() => prisma.$disconnect());
