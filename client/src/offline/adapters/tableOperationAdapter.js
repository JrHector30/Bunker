import { recordOperation } from './operationAdapter';
import { EntityType } from '../operations/entityTypes';
import { OperationType } from '../operations/operationTypes';

export const tableOperationAdapter = {
  /**
   * Registra la creación de una mesa.
   * @param {string|number} tableId 
   * @param {Object} tableData 
   */
  async recordCreateTable(tableId, tableData) {
    return await recordOperation({
      entity: EntityType.TABLE,
      entityId: tableId,
      operation: OperationType.CREATE,
      payload: tableData
    });
  },

  /**
   * Registra la actualización de una mesa (posX, posY, estado, etc).
   * @param {string|number} tableId 
   * @param {Object} tableData 
   */
  async recordUpdateTable(tableId, tableData) {
    return await recordOperation({
      entity: EntityType.TABLE,
      entityId: tableId,
      operation: OperationType.UPDATE,
      payload: tableData
    });
  },

  /**
   * Registra la eliminación de una mesa.
   * @param {string|number} tableId 
   */
  async recordDeleteTable(tableId) {
    return await recordOperation({
      entity: EntityType.TABLE,
      entityId: tableId,
      operation: OperationType.DELETE,
      payload: {}
    });
  }
};
