import db from '../database';
import { networkStatus } from '../network/networkStatus';
import { offlineReadiness } from '../readiness/offlineReadiness';
import { getActiveRestaurant } from '../../utils/tenant';

export const offlineSnapshotService = {
  /**
   * Realiza la hidratación del snapshot operativo de la base de datos local IndexedDB
   * consumiendo las APIs reales del sistema cuando se encuentra ONLINE.
   * Cuenta con protección crítica de merge para no pisar cambios locales pendientes de sync.
   * 
   * @returns {Promise<Object>} Resultado del Readiness Inspector tras hidratar
   */
  async hydrateOperationalSnapshot(options = {}) {
    const skipProducts = !!options.skipProducts;

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

      const tenantId = getActiveRestaurant()?.id || 1;
      const tenantHeaders = { 'x-restaurante-id': String(tenantId) };

      // 3. Ejecutar peticiones en paralelo a las APIs reales
      const promises = [
        fetch('/api/tables', { headers: tenantHeaders }),
        skipProducts ? Promise.resolve(null) : fetch('/api/products', { headers: tenantHeaders }),
        fetch('/api/cashier/balance', { headers: tenantHeaders })
      ];

      const [tablesRes, productsRes, balanceRes] = await Promise.all(promises);

      if (!tablesRes.ok || (productsRes && !productsRes.ok) || !balanceRes.ok) {
        throw new Error('Error al consultar uno o más endpoints de hidratación del backend.');
      }

      const [tables, products, balance] = await Promise.all([
        tablesRes.json(),
        productsRes ? productsRes.json() : Promise.resolve(null),
        balanceRes.json()
      ]);

      // 4. Hidratar PRODUCTOS (Operación segura ya que platos están deshabilitados offline)
      if (!skipProducts && Array.isArray(products)) {
        await db.products.clear();
        if (products.length > 0) {
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
          await db.products.bulkPut(productRecords);
        }
      }

      // 5. Hidratar MESAS, COMANDAS y DETALLES ABIERTOS de forma cohesiva
      if (Array.isArray(tables) && tables.length === 0) {
        await db.table('tables').clear();
        await db.orders.clear();
        await db.orderItems.clear();
      } else if (Array.isArray(tables) && tables.length > 0) {
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
              mesaId: Number(comanda.mesaId || mesa.id),
              tableId: Number(comanda.mesaId || mesa.id),
              usuarioId: Number(comanda.usuarioId || comanda.usuario?.id || 1),
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

              const platoIdResolved = Number(det.platoId || det.plato?.id || det.productId || 0);
              const unitPrice = Number(det.precio != null ? det.precio : det.plato?.precio || 0);

              await db.orderItems.put({
                id: det.id,
                remoteId: det.id,
                comandaId: comanda.id,
                orderId: comanda.id, // Duplicado para compatibilidad Dexie
                platoId: platoIdResolved,
                productId: platoIdResolved, // Duplicado para compatibilidad Dexie
                nombre: det.plato?.nombre || det.nombre || 'Plato',
                precio: unitPrice,
                precioVenta: unitPrice,
                cantidad: Number(det.cantidad || 1),
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

      // 6. Hidratar ARQUEOS, MOVIMIENTOS y VENTAS DE SESIÓN
      if (balance) {
        const lastArqueoIdStr = String(balance.id);
        
        // Protección de merge para la sesión de caja
        if (!pendingCashIds.has(lastArqueoIdStr)) {
          if (balance.estado === 'abierto') {
            const userName = balance.usuarioNombre || balance.usuario?.nombre || 'Caja Prueba';
            await db.arqueos.put({
              id: balance.id,
              numeroSesion: balance.numeroSesion != null ? balance.numeroSesion : balance.id,
              usuarioId: balance.usuarioId || null,
              usuarioNombre: userName,
              usuario: { nombre: userName },
              montoInicial: Number(balance.inicio || 0),
              estado: 'abierto',
              fechaInicio: balance.fechaInicio || new Date().toISOString()
            });

            // Limpiar movimientos locales inválidos (como ventas erróneamente guardadas como movimientos)
            const localMovements = await db.movimientosCaja.toArray();
            for (const lm of localMovements) {
              if (String(lm.concepto || '').toLowerCase().startsWith('venta')) {
                await db.movimientosCaja.delete(lm.id).catch(() => {});
              }
            }

            // Registrar los movimientos manuales asociados (excluyendo ventas)
            const remoteMovements = balance.movimientos || [];
            for (const mov of remoteMovements) {
              if (pendingCashIds.has(String(mov.id))) continue;
              if (String(mov.concepto || '').toLowerCase().startsWith('venta')) continue;

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

            // Hidratar las ventas cerradas de la sesión para que el balance offline preserve el historial completo del turno
            const remoteVentas = balance.ventas || [];
            for (const sale of remoteVentas) {
              const saleIdStr = String(sale.id);
              if (pendingOrderIds.has(saleIdStr)) continue;

              await db.orders.put({
                id: sale.id,
                remoteId: sale.id,
                mesaId: Number(sale.mesaNum || sale.mesaId || 0),
                tableId: Number(sale.mesaNum || sale.mesaId || 0),
                fecha: sale.hora || new Date().toISOString(),
                fechaCierre: sale.hora || new Date().toISOString(),
                estado: 'cerrada',
                status: 'cerrada',
                metodoPago: sale.metodoPago || sale.metodo || 'efectivo',
                tipoDocumento: sale.tipoDocumento || sale.doc || 'sin_comprobante',
                montoRecibido: Number(sale.total || 0),
                total: Number(sale.total || 0),
                propina: Number(sale.propina || 0),
                syncStatus: 'SYNCED',
                createdAt: sale.hora || new Date().toISOString(),
                updatedAt: sale.hora || new Date().toISOString()
              });

              for (const item of (sale.items || [])) {
                await db.orderItems.put({
                  id: item.id || `hist_${sale.id}_${item.platoId || Math.random()}`,
                  comandaId: sale.id,
                  orderId: sale.id,
                  platoId: Number(item.platoId || 0),
                  productId: Number(item.platoId || 0),
                  nombre: item.descripcion || 'Plato',
                  precio: Number(item.precio || 0),
                  precioVenta: Number(item.precio || 0),
                  cantidad: Number(item.cantidad || 1),
                  estado: 'entregado',
                  fechaCreacion: sale.hora || new Date().toISOString(),
                  createdAt: sale.hora || new Date().toISOString()
                });
              }
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
