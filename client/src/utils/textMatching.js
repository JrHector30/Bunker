/**
 * Utilidades para normalización y coincidencia de nombres palabra por palabra.
 * Permite detectar si dos insumos o platos tienen el mismo nombre ignorando
 * mayúsculas, minúsculas, tildes/acentos, signos de puntuación y orden de palabras.
 */

export function normalizeWords(str) {
  if (!str) return [];
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function areNamesMatching(nameA, nameB) {
  if (!nameA || !nameB) return false;
  const wordsA = normalizeWords(nameA);
  const wordsB = normalizeWords(nameB);
  if (wordsA.length === 0 || wordsB.length === 0) return false;

  // Coincidencia exacta limpia
  if (wordsA.join(' ') === wordsB.join(' ')) return true;

  // Coincidencia palabra por palabra ordenada
  const sortedA = [...wordsA].sort().join(' ');
  const sortedB = [...wordsB].sort().join(' ');
  return sortedA === sortedB;
}

export default {
  normalizeWords,
  areNamesMatching,
};
