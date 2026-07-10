import db from '../database';
import { QueueStatus } from '../tables';
import { queueService } from '../queue/queueService';
import { syncDispatcher } from './syncDispatcher';
import { SYNC_CONFIG } from './syncConfig';
import { classifyError } from './errorClassifier';
import { getCurrentDate } from '../offlineUtils';

export const SyncEngineState = Object.freeze({
  STOPPED: 'STOPPED',
  IDLE: 'IDLE',
  SYNCING: 'SYNCING',
  BACKOFF: 'BACKOFF'
});

let engineState = SyncEngineState.STOPPED;
let syncInProgress = false;
let lastRunResult = null;

/**
 * Reclama atómicamente la siguiente operación PENDING sincronizable de la cola
 * cambiándola a estado PROCESSING de forma transaccional en Dexie.
 * 
 * @returns {Promise<Object|null>} Operación reclamada o null si no hay ninguna
 */
export const claimNextSyncable = async () => {
  return await db.transaction('rw', db.syncQueue, async () => {
    // 1. Obtener la lista de pendientes sincronizables ordenados FIFO
    const pending = await queueService.getPendingSyncable();
    if (pending.length === 0) return null;

    // Tomar la primera según FIFO determinista
    const nextOp = pending[0];
    const timestamp = getCurrentDate();
    
    // Cambiar estado a PROCESSING
    await db.syncQueue.update(nextOp.id, {
      status: QueueStatus.PROCESSING,
      updatedAt: timestamp
    });

    // Devolver objeto actualizado
    return {
      ...nextOp,
      status: QueueStatus.PROCESSING,
      updatedAt: timestamp
    };
  });
};

/**
 * Recupera operaciones que quedaron en estado PROCESSING por un cierre inesperado de la aplicación.
 * Evalúa operaciones basándose en updatedAt.
 * 
 * @returns {Promise<number>} Cantidad de operaciones recuperadas
 */
export const recoverStaleOperations = async () => {
  const threshold = Date.now() - SYNC_CONFIG.STALE_TIMEOUT_MS;
  return await db.transaction('rw', db.syncQueue, async () => {
    const processingOps = await db.syncQueue
      .where('status')
      .equals(QueueStatus.PROCESSING)
      .toArray();

    let recoveredCount = 0;
    const timestamp = getCurrentDate();
    
    for (const op of processingOps) {
      const opTime = new Date(op.updatedAt || op.createdAt).getTime();
      // Si superó el timeout de inactividad, devolver a PENDING
      if (opTime < threshold) {
        await db.syncQueue.update(op.id, {
          status: QueueStatus.PENDING,
          updatedAt: timestamp
        });
        recoveredCount++;
      }
    }
    return recoveredCount;
  });
};

