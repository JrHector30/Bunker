const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateHistoryRoute(page, limit) {
  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    console.log(`--- Simulación de ruta /api/cashier/history para página ${page} (limit: ${limit}, skip: ${skip}) ---`);

    const [totalCount, arqueos] = await Promise.all([
      prisma.arqueo.count(),
      prisma.arqueo.findMany({
        orderBy: { id: 'desc' },
        skip,
        take
      })
    ]);

    console.log(`Total Arqueos: ${totalCount}`);
    console.log(`Arqueos obtenidos en esta página: ${arqueos.length}`);

    const historyData = await Promise.all(arqueos.map(async (arq) => {
      const startDate = arq.fechaInicio;
      const endDate = arq.estado === 'abierto' ? new Date() : arq.fechaFin;
      const isAbierto = arq.estado === 'abierto';

      const [comandasCerradas, movements, pendingOrders] = await Promise.all([
        prisma.comanda.findMany({
          where: {
            estado: 'cerrada',
            fecha: { gte: startDate, lte: endDate }
          },
          select: {
            metodoPago: true,
            propina: true,
            detalles: {
              select: {
                cantidad: true,
                plato: { select: { precio: true } }
              }
            }
          }
        }),
        prisma.movimientoCaja.findMany({
          where: { arqueoId: arq.id }
        }),
        isAbierto
          ? prisma.comanda.findMany({
              where: { estado: { notIn: ['cerrada', 'anulada'] } },
              include: { detalles: { where: { estado: { not: 'anulado' } }, include: { plato: true } } }
            })
          : Promise.resolve([])
      ]);

      const parsePaymentMethod = (metodoPago) => {
        const m = (metodoPago || 'efectivo').toLowerCase();
        if (m.includes('izipay') || m.includes('izi')) return 'izipay';
        if (m.includes('niubiz')) return 'niubiz';
        if (m.includes('plin')) return 'plin';
        if (m.includes('yape')) return 'yape';
        if (m.includes('tarjeta')) return 'tarjeta';
        return 'efectivo';
      };

      const manualIngresos = movements.filter(m => m.tipo === 'INGRESO' && (m.metodoPago === 'efectivo' || !m.metodoPago)).reduce((sum, m) => sum + m.monto, 0);
      const manualEgresos = movements.filter(m => m.tipo === 'EGRESO' && (m.metodoPago === 'efectivo' || !m.metodoPago)).reduce((sum, m) => sum + m.monto, 0);

      const manualIngresosYape = movements.filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'yape').reduce((sum, m) => sum + m.monto, 0);
      const manualEgresosYape = movements.filter(m => m.tipo === 'EGRESO' && m.metodoPago === 'yape').reduce((sum, m) => sum + m.monto, 0);

      const manualIngresosPlin = movements.filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'plin').reduce((sum, m) => sum + m.monto, 0);
      const manualEgresosPlin = movements.filter(m => m.tipo === 'EGRESO' && m.metodoPago === 'plin').reduce((sum, m) => sum + m.monto, 0);

      const inicio = arq.montoInicial;
      const egresos = movements.filter(m => m.tipo === 'EGRESO').reduce((sum, m) => sum + m.monto, 0);

      let totalBruto = 0;
      let totalPropinas = 0;
      let incomeDetails = {
        efectivo: 0,
        tarjeta: 0,
        yape: 0,
        izipay: 0,
        plin: 0,
        niubiz: 0,
        manual: manualIngresos
      };

      comandasCerradas.forEach(order => {
        const subtotal = order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
        totalBruto += subtotal;
        totalPropinas += order.propina || 0;

        const cat = parsePaymentMethod(order.metodoPago);
        if (incomeDetails[cat] !== undefined) {
          incomeDetails[cat] += subtotal;
        } else {
          incomeDetails.efectivo += subtotal;
        }
      });

      incomeDetails.yape = Math.max(0, incomeDetails.yape + manualIngresosYape - manualEgresosYape);
      incomeDetails.plin = Math.max(0, incomeDetails.plin + manualIngresosPlin - manualEgresosPlin);

      const totalPendiente = pendingOrders.reduce((acc, order) => {
        const hasKitchenItems = order.detalles.some(d => 
          ['listo', 'lista', 'entregado', 'entregada'].includes(d.estado.toLowerCase())
        );
        if (hasKitchenItems) {
          return acc + order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
        }
        return acc;
      }, 0);

      return {
        id: arq.id,
        fechaInicio: arq.fechaInicio,
        fechaFin: arq.fechaFin,
        estado: arq.estado,
        inicio,
        egresos,
        ingresos: incomeDetails,
        totalCaja: arq.montoInicial + manualIngresos + incomeDetails.efectivo - manualEgresos,
        totalBruto,
        totalPropinas,
        totalPendiente
      };
    }));

    console.log('✅ Simulación completada con éxito.');
    console.log(`Resultado final meta: page: ${page}, totalPages: ${Math.ceil(totalCount / take)}`);
    console.log(`Primer elemento en esta página: ID ${historyData[0]?.id || 'N/A'}`);
  } catch (error) {
    console.error('❌ Error en simulación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateHistoryRoute(4, 5);
