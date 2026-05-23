const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkComandas() {
    try {
        const comandas = await prisma.comanda.findMany({
            where: { mesaId: 8 },
            include: { detalles: true }
        });
        console.log(JSON.stringify(comandas, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkComandas();
