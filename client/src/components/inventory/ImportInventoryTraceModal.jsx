import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  CopyX,
  Download,
  FileSpreadsheet,
  Loader2,
  PackageCheck,
  X,
} from 'lucide-react';
import { downloadImportErrorsCsv } from '../../utils/inventoryExcel';

export const ImportInventoryTraceModal = ({
  isOpen,
  analysis,
  onClose,
  onConfirmImport,
}) => {
  const [phase, setPhase] = useState('review'); // 'review' | 'importing' | 'done'
  const [importedCount, setImportedCount] = useState(0);
  const [elapsedLabel, setElapsedLabel] = useState('0.4s');
  const [duplicatesOpen, setDuplicatesOpen] = useState(true);
  const [missingOpen, setMissingOpen] = useState(true);
  const [validPreviewOpen, setValidPreviewOpen] = useState(false);
  const committedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !analysis) return;
    setPhase('review');
    setImportedCount(0);
    committedRef.current = false;
    setDuplicatesOpen(analysis.duplicateErrors.length > 0);
    setMissingOpen(analysis.missingFieldErrors.length > 0);
    setValidPreviewOpen(false);
  }, [isOpen, analysis]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && phase !== 'importing') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, phase, onClose]);

  useEffect(() => {
    if (phase !== 'importing' || !analysis) return;
    const total = analysis.validRows.length;
    if (total === 0) {
      setPhase('done');
      return;
    }

    if (importedCount >= total) {
      if (!committedRef.current) {
        committedRef.current = true;
        onConfirmImport(analysis.validRows);
        setPhase('done');
      }
      return;
    }

    const step = Math.max(1, Math.ceil(total / 8));
    const timer = window.setTimeout(() => {
      setImportedCount((n) => Math.min(n + step, total));
    }, 65);

    return () => window.clearTimeout(timer);
  }, [phase, importedCount, analysis, onConfirmImport]);

  if (!isOpen || !analysis) return null;

  const {
    fileName,
    totalRows,
    mappedColumnsCount,
    totalColumnsCount,
    ignoredColumnsCount,
    validRows,
    duplicateErrors,
    missingFieldErrors,
  } = analysis;

  const handleStartImport = () => {
    if (validRows.length === 0 || phase !== 'review') return;
    const estimatedSec = Math.max(0.2, Math.min(1.8, validRows.length * 0.03));
    setElapsedLabel(`${estimatedSec.toFixed(1)}s`);
    setImportedCount(0);
    setPhase('importing');
  };

  const progressPct = validRows.length > 0 ? Math.round((importedCount / validRows.length) * 100) : 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[2px] animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-trace-title"
      onClick={() => {
        if (phase !== 'importing') onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300"
      >
        <div className="sm:hidden flex justify-center pt-2.5">
          <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-4 pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <h3
              id="import-trace-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight"
            >
              Resumen de Importación Excel
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 tabular-nums">
              {fileName} · {totalRows}{' '}
              {totalRows === 1 ? 'fila analizada' : 'filas analizadas'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={phase === 'importing'}
            aria-label="Cerrar ventana"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overlay o Barra de Progreso en Importación */}
        {phase === 'importing' && (
          <div className="bg-orange-50/70 dark:bg-orange-950/30 px-5 sm:px-6 py-3 border-b border-orange-100 dark:border-orange-900/50 animate-fade-in">
            <div className="flex items-center justify-between text-xs font-semibold text-[#F26522] mb-1.5">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importando insumos al sistema...</span>
              </span>
              <span className="tabular-nums font-mono">{progressPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-orange-200/60 dark:bg-orange-900/40 overflow-hidden">
              <div
                className="h-full bg-[#F26522] rounded-full transition-all duration-100"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Trace Body */}
        <div className="p-5 sm:p-6 overflow-y-auto text-sm space-y-4">
          <div className="relative flex flex-col">
            {/* Paso 1: Archivo analizado */}
            <div className="relative flex gap-3 pb-4">
              <div
                aria-hidden="true"
                className="absolute left-[13px] top-7 bottom-0 w-px bg-slate-200 dark:bg-slate-800"
              />
              <div className="relative z-10 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5 flex items-baseline justify-between gap-3">
                <span className="font-semibold text-slate-900 dark:text-white truncate">
                  Archivo procesado: {fileName}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap shrink-0">
                  {totalRows} {totalRows === 1 ? 'fila' : 'filas'} en total
                </span>
              </div>
            </div>

            {/* Paso 2: Columnas mapeadas */}
            <div className="relative flex gap-3 pb-4">
              <div
                aria-hidden="true"
                className="absolute left-[13px] top-7 bottom-0 w-px bg-slate-200 dark:bg-slate-800"
              />
              <div className="relative z-10 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5 flex items-baseline justify-between gap-3">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Mapeadas {mappedColumnsCount} de {totalColumnsCount} columnas
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap shrink-0">
                  {ignoredColumnsCount > 0
                    ? `${ignoredColumnsCount} ignorada${ignoredColumnsCount === 1 ? '' : 's'}`
                    : 'Todas reconocidas'}
                </span>
              </div>
            </div>

            {/* Paso 3: Nombres duplicados (omitidos, no son errores) */}
            <div className="relative flex gap-3 pb-4">
              <div
                aria-hidden="true"
                className="absolute left-[13px] top-7 bottom-0 w-px bg-slate-200 dark:bg-slate-800"
              />
              <div
                className={`relative z-10 w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                  duplicateErrors.length > 0
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {duplicateErrors.length > 0 ? (
                  <CopyX className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                {duplicateErrors.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setDuplicatesOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between gap-2 text-left bg-transparent border-0 p-0 cursor-pointer group"
                    >
                      <span className="font-semibold text-amber-700 dark:text-amber-300">
                        {duplicateErrors.length}{' '}
                        {duplicateErrors.length === 1
                          ? 'fila no subirá por nombre duplicado'
                          : 'filas no subirán por nombre duplicado'}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-150 shrink-0 ${
                          duplicatesOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {duplicatesOpen && (
                      <div className="mt-2.5 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                        <div className="max-h-40 overflow-y-auto">
                          <table className="no-theme-header w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 sticky top-0">
                              <tr>
                                <th className="py-1.5 px-3 font-semibold w-14">
                                  Fila
                                </th>
                                <th className="py-1.5 px-3 font-semibold">
                                  Insumo
                                </th>
                                <th className="py-1.5 px-3 font-semibold">
                                  Motivo
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {duplicateErrors.map((err) => (
                                <tr key={`dup-${err.rowNumber}`}>
                                  <td className="py-1.5 px-3 tabular-nums text-slate-500 dark:text-slate-400">
                                    {err.rowNumber}
                                  </td>
                                  <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                                    {err.nombre}
                                  </td>
                                  <td className="py-1.5 px-3 text-amber-700 dark:text-amber-300">
                                    {err.problem}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      0 filas con nombre duplicado
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Sin repetidos
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Paso 4: Errores de campos obligatorios + descarga CSV */}
            <div className="relative flex gap-3 pb-4">
              <div
                aria-hidden="true"
                className="absolute left-[13px] top-7 bottom-0 w-px bg-slate-200 dark:bg-slate-800"
              />
              <div
                className={`relative z-10 w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                  missingFieldErrors.length > 0
                    ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {missingFieldErrors.length > 0 ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                {missingFieldErrors.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setMissingOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between gap-2 text-left bg-transparent border-0 p-0 cursor-pointer"
                    >
                      <span className="font-semibold text-red-700 dark:text-red-400">
                        {missingFieldErrors.length}{' '}
                        {missingFieldErrors.length === 1
                          ? 'fila falló por campo obligatorio'
                          : 'filas fallaron por campo obligatorio'}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-150 shrink-0 ${
                          missingOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {missingOpen && (
                      <div className="mt-2.5 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                        <div className="max-h-40 overflow-y-auto">
                          <table className="no-theme-header w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 sticky top-0">
                              <tr>
                                <th className="py-1.5 px-3 font-semibold w-14">
                                  Fila
                                </th>
                                <th className="py-1.5 px-3 font-semibold">
                                  Campo
                                </th>
                                <th className="py-1.5 px-3 font-semibold">
                                  Problema
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {missingFieldErrors.map((err) => (
                                <tr key={`req-${err.rowNumber}`}>
                                  <td className="py-1.5 px-3 tabular-nums text-slate-500 dark:text-slate-400">
                                    {err.rowNumber}
                                  </td>
                                  <td className="py-1.5 px-3">
                                    <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                      {err.field}
                                    </code>
                                  </td>
                                  <td className="py-1.5 px-3 text-red-600 dark:text-red-400">
                                    {err.problem}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      0 errores de campos obligatorios
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Nombre y Cantidad
                    </span>
                  </div>
                )}

                {missingFieldErrors.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      downloadImportErrorsCsv(missingFieldErrors, fileName)
                    }
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-xs font-semibold text-[#F26522] hover:bg-orange-100 dark:hover:bg-orange-900/60 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      Descargar las {missingFieldErrors.length}{' '}
                      {missingFieldErrors.length === 1 ? 'fila' : 'filas'} con
                      error en CSV
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Paso 5: Filas válidas / progreso de carga */}
            <div className="relative flex gap-3">
              <div
                className={`relative z-10 w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                  phase === 'importing'
                    ? 'bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800 text-[#F26522]'
                    : validRows.length > 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {phase === 'importing' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PackageCheck className="w-3.5 h-3.5" />
                )}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {phase === 'done'
                      ? `Se importaron ${validRows.length} insumos correctamente`
                      : phase === 'importing'
                        ? `Importando ${validRows.length} insumos`
                        : `${validRows.length} ${
                            validRows.length === 1
                              ? 'insumo se subirá correctamente'
                              : 'insumos se subirán correctamente'
                          }`}
                  </span>
                  <span
                    aria-hidden={phase === 'importing'}
                    className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap shrink-0"
                  >
                    {phase === 'done'
                      ? `en ${elapsedLabel}`
                      : phase === 'importing'
                        ? `${importedCount} de ${validRows.length}`
                        : validRows.length > 0
                          ? 'Listos para subir'
                          : 'Nada válido'}
                  </span>
                </div>

                {validRows.length > 0 && phase === 'review' && (
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={() => setValidPreviewOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-transparent border-0 p-0 cursor-pointer"
                    >
                      <span>
                        {validPreviewOpen
                          ? 'Ocultar lista de insumos válidos'
                          : `Ver los ${validRows.length} insumos que se subirán`}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-150 ${
                          validPreviewOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {validPreviewOpen && (
                      <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                        <div className="max-h-40 overflow-y-auto">
                          <table className="no-theme-header w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 sticky top-0">
                              <tr>
                                <th className="py-1.5 px-3 font-semibold w-14">
                                  Fila
                                </th>
                                <th className="py-1.5 px-3 font-semibold">
                                  Nombre
                                </th>
                                <th className="py-1.5 px-3 font-semibold">
                                  Cantidad
                                </th>
                                <th className="py-1.5 px-3 font-semibold">
                                  Almacén
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {validRows.map((row) => (
                                <tr key={`ok-${row.rowNumber}`}>
                                  <td className="py-1.5 px-3 tabular-nums text-slate-500 dark:text-slate-400">
                                    {row.rowNumber}
                                  </td>
                                  <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                                    {row.nombre}
                                  </td>
                                  <td className="py-1.5 px-3 tabular-nums text-slate-600 dark:text-slate-300">
                                    {row.cantidad} {row.unidad}
                                  </td>
                                  <td className="py-1.5 px-3 text-slate-600 dark:text-slate-300">
                                    {row.almacen}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <p role="status" className="sr-only">
            {phase === 'done'
              ? `Se importaron ${validRows.length} insumos correctamente`
              : ''}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          {phase === 'done' ? (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-xs font-bold rounded-full bg-[#F26522] hover:bg-[#DC5616] text-white border-0 shadow-[0_6px_14px_-3px_rgba(242,101,34,0.5)] transition-colors cursor-pointer"
            >
              Listo
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={phase === 'importing'}
                className="px-5 py-2.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-0 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStartImport}
                disabled={validRows.length === 0 || phase === 'importing'}
                className="px-6 py-2.5 text-xs font-bold rounded-full bg-[#F26522] hover:bg-[#DC5616] border-0 disabled:opacity-45 disabled:cursor-not-allowed text-white shadow-[0_6px_14px_-3px_rgba(242,101,34,0.5)] transition-colors cursor-pointer"
              >
                {phase === 'importing'
                  ? 'Importando...'
                  : `Importar ${validRows.length} ${
                      validRows.length === 1 ? 'insumo' : 'insumos'
                    }`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
