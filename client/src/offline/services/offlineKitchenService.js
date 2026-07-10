import db from '../database';
import { QueueStatus } from '../tables';
import { createOperation } from '../operations/createOperation';
import { getCurrentDate } from '../offlineUtils';

export const offlineKitchenService = {
  /**
   * Obtiene la cola de cocina local offline uniendo tablas de IndexedDB.
   * Filtra platos que no se hayan entregado o anulado, cuyas comandas estén activas (no cerradas ni anuladas),
   * y que correspondan a categorías aptas para cocina (leídas de localStorage).
   * 
   * @returns {Promise<Array>} Listado compatible con el formato de /api/kitchen/queue
   */
  async getQueue() {
    // 1. Cargar todas las mesas, platos y comandas locales para mapear eficientemente
    const [tables, products, orders, orderItems] = await Promise.all([
      db.table('tables').toArray(),
      db.products.toArray(),
      db.orders.toArray(),
      db.orderItems.toArray()
    ]);

    // Mapas con normalización de tipo String para evitar mismatch number vs string
    const tableMap = new Map(tables.map(t => [String(t.id), t]));

    // productMap indexado por id Y por remoteId para máxima compatibilidad
    const productMap = new Map();
    products.forEach(p => {
      if (p.id != null) productMap.set(String(p.id), p);
      if (p.remoteId != null) productMap.set(String(p.remoteId), p);
    });

    // orderMap indexado por id Y por remoteId
    const orderMap = new Map();
    orders.forEach(o => {
      if (o.id != null) orderMap.set(String(o.id), o);
      if (o.remoteId != null) orderMap.set(String(o.remoteId), o);
    });

    // 2. Obtener categorías desde localStorage para verificar enviarCocina
    let kitchenCategories = new Set();
    let hasCategoryFilter = false;
    try {
      const cachedCats = localStorage.getItem('categories');
      if (cachedCats) {
        const parsed = JSON.parse(cachedCats);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach(c => {
            if (c.enviarCocina) kitchenCategories.add(String(c.id));
          });
          // Solo activar el filtro si hay al menos una categoría marcada para cocina
          hasCategoryFilter = kitchenCategories.size > 0;
        }
      }
    } catch (e) {
      console.error('[OfflineKitchenService] Error parseando categorías de localStorage:', e);
    }

    // 3. Filtrar y mapear detalles de cocina con joins robustos
    const queue = orderItems
      .filter(item => {
        // Filtrar estados terminales del item
        const itemEstado = (item.estado || 'pendiente').toLowerCase();
        if (itemEstado === 'entregado' || itemEstado === 'anulado') return false;

        // Resolver orderId/comandaId con normalización de tipo
        const parentId = String(item.orderId || item.comandaId || '');
        if (!parentId) return false;

        // Validar que la comanda asociada exista y esté activa
        const order = orderMap.get(parentId);
        if (!order) return false;
        const orderEstado = (order.estado || order.status || 'pendiente').toLowerCase();
        if (orderEstado === 'cerrada' || orderEstado === 'anulada') return false;

        // Resolver platoId/productId con normalización de tipo
        const productKey = String(item.platoId || item.productId || '');
        if (!productKey) return false;

        const plato = productMap.get(productKey);

        // Si no existe el producto en el snapshot local, pasar igual con fallback visual
        if (!plato) return true;

        // Filtro de categoría: solo aplicar si hay categorías marcadas Y el producto tiene categoría
        // Si el producto no tiene categoría definida, NO excluirlo (fallback permisivo)
        if (hasCategoryFilter) {
          const catId = plato.categoriaId != null ? String(plato.categoriaId)
                      : plato.categoryId != null ? String(plato.categoryId)
                      : null;
          if (catId !== null && !kitchenCategories.has(catId)) return false;
          // Si catId === null → producto sin categoría, se deja pasar (no excluir)
        }

        return true;
      })
      .map(item => {
        const parentId = String(item.orderId || item.comandaId || '');
        const productKey = String(item.platoId || item.productId || '');
        const order = orderMap.get(parentId);
        const plato = productMap.get(productKey);

        // Resolver mesa: mesaId o tableId
        const mesaKey = order
          ? String(order.mesaId || order.tableId || '')
          : '';
        const mesa = mesaKey ? tableMap.get(mesaKey) : null;

        return {
          id: item.id,
          comandaId: parentId,
          platoId: productKey,
          cantidad: item.cantidad,
          estado: item.estado || 'pendiente',
          observacion: item.observacion || '',
          cocineroId: item.cocineroId || null,
          fechaCreacion: item.fechaCreacion || item.createdAt || (order ? order.fecha : null),
          plato: plato || { id: productKey, nombre: 'Plato sin datos', precio: 0 },
          comanda: order ? {
            id: order.id,
            fecha: order.fecha,
            estado: order.estado || order.status,
            mesa: mesa || { id: mesaKey, numero: mesaKey || '?' }
          } : null,
          cocinero: item.cocineroId ? { id: item.cocineroId, nombre: 'Cocinero Offline' } : null
        };
      });

    // Ordenar por FIFO (fecha de creación luego por id)
    return queue.sort((a, b) => {
      if (a.fechaCreacion < b.fechaCreacion) return -1;
      if (a.fechaCreacion > b.fechaCreacion) return 1;
      return a.id < b.id ? -1 : 1;
    });
  },

  /**
   * Cambia el estado de preparación de un plato en cocina de forma transaccional.
   * 
   * @param {string} itemId UUID local del detalle
   * @param {string} status Nuevo estado del ítem ('preparando' | 'listo' | 'pendiente')
   * @param {Object} chefInfo Información del cocinero ({ id, nombre })
   * @returns {Promise<void>}
   */
  async updateItemStatus(itemId, status, chefInfo = {}) {
    if (!itemId) throw new Error('itemId es obligatorio.');
    if (!status) throw new Error('status es obligatorio.');

    const timestamp = getCurrentDate();

    await db.transaction('rw', [db.orderItems, db.orders, db.syncQueue], async () => {
      const item = await db.orderItems.get(itemId);
      if (!item) throw new Error(`No se encontró el detalle de comanda ${itemId}`);

      const updates = {
        estado: status,
        updatedAt: timestamp
      };

      if (status === 'preparando') {
        updates.cocineroId = chefInfo.id || null;
      }

      // 1. Actualizar estado local del item
      await db.orderItems.update(itemId, updates);

      // Buscar si la comanda asociada tiene una operación de creación pendiente
      const pendingCreate = await db.syncQueue
        .where('entityId')
        .equals(item.comandaId)
        .and(op => op.operation === 'CREATE_ORDER')
        .toArray();
      const dependsOnOperationId = pendingCreate.length > 0 ? pendingCreate[0].operationId : null;

      // 2. Encolar la operación de actualización
      const op = createOperation({
        entity: 'ORDER_ITEM',
        entityId: itemId,
        operation: 'UPDATE_ORDER_ITEM',
        payload: {
          localItemId: itemId,
          localOrderId: item.comandaId,
          estado: status,
          cocineroId: status === 'preparando' ? chefInfo.id : undefined,
          dependsOnOperationId,
          recordingSource: 'offline'
        }
      });

      await db.syncQueue.add(op);
    });

    if (import.meta.env.DEV) {
      console.log(`[OfflineKitchenService] Estado del item ${itemId} cambiado a ${status} localmente.`);
    }
  }
};
