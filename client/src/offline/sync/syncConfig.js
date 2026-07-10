export const SYNC_CONFIG = {
  // Dry run activo por defecto
  DRY_RUN: import.meta.env.VITE_OFFLINE_SYNC_DRY_RUN !== 'false',
  
  // Habilitación de sincronización real (Fase 5B)
  REAL_ENABLED: import.meta.env.VITE_OFFLINE_SYNC_REAL_ENABLED === 'true',
  
  // Timeout para considerar una operación PROCESSING como atascada (en milisegundos)
  STALE_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutos
  
  // Límite de reintentos
  MAX_RETRY_COUNT: 5
};
