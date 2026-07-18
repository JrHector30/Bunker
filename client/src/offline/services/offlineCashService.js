import db from '../database';
import { QueueStatus } from '../tables';
import { createOperation } from '../operations/createOperation';
import { generateUUID, getCurrentDate } from '../offlineUtils';

/**
 * Resuelve de forma defensiva el precio de un plato en base al detalle histórico
 * o al snapshot del producto, registrando errores de integridad si es indefinido.
 * 
 * @param {Object} d Detalle de comanda (item)
 * @param {Object} product Plato asociado
 * @returns {number|null} Precio resuelto o null si hay error de integridad
 */
export function resolveItemPrice(d, product) {
  // Prioridad 1: Precio histórico guardado directamente en el detalle (precio o precioVenta)
  let price = d.precio !== undefined ? d.precio : d.precioVenta;
  
  // Prioridad 2: Precio del snapshot del producto (precio o precioVenta)
  if (price === undefined || price === null) {
    price = product?.precio !== undefined ? product.precio : product?.precioVenta;
  }

  // Validar si es un valor numérico finito
  if (price !== undefined && price !== null) {
    const num = Number(price);
    if (Number.isFinite(num)) {
      return num;
    }
  }

  return null;
}

export const offlineCashService = {
  /**
   * Obtiene el balance de caja y último arqueo local offline.
   * Réplica fidedigna de la lógica del backend /api/cashier/balance.
   * 
   * @returns {Promise<Object>} Balance detallado de caja
   */
  async getBalance() {
    const arqueos = await db.arqueos.toArray();
    // Ordenar desc para obtener el último
    arqueos.sort((a, b) => b.id - a.id);

    const defaultBalance = {
      estado: 'cerrado',
      inicio: 0,
      egresos: 0,
      ingresos: { efectivo: 0, tarjeta: 0, yape: 0, izipay: 0, plin: 0, niubiz: 0, manual: 0 },
      totalCaja: 0,
      totalBruto: 0,
      totalPendiente: 0,
      ventas: [],
      movimientos: []
    };

    if (arqueos.length === 0) {
      return defaultBalance;
    }

    const lastArqueo = arqueos[0];
    const startDate = new Date(lastArqueo.fechaInicio);
    const endDate = lastArqueo.estado === 'abierto' ? new Date() : new Date(lastArqueo.fechaFin);

    // Cargar datos locales de IndexedDB
    const [orders, orderItems, products, movements] = await Promise.all([
      db.orders.toArray(),
      db.orderItems.toArray(),
      db.products.toArray(),
      db.movimientosCaja.where('arqueoId').equals(lastArqueo.id).toArray()
    ]);

    const productMap = new Map(products.map(p => [p.id, p]));
    const itemMap = new Map(); // orderId -> Array de detalles

    orderItems.forEach(item => {
      if (!itemMap.has(item.comandaId)) {
        itemMap.set(item.comandaId, []);
      }
      itemMap.get(item.comandaId).push(item);
    });

    // 1. Filtrar ventas locales cerradas del rango
    const sales = orders.filter(order => {
      const isClosed = order.estado === 'cerrada' || order.status === 'cerrada';
      if (!isClosed) return false;
      const orderDate = new Date(order.fechaCierre || order.fecha);
      return orderDate >= startDate && orderDate <= endDate;
    });

    // 2. Filtrar comandas activas pendientes
    const pendingOrders = orders.filter(order => {
      const isClosed = order.estado === 'cerrada' || order.status === 'cerrada';
      const isCancelled = order.estado === 'anulada' || order.status === 'anulada';
      return !isClosed && !isCancelled;
    });

    const parsePaymentMethod = (metodoPago) => {
      const m = (metodoPago || 'efectivo').toLowerCase();
      if (m.includes('izipay') || m.includes('izi')) return 'izipay';
      if (m.includes('niubiz')) return 'niubiz';
      if (m.includes('plin')) return 'plin';
      if (m.includes('yape')) return 'yape';
      if (m.includes('tarjeta')) return 'tarjeta';
      return 'efectivo';
    };

    // Calcular ingresos y egresos manuales
    const manualIngresos = movements.filter(m => m.tipo === 'INGRESO').reduce((sum, m) => sum + Number(m.monto), 0);
    const manualEgresos = movements.filter(m => m.tipo === 'EGRESO').reduce((sum, m) => sum + Number(m.monto), 0);

    const inicio = Number(lastArqueo.montoInicial || 0);
    const egresos = manualEgresos;

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

    const ventasDetalladas = sales.map(order => {
      const items = itemMap.get(order.id) || [];
      let subtotal = 0;
      let comandaHasError = false;

      const mappedItems = items.map(item => {
        const plato = productMap.get(item.platoId);
        const resolvedPrice = resolveItemPrice(item, plato);
        
        let itemTotal = null;
        if (resolvedPrice !== null) {
          itemTotal = Number(item.cantidad) * resolvedPrice;
          subtotal += itemTotal;
        } else {
          comandaHasError = true;
          console.error(`[INTEGRITY ERROR] Precio no disponible para el item id: ${item.id} (platoId: ${item.platoId}) en balance`);
        }

        return {
          cantidad: item.cantidad,
          descripcion: plato ? plato.nombre : 'Plato Desconocido',
          precio: resolvedPrice, // Puede ser null
          total: itemTotal       // Puede ser null
        };
      });

      const propina = Number(order.propina || 0);
      if (!comandaHasError) {
        totalBruto += subtotal;
      }
      totalPropinas += propina;

      const cat = parsePaymentMethod(order.metodoPago);
      if (!comandaHasError) {
        if (incomeDetails[cat] !== undefined) {
          incomeDetails[cat] += subtotal;
        } else {
          incomeDetails.efectivo += subtotal;
        }
      }

      return {
        id: order.id,
        hora: order.fechaCierre || order.fecha,
        items: mappedItems,
        total: comandaHasError ? null : subtotal,
        metodo: order.metodoPago,
        doc: order.tipoDocumento,
        waiterName: 'Mozo Offline',
        mesaNum: String(order.mesaId)
      };
    });

    // Calcular el total pendiente de las comandas activas
    const totalPendiente = pendingOrders.reduce((acc, order) => {
      const items = itemMap.get(order.id) || [];
      let subtotal = 0;
      let hasError = false;

      items.forEach(item => {
        const plato = productMap.get(item.platoId);
        const resolvedPrice = resolveItemPrice(item, plato);
        if (resolvedPrice !== null) {
          subtotal += (Number(item.cantidad) * resolvedPrice);
        } else {
          hasError = true;
          console.error(`[INTEGRITY ERROR] Precio no disponible para el item pendiente id: ${item.id}`);
        }
      });

      return acc + (hasError ? 0 : subtotal);
    }, 0);

    // totalCaja = Inicio + manualIngresos + cash sales - manualEgresos
    const totalCaja = inicio + manualIngresos + incomeDetails.efectivo - manualEgresos;

    return {
      id: lastArqueo.id,
      estado: lastArqueo.estado,
      inicio,
      egresos,
      ingresos: incomeDetails,
      totalCaja,
      totalBruto,
      totalPendiente,
      ventas: ventasDetalladas,
      movimientos: movements.map(m => ({
        id: m.id,
        arqueoId: m.arqueoId,
        tipo: m.tipo,
        tipoComprobante: m.tipoComprobante || 'Ticket',
        concepto: m.concepto,
        observacion: m.observacion || '',
        monto: Number(m.monto),
        fecha: m.fecha,
        metodoPago: m.metodoPago || 'efectivo'
      }))
    };
  },

  /**
   * Obtiene los detalles completos de un arqueo de caja específico offline.
   * Réplica fidedigna del endpoint /api/cashier/arqueo/:id.
   * 
   * @param {number|string} arqueoId ID del arqueo
   * @returns {Promise<Object>} Detalle de arqueo con ventas y desgloses
   */
  async getArqueoDetails(arqueoId) {
    const id = Number(arqueoId);
    const arq = await db.arqueos.get(id);
    if (!arq) {
      throw new Error(`Arqueo local con ID ${arqueoId} no encontrado.`);
    }

    const startDate = new Date(arq.fechaInicio);
    const endDate = arq.estado === 'abierto' ? new Date() : new Date(arq.fechaFin || arq.fechaInicio);

    // Cargar datos locales de IndexedDB
    const [orders, orderItems, products, movements] = await Promise.all([
      db.orders.toArray(),
      db.orderItems.toArray(),
      db.products.toArray(),
      db.movimientosCaja.where('arqueoId').equals(arq.id).toArray()
    ]);

    const productMap = new Map(products.map(p => [p.id, p]));
    const itemMap = new Map(); // orderId -> Array de detalles

    orderItems.forEach(item => {
      if (!itemMap.has(item.comandaId)) {
        itemMap.set(item.comandaId, []);
      }
      itemMap.get(item.comandaId).push(item);
    });

    const parsePaymentMethod = (metodoPago) => {
      const m = (metodoPago || 'efectivo').toLowerCase();
      if (m.includes('izipay') || m.includes('izi')) return 'izipay';
      if (m.includes('niubiz')) return 'niubiz';
      if (m.includes('plin')) return 'plin';
      if (m.includes('yape')) return 'yape';
      if (m.includes('tarjeta')) return 'tarjeta';
      return 'efectivo';
    };

    const manualIngresos = movements.filter(m => m.tipo === 'INGRESO' && (m.metodoPago === 'efectivo' || !m.metodoPago)).reduce((sum, m) => sum + Number(m.monto), 0);
    const manualEgresos = movements.filter(m => m.tipo === 'EGRESO' && (m.metodoPago === 'efectivo' || !m.metodoPago)).reduce((sum, m) => sum + Number(m.monto), 0);

    const manualIngresosYape = movements.filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'yape').reduce((sum, m) => sum + Number(m.monto), 0);
    const manualEgresosYape = movements.filter(m => m.tipo === 'EGRESO' && m.metodoPago === 'yape').reduce((sum, m) => sum + Number(m.monto), 0);

    const manualIngresosPlin = movements.filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'plin').reduce((sum, m) => sum + Number(m.monto), 0);
    const manualEgresosPlin = movements.filter(m => m.tipo === 'EGRESO' && m.metodoPago === 'plin').reduce((sum, m) => sum + Number(m.monto), 0);

    const inicio = Number(arq.montoInicial || 0);
    const egresos = movements.filter(m => m.tipo === 'EGRESO').reduce((sum, m) => sum + Number(m.monto), 0);

    let totalPropinas = 0;
    let propinasPorMozo = {};

    let incomeDetails = {
      efectivo: 0,
      tarjeta: 0,
      yape: 0,
      izipay: 0,
      plin: 0,
      niubiz: 0,
      manual: manualIngresos
    };

    // Filtrar ventas locales cerradas de la sesión de este arqueo
    const sales = orders.filter(order => {
      const isClosed = order.estado === 'cerrada' || order.status === 'cerrada';
      if (!isClosed) return false;
      const orderDate = new Date(order.fechaCierre || order.fecha);
      return orderDate >= startDate && orderDate <= endDate;
    });

    const salesData = sales.map(order => {
      const items = itemMap.get(order.id) || [];
      let subtotal = 0;
      let comandaHasError = false;

      const mappedItems = items.map(item => {
        const plato = productMap.get(item.platoId);
        const resolvedPrice = resolveItemPrice(item, plato);
        
        let itemTotal = null;
        if (resolvedPrice !== null) {
          itemTotal = Number(item.cantidad) * resolvedPrice;
          subtotal += itemTotal;
        } else {
          comandaHasError = true;
          console.error(`[INTEGRITY ERROR] Precio no disponible para el item id: ${item.id} (platoId: ${item.platoId}) en arqueo N° ${arq.id}`);
        }

        return {
          cantidad: item.cantidad,
          descripcion: plato ? plato.nombre : 'Plato Desconocido',
          precio: resolvedPrice, // Puede ser null
          total: itemTotal       // Puede ser null
        };
      });

      const propina = Number(order.propina || 0);
      if (!comandaHasError) {
        totalPropinas += propina;
      }

      // Acumular propinas por mozo offline
      const mozoId = order.usuarioId || 1;
      const mozoNombre = order.waiterName || 'Mozo Offline';
      if (propina > 0 && !comandaHasError) {
        if (!propinasPorMozo[mozoId]) {
          propinasPorMozo[mozoId] = {
            id: mozoId,
            nombre: mozoNombre,
            propinas: 0
          };
        }
        propinasPorMozo[mozoId].propinas += propina;
      }

      const cat = parsePaymentMethod(order.metodoPago);
      if (!comandaHasError) {
        if (incomeDetails[cat] !== undefined) {
          incomeDetails[cat] += subtotal;
        } else {
          incomeDetails.efectivo += subtotal;
        }
      }

      return {
        id: order.id,
        hora: order.fechaCierre || order.fecha,
        items: mappedItems,
        total: comandaHasError ? null : subtotal,
        propina: propina,
        metodo: order.metodoPago,
        doc: order.tipoDocumento,
        mozo: mozoNombre,
        mesa: String(order.mesaId || 'Barra')
      };
    });

    // Sincronizar movimientos manuales
    incomeDetails.yape = Math.max(0, incomeDetails.yape + manualIngresosYape - manualEgresosYape);
    incomeDetails.plin = Math.max(0, incomeDetails.plin + manualIngresosPlin - manualEgresosPlin);

    // Calcular el total pendiente de las comandas activas (solo si el arqueo está abierto)
    let totalPendiente = 0;
    if (arq.estado === 'abierto') {
      const pendingOrders = orders.filter(order => {
        const isClosed = order.estado === 'cerrada' || order.status === 'cerrada';
        const isCancelled = order.estado === 'anulada' || order.status === 'anulada';
        return !isClosed && !isCancelled;
      });
      totalPendiente = pendingOrders.reduce((acc, order) => {
        const items = itemMap.get(order.id) || [];
        let subtotal = 0;
        let hasError = false;

        items.forEach(item => {
          const plato = productMap.get(item.platoId);
          const resolvedPrice = resolveItemPrice(item, plato);
          if (resolvedPrice !== null) {
            subtotal += (Number(item.cantidad) * resolvedPrice);
          } else {
            hasError = true;
            console.error(`[INTEGRITY ERROR] Precio no disponible para el item pendiente id: ${item.id} en arqueo N° ${arq.id}`);
          }
        });

        return acc + (hasError ? 0 : subtotal);
      }, 0);
    }

    const totalCaja = inicio + manualIngresos + incomeDetails.efectivo - manualEgresos;

    return {
      id: arq.id,
      fechaInicio: arq.fechaInicio,
      fechaFin: arq.fechaFin,
      estado: arq.estado,
      usuarioId: arq.usuarioId,
      montoInicial: arq.montoInicial,
      montoFinal: arq.montoFinal,
      inicio,
      egresos,
      ingresos: incomeDetails,
      totalCaja,
      ventas: salesData,
      totalBruto: salesData.reduce((acc, s) => acc + (s.total || 0), 0),
      totalPropinas,
      propinasPorMozo: Object.values(propinasPorMozo),
      totalPendiente,
      movimientos: movements.map(m => ({
        id: m.id,
        arqueoId: m.arqueoId,
        tipo: m.tipo,
        tipoComprobante: m.tipoComprobante || 'Ticket',
        concepto: m.concepto,
        observacion: m.observacion || '',
        monto: Number(m.monto),
        fecha: m.fecha,
        metodoPago: m.metodoPago || 'efectivo'
      }))
    };
  },

  /**
   * Abre o cierra una sesión de arqueo offline de forma transaccional.
   * 
   * @param {Object} params 
   * @param {number} params.usuarioId ID del usuario de la sesión
   * @param {number} params.montoInicial Monto inicial (si abre)
   * @param {number} params.montoFinal Monto final (si cierra)
   * @param {string} params.accion 'open' o 'close'
   */
  async toggleCashSession({ usuarioId, montoInicial, montoFinal, accion }) {
    const timestamp = getCurrentDate();

    await db.transaction('rw', [db.arqueos, db.syncQueue], async () => {
      if (accion === 'open') {
        // Validar que no haya ya una abierta
        const open = await db.arqueos.where('estado').equals('abierto').toArray();
        if (open.length > 0) throw new Error('Ya existe una sesión de caja abierta localmente.');

        const nextId = Date.now(); // ID único numérico basado en timestamp
        const openRecord = {
          id: nextId,
          montoInicial: Number(montoInicial || 0),
          estado: 'abierto',
          fechaInicio: timestamp,
          fechaFin: null,
          usuarioId: Number(usuarioId)
        };

        await db.arqueos.add(openRecord);

        // Registrar operación
        const op = createOperation({
          entity: 'CASH_SESSION',
          entityId: String(nextId),
          operation: 'TOGGLE_CASH_SESSION',
          payload: {
            id: nextId,
            accion: 'open',
            montoInicial: Number(montoInicial || 0),
            fecha: timestamp,
            usuarioId: Number(usuarioId),
            recordingSource: 'offline'
          }
        });
        await db.syncQueue.add(op);
      } else {
        // Cerrar
        const open = await db.arqueos.where('estado').equals('abierto').toArray();
        if (open.length === 0) throw new Error('No hay ninguna sesión de caja abierta para cerrar.');
        const active = open[0];

        await db.arqueos.update(active.id, {
          estado: 'cerrado',
          montoFinal: Number(montoFinal || 0),
          fechaFin: timestamp
        });

        // Registrar operación
        const op = createOperation({
          entity: 'CASH_SESSION',
          entityId: String(active.id),
          operation: 'TOGGLE_CASH_SESSION',
          payload: {
            id: active.id,
            accion: 'close',
            montoFinal: Number(montoFinal || 0),
            fecha: timestamp,
            usuarioId: Number(usuarioId),
            recordingSource: 'offline'
          }
        });
        await db.syncQueue.add(op);
      }
    });

    if (import.meta.env.DEV) {
      console.log(`[OfflineCashService] Sesión de caja toggled: ${accion}`);
    }
  },

  /**
   * Registra un movimiento de caja local manual de forma transaccional.
   * 
   * @param {Object} params 
   * @param {number} params.arqueoId ID del arqueo
   * @param {string} params.tipo INGRESO o EGRESO
   * @param {number} params.monto Monto del movimiento
   * @param {string} params.concepto Concepto o categoría
   * @param {string} params.metodoPago Pasarela o efectivo
   * @param {string} params.observacion Notas
   */
  async createMovement({ arqueoId, tipo, monto, concepto, metodoPago, observacion }) {
    if (!arqueoId) throw new Error('arqueoId es obligatorio para registrar un movimiento.');
    if (!tipo) throw new Error('tipo (INGRESO/EGRESO) es obligatorio.');
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a cero.');

    const timestamp = getCurrentDate();
    const nextId = Date.now();

    const movementRecord = {
      id: nextId,
      arqueoId: Number(arqueoId),
      tipo,
      tipoComprobante: 'Ticket',
      concepto,
      observacion: observacion || '',
      monto: Number(monto),
      fecha: timestamp,
      metodoPago: metodoPago || 'efectivo'
    };

    await db.transaction('rw', [db.movimientosCaja, db.syncQueue], async () => {
      // 1. Agregar el movimiento
      await db.movimientosCaja.add(movementRecord);

      // 2. Registrar la operación
      const op = createOperation({
        entity: 'CASH_MOVEMENT',
        entityId: String(nextId),
        operation: 'CREATE_CASH_MOVEMENT',
        payload: {
          id: nextId,
          arqueoId: Number(arqueoId),
          tipo,
          monto: Number(monto),
          concepto,
          observacion: observacion || '',
          metodoPago: metodoPago || 'efectivo',
          fecha: timestamp,
          recordingSource: 'offline'
        }
      });
      await db.syncQueue.add(op);
    });

    if (import.meta.env.DEV) {
      console.log('[OfflineCashService] Movimiento de caja registrado localmente:', movementRecord);
    }

    return movementRecord;
  }
};
