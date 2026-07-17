export const NetworkState = Object.freeze({
  ONLINE: 'ONLINE',
  OFFLINE_CONFIRMED: 'OFFLINE_CONFIRMED',
  REMOTE_RESULT_UNKNOWN: 'REMOTE_RESULT_UNKNOWN'
});

// ─── Control 100% Manual de Red ────────────────────────────────────────────────
// El sistema nunca cambia de modo automáticamente por fallos de red o pings.
// Solo el usuario puede cambiar el estado de red de manera explícita desde Ajustes.
const OVERRIDE_STATE_KEY = 'bunker_network_manual_state';

let currentState = NetworkState.ONLINE;

// Inicializar desde localStorage al cargar el módulo
try {
  const savedState = localStorage.getItem(OVERRIDE_STATE_KEY);
  if (savedState && Object.values(NetworkState).includes(savedState)) {
    currentState = savedState;
  } else {
    currentState = NetworkState.ONLINE;
  }
} catch {
  currentState = NetworkState.ONLINE;
}

const listeners = new Set();

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
  /** Obtiene el estado de red actual. */
  getStatus() {
    return currentState;
  },

  /** Indica si el override manual está activo (siempre true). */
  isManualOverride() {
    return true;
  },

  /**
   * Suscribe un callback a cambios de estado de red.
   * @param {function} callback
   * @returns {function} Función para desuscribirse
   */
  subscribe(callback) {
    listeners.add(callback);
    try {
      callback(currentState);
    } catch (err) {
      console.error('[NetworkStatus] Error en callback de suscripción:', err);
    }
    return () => {
      listeners.delete(callback);
    };
  },

  /**
   * Cambia manualmente el estado de red.
   * SOLO se aceptan cambios si viene con force=true, bloqueando cambios automáticos de los catch.
   * @param {string} newState
   * @param {boolean} [force=false]
   */
  setStatus(newState, force = false) {
    if (!Object.values(NetworkState).includes(newState)) {
      throw new Error(`Estado de red inválido: ${newState}`);
    }
    // Bloqueo absoluto de cambios automáticos
    if (!force) {
      if (import.meta.env.DEV) {
        console.log(`[NetworkStatus] Intento de cambio automático a "${newState}" rechazado. El modo offline solo se activa por Ajustes.`);
      }
      return;
    }
    if (currentState !== newState) {
      currentState = newState;
      try {
        localStorage.setItem(OVERRIDE_STATE_KEY, newState);
      } catch { /* ignore */ }
      console.log(`[NetworkStatus] Estado de red cambiado manualmente a: ${newState}`);
      notifyListeners();
    }
  },

  /**
   * Activa el modo manual y fuerza el estado.
   * @param {string} state - NetworkState.ONLINE | NetworkState.OFFLINE_CONFIRMED
   */
  setManualOverride(state) {
    this.setStatus(state, true);
  },

  /** Desactivación de control automático (sin acción ya que siempre es manual). */
  clearManualOverride() {
    console.log('[NetworkStatus] El sistema opera bajo control manual permanente.');
  },

  /** Determina si el sistema debe operar en modo offline local. */
  isOffline() {
    return currentState === NetworkState.OFFLINE_CONFIRMED || currentState === NetworkState.REMOTE_RESULT_UNKNOWN;
  },

  /**
   * Devuelve la conectividad. No realiza pings activos para evitar intermitencias.
   * @returns {Promise<string>}
   */
  async checkConnectivity() {
    return currentState;
  }
};
