import { recordOperation } from './operationAdapter';
import { EntityType } from '../operations/entityTypes';
import { DomainOperation } from '../operations/operationTypes';

export const orderOperationAdapter = {
  /**
   * Registra la creación de un nuevo pedido.
   * @param {string|number} orderId 
   * @param {Object} orderData 
   */
  async recordCreateOrder(orderId, orderData) {
    return await recordOperation({
      entity: EntityType.ORDER,
      entityId: orderId,
      operation: DomainOperation.CREATE_ORDER,
      payload: orderData
    });
  },

  /**
   * Registra la modificación de un pedido.
   * @param {string|number} orderId 
   * @param {Object} orderData 
   */
  async recordUpdateOrder(orderId, orderData) {
    return await recordOperation({
      entity: EntityType.ORDER,
      entityId: orderId,
      operation: DomainOperation.UPDATE_ORDER,
      payload: orderData
    });
  },

  /**
   * Registra la eliminación de un pedido.
   * @param {string|number} orderId 
   */
  async recordDeleteOrder(orderId) {
    return await recordOperation({
      entity: EntityType.ORDER,
      entityId: orderId,
      operation: DomainOperation.DELETE_ORDER,
      payload: {}
    });
  },

  /**
   * Registra el cambio de estado de un pedido (ej: entregado, listo, etc).
   * @param {string|number} orderId 
   * @param {string} status 
   */
  async recordUpdateOrderStatus(orderId, status) {
    return await recordOperation({
      entity: EntityType.ORDER,
      entityId: orderId,
      operation: DomainOperation.UPDATE_ORDER_STATUS,
      payload: { status }
    });
  },

  /**
   * Registra la liquidación/pago de un pedido en caja.
   * @param {string|number} orderId 
   * @param {Object} paymentData 
   */
  async recordPayOrder(orderId, paymentData) {
    return await recordOperation({
      entity: EntityType.ORDER,
      entityId: orderId,
      operation: DomainOperation.PAY_ORDER,
      payload: paymentData
    });
  },

  /**
   * Registra la adición de un plato (ítem) a la comanda.
   * @param {string|number} orderId 
   * @param {string|number} itemId 
   * @param {Object} itemData 
   */
  async recordAddOrderItem(orderId, itemId, itemData) {
    return await recordOperation({
      entity: EntityType.ORDER_ITEM,
      entityId: itemId,
      operation: DomainOperation.ADD_ORDER_ITEM,
      payload: { ...itemData, orderId }
    });
  },

  /**
   * Registra el cambio de cantidad o notas de un plato en la comanda.
   * @param {string|number} orderId 
   * @param {string|number} itemId 
   * @param {Object} itemData 
   */
  async recordUpdateOrderItem(orderId, itemId, itemData) {
    return await recordOperation({
      entity: EntityType.ORDER_ITEM,
      entityId: itemId,
      operation: DomainOperation.UPDATE_ORDER_ITEM,
      payload: { ...itemData, orderId }
    });
  },

  /**
   * Registra la eliminación de un plato de la comanda.
   * @param {string|number} orderId 
   * @param {string|number} itemId 
   */
  async recordRemoveOrderItem(orderId, itemId) {
    return await recordOperation({
      entity: EntityType.ORDER_ITEM,
      entityId: itemId,
      operation: DomainOperation.REMOVE_ORDER_ITEM,
      payload: { orderId }
    });
  }
};
