const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando borrado físico de mesas 100 y 101 ---');
  const mesasABorrar = ['100', '101'];

  for (const num of mesasABorrar) {
    const mesa = await prisma.mesa.findUnique({ where: { numero: num } });
    if (!mesa) {
      console.log(`Mesa ${num} no encontrada en la base de datos, saltando...`);
      continue;
    }

    console.log(`Eliminando relaciones para Mesa ${num} (ID: ${mesa.id})...`);
    
    // Buscar comandas asociadas a la mesa
    const comandas = await prisma.comanda.findMany({ where: { mesaId: mesa.id } });
    for (const comanda of comandas) {
      // Eliminar detalles de la comanda
      await prisma.detalleComanda.deleteMany({ where: { comandaId: comanda.id } });
      console.log(`- Detalles de comanda ${comanda.id} eliminados.`);
      
      // Eliminar pedidos cancelados si los hubiera
      await prisma.pedidoCancelado.deleteMany({ where: { comandaId: comanda.id } });
      console.log(`- Pedidos cancelados de comanda ${comanda.id} eliminados.`);

      // Eliminar la comanda en sí
      await prisma.comanda.delete({ where: { id: comanda.id } });
      console.log(`- Comanda ${comanda.id} eliminada.`);
    }

    // Finalmente eliminar la mesa
    await prisma.mesa.delete({ where: { id: mesa.id } });
    console.log(`✅ Mesa ${num} eliminada completamente.`);
  }

  console.log('--- Proceso terminado ---');
}

main()
  .catch(e => {
    console.error('Error durante la eliminación:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
