import { EntityType } from '../operations/entityTypes';
import { productSyncHandler } from './handlers/productSyncHandler';

export const syncDispatcher = {
  /**
   * Enruta la operación de sincronización al controlador correspondiente.
   * Si la entidad o la operación no son soportadas, arroja un error estructurado.
   * 
   * @param {Object} operation Operación local extraída de syncQueue
   * @returns {Promise<Object>} Resultado de la sincronización
   */
  async dispatch(operation) {
    const { entity, operation: opName } = operation;

    if (entity === EntityType.PRODUCT) {
      if (opName === 'CREATE') {
        return await productSyncHandler.create(operation);
      }
      if (opName === 'UPDATE') {
        return await productSyncHandler.update(operation);
      }
      if (opName === 'DELETE') {
        return await productSyncHandler.delete(operation);
      }
      
      const err = new Error(`Operación de producto no soportada: "${opName}"`);
      err.status = 400; // Errores 400 son clasificados como NON_RETRYABLE
      throw err;
    }

    const err = new Error(`Entidad "${entity}" sin despachador configurado en la Fase 5A.`);
    err.status = 400; // Clasificado como NON_RETRYABLE
    throw err;
  }
};
