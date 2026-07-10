export const SyncStatus = {
  LOCAL: 'LOCAL',
  SYNCING: 'SYNCING',
  SYNCED: 'SYNCED',
  ERROR: 'ERROR'
};

export const QueueStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  DONE: 'DONE',
  FAILED: 'FAILED'
};

export const dbSchemaV1 = {
  products: 'id, remoteId, categoryId, syncStatus, createdAt, updatedAt',
  orders: 'id, remoteId, tableId, status, syncStatus, createdAt, updatedAt',
  orderItems: 'id, orderId, productId, syncStatus, createdAt',
  tables: 'id, name, syncStatus, createdAt, updatedAt',
  printers: 'id, station, syncStatus, createdAt, updatedAt',
  settings: 'key, updatedAt',
  metadata: 'key, updatedAt',
  syncQueue: 'id, operationId, entity, entityId, operation, status, retryCount, createdAt'
};

export const dbSchemaV2 = {
  ...dbSchemaV1,
  syncQueue: 'id, &operationId, entity, entityId, operation, status, retryCount, createdAt, updatedAt'
};

export const dbSchemaV3 = {
  ...dbSchemaV2,
  syncQueue: 'id, &operationId, entity, entityId, operation, recordingSource, status, retryCount, createdAt, updatedAt'
};

export const dbSchemaV4 = {
  ...dbSchemaV3,
  arqueos: 'id, estado, fechaInicio',
  movimientosCaja: 'id, arqueoId, tipo, fecha'
};

