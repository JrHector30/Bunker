/**
 * Calcula el tiempo de espera para el backoff exponencial con jitter.
 * Formula: Min(maxDelay, base * 2^retryCount) + Jitter
 * 
 * @param {number} retryCount Número de intento actual (0-indexed)
 * @param {number} [baseDelay] Retraso base en ms (por defecto 1000ms)
 * @param {number} [maxDelay] Retraso máximo en ms (por defecto 30000ms)
 * @returns {number} Tiempo en milisegundos
 */
export const calculateBackoff = (retryCount, baseDelay = 1000, maxDelay = 30000) => {
  const delay = Math.min(maxDelay, baseDelay * Math.pow(2, retryCount));
  // Añadir Jitter aleatorio (entre 0 y 30% del delay)
  const jitter = Math.random() * (delay * 0.3);
  return Math.floor(delay + jitter);
};
