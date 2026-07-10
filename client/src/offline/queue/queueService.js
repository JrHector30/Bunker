import db from '../database';
import { QueueStatus } from '../tables';
import { getCurrentDate } from '../offlineUtils';

/**
 * Valida si la transición de estado en la máquina de estados local es válida.
 * 
 * @param {string} currentStatus Estado actual
 * @param {string} nextStatus Estado destino
 * @throws {Error} Si la transición no está permitida
 */
const validateTransition = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) return; // Permitir transición al mismo estado (no-op)

  if (currentStatus === QueueStatus.PENDING && nextStatus === QueueStatus.PROCESSING) return;
  if (currentStatus === QueueStatus.PROCESSING && (nextStatus === QueueStatus.DONE || nextStatus === QueueStatus.FAILED)) return;
  if (currentStatus === QueueStatus.FAILED && nextStatus === QueueStatus.PENDING) return;

  throw new Error(`Transición de estado inválida rechazada: "${currentStatus}" -> "${nextStatus}"`);
};

/**
 * Función comparadora para ordenar operaciones de forma estable y determinista (FIFO).
 * Criterio principal: createdAt ASC. Criterio secundario: id ASC.
 */
const sortFIFO = (a, b) => {
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
};

export const queueService = {
  /**
   * Encola una nueva operación de manera transaccional e idempotente (doble capa).
   * 
   * @param {Object} opData Operación validada generada por createOperation
   * @returns {Promise<Object>} La operación persistida en la cola
   */
  async enqueue(opData) {
    return await db.transaction('rw', db.syncQueue, async () => {
      // CAPA 1: Validación lógica en la transacción
      if (opData.operationId) {
        const existing = await db.syncQueue.where('operationId').equals(opData.operationId).first();
        if (existing) {
          if (import.meta.env.DEV) {
            console.warn(`[QueueService] Operación duplicada evitada lógicamente. operationId: ${opData.operationId}`);
          }
          return existing;
        }
      }

      // CAPA 2: Restricción única en base de datos (&operationId)
      try {
        await db.syncQueue.add(opData);
        return opData;
      } catch (err) {
        // Capturar conflicto de clave única local
        if (err.name === 'ConstraintError' || err.message.includes('already exists')) {
          if (import.meta.env.DEV) {
            console.warn(`[QueueService] Concurrencia controlada por restricción de base de datos. operationId: ${opData.operationId}`);
          }
          const existing = await db.syncQueue.where('operationId').equals(opData.operationId).first();
          if (existing) {
            return existing;
          }
        }
        throw err;
      }
    });
  },

  /**
   * Obtiene una operación por su ID técnico local.
   * @param {string} id 
   * @returns {Promise<Object|undefined>}
   */
  async getById(id) {
    return await db.syncQueue.get(id);
  },

  /**
   * Obtiene una operación por su identificador lógico.
   * @param {string} operationId 
   * @returns {Promise<Object|undefined>}
   */
  async getByOperationId(operationId) {
    return await db.syncQueue.where('operationId').equals(operationId).first();
  },

  /**
   * Obtiene todas las operaciones en estado PENDING ordenadas por FIFO determinista.
   * @returns {Promise<Object[]>}
   */
  async getPending() {
    const ops = await db.syncQueue.where('status').equals(QueueStatus.PENDING).toArray();
    return ops.sort(sortFIFO);
  },

  /**
   * Obtiene las operaciones PENDING aptas para sincronización con la API/Supabase.
   * Excluye expresamente los registros de auditoría/diagnóstico ('shadow' y 'diagnostic').
   * @returns {Promise<Object[]>}
   */
  async getPendingSyncable() {
    const ops = await db.syncQueue.where('status').equals(QueueStatus.PENDING).toArray();
    const syncable = ops.filter(op => op.recordingSource !== 'shadow' && op.recordingSource !== 'diagnostic');
    return syncable.sort(sortFIFO);
  },

  /**
   * Obtiene todas las operaciones en estado FAILED ordenadas por FIFO determinista.
   * @returns {Promise<Object[]>}
   */
  async getFailed() {
    const ops = await db.syncQueue.where('status').equals(QueueStatus.FAILED).toArray();
    return ops.sort(sortFIFO);
  },

  /**
   * Obtiene todas las operaciones en estado PROCESSING ordenadas por FIFO determinista.
   * @returns {Promise<Object[]>}
   */
  async getProcessing() {
    const ops = await db.syncQueue.where('status').equals(QueueStatus.PROCESSING).toArray();
    return ops.sort(sortFIFO);
  },

  /**
   * Cuenta la cantidad de operaciones en estado PENDING.
   * @returns {Promise<number>}
   */
  async countPending() {
    return await db.syncQueue.where('status').equals(QueueStatus.PENDING).count();
  },

  /**
   * Cambia el estado de una operación a PROCESSING y actualiza updatedAt.
   * @param {string} id 
   * @returns {Promise<void>}
   */
  async markProcessing(id) {
    return await db.transaction('rw', db.syncQueue, async () => {
      const op = await db.syncQueue.get(id);
      if (!op) throw new Error(`Operación local no encontrada para el ID: ${id}`);
      validateTransition(op.status, QueueStatus.PROCESSING);

      await db.syncQueue.update(id, {
        status: QueueStatus.PROCESSING,
        updatedAt: getCurrentDate()
      });
    });
  },

  /**
   * Cambia el estado de una operación a DONE (completada) y actualiza updatedAt.
   * @param {string} id 
   * @returns {Promise<void>}
   */
  async markDone(id) {
    return await db.transaction('rw', db.syncQueue, async () => {
      const op = await db.syncQueue.get(id);
      if (!op) throw new Error(`Operación local no encontrada para el ID: ${id}`);
      validateTransition(op.status, QueueStatus.DONE);

      await db.syncQueue.update(id, {
        status: QueueStatus.DONE,
        updatedAt: getCurrentDate()
      });
    });
  },

  /**
   * Cambia el estado de una operación a FAILED, registra la causa de error serializada
   * de forma segura (sin stack traces ni claves sensibles) y actualiza updatedAt.
   * NO incrementa retryCount en este paso.
   * 
   * @param {string} id 
   * @param {Error|Object|string} error 
   * @returns {Promise<void>}
   */
  async markFailed(id, error) {
    return await db.transaction('rw', db.syncQueue, async () => {
      const op = await db.syncQueue.get(id);
      if (!op) throw new Error(`Operación local no encontrada para el ID: ${id}`);
      validateTransition(op.status, QueueStatus.FAILED);

      const lastError = {
        name: error?.name || 'Error',
        message: error?.message || String(error),
        code: error?.code || null,
        timestamp: getCurrentDate()
      };

      await db.syncQueue.update(id, {
        status: QueueStatus.FAILED,
        lastError,
        updatedAt: getCurrentDate()
      });
    });
  },

  /**
   * Incrementa manualmente el retryCount de una operación y actualiza updatedAt.
   * @param {string} id 
   * @returns {Promise<void>}
   */
  async incrementRetry(id) {
    return await db.transaction('rw', db.syncQueue, async () => {
      const op = await db.syncQueue.get(id);
      if (!op) throw new Error(`Operación local no encontrada para el ID: ${id}`);

      await db.syncQueue.update(id, {
        retryCount: (op.retryCount || 0) + 1,
        updatedAt: getCurrentDate()
      });
    });
  },

  /**
   * Cambia de forma explícita una operación de FAILED a PENDING, incrementando retryCount exactamente
   * una vez, conservando el lastError original para diagnóstico y actualizando updatedAt.
   * 
   * @param {string} id 
   * @returns {Promise<void>}
   */
  async retry(id) {
    return await db.transaction('rw', db.syncQueue, async () => {
      const op = await db.syncQueue.get(id);
      if (!op) throw new Error(`Operación local no encontrada para el ID: ${id}`);
      validateTransition(op.status, QueueStatus.PENDING);

      await db.syncQueue.update(id, {
        status: QueueStatus.PENDING,
        retryCount: (op.retryCount || 0) + 1,
        updatedAt: getCurrentDate()
      });
    });
  },

  /**
   * Elimina una operación por ID de forma protegida.
   * Si la operación está en estado PROCESSING, la eliminación es rechazada para evitar inconsistencias.
   * 
   * @param {string} id 
   * @throws {Error} Si el registro no existe o está PROCESSING
   */
  async remove(id) {
    return await db.transaction('rw', db.syncQueue, async () => {
      const op = await db.syncQueue.get(id);
      if (!op) {
        throw new Error(`Operación local no encontrada para eliminar: ${id}`);
      }

      if (op.status === QueueStatus.PROCESSING) {
        throw new Error(`Eliminación protegida: No se puede eliminar una operación en estado ${QueueStatus.PROCESSING}.`);
      }

      await db.syncQueue.delete(id);
    });
  },

  /**
   * Limpia de forma manual los registros completados (DONE) de la cola.
   * @returns {Promise<number>} Cantidad de registros eliminados
   */
  async clearCompleted() {
    return await db.transaction('rw', db.syncQueue, async () => {
      const completedOps = await db.syncQueue.where('status').equals(QueueStatus.DONE).toArray();
      const ids = completedOps.map(op => op.id);
      await db.syncQueue.bulkDelete(ids);
      return ids.length;
    });
  }
};
