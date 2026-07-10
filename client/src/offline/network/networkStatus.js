export const NetworkState = Object.freeze({
  ONLINE: 'ONLINE',
  OFFLINE_CONFIRMED: 'OFFLINE_CONFIRMED',
  REMOTE_RESULT_UNKNOWN: 'REMOTE_RESULT_UNKNOWN'
});

let currentState = navigator.onLine ? NetworkState.ONLINE : NetworkState.OFFLINE_CONFIRMED;
const listeners = new Set();

/**
 * Notifica a todos los escuchas sobre un cambio en el estado de red.
 */
const notifyListeners = () => {
  listeners.forEach(cb => {
    try {
      cb(currentState);
    } catch (err) {
      console.error('[NetworkStatus] Error en listener de red:', err);
    }
  });
};

export const networkStatus = {
  /**
   * Obtiene el estado de red actual.
   * @returns {string}
   */
  getStatus() {
    return currentState;
  },

  /**
   * Cambia manualmente el estado de red.
   * @param {string} newState 
   */
  setStatus(newState) {
    if (!Object.values(NetworkState).includes(newState)) {
      throw new Error(`Estado de red inválido: ${newState}`);
    }
    if (currentState !== newState) {
      currentState = newState;
      if (import.meta.env.DEV) {
        console.log(`[NetworkStatus] Estado de red cambiado a: ${newState}`);
      }
      notifyListeners();
    }
  },

  /**
   * Determina si el sistema debe operar en modo offline local.
   * @returns {boolean}
   */
  isOffline() {
    return currentState === NetworkState.OFFLINE_CONFIRMED || currentState === NetworkState.REMOTE_RESULT_UNKNOWN;
  },

  /**
   * Realiza un ping activo al backend para reevaluar la conectividad.
   * @returns {Promise<string>} El estado resultante
   */
  async checkConnectivity() {
    // Si la conectividad física está reportada apagada por el navegador, no hay ping que valga
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setStatus(NetworkState.OFFLINE_CONFIRMED);
      return NetworkState.OFFLINE_CONFIRMED;
    }

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000); // 3s timeout

      const res = await fetch('/api/ping', {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      clearTimeout(id);

      if (res.ok) {
        // Solo regresar a ONLINE si no estábamos en REMOTE_RESULT_UNKNOWN (que requiere resolución manual/idempotente)
        if (currentState !== NetworkState.REMOTE_RESULT_UNKNOWN) {
          this.setStatus(NetworkState.ONLINE);
        }
        return currentState;
      } else {
        this.setStatus(NetworkState.OFFLINE_CONFIRMED);
        return NetworkState.OFFLINE_CONFIRMED;
      }
    } catch (err) {
      // Error de red o timeout
      this.setStatus(NetworkState.OFFLINE_CONFIRMED);
      return NetworkState.OFFLINE_CONFIRMED;
    }
  },

  /**
   * Suscribe un callback a los cambios de estado de red.
   * @param {Function} cb 
   * @returns {Function} Función para cancelar la suscripción
   */
  subscribe(cb) {
    listeners.add(cb);
    // Ejecutar inmediatamente con el valor actual
    cb(currentState);
    return () => listeners.delete(cb);
  }
};

// Listeners nativos de conectividad del navegador
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    networkStatus.checkConnectivity();
  });

  window.addEventListener('offline', () => {
    networkStatus.setStatus(NetworkState.OFFLINE_CONFIRMED);
  });
}
