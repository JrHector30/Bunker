import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initDatabase, db, offlineService, queueService, createOperation, QueueStatus, recordOperation, isRecordingEnabled, getRecordingMode, setRecordingMode, syncEngine, recoverStaleOperations, RecordingSource, SYNC_CONFIG, getCurrentDate, offlineReadiness, offlineSnapshotService, offlineKitchenService } from './offline'

// Initialize local database passively
initDatabase();

// Expose DevTools diagnostic helper only in development mode
if (import.meta.env.DEV) {
  window.BunkerOffline = {
    database: db,
    tables: () => db.tables.map(t => t.name),
    clear: () => offlineService.clear(),
    readiness: {
      inspect: () => offlineReadiness.inspect(),
      hydrate: () => offlineSnapshotService.hydrateOperationalSnapshot()
    },
    stats: async () => {
      const counts = {};
      for (const table of db.tables) {
        try {
          counts[table.name] = await table.count();
        } catch (err) {
          counts[table.name] = 'Error: ' + err.message;
        }
      }
      return {
        databaseName: db.name,
        version: db.verno,
        tables: db.tables.map(t => t.name),
        counts
      };
    },
    queue: {
      all: async () => {
        const ops = await db.syncQueue.toArray();
        return ops.sort((a, b) => {
          if (a.createdAt < b.createdAt) return -1;
          if (a.createdAt > b.createdAt) return 1;
          if (a.id < b.id) return -1;
          if (a.id > b.id) return 1;
          return 0;
        });
      },
      pending: () => queueService.getPending(),
      getPendingSyncable: () => queueService.getPendingSyncable(),
      processing: () => queueService.getProcessing(),
      failed: () => queueService.getFailed(),
      done: () => db.syncQueue.where('status').equals(QueueStatus.DONE).toArray(),
      count: () => db.syncQueue.count(),
      clearCompleted: () => queueService.clearCompleted(),
      findByOperationId: async (operationId) => {
        const ops = await db.syncQueue.where('operationId').equals(operationId).toArray();
        return ops[0];
      },
      findById: async (id) => {
        return await db.syncQueue.get(id);
      },
      inspectLostResponse: async (operationId) => {
        const ops = await db.syncQueue.where('operationId').equals(operationId).toArray();
        const opByOpId = ops[0];
        
        let opById = null;
        if (opByOpId && opByOpId.id) {
          opById = await db.syncQueue.get(opByOpId.id);
        }

        const raw = opByOpId || {};
        return {
          foundByOperationId: !!opByOpId,
          foundById: !!opById,
          id: raw.id || null,
          operationId: raw.operationId || null,
          status: raw.status || null,
          retryCount: raw.retryCount !== undefined ? raw.retryCount : null,
          payloadSimulateLostResponse: raw.payload ? !!raw.payload.simulateLostResponse : null,
          updatedAt: raw.updatedAt || null,
          lastError: raw.lastError || null,
          rawRecord: raw
        };
      },
      stats: async () => {
        const all = await db.syncQueue.toArray();
        return {
          total: all.length,
          pending: all.filter(op => op.status === QueueStatus.PENDING).length,
          processing: all.filter(op => op.status === QueueStatus.PROCESSING).length,
          failed: all.filter(op => op.status === QueueStatus.FAILED).length,
          done: all.filter(op => op.status === QueueStatus.DONE).length
        };
      },
      test: async (options = {}) => {
        const op = createOperation({
          entity: options.entity || 'ORDER',
          entityId: options.entityId || 'test-order-001',
          operation: options.operation || 'CREATE_ORDER',
          payload: options.payload || { tableId: 'test-table', total: 50 },
          operationId: options.operationId
        });
        return await queueService.enqueue(op);
      }
    },
    operations: {
      isEnabled: () => isRecordingEnabled(),
      setEnabled: (enabled) => setRecordingMode(enabled ? 'diagnostic' : 'disabled'),
      getRecordingMode: () => getRecordingMode(),
      recordTest: async () => {
        const previousMode = getRecordingMode();
        setRecordingMode('diagnostic');
        try {
          const res = await recordOperation({
            entity: 'ORDER',
            entityId: 'test-adapter-order-999',
            operation: 'CREATE_ORDER',
            payload: {
              tableId: 'test-adapter-table',
              total: 120,
              items: [{ productId: 'test-p1', quantity: 2 }]
            },
            source: 'diagnostic'
          });
          return res;
        } finally {
          setRecordingMode(previousMode);
        }
      }
    },
    shadow: {
      stats: async () => {
        const all = await db.syncQueue.where('recordingSource').equals(RecordingSource.SHADOW).toArray();
        return {
          total: all.length,
          creates: all.filter(op => op.operation === 'CREATE').length,
          updates: all.filter(op => op.operation === 'UPDATE').length,
          deletes: all.filter(op => op.operation === 'DELETE').length
        };
      },
      operations: async () => {
        const ops = await db.syncQueue.where('recordingSource').equals(RecordingSource.SHADOW).toArray();
        return ops.sort((a, b) => {
          if (a.createdAt < b.createdAt) return -1;
          if (a.createdAt > b.createdAt) return 1;
          if (a.id < b.id) return -1;
          if (a.id > b.id) return 1;
          return 0;
        });
      },
      products: () => db.products.toArray()
    },
    sync: {
      start: () => syncEngine.start(),
      stop: () => syncEngine.stop(),
      state: () => syncEngine.getState(),
      lastRun: () => syncEngine.getLastRun(),
      trigger: () => syncEngine.trigger(),
      recoverStale: () => recoverStaleOperations(),
      pending: () => queueService.getPendingSyncable(),
      config: () => ({
        dryRun: SYNC_CONFIG.DRY_RUN,
        realEnabled: SYNC_CONFIG.REAL_ENABLED,
        realMutationAllowed: SYNC_CONFIG.DRY_RUN === false && SYNC_CONFIG.REAL_ENABLED === true
      }),
      createTestProductOperation: async (options = {}) => {
        const op = createOperation({
          entity: 'PRODUCT',
          entityId: options.entityId || 'offline-test-product-001',
          operation: options.operation || 'CREATE',
          payload: options.payload || {
            nombre: 'Producto Offline Test',
            precio: 10.0,
            descripcion: 'Prueba Sync Engine'
          },
          operationId: options.operationId
        });
        op.recordingSource = RecordingSource.OFFLINE;
        return await queueService.enqueue(op);
      },
      createTestInvalidOperation: async () => {
        // Encolado válido por esquema, pero fallará con error 400 (NON_RETRYABLE)
        // al ser validado internamente por el productSyncHandler
        const op = createOperation({
          entity: 'PRODUCT',
          entityId: 'product-invalid-001',
          operation: 'CREATE',
          payload: { invalidTest: true }
        });
        op.recordingSource = RecordingSource.OFFLINE;
        return await queueService.enqueue(op);
      },
      replay: async (operationId) => {
        // Devuelve la operación a PENDING conservando el mismo operationId
        return await db.transaction('rw', db.syncQueue, async () => {
          const ops = await db.syncQueue.where('operationId').equals(operationId).toArray();
          if (ops.length === 0) throw new Error(`No se encontró operación con ID: ${operationId}`);
          const op = ops[0];
          await db.syncQueue.update(op.id, {
            status: QueueStatus.PENDING,
            updatedAt: getCurrentDate()
          });
        });
      },
      createRealTestProductOperation: async (options = {}) => {
        // Obtener una categoría válida del snapshot local si existe
        const localProducts = await db.products.toArray();
        let fallbackCatId = 1;
        if (localProducts.length > 0 && localProducts[0].categoriaId) {
          fallbackCatId = localProducts[0].categoriaId;
        }

        const op = createOperation({
          entity: 'PRODUCT',
          entityId: options.entityId || `real-sync-test-${Date.now()}`,
          operation: 'CREATE',
          payload: {
            nombre: options.nombre || 'BUNKER SYNC TEST 5B',
            precio: options.precio || 1.0,
            categoriaId: options.categoriaId || fallbackCatId,
            descripcion: options.descripcion || 'Prueba de Sincronización Real',
            simulateLostResponse: options.simulateLostResponse || false
          },
          operationId: options.operationId
        });
        op.recordingSource = RecordingSource.OFFLINE;

        // Registrar localmente el producto en la tabla local 'products' en estado 'PENDING'
        await db.transaction('rw', db.products, async () => {
          await db.products.put({
            id: op.entityId,
            nombre: op.payload.nombre,
            precio: op.payload.precio,
            categoriaId: op.payload.categoriaId,
            descripcion: op.payload.descripcion,
            activo: true,
            deleted: false,
            syncStatus: 'PENDING'
          });
        });

        return await queueService.enqueue(op);
      }
    },
    // ─── DEV HELPERS: Inspección de datos operativos offline ──────────────────
    offline: {
      /**
       * Lista todas las comandas locales en IndexedDB.
       * Útil para verificar que createOrder() persiste correctamente.
       */
      orders: () => db.orders.toArray(),

      /**
       * Lista todos los detalles de comanda en IndexedDB.
       * Verifica que orderItems tengan orderId/comandaId y platoId correctos.
       */
      orderItems: () => db.orderItems.toArray(),

      /**
       * Invoca offlineKitchenService.getQueue() directamente.
       * Debe devolver los platos de la comanda local que sean aptos para cocina.
       */
      kitchenQueue: () => offlineKitchenService.getQueue(),

      /**
       * Diagnóstico cruzado: verifica que cada orderItem tenga
       * una comanda padre válida y que sus IDs coincidan.
       */
      diagnose: async () => {
        const orders = await db.orders.toArray();
        const items = await db.orderItems.toArray();
        const orderMap = new Map(orders.map(o => [o.id, o]));
        const orphaned = items.filter(item => {
          const orderId = item.orderId || item.comandaId;
          return !orderMap.has(orderId);
        });
        const matched = items.filter(item => {
          const orderId = item.orderId || item.comandaId;
          return orderMap.has(orderId);
        });
        return {
          totalOrders: orders.length,
          totalItems: items.length,
          matchedItems: matched.length,
          orphanedItems: orphaned.length,
          orphaned,
          orders,
          items
        };
      },

      /**
       * Devuelve los orderItems huérfanos (sin comanda padre) con contexto completo.
       * Para cada ítem indica si existe una operación PENDING en syncQueue relacionada.
       *
       * Uso:
       *   await BunkerOffline.offline.orphanedItems()
       */
      orphanedItems: async () => {
        const orders = await db.orders.toArray();
        const items = await db.orderItems.toArray();
        const pendingOps = await db.syncQueue.where('status').equals('PENDING').toArray();

        const orderMap = new Map(orders.map(o => [o.id, o]));

        // Construir un set de IDs de comanda que tienen operaciones pendientes
        const pendingEntityIds = new Set(pendingOps.map(op => op.entityId));

        const orphaned = items
          .filter(item => {
            const parentId = item.orderId || item.comandaId;
            return !orderMap.has(parentId);
          })
          .map(item => {
            const parentId = item.orderId || item.comandaId;
            const hasPendingOp = pendingEntityIds.has(item.id) || pendingEntityIds.has(parentId);
            return {
              id: item.id,
              orderId: item.orderId || null,
              comandaId: item.comandaId || null,
              productId: item.productId || null,
              platoId: item.platoId || null,
              cantidad: item.cantidad || null,
              estado: item.estado || null,
              createdAt: item.createdAt || item.fechaCreacion || null,
              relatedOrderExists: false,
              operationPending: hasPendingOp
            };
          });

        console.table(orphaned);
        return orphaned;
      },

      /**
       * Limpia los orderItems huérfanos de forma controlada.
       *
       * Reglas de seguridad — solo se elimina un ítem si:
       *   1. No existe comanda padre en IndexedDB.
       *   2. No tiene ninguna operación PENDING en syncQueue relacionada.
       *
       * Uso (primero inspeccionar, luego confirmar):
       *   await BunkerOffline.offline.cleanupOrphanedItems({ dryRun: true })
       *   await BunkerOffline.offline.cleanupOrphanedItems({ dryRun: false })
       *
       * @param {{ dryRun?: boolean }} options
       */
      cleanupOrphanedItems: async ({ dryRun = true } = {}) => {
        const orders = await db.orders.toArray();
        const items = await db.orderItems.toArray();
        const pendingOps = await db.syncQueue.where('status').equals('PENDING').toArray();

        const orderMap = new Map(orders.map(o => [o.id, o]));
        const pendingEntityIds = new Set(pendingOps.map(op => op.entityId));

        // Candidatos a eliminar: huérfanos sin operación pendiente
        const toDelete = items.filter(item => {
          const parentId = item.orderId || item.comandaId;
          const isOrphan = !orderMap.has(parentId);
          const hasPendingOp = pendingEntityIds.has(item.id) || pendingEntityIds.has(parentId);
          return isOrphan && !hasPendingOp;
        });

        // Ítems protegidos (huérfanos con operación pendiente — no se tocan)
        const protected_ = items.filter(item => {
          const parentId = item.orderId || item.comandaId;
          const isOrphan = !orderMap.has(parentId);
          const hasPendingOp = pendingEntityIds.has(item.id) || pendingEntityIds.has(parentId);
          return isOrphan && hasPendingOp;
        });

        const result = {
          dryRun,
          wouldDelete: toDelete.length,
          wouldKeepProtected: protected_.length,
          itemsToDelete: toDelete.map(i => ({
            id: i.id,
            orderId: i.orderId || i.comandaId,
            platoId: i.platoId || i.productId,
            estado: i.estado,
            createdAt: i.createdAt || i.fechaCreacion
          })),
          protectedItems: protected_.map(i => ({
            id: i.id,
            orderId: i.orderId || i.comandaId,
            reason: 'operación PENDING en syncQueue'
          }))
        };

        if (dryRun) {
          console.log('[cleanupOrphanedItems] DRY RUN — nada fue eliminado.');
          console.table(result.itemsToDelete);
          return result;
        }

        // Eliminación real dentro de una transacción
        const idsToDelete = toDelete.map(i => i.id);
        await db.transaction('rw', db.orderItems, async () => {
          await db.orderItems.bulkDelete(idsToDelete);
        });

        console.log(`[cleanupOrphanedItems] Eliminados ${idsToDelete.length} ítems huérfanos.`);
        return { ...result, deleted: idsToDelete.length };
      },

      /**
       * Traza el pipeline completo de filtrado de la cola de cocina offline.
       * Muestra exactamente en qué etapa desaparece cada ítem y por qué.
       *
       * Uso:
       *   await BunkerOffline.offline.inspectKitchenPipeline()
       */
      inspectKitchenPipeline: async () => {
        const [tables, products, orders, rawItems] = await Promise.all([
          db.table('tables').toArray(),
          db.products.toArray(),
          db.orders.toArray(),
          db.orderItems.toArray()
        ]);

        // Construir mapas con la misma lógica corregida
        const tableMap = new Map(tables.map(t => [String(t.id), t]));
        const productMap = new Map();
        products.forEach(p => {
          if (p.id != null) productMap.set(String(p.id), p);
          if (p.remoteId != null) productMap.set(String(p.remoteId), p);
        });
        const orderMap = new Map();
        orders.forEach(o => {
          if (o.id != null) orderMap.set(String(o.id), o);
          if (o.remoteId != null) orderMap.set(String(o.remoteId), o);
        });

        let kitchenCategories = new Set();
        let hasCategoryFilter = false;
        try {
          const cachedCats = localStorage.getItem('categories');
          if (cachedCats) {
            const parsed = JSON.parse(cachedCats);
            if (Array.isArray(parsed) && parsed.length > 0) {
              parsed.forEach(c => { if (c.enviarCocina) kitchenCategories.add(String(c.id)); });
              hasCategoryFilter = kitchenCategories.size > 0;
            }
          }
        } catch (e) { /* ignore */ }

        const excluded = [];

        const stage1 = rawItems.filter(item => {
          const est = (item.estado || 'pendiente').toLowerCase();
          if (est === 'entregado' || est === 'anulado') {
            excluded.push({ itemId: item.id, reason: `estado terminal: ${est}`, estado: item.estado, orderId: item.orderId, comandaId: item.comandaId, productId: item.productId, platoId: item.platoId });
            return false;
          }
          return true;
        });

        const stage2 = stage1.filter(item => {
          const parentId = String(item.orderId || item.comandaId || '');
          if (!parentId) {
            excluded.push({ itemId: item.id, reason: 'sin orderId ni comandaId', estado: item.estado, orderId: item.orderId, comandaId: item.comandaId, productId: item.productId, platoId: item.platoId });
            return false;
          }
          const order = orderMap.get(parentId);
          if (!order) {
            excluded.push({ itemId: item.id, reason: `comanda no encontrada: parentId="${parentId}"`, estado: item.estado, orderId: item.orderId, comandaId: item.comandaId, productId: item.productId, platoId: item.platoId });
            return false;
          }
          const orderEstado = (order.estado || order.status || 'pendiente').toLowerCase();
          if (orderEstado === 'cerrada' || orderEstado === 'anulada') {
            excluded.push({ itemId: item.id, reason: `comanda con estado: ${orderEstado}`, estado: item.estado, orderId: item.orderId, comandaId: item.comandaId, productId: item.productId, platoId: item.platoId });
            return false;
          }
          return true;
        });

        const stage3 = stage2.filter(item => {
          const productKey = String(item.platoId || item.productId || '');
          if (!productKey) {
            excluded.push({ itemId: item.id, reason: 'sin platoId ni productId', estado: item.estado, orderId: item.orderId, comandaId: item.comandaId, productId: item.productId, platoId: item.platoId });
            return false;
          }
          return true;
        });

        const stage4 = stage3.filter(item => {
          const productKey = String(item.platoId || item.productId || '');
          const plato = productMap.get(productKey);
          if (!plato) return true; // permisivo — fallback visual
          if (hasCategoryFilter) {
            const catId = plato.categoriaId != null ? String(plato.categoriaId)
                        : plato.categoryId != null ? String(plato.categoryId)
                        : null;
            if (catId !== null && !kitchenCategories.has(catId)) {
              excluded.push({ itemId: item.id, reason: `categoría ${catId} no es cocina`, estado: item.estado, orderId: item.orderId, comandaId: item.comandaId, productId: item.productId, platoId: item.platoId });
              return false;
            }
          }
          return true;
        });

        const result = {
          rawItems: rawItems.length,
          itemsAfterStatusFilter: stage1.length,
          itemsAfterOrderJoin: stage2.length,
          itemsAfterProductKeyCheck: stage3.length,
          itemsAfterCategoryFilter: stage4.length,
          finalQueue: stage4.length,
          hasCategoryFilter,
          kitchenCategoryIds: [...kitchenCategories],
          excluded,
          stage4Items: stage4.map(i => ({
            id: i.id,
            estado: i.estado,
            orderId: i.orderId || i.comandaId,
            platoId: i.platoId || i.productId
          }))
        };

        console.log('[inspectKitchenPipeline]', result);
        if (excluded.length > 0) console.table(excluded);
        return result;
      },

      /**
       * Diagnóstico de cuentas abiertas offline (espejo del builder de CashierView).
       * Devuelve por cada comanda: mesa resuelta, detalles, precios y total calculado.
       *
       * Uso:
       *   await BunkerOffline.offline.inspectOpenAccounts()
       */
      inspectOpenAccounts: async () => {
        const [orders, orderItems, products, tables] = await Promise.all([
          db.orders.toArray(),
          db.orderItems.toArray(),
          db.products.toArray(),
          db.table('tables').toArray()
        ]);

        const productMap = new Map();
        products.forEach(p => {
          if (p.id != null) productMap.set(String(p.id), p);
          if (p.remoteId != null) productMap.set(String(p.remoteId), p);
        });
        const tableMap = new Map(tables.map(t => [String(t.id), t]));

        // Filtrar órdenes activas
        const activeOrders = orders.filter(o => {
          const est = (o.estado || o.status || '').toLowerCase();
          return est !== 'cerrada' && est !== 'anulada';
        });

        const result = activeOrders.map(order => {
          const resolvedTableId = order.mesaId != null ? String(order.mesaId)
                                : order.tableId != null ? String(order.tableId) : null;
          const mesa = resolvedTableId ? tableMap.get(resolvedTableId) : null;
          const mesaNumero = mesa
            ? (mesa.numero ?? mesa.name ?? resolvedTableId)
            : (resolvedTableId ?? '?');

          const exclusions = [];
          const rawItems = orderItems.filter(item => {
            const parentId = String(item.comandaId || item.orderId || '');
            return parentId === String(order.id);
          });

          const mappedItems = rawItems.map(item => {
            const productKey = String(item.platoId || item.productId || '');
            const product = productMap.get(productKey);
            const unitPrice = item.precio != null ? Number(item.precio)
                            : item.precioVenta != null ? Number(item.precioVenta)
                            : product?.precio != null ? Number(product.precio)
                            : product?.precioVenta != null ? Number(product.precioVenta)
                            : 0;
            const qty = Number(item.cantidad ?? item.quantity ?? 1);
            const lineTotal = qty * unitPrice;

            if (!product) exclusions.push({ itemId: item.id, reason: `producto ${productKey} no encontrado en snapshot local` });
            if (unitPrice === 0) exclusions.push({ itemId: item.id, reason: 'precio resuelto como 0' });

            return {
              id: item.id,
              orderId: item.orderId || null,
              comandaId: item.comandaId || null,
              productId: item.productId || null,
              platoId: item.platoId || null,
              productKey,
              quantity: qty,
              cantidad: item.cantidad ?? null,
              productFound: !!product,
              productName: product?.nombre ?? 'sin datos',
              unitPrice,
              lineTotal
            };
          });

          const calculatedTotal = mappedItems.reduce((s, i) => s + i.lineTotal, 0);

          return {
            orderId: order.id,
            mesaId: order.mesaId ?? null,
            tableId: order.tableId ?? null,
            resolvedTableId,
            tableFound: !!mesa,
            tableNumber: mesaNumero,
            estado: order.estado ?? null,
            status: order.status ?? null,
            itemCount: mappedItems.length,
            items: mappedItems,
            calculatedTotal,
            exclusions
          };
        });

        console.log('[inspectOpenAccounts] Cuentas activas:', result.length);
        console.table(result.map(r => ({
          orderId: r.orderId?.slice(0, 8),
          mesa: r.tableNumber,
          tableFound: r.tableFound,
          items: r.itemCount,
          total: r.calculatedTotal.toFixed(2),
          exclusions: r.exclusions.length
        })));
        return result;
      }
    }
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((err) => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}
