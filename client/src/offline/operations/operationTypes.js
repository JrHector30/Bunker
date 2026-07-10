export const OperationType = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE'
});

export const DomainOperation = Object.freeze({
  CREATE_ORDER: 'CREATE_ORDER',
  UPDATE_ORDER: 'UPDATE_ORDER',
  DELETE_ORDER: 'DELETE_ORDER',

  ADD_ORDER_ITEM: 'ADD_ORDER_ITEM',
  UPDATE_ORDER_ITEM: 'UPDATE_ORDER_ITEM',
  REMOVE_ORDER_ITEM: 'REMOVE_ORDER_ITEM',

  UPDATE_ORDER_STATUS: 'UPDATE_ORDER_STATUS',
  PAY_ORDER: 'PAY_ORDER',

  UPDATE_TABLE_STATUS: 'UPDATE_TABLE_STATUS',
  TOGGLE_CASH_SESSION: 'TOGGLE_CASH_SESSION',
  CREATE_CASH_MOVEMENT: 'CREATE_CASH_MOVEMENT'
});

// Matriz centralizada de operaciones permitidas por cada tipo de entidad
export const ALLOWED_OPERATIONS_BY_ENTITY = Object.freeze({
  PRODUCT: [OperationType.CREATE, OperationType.UPDATE, OperationType.DELETE],
  TABLE: [OperationType.CREATE, OperationType.UPDATE, OperationType.DELETE, DomainOperation.UPDATE_TABLE_STATUS],
  PRINTER: [OperationType.CREATE, OperationType.UPDATE, OperationType.DELETE],
  SETTING: [OperationType.CREATE, OperationType.UPDATE, OperationType.DELETE],
  ORDER: [
    DomainOperation.CREATE_ORDER,
    DomainOperation.UPDATE_ORDER,
    DomainOperation.DELETE_ORDER,
    DomainOperation.UPDATE_ORDER_STATUS,
    DomainOperation.PAY_ORDER
  ],
  ORDER_ITEM: [
    DomainOperation.ADD_ORDER_ITEM,
    DomainOperation.UPDATE_ORDER_ITEM,
    DomainOperation.REMOVE_ORDER_ITEM
  ],
  CASH_SESSION: [
    DomainOperation.TOGGLE_CASH_SESSION
  ],
  CASH_MOVEMENT: [
    DomainOperation.CREATE_CASH_MOVEMENT
  ]
});