export const syncEngine = {
  /**
   * Obtiene el estado actual del motor.
   * @returns {string}
   */
  getState() {
    return engineState;
  },

  /**
   * Obtiene el resultado de la última ejecución.
   * @returns {Object|null}
   */
  getLastRun() {
    return lastRunResult;
  },

  /**
   * Arranca el motor de sincronización.
   * En la Fase 5A es pasivo: cambia el estado a IDLE pero no levanta timers automáticos ni listeners.
   */
  start() {
    if (engineState !== SyncEngineState.STOPPED) return;
    engineState = SyncEngineState.IDLE;
    if (import.meta.env.DEV) {
      console.log('[SyncEngine] Arrancado en modo pasivo (IDLE). Sincronización manual disponible.');
    }
  },

  /**
   * Detiene el motor de sincronización.
   */
  stop() {
    engineState = SyncEngineState.STOPPED;
    if (import.meta.env.DEV) {
      console.log('[SyncEngine] Detenido.');
    }
  },

  /**
   * Ejecuta el procesamiento de la cola offline.
   * Cuenta con un mutex en memoria y protección entre pestañas mediante Web Locks API.
   * 
   * @returns {Promise<Object>} Resumen de la ejecución
   */
  async trigger() {
    if (engineState === SyncEngineState.STOPPED) {
      throw new Error('No se puede ejecutar trigger si el motor de sincronización está STOPPED.');
    }

    // Mutex 1: Evitar concurrencia en la misma pestaña
    if (syncInProgress) {
      if (import.meta.env.DEV) {
        console.warn('[SyncEngine] trigger() ignorado: ya existe una ejecución activa en esta pestaña.');
      }
      return lastRunResult || { status: 'busy' };
    }

    syncInProgress = true;
    engineState = SyncEngineState.SYNCING;
    const startTime = Date.now();
    
    const runSummary = {
      startedAt: new Date(startTime).toISOString(),
      finishedAt: null,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      durationMs: 0
    };

    // Mutex 2: Evitar concurrencia entre múltiples pestañas usando Web Locks API
    try {
      if (typeof navigator !== 'undefined' && navigator.locks) {
        await navigator.locks.request('bunker-offline-sync', { ifAvailable: true }, async (lock) => {
          if (!lock) {
            if (import.meta.env.DEV) {
              console.warn('[SyncEngine] trigger() abortado: bloqueo multi-pestaña activo en otra pestaña.');
            }
            runSummary.skipped = 1;
            return;
          }
          await this.processBatch(runSummary);
        });
      } else {
        // Fallback: usar solo el mutex en memoria 'syncInProgress'
        if (import.meta.env.DEV) {
          console.warn('[SyncEngine] navigator.locks no disponible. Protección multi-pestaña limitada al mutex local de pestaña.');
        }
        await this.processBatch(runSummary);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[SyncEngine] Error en procesamiento del lote:', err);
      }
    } finally {
      syncInProgress = false;
      engineState = SyncEngineState.IDLE;
      
      const endTime = Date.now();
      runSummary.finishedAt = new Date(endTime).toISOString();
      runSummary.durationMs = endTime - startTime;
      lastRunResult = runSummary;
    }

    return runSummary;
  },

  /**
   * Procesa de uno en uno (FIFO estricto) los elementos sincronizables.
   * Si ocurre un fallo en una operación, se cancela el procesamiento del lote de inmediato
   * para evitar reintentos automáticos instantáneos hasta agotar el límite en el mismo ciclo.
   * 
   * @param {Object} summary Objeto de estadísticas
   */
  async processBatch(summary) {
    let nextOp = await claimNextSyncable();
    
    while (nextOp) {
      summary.processed++;
      const success = await this.processNext(nextOp);
      
      if (success) {
        summary.succeeded++;
      } else {
        summary.failed++;
        // AJUSTE CRÍTICO: ante cualquier error en la cola, detener el lote inmediatamente
        if (import.meta.env.DEV) {
          console.warn(`[SyncEngine] Deteniendo procesamiento del lote por error en operación "${nextOp.id}".`);
        }
        break;
      }
      nextOp = await claimNextSyncable();
    }
  },

  /**
   * Procesa una única operación encolada.
   * 
   * @param {Object} operation La operación en estado PROCESSING
   * @returns {Promise<boolean>} True si tuvo éxito
   */
  async processNext(operation) {
    try {
      // 1. Validar si ya superó el límite de reintentos
      if (operation.retryCount >= SYNC_CONFIG.MAX_RETRY_COUNT) {
        const err = new Error(`Excedió el límite máximo de ${SYNC_CONFIG.MAX_RETRY_COUNT} reintentos.`);
        await queueService.markFailed(operation.id, err);
        return false;
      }

      // 2. Despachar al handler correspondiente
      const result = await syncDispatcher.dispatch(operation);
      
      if (result && result.success) {
        const timestamp = getCurrentDate();
        
        // 3. Almacenar éxito
        if (result.dryRun) {
          // Metadatos inequívocos exigidos para Dry Run
          await db.transaction('rw', db.syncQueue, async () => {
            await db.syncQueue.update(operation.id, {
              status: QueueStatus.DONE,
              updatedAt: timestamp,
              syncResult: {
                mode: 'dry-run',
                dryRun: true,
                validatedAt: timestamp,
                handler: 'productSyncHandler',
                remoteMutation: false,
                result: result.result
              }
            });
          });
        } else {
          // Sincronización Real Exitosa (Fase 5B)
          // Actualizar snapshot local conservando el ID local estable
          await db.transaction('rw', [db.products, db.syncQueue], async () => {
            const localId = result.result.localEntityId;
            const remoteId = String(result.result.remoteEntityId);
            
            // 1. Actualizar el snapshot del producto con su remoteId y syncStatus
            if (operation.entity === 'PRODUCT') {
              const existing = await db.products.get(localId);
              if (existing) {
                await db.products.update(localId, {
                  remoteId: remoteId,
                  syncStatus: 'SYNCED'
                });
              }
            }
            
            // 2. Marcar la operación como DONE con metadatos reales de sincronización
            await db.syncQueue.update(operation.id, {
              status: QueueStatus.DONE,
              updatedAt: timestamp,
              syncResult: {
                mode: 'real',
                dryRun: false,
                remoteMutation: true,
                operationId: operation.operationId,
                remoteEntityId: remoteId,
                duplicate: result.duplicate || false,
                completedAt: timestamp
              }
            });
          });
        }
        return true;
      } else {
        const err = new Error(result?.message || 'Fallo lógico en el despachador de sincronización.');
        await this.handleProcessingFailure(operation, err);
        return false;
      }
    } catch (err) {
      await this.handleProcessingFailure(operation, err);
      return false;
    }
  },

  /**
   * Maneja el fallo del procesamiento de una operación, clasificando el error.
   * 
   * @param {Object} operation 
   * @param {Error} error 
   */
  async handleProcessingFailure(operation, error) {
    const category = classifyError(error);
    const timestamp = getCurrentDate();
    
    if (import.meta.env.DEV) {
      console.warn(`[SyncEngine] Fallo al procesar operación "${operation.id}" (${category}):`, error);
    }

    const structuredError = {
      name: error.name || 'SyncError',
      message: error.message || 'Error desconocido',
      code: category,
      timestamp
    };

    if (category === 'RETRYABLE' && operation.retryCount < SYNC_CONFIG.MAX_RETRY_COUNT) {
      // Retornar a PENDING e incrementar retryCount de forma segura
      await db.transaction('rw', db.syncQueue, async () => {
        await db.syncQueue.update(operation.id, {
          status: QueueStatus.PENDING,
          retryCount: operation.retryCount + 1,
          updatedAt: timestamp,
          lastError: structuredError
        });
      });
      engineState = SyncEngineState.BACKOFF;
    } else {
      // Marcar como FAILED de forma permanente, conservando el retryCount actual sin cambios
      await db.transaction('rw', db.syncQueue, async () => {
        await db.syncQueue.update(operation.id, {
          status: QueueStatus.FAILED,
          updatedAt: timestamp,
          lastError: structuredError
        });
      });
    }
  }
};
