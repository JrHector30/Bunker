import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, FileSpreadsheet } from 'lucide-react';

export const ImportReportModal = ({
  isOpen,
  report,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !report) return null;

  const {
    total = 0,
    agregados = [],
    duplicados = [],
    incompletos = []
  } = report;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[2px] animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-report-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-[#F26522] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="import-report-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
              >
                Informe de Importación
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Se procesaron {total} fila(s) del archivo Excel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
          {/* Exitosos */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-center">
            <CheckCircle2 className="w-4 h-4 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
            <span className="block text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {agregados.length}
            </span>
            <span className="block text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
              Agregados
            </span>
          </div>

          {/* Omitidos por duplicidad */}
          <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-center">
            <AlertTriangle className="w-4 h-4 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
            <span className="block text-base sm:text-lg font-bold text-amber-700 dark:text-amber-300">
              {duplicados.length}
            </span>
            <span className="block text-[10.5px] font-semibold text-amber-600 dark:text-amber-400">
              Duplicados
            </span>
          </div>

          {/* Incompletos */}
          <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-center">
            <AlertCircle className="w-4 h-4 mx-auto text-rose-600 dark:text-rose-400 mb-1" />
            <span className="block text-base sm:text-lg font-bold text-rose-700 dark:text-rose-300">
              {incompletos.length}
            </span>
            <span className="block text-[10.5px] font-semibold text-rose-600 dark:text-rose-400">
              Rechazados
            </span>
          </div>
        </div>

        {/* Scrollable details */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Lista de Incompletos / Errores */}
          {incompletos.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                Filas no agregadas (datos obligatorios incompletos)
              </span>
              <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 divide-y divide-rose-100 dark:divide-rose-900/40 text-xs">
                {incompletos.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-start gap-2">
                    <span className="font-bold text-rose-700 dark:text-rose-300 shrink-0">
                      Fila {item.fila}:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {item.motivo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de Omitidos por Duplicidad */}
          {duplicados.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                Omitidos por duplicidad en el nombre
              </span>
              <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 divide-y divide-amber-100 dark:divide-amber-900/40 text-xs">
                {duplicados.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-start gap-2">
                    <span className="font-bold text-amber-700 dark:text-amber-300 shrink-0">
                      Fila {item.fila}:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      &quot;{item.nombre}&quot; (ya existe en el sistema como &quot;{item.coincideCon}&quot;)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumen de Agregados */}
          {agregados.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Insumos importados exitosamente ({agregados.length})
              </span>
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 divide-y divide-emerald-100 dark:divide-emerald-900/40 text-xs max-h-40 overflow-y-auto">
                {agregados.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.nombre}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 shrink-0">
                      {item.stock} {item.unidadMedida} · S/. {Number(item.precioCompra || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-xs font-bold rounded-full bg-[#F26522] hover:bg-[#DC5616] text-white shadow-md transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportReportModal;
