const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const xs = [15, 32, 50, 68, 85];
    
    // Fila 1 (Mesas 1-5)
    for (let i = 1; i <= 5; i++) {
        await prisma.mesa.updateMany({
            where: { numero: i.toString() },
            data: { posX: xs[i-1], posY: 25 }
        });
    }

    // Fila 2 (Mesas 6-10)
    for (let i = 6; i <= 10; i++) {
        await prisma.mesa.updateMany({
            where: { numero: i.toString() },
            data: { posX: xs[i-6], posY: 50 }
        });
    }

    // Fila 3 (Mesas 11-15)
    for (let i = 11; i <= 15; i++) {
        await prisma.mesa.updateMany({
            where: { numero: i.toString() },
            data: { posX: xs[i-11], posY: 75 }
        });
    }

    console.log('Mesas actualizadas simétricamente.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
