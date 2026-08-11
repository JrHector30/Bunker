const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPostgres() {
  try {
    console.log('--- Probando Conexión a PostgreSQL (Supabase) ---');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Definida' : 'No definida');
    
    // Conectar y consultar
    await prisma.$connect();
    console.log('✅ Conexión establecida.');

    const platoCount = await prisma.plato.count();
    console.log(`Total platos (Plato): ${platoCount}`);

    const categoryCount = await prisma.categoria.count();
    console.log(`Total categorías (Categoria): ${categoryCount}`);

    const comandaCount = await prisma.comanda.count();
    console.log(`Total comandas (Comanda): ${comandaCount}`);

    const userCount = await prisma.user.count();
    console.log(`Total usuarios (User): ${userCount}`);

    if (platoCount > 0) {
      const samplePlatos = await prisma.plato.findMany({
        take: 3,
        include: { categoria: true }
      });
      console.log('Ejemplos de platos en la base de datos:');
      samplePlatos.forEach(p => {
        console.log(`- ID: ${p.id}, Nombre: ${p.nombre}, Precio: S/. ${p.precio}, Categoría: ${p.categoria?.nombre || 'Ninguna'}, Deleted: ${p.deleted}`);
      });
    } else {
      console.log('⚠️ ADVERTENCIA: La tabla de Platos está completamente vacía.');
    }

  } catch (err) {
    console.error('❌ Error de conexión o consulta en PostgreSQL:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testPostgres();
