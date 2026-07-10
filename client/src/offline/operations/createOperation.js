import { generateUUID, getCurrentDate } from '../offlineUtils';
import { EntityType } from './entityTypes';
import { ALLOWED_OPERATIONS_BY_ENTITY } from './operationTypes';
import { QueueStatus } from '../tables';

/**
 * Fábrica para construir y validar una operación de sincronización local.
 * 
 * @param {Object} params
 * @param {string} params.entity Tipo de entidad (de EntityType)
 * @param {string|number} params.entityId Identificador único de la entidad
 * @param {string} params.operation Tipo de operación (compatible según matriz)
 * @param {Object} params.payload Datos asociados a la operación (serializables)
 * @param {string} [params.operationId] Identificador lógico único de la operación (opcional)
 * @returns {Object} El objeto de operación validado y listo para encolar
 * @throws {Error} Si alguna validación de campos, tipos o compatibilidad falla
 */
export const createOperation = ({ entity, entityId, operation, payload, operationId }) => {
  // 1. Validaciones de presencia
  if (!entity) {
    throw new Error('La entidad (entity) es obligatoria.');
  }
  if (entityId === undefined || entityId === null || entityId === '') {
    throw new Error('El ID de entidad (entityId) es obligatorio.');
  }
  if (!operation) {
    throw new Error('La operación (operation) es obligatoria.');
  }

  // 2. Validar que la entidad sea conocida
  if (!Object.values(EntityType).includes(entity)) {
    throw new Error(`Entidad desconocida: "${entity}". Debe ser una de: ${Object.values(EntityType).join(', ')}`);
  }

  // 3. Validar compatibilidad semántica entre entidad y operación
  const allowedOps = ALLOWED_OPERATIONS_BY_ENTITY[entity];
  if (!allowedOps || !allowedOps.includes(operation)) {
    throw new Error(`Operación inválida: La acción "${operation}" no está permitida para la entidad "${entity}".`);
  }

  // 4. Validar que el payload sea serializable
  if (payload !== undefined && payload !== null) {
    try {
      JSON.stringify(payload);
    } catch (err) {
      throw new Error('El payload no es un objeto serializable a JSON válido.');
    }
  }

  const generatedId = generateUUID();
  const finalOperationId = operationId || generateUUID();
  const timestamp = getCurrentDate();

  return {
    id: generatedId,
    operationId: finalOperationId,
    entity,
    entityId: String(entityId), // Asegurar consistencia de tipo string para el id de entidad
    operation,
    payload: payload || {},
    status: QueueStatus.PENDING,
    retryCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
};
