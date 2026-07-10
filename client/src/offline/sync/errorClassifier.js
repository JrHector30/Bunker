export const ErrorCategory = Object.freeze({
  RETRYABLE: 'RETRYABLE',
  NON_RETRYABLE: 'NON_RETRYABLE',
  AUTH: 'AUTH',
  CONFLICT: 'CONFLICT',
  UNKNOWN: 'UNKNOWN'
});

/**
 * Clasifica un error HTTP o de red en una categoría lógica de reintento.
 * 
 * @param {Error|Object} error Objeto de error o respuesta HTTP fallida
 * @returns {string} Categoría (ErrorCategory)
 */
export const classifyError = (error) => {
  if (!error) return ErrorCategory.UNKNOWN;

  // Si es un conflicto concurrente temporal marcado por el servidor
  if (error.pendingProcessing === true) {
    return ErrorCategory.RETRYABLE;
  }

  const status = error.status || error.statusCode || error.code;
  
  // Detectar errores de red de fetch (cuando no hay conexión a internet)
  if (error.message && (
    error.message.toLowerCase().includes('network') ||
    error.message.toLowerCase().includes('failed to fetch') ||
    error.message.toLowerCase().includes('load failed')
  )) {
    return ErrorCategory.RETRYABLE;
  }

  if (status) {
    if (status === 401 || status === 403) return ErrorCategory.AUTH;
    
    if (status === 409) {
      // Si el mensaje indica procesamiento concurrente o el servidor está trabajando en ello
      if (error.message && (
        error.message.toLowerCase().includes('concurrente') ||
        error.message.toLowerCase().includes('procesando')
      )) {
        return ErrorCategory.RETRYABLE;
      }
      return ErrorCategory.CONFLICT;
    }
    
    if (status >= 500) return ErrorCategory.RETRYABLE; // Fallas temporales de servidor
    if (status >= 400 && status < 500) return ErrorCategory.NON_RETRYABLE; // Errores de cliente (ej: 400 Bad Request)
  }

  return ErrorCategory.UNKNOWN;
};
