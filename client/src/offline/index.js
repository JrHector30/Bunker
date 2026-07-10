export { default as db, initDatabase } from './database';
export { offlineService } from './offlineService';
export * from './offlineUtils';
export { SyncStatus, QueueStatus } from './tables';
export { OperationType, DomainOperation, ALLOWED_OPERATIONS_BY_ENTITY } from './operations/operationTypes';
export { EntityType } from './operations/entityTypes';
export { createOperation } from './operations/createOperation';
export { queueService } from './queue/queueService';

// Exportación de adaptadores y controles de grabación offline
export { recordOperation, isRecordingEnabled, getRecordingMode, setRecordingMode } from './adapters/operationAdapter';
export { orderOperationAdapter } from './adapters/orderOperationAdapter';
export { productOperationAdapter } from './adapters/productOperationAdapter';
export { tableOperationAdapter } from './adapters/tableOperationAdapter';
export { printerOperationAdapter } from './adapters/printerOperationAdapter';

// Exportación de Shadow Recorder
export { recordShadowOperation, safeRecordProductShadow, normalizeProductForOffline } from './shadow/shadowRecorder';

// Exportación de constantes de grabación
export { RecordingSource } from './constants/recordingSources';

// Exportación del Sync Engine
export { syncEngine, recoverStaleOperations } from './sync/syncEngine';
export { SYNC_CONFIG } from './sync/syncConfig';

// Exportación del Monitor de Red, Readiness e Inspector
export { networkStatus, NetworkState } from './network/networkStatus';
export { offlineReadiness } from './readiness/offlineReadiness';

// Exportación de Servicios de Dominio Offline
export { offlineOrderService } from './services/offlineOrderService';
export { offlineKitchenService } from './services/offlineKitchenService';
export { offlineCheckoutService } from './services/offlineCheckoutService';
export { offlineCashService } from './services/offlineCashService';
export { offlineSnapshotService } from './services/offlineSnapshotService';
