import db from '../database';
import { QueueStatus } from '../tables';
import { createOperation } from '../operations/createOperation';
import { getCurrentDate } from '../offlineUtils';

export const offlineCheckoutService = {
  /**
   * Registra el pago y cierra una mesa de forma transaccional localmente.
   * 
   * @param {number|string} mesaId ID de la mesa a liquidar
   * @param {Object} paymentDetails Detalles del pago y comprobante
   * @returns {Promise<Object>} La comanda cerrada
   */
  async checkout(mesaId, paymentDetails) {
    if (!mesaId) throw new Error('mesaId es obligatorio para el checkout.');
    if (!paymentDetails) throw new Error('Los detalles de pago son obligatorios.');

    const timestamp = getCurrentDate();
    let closedOrder = null;

    await db.transaction('rw', [db.orders, db.table('tables'), db.arqueos, db.syncQueue], async () => {
      // 1. Verificar si hay un arqueo abierto
      const openArqueos = await db.arqueos
        .where('estado')
        .equals('abierto')
        .toArray();
      if (openArqueos.length === 0) {
        throw new Error('No es posible registrar el pago. La caja está cerrada.');
      }
      const activeArqueo = openArqueos[0];

      // 2. Buscar la comanda activa de la mesa (soporta mesaId numérico y UUID string)
      const mesaIdStr = String(mesaId);
      const activeOrders = await db.orders
        .filter(o => {
          const oMesaId = String(o.mesaId || o.tableId || '');
          if (oMesaId !== mesaIdStr) return false;
          const est = (o.estado || o.status || '').toLowerCase();
          return est !== 'cerrada' && est !== 'anulada';
        })
        .toArray();

      if (activeOrders.length === 0) {
        throw new Error(`No se encontró ninguna comanda activa para la mesa ${mesaId}`);
      }

      const order = activeOrders[0];

      // 3. Validación de integridad antes del cobro
      const orderItems = await db.orderItems
        .filter(item => {
          const parentId = String(item.comandaId || item.orderId || '');
          return parentId === order.id;
        })
        .toArray();

      if (orderItems.length === 0) {
        throw new Error('OFFLINE_CHECKOUT_INVALID_ACCOUNT: La comanda no tiene detalles locales válidos.');
      }

      // 3. Estructurar la actualización de la comanda con los datos del cobro
      const checkoutUpdates = {
        estado: 'cerrada',
        status: 'cerrada', // Soportar propiedad duplicada por compatibilidad de esquemas
        metodoPago: paymentDetails.paymentMethod || 'efectivo',
        tipoDocumento: paymentDetails.docType || 'sin_comprobante',
        montoRecibido: Number(paymentDetails.totalReceived || 0),
        propina: Number(paymentDetails.tip || 0),
        tipoComprobante: paymentDetails.tipoComprobante || 'ticket',
        documentoCliente: paymentDetails.documentoCliente || null,
        razonSocial: paymentDetails.razonSocial || null,
        direccionFiscal: paymentDetails.direccionFiscal || null,
        fechaCierre: timestamp,
        updatedAt: timestamp
      };

      // 4. Actualizar comanda local
      await db.orders.update(order.id, checkoutUpdates);

      // 5. Liberar la mesa localmente (usar String para evitar NaN con UUIDs)
      await db.table('tables').update(String(mesaId), {
        estado: 'libre',
        updatedAt: timestamp
      });

      // Buscar si existe la operación CREATE_ORDER pendiente en cola
      const pendingCreate = await db.syncQueue
        .where('entityId')
        .equals(order.id)
        .and(op => op.operation === 'CREATE_ORDER')
        .toArray();
      const dependsOnOperationId = pendingCreate.length > 0 ? pendingCreate[0].operationId : null;

      // 6. Registrar la operación PAY_ORDER
      const op = createOperation({
        entity: 'ORDER',
        entityId: order.id,
        operation: 'PAY_ORDER',
        payload: {
          localOrderId: order.id,
          arqueoId: activeArqueo.id,
          ...checkoutUpdates,
          dependsOnOperationId,
          recordingSource: 'offline'
        }
      });

      await db.syncQueue.add(op);

      closedOrder = {
        ...order,
        ...checkoutUpdates
      };
    });

    if (import.meta.env.DEV) {
      console.log(`[OfflineCheckoutService] Checkout completado para mesa ${mesaId}. Comanda:`, closedOrder);
    }

    return closedOrder;
  }
};
