import db from '../database';
import { networkStatus } from '../network/networkStatus';
import { offlineReadiness } from '../readiness/offlineReadiness';

export const offlineSnapshotService = {
  /**
   * Realiza la hidratación del snapshot operativo de la base de datos local IndexedDB
   * consumiendo las APIs reales del sistema cuando se encuentra ONLINE.
   * Cuenta con protección crítica de merge para no pisar cambios locales pendientes de sync.
   * 
   * @returns {Promise<Object>} Resultado del Readiness Inspector tras hidratar
   */
  async hydrateOperationalSnapshot() {
    // 1. Exigir estado de red ONLINE
    if (networkStatus.isOffline()) {
      throw new Error('La hidratación requiere una conexión ONLINE activa con el backend.');
    }

    try {
      // 2. Obtener operaciones pendientes de la cola de sincronización para protección de merge
      const pendingOps = await db.syncQueue.where('status').equals('PENDING').toArray();
      const pendingOrderIds = new Set();
      const pendingOrderItemIds = new Set();
      const pendingTableIds = new Set();
      const pendingCashIds = new Set();

      pendingOps.forEach(op => {
        if (op.entity === 'ORDER') pendingOrderIds.add(String(op.entityId));
        if (op.entity === 'ORDER_ITEM') pendingOrderItemIds.add(String(op.entityId));
        if (op.entity === 'TABLE') pendingTableIds.add(String(op.entityId));
        if (op.entity === 'CASH_SESSION' || op.entity === 'CASH_MOVEMENT') pendingCashIds.add(String(op.entityId));
      });

      // 3. Ejecutar peticiones en paralelo a las APIs reales
      const [tablesRes, productsRes, balanceRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/products'),
        fetch('/api/cashier/balance')
      ]);

      if (!tablesRes.ok || !productsRes.ok || !balanceRes.ok) {
        throw new Error('Error al consultar uno o más endpoints de hidratación del backend.');
      }

      const [tables, products, balance] = await Promise.all([
        tablesRes.json(),
        productsRes.json(),
        balanceRes.json()
      ]);

      // 4. Hidratar PRODUCTOS (Operación segura ya que platos están deshabilitados offline)
      if (Array.isArray(products) && products.length > 0) {
        const productRecords = products.map(p => ({
          id: p.id,
          remoteId: p.id,
          categoryId: p.categoriaId,
          nombre: p.nombre,
          precio: Number(p.precio),
          activo: p.activo,
          deleted: p.deleted,
          syncStatus: 'SYNCED'
        }));
        await db.products.clear();
        await db.products.bulkPut(productRecords);
      }

      // 5. Hidratar MESAS, COMANDAS y DETALLES ABIERTOS de forma cohesiva
      if (Array.isArray(tables) && tables.length > 0) {
        for (const mesa of tables) {
          const mesaIdStr = String(mesa.id);
          
          // Protección de merge: no pisar mesa si tiene cambios locales en cola
          if (pendingTableIds.has(mesaIdStr)) {
            continue;
          }

          // Verificar si alguna comanda activa de la mesa tiene cambios locales en cola
          const remoteComandas = mesa.comandas || [];
          const hasPendingComandaLocal = remoteComandas.some(c => pendingOrderIds.has(String(c.id)));
          if (hasPendingComandaLocal) {
            continue;
          }

          // Guardar mesa localmente
          // Proteger: si existe una comanda local activa para esta mesa, conservar estado local
          const localMesa = await db.table('tables').get(mesa.id);
          const hasLocalActiveOrder = await db.orders
            .filter(o => {
              const oMesaId = String(o.mesaId || o.tableId || '');
              if (oMesaId !== mesaIdStr) return false;
              const est = (o.estado || o.status || '').toLowerCase();
              return est !== 'cerrada' && est !== 'anulada';
            })
            .count();
          // Usar estado remoto solo si no hay orden local activa
          const estadoFinal = hasLocalActiveOrder > 0 ? 'ocupada' : mesa.estado;

          await db.table('tables').put({
            id: mesa.id,
            numero: mesa.numero,
            capacidad: mesa.capacidad,
            estado: estadoFinal,
            posX: Number(mesa.posX !== undefined && mesa.posX !== null ? mesa.posX : 15),
            posY: Number(mesa.posY !== undefined && mesa.posY !== null ? mesa.posY : 25),
            mesaPadreId: mesa.mesaPadreId !== undefined && mesa.mesaPadreId !== null ? Number(mesa.mesaPadreId) : null,
            updatedAt: new Date().toISOString()
          });

          // Hidratar comandas y detalles de la mesa que no estén bloqueados
          for (const comanda of remoteComandas) {
            const comandaIdStr = String(comanda.id);
            if (pendingOrderIds.has(comandaIdStr)) continue;

            await db.orders.put({
              id: comanda.id,
              remoteId: comanda.id,
              mesaId: Number(comanda.mesaId),
              usuarioId: Number(comanda.usuarioId),
              comensales: Number(comanda.comensales || 2),
              fecha: comanda.fecha,
              estado: comanda.estado,
              status: comanda.estado,
              syncStatus: 'SYNCED',
              createdAt: comanda.createdAt || comanda.fecha,
              updatedAt: comanda.updatedAt || comanda.fecha
            });

            const detalles = comanda.detalles || [];
            for (const det of detalles) {
              if (pendingOrderItemIds.has(String(det.id))) continue;

              await db.orderItems.put({
                id: det.id,
                remoteId: det.id,
                comandaId: det.comandaId,
                orderId: det.comandaId, // Duplicado para compatibilidad Dexie
                platoId: Number(det.platoId),
                productId: Number(det.platoId), // Duplicado para compatibilidad Dexie
                cantidad: Number(det.cantidad),
                estado: det.estado || 'pendiente',
                observacion: det.observacion || '',
                cocineroId: det.cocineroId || null,
                fechaCreacion: det.fechaCreacion || comanda.fecha,
                createdAt: det.fechaCreacion || comanda.fecha, // Duplicado para compatibilidad Dexie
                syncStatus: 'SYNCED'
              });
            }
          }
        }
      }

      // 6. Hidratar ARQUEOS y MOVIMIENTOS
      if (balance) {
        const lastArqueoIdStr = String(balance.id);
        
        // Protección de merge para la sesión de caja
        if (!pendingCashIds.has(lastArqueoIdStr)) {
          if (balance.estado === 'abierto') {
            await db.arqueos.put({
              id: balance.id,
              montoInicial: Number(balance.inicio || 0),
              estado: 'abierto',
              fechaInicio: balance.fechaInicio || new Date().toISOString()
            });

            // Registrar los movimientos asociados
            const remoteMovements = balance.movimientos || [];
            for (const mov of remoteMovements) {
              if (pendingCashIds.has(String(mov.id))) continue;

              await db.movimientosCaja.put({
                id: mov.id,
                arqueoId: Number(mov.arqueoId),
                tipo: mov.tipo,
                tipoComprobante: mov.tipoComprobante || 'Ticket',
                concepto: mov.concepto,
                observacion: mov.observacion || '',
                monto: Number(mov.monto),
                fecha: mov.fecha,
                metodoPago: mov.metodoPago || 'efectivo'
              });
            }
          } else {
            // Si en el servidor está cerrada, marcar localmente como cerrado
            const activeArqueos = await db.arqueos.where('estado').equals('abierto').toArray();
            for (const a of activeArqueos) {
              await db.arqueos.update(a.id, {
                estado: 'cerrado',
                fechaFin: new Date().toISOString()
              });
            }
          }
        }
      }

      if (import.meta.env.DEV) {
        console.log('[OfflineSnapshotService] Snapshot operativo hidratado con éxito desde el servidor.');
      }

      // 7. Retornar el resultado de la inspección de preparación
      return await offlineReadiness.inspect();
    } catch (err) {
      console.error('[OfflineSnapshotService] Error durante la hidratación de datos:', err);
      throw err;
    }
  },

  /**
   * Hidrata la tabla local de mesas, comandas y detalles a partir de los datos frescos
   * recibidos del servidor en la consulta habitual, protegiendo las operaciones locales.
   * 
   * @param {Array} tables Listado de mesas obtenido de la API
   */
  async hydrateTablesFromData(tables) {
    if (!Array.isArray(tables) || tables.length === 0) return;

    try {
      const pendingOps = await db.syncQueue.where('status').equals('PENDING').toArray();
      const pendingOrderIds = new Set();
      const pendingOrderItemIds = new Set();
      const pendingTableIds = new Set();

      pendingOps.forEach(op => {
        if (op.entity === 'ORDER') pendingOrderIds.add(String(op.entityId));
        if (op.entity === 'ORDER_ITEM') pendingOrderItemIds.add(String(op.entityId));
        if (op.entity === 'TABLE') pendingTableIds.add(String(op.entityId));
      });

      for (const mesa of tables) {
        const mesaIdStr = String(mesa.id);
        if (pendingTableIds.has(mesaIdStr)) continue;

        const remoteComandas = mesa.comandas || [];
        const hasPendingComandaLocal = remoteComandas.some(c => pendingOrderIds.has(String(c.id)));
        if (hasPendingComandaLocal) continue;

        // Guardar mesa localmente
        await db.table('tables').put({
          id: mesa.id,
          numero: mesa.numero,
          capacidad: mesa.capacidad,
          estado: mesa.estado,
          posX: Number(mesa.posX !== undefined && mesa.posX !== null ? mesa.posX : 15),
          posY: Number(mesa.posY !== undefined && mesa.posY !== null ? mesa.posY : 25),
          mesaPadreId: mesa.mesaPadreId !== undefined && mesa.mesaPadreId !== null ? Number(mesa.mesaPadreId) : null,
          updatedAt: new Date().toISOString()
        });

        // Hidratar comandas y detalles
        for (const comanda of remoteComandas) {
          const comandaIdStr = String(comanda.id);
          if (pendingOrderIds.has(comandaIdStr)) continue;

          await db.orders.put({
            id: comanda.id,
            remoteId: comanda.id,
            mesaId: Number(comanda.mesaId),
            usuarioId: Number(comanda.usuarioId),
            comensales: Number(comanda.comensales || 2),
            fecha: comanda.fecha,
            estado: comanda.estado,
            status: comanda.estado,
            syncStatus: 'SYNCED',
            createdAt: comanda.createdAt || comanda.fecha,
            updatedAt: comanda.updatedAt || comanda.fecha
          });

          const detalles = comanda.detalles || [];
          for (const det of detalles) {
            if (pendingOrderItemIds.has(String(det.id))) continue;

            await db.orderItems.put({
              id: det.id,
              remoteId: det.id,
              comandaId: det.comandaId,
              orderId: det.comandaId, // Duplicado para compatibilidad Dexie
              platoId: Number(det.platoId),
              productId: Number(det.platoId), // Duplicado para compatibilidad Dexie
              cantidad: Number(det.cantidad),
              estado: det.estado || 'pendiente',
              observacion: det.observacion || '',
              cocineroId: det.cocineroId || null,
              fechaCreacion: det.fechaCreacion || comanda.fecha,
              createdAt: det.fechaCreacion || comanda.fecha, // Duplicado para compatibilidad Dexie
              syncStatus: 'SYNCED'
            });
          }
        }
      }
    } catch (err) {
      console.error('[OfflineSnapshotService] Error al hidratar mesas locales de fondo:', err);
    }
  }
};
