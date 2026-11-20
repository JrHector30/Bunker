import { EntityType } from '../operations/entityTypes';
import { productSyncHandler } from './handlers/productSyncHandler';
import { orderSyncHandler } from './handlers/orderSyncHandler';
import { orderItemSyncHandler } from './handlers/orderItemSyncHandler';

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

    if (entity === EntityType.ORDER) {
      if (opName === 'CREATE_ORDER') {
        return await orderSyncHandler.create(operation);
      }
      if (opName === 'PAY_ORDER') {
        return await orderSyncHandler.pay(operation);
      }
      if (opName === 'UPDATE_ORDER_STATUS') {
        return await orderSyncHandler.updateStatus(operation);
      }

      const err = new Error(`Operación de comanda no soportada: "${opName}"`);
      err.status = 400;
      throw err;
    }

    if (entity === EntityType.ORDER_ITEM || entity === 'ORDER_ITEM') {
      if (opName === 'UPDATE_ORDER_ITEM' || opName === 'UPDATE') {
        return await orderItemSyncHandler.update(operation);
      }
      if (opName === 'ADD_ORDER_ITEM' || opName === 'ADD') {
        return await orderItemSyncHandler.add(operation);
      }
      if (opName === 'REMOVE_ORDER_ITEM' || opName === 'REMOVE') {
        return await orderItemSyncHandler.remove(operation);
      }

      const err = new Error(`Operación de ítem de orden no soportada: "${opName}"`);
      err.status = 400;
      throw err;
    }

    const err = new Error(`Entidad "${entity}" sin despachador configurado.`);
    err.status = 400; // Clasificado como NON_RETRYABLE
    throw err;
  }
};
