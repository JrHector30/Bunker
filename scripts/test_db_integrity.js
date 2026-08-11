const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkIntegrity() {
  try {
    console.log('--- Comprobando Integridad de la Base de Datos ---');
    const details = await prisma.detalleComanda.findMany({
      include: {
        plato: true
      }
    });

    const orphans = details.filter(d => !d.plato);
    console.log(`Total de detalles de comanda: ${details.length}`);
    console.log(`Detalles huérfanos (sin plato): ${orphans.length}`);

    if (orphans.length > 0) {
      console.log('Ejemplos de detalles huérfanos:');
      orphans.slice(0, 10).forEach(o => {
        console.log(`ID Detalle: ${o.id}, Comanda ID: ${o.comandaId}, Plato ID Buscado: ${o.platoId}`);
      });
    }

    // Comprobar si hay comandas con platos nulos cerradas
    const comandas = await prisma.comanda.findMany({
      include: {
        detalles: {
          include: {
            plato: true
          }
        }
      }
    });

    const corruptComandas = comandas.filter(c => c.detalles.some(d => !d.plato));
    console.log(`Total comandas: ${comandas.length}`);
    console.log(`Comandas corruptas (detalles sin plato): ${corruptComandas.length}`);

    // Consultar el historial de arqueos y simular la consulta de la API
    const arqueos = await prisma.arqueo.findMany({
      orderBy: { id: 'desc' }
    });

    console.log(`Total arqueos registrados: ${arqueos.length}`);
    
    // Simular el cálculo de arqueos y atrapar errores específicos de plato null
    for (let i = 0; i < arqueos.length; i++) {
      const arq = arqueos[i];
      const startDate = arq.fechaInicio;
      const endDate = arq.estado === 'abierto' ? new Date() : arq.fechaFin;

      try {
        const comandasCerradas = await prisma.comanda.findMany({
          where: {
            estado: 'cerrada',
            fecha: { gte: startDate, lte: endDate }
          },
          include: {
            detalles: {
              include: {
                plato: true
              }
            }
          }
        });

        comandasCerradas.forEach(order => {
          order.detalles.forEach(d => {
            if (!d.plato) {
              throw new Error(`Detalle id ${d.id} en comanda ${order.id} tiene plato null! Plato ID buscado: ${d.platoId}`);
            }
          });
        });
      } catch (err) {
        console.error(`❌ Error en Arqueo ID ${arq.id} (Rango: ${startDate.toISOString()} - ${endDate ? endDate.toISOString() : 'AHORA'}):`, err.message);
      }
    }

  } catch (err) {
    console.error('Error durante el chequeo:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkIntegrity();
