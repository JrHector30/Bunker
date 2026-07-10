import db from '../database';
import { QueueStatus } from '../tables';
import { createOperation } from '../operations/createOperation';
import { generateUUID, getCurrentDate } from '../offlineUtils';

export const offlineOrderService = {
  /**
   * Crea una comanda local offline de forma transaccional.
   * Modifica órdenes, detalles, estado de mesas e ingresa la operación en la cola de sincronización.
   * 
   * @param {Object} params 
   * @param {number|string} params.mesaId ID de la mesa
   * @param {number} params.usuarioId ID del mesero
   * @param {number} params.comensales Cantidad de comensales
   * @param {Array} params.detalles Listado de detalles del carrito ({ platoId, cantidad, observacion })
   * @returns {Promise<Object>} La orden creada localmente
   */
   async createOrder({ mesaId, usuarioId, comensales, detalles }) {
    if (!mesaId) throw new Error('mesaId es obligatorio.');
    if (!usuarioId) throw new Error('usuarioId es obligatorio.');
    if (!detalles || detalles.length === 0) {
      throw new Error('Debe haber al menos un plato en la comanda.');
    }

    // Validación obligatoria de detalles normalizados
    const normalizedItems = detalles.filter(item => item && item.platoId && Number(item.cantidad) > 0);
    if (normalizedItems.length === 0) {
      throw new Error('OFFLINE_ORDER_ITEMS_EMPTY: La comanda no contiene detalles normalizados válidos.');
    }

    const localOrderId = generateUUID();
    const timestamp = getCurrentDate();

    // Estructurar el objeto comanda local
    const orderRecord = {
      id: localOrderId,
      remoteId: null, // Pendiente de asignación al sincronizar
      mesaId: Number(mesaId),
      usuarioId: Number(usuarioId),
      comensales: Number(comensales || 2),
      fecha: timestamp,
      estado: 'pendiente',
      status: 'pendiente', // Duplicado por compatibilidad de esquema
      syncStatus: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Estructurar los detalles de comanda con duplicación defensiva
    const itemRecords = normalizedItems.map(item => {
      const localItemId = generateUUID();
      return {
        id: localItemId,
        remoteId: null,
        comandaId: localOrderId,
        orderId: localOrderId, // Duplicado para compatibilidad de esquema Dexie
        platoId: Number(item.platoId),
        productId: Number(item.platoId), // Duplicado para compatibilidad de esquema Dexie
        cantidad: Number(item.cantidad),
        estado: 'pendiente',
        observacion: item.observacion || '',
        fechaCreacion: timestamp,
        createdAt: timestamp, // Duplicado para compatibilidad de esquema Dexie
        syncStatus: 'PENDING'
      };
    });

    // Crear la operación de sincronización
    const op = createOperation({
      entity: 'ORDER',
      entityId: localOrderId,
      operation: 'CREATE_ORDER',
      payload: {
        localOrderId,
        mesaId: Number(mesaId),
        usuarioId: Number(usuarioId),
        comensales: Number(comensales || 2),
        detalles: itemRecords.map(item => ({
          localItemId: item.id,
          platoId: item.platoId,
          cantidad: item.cantidad,
          observacion: item.observacion
        })),
        recordingSource: 'offline'
      }
    });

    // Transacción atómica Dexie (todo o nada)
    await db.transaction('rw', [db.orders, db.orderItems, db.table('tables'), db.syncQueue], async () => {
      // 1. Agregar comanda
      await db.orders.add(orderRecord);

      // 2. Agregar detalles en lote
      await db.orderItems.bulkAdd(itemRecords);

      // 3. Actualizar estado de la mesa a ocupada
      await db.table('tables').update(Number(mesaId), { 
        estado: 'ocupada',
        updatedAt: timestamp
      });

      // 4. Registrar en cola de sincronización
      await db.syncQueue.add(op);
    });

    if (import.meta.env.DEV) {
      console.log('[OfflineOrderService] Comanda offline creada con éxito localmente.', orderRecord);
    }

    return {
      ...orderRecord,
      detalles: itemRecords
    };
  },

  /**
   * Cancela una comanda local offline de forma transaccional.
   * 
   * @param {string} orderId UUID local de la orden
   * @returns {Promise<void>}
   */
  async cancelOrder(orderId) {
    if (!orderId) throw new Error('orderId es obligatorio para cancelar.');

    const timestamp = getCurrentDate();

    await db.transaction('rw', [db.orders, db.table('tables'), db.syncQueue], async () => {
      const order = await db.orders.get(orderId);
      if (!order) throw new Error(`No se encontró la comanda con ID ${orderId}`);

      // Cambiar estado de la comanda
      await db.orders.update(orderId, {
        estado: 'anulada',
        updatedAt: timestamp
      });

      // Liberar la mesa
      await db.table('tables').update(Number(order.mesaId), {
        estado: 'libre',
        updatedAt: timestamp
      });

      // Buscar si ya existía una operación de creación pendiente
      const pendingCreate = await db.syncQueue
        .where('entityId')
        .equals(orderId)
        .and(op => op.operation === 'CREATE_ORDER')
        .toArray();

      const dependsOnOperationId = pendingCreate.length > 0 ? pendingCreate[0].operationId : null;

      // Registrar operación de cancelación
      const op = createOperation({
        entity: 'ORDER',
        entityId: orderId,
        operation: 'UPDATE_ORDER_STATUS',
        payload: {
          localOrderId: orderId,
          estado: 'anulada',
          dependsOnOperationId,
          recordingSource: 'offline'
        }
      });

      await db.syncQueue.add(op);
    });

    if (import.meta.env.DEV) {
      console.log(`[OfflineOrderService] Comanda offline ${orderId} anulada localmente.`);
    }
  }
};
