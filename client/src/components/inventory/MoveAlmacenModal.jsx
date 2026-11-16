import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';

export const MoveAlmacenModal = ({
  isOpen,
  selectedCount,
  label,
  currentAlmacen,
  almacenes,
  onClose,
  onConfirmMove,
}) => {
  const [targetAlmacen, setTargetAlmacen] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const alternative =
      almacenes.find((a) => a !== currentAlmacen) ?? almacenes[0] ?? '';
    setTargetAlmacen(alternative);
  }, [isOpen, currentAlmacen, almacenes]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetAlmacen) return;
    onConfirmMove(targetAlmacen);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-almacen-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
        <div className="sm:hidden flex justify-center pt-2.5">
          <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        <div className="flex items-center justify-between px-5 sm:px-6 pt-3.5 pb-3 sm:py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#10B981] flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="move-almacen-title"
                className="text-base font-bold text-slate-900 dark:text-white leading-tight"
              >
                Mover a otro almacén
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedCount === 1
                  ? label
                  : `${selectedCount} insumos seleccionados`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {currentAlmacen && (
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
              Almacén actual:{' '}
              <strong className="text-slate-900 dark:text-white">
                {currentAlmacen}
              </strong>
            </div>
          )}

          <div>
            <label
              htmlFor="move-target-almacen"
              className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
            >
              Almacén destino <span className="text-slate-500">*</span>
            </label>
            <select
              id="move-target-almacen"
              value={targetAlmacen}
              onChange={(e) => setTargetAlmacen(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F26522]/25 focus:border-[#F26522]"
            >
              {almacenes.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!targetAlmacen || targetAlmacen === currentAlmacen}
              className="px-6 py-2.5 text-xs font-bold rounded-full bg-[#F26522] hover:bg-[#DC5616] disabled:opacity-45 disabled:cursor-not-allowed text-white shadow-[0_6px_14px_-3px_rgba(242,101,34,0.5)] cursor-pointer"
            >
              Confirmar Traslado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
