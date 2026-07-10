import { SYNC_CONFIG } from '../syncConfig';
import db from '../../database';

export const productSyncHandler = {
  /**
   * Sincroniza la creación de un producto.
   * 
   * @param {Object} operation 
   * @returns {Promise<Object>}
   */
  async create(operation) {
    const payload = operation.payload || {};
    
    // 1. Validación de negocio del payload de platos
    if (payload.invalidTest || !payload.nombre || payload.precio === undefined) {
      const err = new Error('Estructura de producto inválida: se requiere "nombre" y "precio" obligatorios.');
      err.status = 400; // NON_RETRYABLE
      throw err;
    }

    const isRealSync = !SYNC_CONFIG.DRY_RUN && SYNC_CONFIG.REAL_ENABLED;

    // 2. Comportamiento en Dry Run (Simulado)
    if (!isRealSync) {
      if (import.meta.env.DEV) {
        console.log('[ProductSyncHandler] Dry Run [CREATE] exitoso para plato:', operation.entityId);
      }
      return {
        success: true,
        dryRun: true,
        result: {
          id: operation.entityId,
          message: 'Simulación exitosa de creación en dry-run (plato)'
        }
      };
    }

    // 3. Comportamiento en Sincronización Real (Fase 5B)
    // Extraer y sanitizar flag de simulación de depuración en cliente
    const { simulateLostResponse, ...businessPayload } = payload;

    try {
        const response = await fetch('/api/sync/operations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operationId: operation.operationId,
                entity: operation.entity,
                entityId: operation.entityId,
                operation: operation.operation,
                payload: businessPayload
            })
        });

        if (!response.ok) {
            let errData = {};
            try {
                errData = await response.json();
            } catch (e) {
                // Silenciar fallos de parseo
            }
            const err = new Error(errData.error || `Error del servidor HTTP ${response.status}`);
            err.status = response.status;
            if (errData.pendingProcessing) {
                err.pendingProcessing = true; // Clasificado como RETRYABLE por errorClassifier
            }
            throw err;
        }

        const data = await response.json();

        // Simulación controlada de respuesta perdida en el cliente
        if (simulateLostResponse) {
            if (import.meta.env.DEV) {
                console.warn('[ProductSyncHandler] Simulación de respuesta perdida activa. Apagando bandera en IndexedDB y lanzando error de red artificial...');
            }

            // Apagar la bandera en IndexedDB de forma atómica y directa (evita rollbacks por la posterior excepción)
            const newPayload = { ...payload, simulateLostResponse: false };
            await db.syncQueue.update(operation.id, { payload: newPayload });
            
            // Actualizar también la instancia en memoria por consistencia
            operation.payload.simulateLostResponse = false;

            const lostError = new Error('failed to fetch'); // Clasificado como RETRYABLE
            throw lostError;
        }

        return {
            success: true,
            dryRun: false,
            result: data.result,
            duplicate: data.duplicate
        };

    } catch (error) {
        // Asegurar que propagamos el error para que sea capturado por el motor de colas
        throw error;
    }
  },

  /**
   * Sincroniza la actualización de un producto.
   * 
   * @param {Object} operation 
   * @returns {Promise<Object>}
   */
  async update(operation) {
    const payload = operation.payload || {};
    
    // Validación de negocio
    if (payload.invalidTest || !payload.nombre || payload.precio === undefined) {
      const err = new Error('Estructura de producto inválida: se requiere "nombre" y "precio" obligatorios.');
      err.status = 400; // NON_RETRYABLE
      throw err;
    }

    const isRealSync = !SYNC_CONFIG.DRY_RUN && SYNC_CONFIG.REAL_ENABLED;

    if (!isRealSync) {
      if (import.meta.env.DEV) {
        console.log('[ProductSyncHandler] Dry Run [UPDATE] exitoso para plato:', operation.entityId);
      }
      return {
        success: true,
        dryRun: true,
        result: {
          id: operation.entityId,
          message: 'Simulación exitosa de actualización en dry-run (plato)'
        }
      };
    }

    // Alcance estricto Módulo 5B: solo PRODUCT CREATE real
    throw new Error('Las operaciones de actualización real (UPDATE) no están habilitadas en la Fase 5B.');
  },

  /**
   * Sincroniza la eliminación de un producto.
   * 
   * @param {Object} operation 
   * @returns {Promise<Object>}
   */
  async delete(operation) {
    const isRealSync = !SYNC_CONFIG.DRY_RUN && SYNC_CONFIG.REAL_ENABLED;

    if (!isRealSync) {
      if (import.meta.env.DEV) {
        console.log('[ProductSyncHandler] Dry Run [DELETE] exitoso para plato:', operation.entityId);
      }
      return {
        success: true,
        dryRun: true,
        result: {
          id: operation.entityId,
          message: 'Simulación exitosa de eliminación en dry-run (plato)'
        }
      };
    }

    // Alcance estricto Módulo 5B: solo PRODUCT CREATE real
    throw new Error('Las operaciones de eliminación real (DELETE) no están habilitadas en la Fase 5B.');
  }
};
