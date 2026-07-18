const ENABLE_DIAGNOSTIC_AUDIT = 
  import.meta.env.DEV || 
  (typeof window !== 'undefined' && window.localStorage.getItem('bunker_enable_audit_logs') === 'true');

/**
 * Registra en consola el cambio detallado de un estado con contexto de componente y timestamp.
 * 
 * @param {string} stateName Nombre descriptivo del estado
 * @param {string} componentName Componente o servicio origen de la modificación
 * @param {any} prevValue Valor previo del estado
 * @param {any} newValue Valor nuevo del estado
 */
export function logStateChange(stateName, componentName, prevValue, newValue) {
  if (!ENABLE_DIAGNOSTIC_AUDIT) return;

  const timestamp = new Date().toISOString();
  console.log(
    `%c[STATE AUDIT] %c${stateName} %cmodificado por %c${componentName} %cat %c${timestamp}`,
    'color: #3b82f6; font-weight: bold;',
    'color: #10b981; font-weight: bold;',
    'color: #64748b;',
    'color: #f59e0b; font-weight: bold;',
    'color: #64748b;',
    'color: #ec4899;'
  );
  
  // Clonado profundo defensivo para evitar mutaciones de visualización en consola
  let prevDisplay = prevValue;
  let newDisplay = newValue;
  try {
    if (prevValue && typeof prevValue === 'object') prevDisplay = JSON.parse(JSON.stringify(prevValue));
    if (newValue && typeof newValue === 'object') newDisplay = JSON.parse(JSON.stringify(newValue));
  } catch { /* ignore */ }

  console.log('  %cPrevious:', 'color: #94a3b8; font-weight: bold;', prevDisplay);
  console.log('  %cNew:     ', 'color: #10b981; font-weight: bold;', newDisplay);
}
