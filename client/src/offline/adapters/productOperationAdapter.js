import { recordOperation } from './operationAdapter';
import { EntityType } from '../operations/entityTypes';
import { OperationType } from '../operations/operationTypes';

export const productOperationAdapter = {
  /**
   * Registra la creación de un plato.
   * @param {string|number} productId 
   * @param {Object} productData 
   */
  async recordCreateProduct(productId, productData) {
    return await recordOperation({
      entity: EntityType.PRODUCT,
      entityId: productId,
      operation: OperationType.CREATE,
      payload: productData
    });
  },

  /**
   * Registra la actualización de un plato.
   * @param {string|number} productId 
   * @param {Object} productData 
   */
  async recordUpdateProduct(productId, productData) {
    return await recordOperation({
      entity: EntityType.PRODUCT,
      entityId: productId,
      operation: OperationType.UPDATE,
      payload: productData
    });
  },

  /**
   * Registra la eliminación de un plato.
   * @param {string|number} productId 
   */
  async recordDeleteProduct(productId) {
    return await recordOperation({
      entity: EntityType.PRODUCT,
      entityId: productId,
      operation: OperationType.DELETE,
      payload: {}
    });
  }
};
