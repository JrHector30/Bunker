export const SYNC_CONFIG = {
  // Sincronización real activa
  DRY_RUN: import.meta.env.VITE_OFFLINE_SYNC_DRY_RUN === 'true',
  
  // Habilitación de sincronización real
  REAL_ENABLED: import.meta.env.VITE_OFFLINE_SYNC_REAL_ENABLED !== 'false',
  
  // Timeout para considerar una operación PROCESSING como atascada (en milisegundos)
  STALE_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutos
  
  // Límite de reintentos
  MAX_RETRY_COUNT: 5
};
