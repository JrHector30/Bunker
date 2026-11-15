import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import CloseButton from '../ui/CloseButton';

export const DeleteConfirmModal = ({
  isOpen,
  itemName = '',
  count = 1,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 text-left space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {count > 1 ? `¿Eliminar ${count} platos?` : '¿Eliminar plato?'}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {count > 1
                ? `Estás a punto de eliminar permanentemente ${count} platos seleccionados de la carta.`
                : `Estás a punto de eliminar "${itemName}" de la carta. Esta acción no se puede deshacer.`}
            </p>
          </div>
          <CloseButton onClick={onCancel} className="scale-75" />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default DeleteConfirmModal;
