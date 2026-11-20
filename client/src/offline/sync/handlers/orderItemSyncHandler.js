import { getActiveRestaurant } from '../../../utils/tenant';

async function sendSyncOperation(operation) {
  const payload = operation.payload || {};
  const tenantId = getActiveRestaurant()?.id || 1;

  const response = await fetch('/api/sync/operations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-restaurante-id': String(tenantId)
    },
    body: JSON.stringify({
      operationId: operation.operationId,
      entity: operation.entity,
      entityId: operation.entityId,
      operation: operation.operation,
      payload
    })
  });

  if (!response.ok) {
    let errData = {};
    try {
      errData = await response.json();
    } catch (e) {}
    const err = new Error(errData.error || `Error del servidor HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  return {
    success: true,
    dryRun: false,
    result: data.result,
    duplicate: data.duplicate
  };
}

export const orderItemSyncHandler = {
  /**
   * Sincroniza la actualización de un ítem de comanda (ej: cambio de estado en cocina).
   * @param {Object} operation
   * @returns {Promise<Object>}
   */
  async update(operation) {
    return await sendSyncOperation(operation);
  },

  /**
   * Sincroniza la adición de un nuevo ítem a una comanda.
   * @param {Object} operation
   * @returns {Promise<Object>}
   */
  async add(operation) {
    return await sendSyncOperation(operation);
  },

  /**
   * Sincroniza la eliminación o anulación de un ítem.
   * @param {Object} operation
   * @returns {Promise<Object>}
   */
  async remove(operation) {
    return await sendSyncOperation(operation);
  }
};
