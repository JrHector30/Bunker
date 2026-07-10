import db from '../database';
import { QueueStatus } from '../tables';
import { createOperation } from '../operations/createOperation';
import { cleanObjectForStorage, getCurrentDate } from '../offlineUtils';
import { EntityType } from '../operations/entityTypes';
import { RecordingSource } from '../constants/recordingSources';

// Entidades habilitadas para funcionar bajo Shadow Mode
const SHADOW_ENABLED_ENTITIES = new Set([EntityType.PRODUCT]);

/**
 * Normaliza las propiedades de un plato (producto) de la API (español)
 * al esquema interno usado en IndexedDB (inglés).
 * 
 * @param {Object} product Datos del producto devueltos por el backend
 * @returns {Object} Datos normalizados para el snapshot local
 */
export const normalizeProductForOffline = (product) => {
  if (!product) return null;
  const timestamp = getCurrentDate();
  
  return {
    id: String(product.id),
    remoteId: String(product.id),
    name: product.nombre || '',
    categoryId: product.categoriaId ? parseInt(product.categoriaId) : 0,
    description: product.descripcion || '',
    price: product.precio ? parseFloat(product.precio) : 0,
    active: product.activo !== undefined ? !!product.activo : true,
    deleted: product.deleted !== undefined ? !!product.deleted : false,
    createdAt: product.fechaCreacion || timestamp,
    updatedAt: product.ultimaModificacion || timestamp,
    syncStatus: 'SYNCED' // Las operaciones Shadow representan sincronización confirmada
  };
};

/**
 * Genera un identificador lógico único determinista para operaciones Shadow.
 * Esto evita logs de diagnóstico redundantes ante duplicaciones visuales.
 * 
 * @param {string} entity 
 * @param {string} operation 
 * @param {string|number} remoteId 
 * @param {Object} product Datos del producto para extraer la versión de cambio
 * @returns {string} ID determinista
 */
const generateShadowOperationId = (entity, operation, remoteId, product) => {
  const cleanId = String(remoteId);
  if (operation === 'CREATE') {
    return `shadow:${entity}:CREATE:${cleanId}`;
  }
  if (operation === 'UPDATE') {
    // Buscar propiedades seguras de modificación para desambiguar actualizaciones sucesivas
    const modTime = product.ultimaModificacion || product.updatedAt || product.fechaCreacion || getCurrentDate();
    return `shadow:${entity}:UPDATE:${cleanId}:${modTime}`;
  }
  if (operation === 'DELETE') {
    return `shadow:${entity}:DELETE:${cleanId}`;
  }
  return `shadow:${entity}:${operation}:${cleanId}:${Date.now()}`;
};

/**
 * Registra una transacción Shadow en segundo plano. Actualiza el snapshot local
 * y añade la operación marcada directamente como DONE a syncQueue de forma atómica.
 * 
 * @param {Object} params 
 * @param {string} params.entity 
 * @param {string|number} params.entityId 
 * @param {string} params.operation 
 * @param {Object} params.payload 
 * @returns {Promise<Object|null>}
 */
export const recordShadowOperation = async ({
  entity,
  entityId,
  operation,
  payload = {}
}) => {
  // 1. Evitar procesamiento si la entidad no está habilitada
  if (!SHADOW_ENABLED_ENTITIES.has(entity)) {
    return null;
  }

  // 2. Importar el modo en tiempo de ejecución para evitar acoplamientos circulares
  const { getRecordingMode } = await import('../adapters/operationAdapter');
  if (getRecordingMode() !== RecordingSource.SHADOW) {
    return null;
  }

  const cleanId = String(entityId);
  const timestamp = getCurrentDate();

  return await db.transaction('rw', [db.products, db.syncQueue], async () => {
    // A. Actualización del Snapshot local
    if (entity === EntityType.PRODUCT) {
      if (operation === 'CREATE' || operation === 'UPDATE') {
        const normalized = normalizeProductForOffline(payload);
        if (normalized) {
          await db.products.put(normalized);
        }
      } else if (operation === 'DELETE') {
        // Confirmado en api/index.js línea 817: el backend realiza soft delete (deleted: true, activo: false)
        const existing = await db.products.get(cleanId);
        const softDeleteRecord = {
          id: cleanId,
          remoteId: cleanId,
          name: existing?.name || payload.nombre || '',
          categoryId: existing?.categoryId || payload.categoriaId || 0,
          description: existing?.description || payload.descripcion || '',
          price: existing?.price || payload.precio || 0,
          active: false,
          deleted: true,
          createdAt: existing?.createdAt || payload.fechaCreacion || timestamp,
          updatedAt: timestamp,
          syncStatus: 'SYNCED'
        };
        await db.products.put(softDeleteRecord);
      }
    }

    // B. Registro de la operación Shadow en cola como DONE
    const deterministicOpId = generateShadowOperationId(entity, operation, cleanId, payload);
    
    const op = createOperation({
      entity,
      entityId: cleanId,
      operation,
      payload: {
        ...cleanObjectForStorage(payload),
        shadowRecordedAt: timestamp
      },
      operationId: deterministicOpId
    });

    // Ajustes específicos de primer nivel para Shadow
    op.recordingSource = RecordingSource.SHADOW;
    op.status = QueueStatus.DONE;
    op.updatedAt = timestamp;

    await db.syncQueue.put(op);
    return op;
  });
};

/**
 * Wrapper de seguridad asíncrono y no bloqueante para registrar eventos de productos en Shadow Mode.
 * Garantiza que fallos en IndexedDB no alteren la interfaz de usuario ni levanten UnhandledPromiseRejection.
 * 
 * @param {'CREATE'|'UPDATE'|'DELETE'} type 
 * @param {Object} product 
 */
export const safeRecordProductShadow = (type, product) => {
  if (!product) return;

  const runShadowRecording = async () => {
    const cleanId = product.id;
    if (!cleanId) return;

    await recordShadowOperation({
      entity: EntityType.PRODUCT,
      entityId: cleanId,
      operation: type,
      payload: product
    });
  };

  runShadowRecording().catch(error => {
    if (import.meta.env.DEV) {
      console.warn('[OfflineShadowWrapper] Error no bloqueante al registrar shadow de producto:', error);
    }
  });
};
