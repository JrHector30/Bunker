import React from 'react';
import { AlertTriangle, Save, Trash2, X } from 'lucide-react';

export const UnsavedChangesModal = ({
  isOpen,
  platoNombre = 'este plato',
  onSaveAndProceed,
  onDiscardAndProceed,
  onCancel,
  isSaving = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cambios sin guardar
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Escandallo de receta
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Has realizado modificaciones en los insumos de{' '}
            <strong className="text-slate-900 dark:text-white font-semibold">
              "{platoNombre}"
            </strong>
            . Si sales o cambias de plato sin guardar, los cambios se perderán.
          </p>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            ¿Deseas guardar el escandallo ahora antes de continuar?
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 pb-5 pt-2 flex flex-col sm:flex-row items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer disabled:opacity-50"
          >
            Seguir editando
          </button>
          <button
            type="button"
            onClick={onDiscardAndProceed}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Descartar cambios</span>
          </button>
          <button
            type="button"
            onClick={onSaveAndProceed}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold rounded-xl border-0 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Guardando...' : 'Guardar y continuar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;
