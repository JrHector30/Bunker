import { createOperation } from '../operations/createOperation';
import { queueService } from '../queue/queueService';
import { cleanObjectForStorage } from '../offlineUtils';
import { RecordingSource } from '../constants/recordingSources';

// Modos permitidos: 'disabled' (apagado por defecto), 'diagnostic' (pruebas) y 'shadow' (observador)
// Inicialización en base a la variable de entorno
let recordingMode = import.meta.env.VITE_OFFLINE_SHADOW_MODE === 'true' ? 'shadow' : 'disabled';

/**
 * Retorna true si la grabación del adaptador está activa (modo diferente de 'disabled').
 * @returns {boolean}
 */
export const isRecordingEnabled = () => {
  return recordingMode !== 'disabled';
};

/**
 * Obtiene el modo actual de grabación.
 * @returns {string}
 */
export const getRecordingMode = () => {
  return recordingMode;
};

/**
 * Cambia el modo de grabación. Solo tiene efecto en entornos de desarrollo (Vite DEV mode).
 * En producción esta acción es completamente ignorada y permanece bloqueada en el modo inicial.
 * 
 * @param {'disabled'|'diagnostic'|'shadow'} mode Nuevo modo de grabación
 */
export const setRecordingMode = (mode) => {
  // BLOQUEO CRÍTICO EN PRODUCCIÓN: solo permitir cambios manuales en desarrollo
  if (!import.meta.env.DEV) {
    return;
  }

  if (mode === 'disabled' || mode === 'diagnostic' || mode === 'shadow') {
    recordingMode = mode;
  }
};

/**
 * Registra una operación local en la cola de sincronización.
 * Si la grabación está desactivada, esta función es un no-op silencioso.
 * Envuelve toda la lógica en un try-catch seguro para no interrumpir el flujo principal.
 * 
 * @param {Object} params
 * @param {string} params.entity Tipo de entidad
 * @param {string|number} params.entityId ID de la entidad
 * @param {string} params.operation Operación semántica
 * @param {Object} [params.payload] Cuerpo de datos
 * @param {string} [params.operationId] UUID lógico opcional
 * @param {string} [params.source] Origen de la grabación ('operationAdapter' | 'diagnostic' | 'shadow')
 * @returns {Promise<Object|null>} Operación registrada o null si está deshabilitado o ocurre un error
 */
export const recordOperation = async ({
  entity,
  entityId,
  operation,
  payload = {},
  operationId,
  source = RecordingSource.OFFLINE
}) => {
  if (recordingMode === 'disabled') {
    return null;
  }

  try {
    // 1. Sanitizar el payload para IndexedDB
    const cleanedPayload = cleanObjectForStorage(payload) || {};

    // 2. Incorporar el marcador de origen dentro del payload para compatibilidad hacia atrás
    const finalPayload = {
      ...cleanedPayload,
      recordingSource: source
    };

    // 3. Crear el objeto de operación validado
    const op = createOperation({
      entity,
      entityId,
      operation,
      payload: finalPayload,
      operationId
    });

    // 4. Asignar el recordingSource a primer nivel (Esquema v3)
    op.recordingSource = source;

    // 5. Encolar la transacción de forma transaccional y segura
    const savedOp = await queueService.enqueue(op);
    return savedOp;
  } catch (error) {
    // CONTROL DE ERRORES SEGURO:
    // En desarrollo se alerta en consola para depuración
    if (import.meta.env.DEV) {
      console.warn('[OfflineOperationAdapter] Fallo al encolar operación local:', error);
    }
    // En producción no se propaga el error para no afectar el flujo principal del POS
    return null;
  }
};
