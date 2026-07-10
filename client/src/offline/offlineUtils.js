/**
 * Generates a local UUID v4.
 * @returns {string} UUID
 */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Gets the current date in ISO format.
 * @returns {string} ISO date string
 */
export const getCurrentDate = () => {
  return new Date().toISOString();
};

/**
 * Checks if IndexedDB is available in the current environment.
 * @returns {boolean} True if IndexedDB is available.
 */
export const isIndexedDBAvailable = () => {
  try {
    return (
      typeof window !== 'undefined' &&
      'indexedDB' in window &&
      window.indexedDB !== null
    );
  } catch (e) {
    return false;
  }
};

/**
 * Cleans an object to make it safe for IndexedDB storage.
 * IndexedDB cannot serialize functions, symbols, or undefined values.
 * @param {any} obj Object or value to clean.
 * @returns {any} Cleaned object or value.
 */
export const cleanObjectForStorage = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => cleanObjectForStorage(item));
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
      continue;
    }
    if (typeof value === 'object') {
      cleaned[key] = cleanObjectForStorage(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
};
