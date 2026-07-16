export const NetworkState = Object.freeze({
  ONLINE: 'ONLINE',
  OFFLINE_CONFIRMED: 'OFFLINE_CONFIRMED',
  REMOTE_RESULT_UNKNOWN: 'REMOTE_RESULT_UNKNOWN'
});

// ─── Manual override ───────────────────────────────────────────────────────────
// Cuando manualOverride === true, el sistema NUNCA cambia de modo
// automáticamente: ni por ping, ni por eventos del navegador, ni por
// respuestas HTTP. Solo el usuario puede cambiar el estado desde Ajustes.
const OVERRIDE_KEY = 'bunker_network_manual_override';
const OVERRIDE_STATE_KEY = 'bunker_network_manual_state';

let manualOverride = false;
let currentState = NetworkState.ONLINE;

// Inicializar desde localStorage al cargar el módulo
try {
  const savedOverride = localStorage.getItem(OVERRIDE_KEY);
  const savedState = localStorage.getItem(OVERRIDE_STATE_KEY);
  if (savedOverride === 'true' && savedState) {
    manualOverride = true;
    currentState = Object.values(NetworkState).includes(savedState) ? savedState : NetworkState.ONLINE;
    if (import.meta.env.DEV) {
      console.log(`[NetworkStatus] Override manual activo: ${currentState}`);
    }
  } else {
    // Sin override: inicializar según conectividad real del navegador
    currentState = navigator.onLine ? NetworkState.ONLINE : NetworkState.OFFLINE_CONFIRMED;
  }
} catch {
  currentState = navigator.onLine ? NetworkState.ONLINE : NetworkState.OFFLINE_CONFIRMED;
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

  /** Indica si el override manual está activo. */
  isManualOverride() {
    return manualOverride;
  },

  /**
   * Cambia manualmente el estado de red.
   * Si manualOverride está activo, solo acepta cambios explícitos internos.
   * @param {string} newState
   * @param {boolean} [force=false] Pasar true para forzar aunque haya override activo
   */
  setStatus(newState, force = false) {
    if (!Object.values(NetworkState).includes(newState)) {
      throw new Error(`Estado de red inválido: ${newState}`);
    }
    // Si hay override manual activo, bloquear cambios automáticos
    if (manualOverride && !force) {
      if (import.meta.env.DEV) {
        console.log(`[NetworkStatus] Cambio a "${newState}" bloqueado — override manual activo (${currentState}).`);
      }
      return;
    }
    if (currentState !== newState) {
      currentState = newState;
      if (import.meta.env.DEV) {
        console.log(`[NetworkStatus] Estado de red cambiado a: ${newState}${manualOverride ? ' (override)' : ''}`);
      }
      notifyListeners();
    }
  },

  /**
   * Activa el override manual y fija el estado en el valor dado.
   * El sistema NO cambiará de modo automáticamente hasta que se llame clearManualOverride().
   * @param {string} state - NetworkState.ONLINE | NetworkState.OFFLINE_CONFIRMED
   */
  setManualOverride(state) {
    if (!Object.values(NetworkState).includes(state)) {
      throw new Error(`Estado inválido para override: ${state}`);
    }
    manualOverride = true;
    try {
      localStorage.setItem(OVERRIDE_KEY, 'true');
      localStorage.setItem(OVERRIDE_STATE_KEY, state);
    } catch { /* ignore */ }
    // Forzar el estado incluso si hay override activo
    if (currentState !== state) {
      currentState = state;
      console.log(`[NetworkStatus] Override manual activado → ${state}`);
      notifyListeners();
    }
  },

  /**
   * Desactiva el override manual.
   * El sistema vuelve a controlar el estado de red automáticamente.
   * Se realiza un ping inmediato para reevaluar el estado real.
   */
  clearManualOverride() {
    manualOverride = false;
    try {
      localStorage.removeItem(OVERRIDE_KEY);
      localStorage.removeItem(OVERRIDE_STATE_KEY);
    } catch { /* ignore */ }
    console.log('[NetworkStatus] Override manual desactivado. Reevaluando conectividad...');
    // Reevaluar inmediatamente
    this.checkConnectivity();
  },

  /** Determina si el sistema debe operar en modo offline local. */
  isOffline() {
    return currentState === NetworkState.OFFLINE_CONFIRMED || currentState === NetworkState.REMOTE_RESULT_UNKNOWN;
  },

  /**
   * Realiza un ping activo al backend para reevaluar la conectividad.
   * Si el override manual está activo, NO hace nada.
   * @returns {Promise<string>} El estado resultante
   */
  async checkConnectivity() {
    // Override activo: no hacer nada, el usuario controla el estado
    if (manualOverride) return currentState;

    // Sin conectividad física reportada por el navegador
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setStatus(NetworkState.OFFLINE_CONFIRMED);
      return NetworkState.OFFLINE_CONFIRMED;
    }

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);

      const res = await fetch('/api/ping', {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });

      clearTimeout(id);

      if (res.ok) {
        if (currentState !== NetworkState.REMOTE_RESULT_UNKNOWN) {
          this.setStatus(NetworkState.ONLINE);
        }
        return currentState;
      } else {
        this.setStatus(NetworkState.OFFLINE_CONFIRMED);
        return NetworkState.OFFLINE_CONFIRMED;
      }
    } catch (err) {
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
    cb(currentState);
    return () => listeners.delete(cb);
  }
};

// Listeners nativos de conectividad del navegador
// Solo actúan si NO hay override manual
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (!networkStatus.isManualOverride()) {
      networkStatus.checkConnectivity();
    }
  });

  window.addEventListener('offline', () => {
    if (!networkStatus.isManualOverride()) {
      networkStatus.setStatus(NetworkState.OFFLINE_CONFIRMED);
    }
  });
}
