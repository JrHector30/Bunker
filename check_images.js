const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const platos = await prisma.plato.findMany({
    select: { nombre: true, imagen: true },
    take: 10
  });

  console.log("Muestreo de imágenes de Platos:");
  platos.forEach(p => {
      console.log(`- ${p.nombre}: ${p.imagen}`);
  });
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
