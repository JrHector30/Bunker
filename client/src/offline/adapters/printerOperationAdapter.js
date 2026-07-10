import { recordOperation } from './operationAdapter';
import { EntityType } from '../operations/entityTypes';
import { OperationType } from '../operations/operationTypes';

export const printerOperationAdapter = {
  /**
   * Registra la creación de una impresora.
   * @param {string|number} printerId 
   * @param {Object} printerData 
   */
  async recordCreatePrinter(printerId, printerData) {
    return await recordOperation({
      entity: EntityType.PRINTER,
      entityId: printerId,
      operation: OperationType.CREATE,
      payload: printerData
    });
  },

  /**
   * Registra la actualización de una impresora.
   * @param {string|number} printerId 
   * @param {Object} printerData 
   */
  async recordUpdatePrinter(printerId, printerData) {
    return await recordOperation({
      entity: EntityType.PRINTER,
      entityId: printerId,
      operation: OperationType.UPDATE,
      payload: printerData
    });
  },

  /**
   * Registra la eliminación de una impresora.
   * @param {string|number} printerId 
   */
  async recordDeletePrinter(printerId) {
    return await recordOperation({
      entity: EntityType.PRINTER,
      entityId: printerId,
      operation: OperationType.DELETE,
      payload: {}
    });
  }
};
