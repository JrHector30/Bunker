import { SYNC_CONFIG } from '../syncConfig';
import db from '../../database';
import { getActiveRestaurant } from '../../../utils/tenant';

export const orderSyncHandler = {
  /**
   * Sincroniza la creación de una comanda hacia el backend.
   * 
   * @param {Object} operation Operación de creación de orden
   * @returns {Promise<Object>}
   */
  async create(operation) {
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
  },

  /**
   * Sincroniza el pago y liquidación de una comanda hacia el backend.
   * 
   * @param {Object} operation Operación de pago de orden
   * @returns {Promise<Object>}
   */
  async pay(operation) {
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
  },

  /**
   * Sincroniza la actualización de estado de una comanda (ej: anulación).
   * 
   * @param {Object} operation 
   * @returns {Promise<Object>}
   */
  async updateStatus(operation) {
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
};
