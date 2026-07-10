import db from '../database';
import { QueueStatus } from '../tables';

export const offlineReadiness = {
  /**
   * Inspecciona las tablas locales en IndexedDB para verificar si cuenta con
   * la información necesaria antes de transicionar a modo offline.
   * 
   * @returns {Promise<Object>} Resultado de la preparación
   */
  async inspect() {
    const productsCount = await db.products.count();
    const tablesCount = await db.table('tables').count();
    
    // Obtener comandas no cerradas ni anuladas
    const openOrders = await db.orders
      .filter(o => o.status !== 'cerrada' && o.status !== 'anulada')
      .toArray();
    
    // Obtener detalles asociados a comandas abiertas
    // Soporta doble nomenclatura: orderId (esquema Dexie) y comandaId (creación offline)
    const openOrderIds = new Set(openOrders.map(o => o.id));
    const openOrderItems = await db.orderItems
      .filter(item => openOrderIds.has(item.orderId) || openOrderIds.has(item.comandaId))
      .toArray();

    // Obtener arqueo abierto actual
    const openArqueos = await db.arqueos
      .where('estado')
      .equals('abierto')
      .toArray();
    const hasOpenCashSession = openArqueos.length > 0;

    // Verificar datos mínimos del usuario/sesión
    let hasUserData = false;
    try {
      const userCached = localStorage.getItem('bunker_user');
      if (userCached) {
        const parsed = JSON.parse(userCached);
        hasUserData = !!(parsed && parsed.id && parsed.rol);
      }
    } catch (e) {
      console.error('[OfflineReadiness] Error leyendo bunker_user de localStorage:', e);
    }

    const missing = [];
    if (productsCount === 0) missing.push('products');
    if (tablesCount === 0) missing.push('tables');
    if (!hasOpenCashSession) missing.push('openCashSession');
    if (!hasUserData) missing.push('activeUserSession');

    const ready = missing.length === 0;

    return {
      ready,
      products: productsCount,
      tables: tablesCount,
      openOrders: openOrders.length,
      orderItems: openOrderItems.length,
      openCashSession: hasOpenCashSession,
      activeUserSession: hasUserData,
      checkedAt: new Date().toISOString(),
      ...(missing.length > 0 ? { missing } : {})
    };
  }
};
