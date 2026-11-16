import * as XLSX from 'xlsx';
import { areNamesMatching } from './textMatching';

export const FALLBACK_ALMACENES = [
  'Congelador',
  'Congelador 2',
  'Alacena',
  'Refrigerador',
];

export const VALID_UNIDADES = ['kg', 'L', 'und', 'g'];

export const HEADER_MATCHERS = {
  nombre: ['nombre', 'nombre del insumo', 'insumo', 'producto'],
  cantidad: ['cantidad', 'cantidad / stock', 'stock', 'cant', 'stock actual'],
  unidad: ['unidad de medida', 'unidad', 'medida', 'u.m.', 'um'],
  almacen: ['almacen', 'almacén', 'ubicacion', 'ubicación'],
  costoUnitario: ['costo unitario', 'costo unitario (s/.)', 'costo', 'precio compra', 'costo unit'],
  stockCritico: [
    'stock critico',
    'stock crítico',
    'stock critico minimo',
    'stock crítico mínimo',
    'alerta stock critico',
    'alerta stock crítico',
    'minimo',
    'mínimo'
  ],
};

export function normalizeHeader(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function parseNumericCell(val) {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/,/g, '.').trim();
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

export function resolveUnidad(rawUnidad) {
  if (!rawUnidad) return 'kg';
  const clean = String(rawUnidad).trim().toLowerCase();
  const found = VALID_UNIDADES.find((u) => u.toLowerCase() === clean);
  return found || 'kg';
}

export function resolveAlmacen(rawAlmacen, almacenes = FALLBACK_ALMACENES) {
  if (!rawAlmacen) return almacenes[0] || 'Congelador';
  const clean = String(rawAlmacen).trim().toLowerCase();
  const found = almacenes.find((a) => a.toLowerCase() === clean);
  return found || String(rawAlmacen).trim();
}

export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function escapeCsvCell(value) {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadImportErrorsCsv(errors, originalFileName = 'importacion') {
  if (!errors || errors.length === 0) return;

  const headers = [
    'Fila Excel',
    'Tipo de Error',
    'Campo',
    'Problema',
    'Nombre',
    'Cantidad',
    'Unidad de Medida',
    'Almacén',
    'Costo Unitario',
    'Stock Crítico',
  ];

  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...errors.map((err) =>
      [
        err.rowNumber,
        err.errorType === 'duplicado' ? 'Duplicado' : 'Campo obligatorio',
        err.field,
        err.problem,
        err.rawData?.nombre ?? '',
        err.rawData?.cantidad ?? '',
        err.rawData?.unidad ?? '',
        err.rawData?.almacen ?? '',
        err.rawData?.costoUnitario ?? '',
        err.rawData?.stockCritico ?? '',
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];

  const baseName = (originalFileName || 'importacion').replace(/\.[^.]+$/, '');
  const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  triggerBlobDownload(blob, `errores_${baseName}.csv`);
}

export async function analyzeInventoryExcelFile(
  file,
  almacenes = FALLBACK_ALMACENES,
  existingInsumos = []
) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return {
      fileName: file.name,
      totalRows: 0,
      mappedColumnsCount: 0,
      totalColumnsCount: 0,
      ignoredColumnsCount: 0,
      validRows: [],
      duplicateErrors: [],
      missingFieldErrors: [],
    };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (matrix.length === 0) {
    return {
      fileName: file.name,
      totalRows: 0,
      mappedColumnsCount: 0,
      totalColumnsCount: 0,
      ignoredColumnsCount: 0,
      validRows: [],
      duplicateErrors: [],
      missingFieldErrors: [],
    };
  }

  const rawHeaders = (matrix[0] ?? []).map((cell) => String(cell ?? '').trim());
  const nonEmptyHeaderIndexes = rawHeaders
    .map((h, idx) => ({ h, idx }))
    .filter((entry) => entry.h !== '');

  const colIndex = {};
  let mappedColumnsCount = 0;

  for (const { h, idx } of nonEmptyHeaderIndexes) {
    const norm = normalizeHeader(h);
    let matched = false;
    Object.keys(HEADER_MATCHERS).forEach((fieldKey) => {
      if (
        colIndex[fieldKey] === undefined &&
        HEADER_MATCHERS[fieldKey].includes(norm)
      ) {
        colIndex[fieldKey] = idx;
        matched = true;
      }
    });
    if (matched) mappedColumnsCount += 1;
  }

  const totalColumnsCount = nonEmptyHeaderIndexes.length;
  const ignoredColumnsCount = Math.max(0, totalColumnsCount - mappedColumnsCount);

  const seenInFile = new Map();

  const validRows = [];
  const duplicateErrors = [];
  const missingFieldErrors = [];
  let totalRows = 0;

  for (let r = 1; r < matrix.length; r += 1) {
    const rowArr = matrix[r] ?? [];
    const allEmpty = rowArr.every((v) => String(v ?? '').trim() === '');
    if (allEmpty) continue;

    totalRows += 1;
    const excelRowNumber = r + 1;

    const getCell = (key) => {
      const idx = colIndex[key];
      return idx !== undefined ? rowArr[idx] : '';
    };

    const rawNombre = getCell('nombre');
    const rawCantidad = getCell('cantidad');
    const rawUnidad = getCell('unidad');
    const rawAlmacen = getCell('almacen');
    const rawCosto = getCell('costoUnitario');
    const rawCritico = getCell('stockCritico');

    const nombre = String(rawNombre ?? '').trim();
    const cantidadStr = String(rawCantidad ?? '').trim();
    const cantidad = parseNumericCell(rawCantidad);

    const rawData = {
      nombre,
      cantidad: cantidadStr,
      unidad: String(rawUnidad ?? '').trim(),
      almacen: String(rawAlmacen ?? '').trim(),
      costoUnitario: String(rawCosto ?? '').trim(),
      stockCritico: String(rawCritico ?? '').trim(),
    };

    const nombreFaltante = !nombre;
    const cantidadFaltante = cantidad === null;
    const cantidadNegativa = cantidad !== null && cantidad < 0;

    if (nombreFaltante || cantidadFaltante || cantidadNegativa) {
      let field = 'Nombre';
      let problem = 'Campo obligatorio vacío';

      if (nombreFaltante && (cantidadFaltante || cantidadNegativa)) {
        field = 'Nombre, Cantidad';
        problem = 'Faltan Nombre y Cantidad (obligatorios)';
      } else if (nombreFaltante) {
        field = 'Nombre';
        problem = 'Campo obligatorio vacío';
      } else if (cantidadFaltante) {
        field = 'Cantidad';
        problem =
          cantidadStr === ''
            ? 'Campo obligatorio vacío'
            : `Cantidad inválida ("${cantidadStr}")`;
      } else if (cantidadNegativa) {
        field = 'Cantidad';
        problem = 'La cantidad no puede ser menor a 0';
      }

      missingFieldErrors.push({
        rowNumber: excelRowNumber,
        errorType: 'campo_obligatorio',
        nombre: nombre || 'Sin nombre',
        field,
        problem,
        rawData,
      });
      continue;
    }

    // Coincidencia con insumos existentes en el sistema (palabra por palabra)
    const matchedExisting = existingInsumos.find((item) =>
      areNamesMatching(nombre, item.nombre) || normalizeHeader(item.nombre) === normalizeHeader(nombre)
    );

    if (matchedExisting) {
      duplicateErrors.push({
        rowNumber: excelRowNumber,
        errorType: 'duplicado',
        nombre,
        field: 'Nombre',
        problem: `Ya existe como "${matchedExisting.nombre}"`,
        rawData,
      });
      continue;
    }

    // Coincidencia dentro del mismo archivo
    const normName = normalizeHeader(nombre);
    const firstFileRow = seenInFile.get(normName);
    if (firstFileRow !== undefined) {
      duplicateErrors.push({
        rowNumber: excelRowNumber,
        errorType: 'duplicado',
        nombre,
        field: 'Nombre',
        problem: `Repetido dentro del Excel (fila ${firstFileRow})`,
        rawData,
      });
      continue;
    }

    seenInFile.set(normName, excelRowNumber);

    const parsedCosto = parseNumericCell(rawCosto);
    const costoUnitario =
      parsedCosto !== null && parsedCosto >= 0
        ? Number(parsedCosto.toFixed(2))
        : 0;

    const criticoStr = String(rawCritico ?? '').trim();
    const parsedCritico = criticoStr !== '' ? parseNumericCell(rawCritico) : null;
    const alertaStockCritico = parsedCritico !== null && parsedCritico >= 0;
    const stockCriticoMin = alertaStockCritico
      ? Number(parsedCritico.toFixed(2))
      : 0;

    let estado = 'Bueno';
    if (cantidad === 0) {
      estado = 'Sin Stock';
    } else if (
      alertaStockCritico &&
      stockCriticoMin !== undefined &&
      cantidad <= stockCriticoMin
    ) {
      estado = 'Bajo Stock';
    }

    validRows.push({
      rowNumber: excelRowNumber,
      nombre,
      cantidad,
      unidad: resolveUnidad(rawUnidad),
      almacen: resolveAlmacen(rawAlmacen, almacenes),
      costoUnitario,
      alertaStockCritico,
      stockCriticoMin,
      estado,
    });
  }

  return {
    fileName: file.name,
    totalRows,
    mappedColumnsCount,
    totalColumnsCount,
    ignoredColumnsCount,
    validRows,
    duplicateErrors,
    missingFieldErrors,
  };
}
