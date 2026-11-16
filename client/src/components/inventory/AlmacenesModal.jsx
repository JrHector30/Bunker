import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Pencil,
  Plus,
  Trash2,
  Warehouse,
  X,
  AlertTriangle,
} from 'lucide-react';

export const AlmacenesModal = ({
  isOpen,
  almacenes,
  insumos,
  onClose,
  onAddAlmacen,
  onRenameAlmacen,
  onDeleteAlmacen,
}) => {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [editingName, setEditingName] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deletingName, setDeletingName] = useState(null);
  const [transferTarget, setTransferTarget] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setNewName('');
    setError('');
    setEditingName(null);
    setEditValue('');
    setDeletingName(null);
    setTransferTarget('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const countsByAlmacen = useMemo(() => {
    const map = new Map();
    for (const a of almacenes) map.set(a, 0);
    for (const item of insumos) {
      const itemAlm = item.almacen || 'Congelador';
      map.set(itemAlm, (map.get(itemAlm) ?? 0) + 1);
    }
    return map;
  }, [almacenes, insumos]);

  if (!isOpen) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Ingresa un nombre para el nuevo almacén.');
      return;
    }
    const exists = almacenes.some(
      (a) => a.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setError(`Ya existe un almacén llamado "${trimmed}".`);
      return;
    }
    setError('');
    onAddAlmacen(trimmed);
    setNewName('');
  };

  const handleStartEdit = (name) => {
    setDeletingName(null);
    setEditingName(name);
    setEditValue(name);
    setError('');
  };

  const handleConfirmEdit = (oldName) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setError('El nombre del almacén no puede estar vacío.');
      return;
    }
    const duplicate = almacenes.some(
      (a) =>
        a.toLowerCase() === trimmed.toLowerCase() &&
        a.toLowerCase() !== oldName.toLowerCase()
    );
    if (duplicate) {
      setError(`Ya existe otro almacén llamado "${trimmed}".`);
      return;
    }
    setError('');
    if (trimmed !== oldName) {
      onRenameAlmacen(oldName, trimmed);
    }
    setEditingName(null);
    setEditValue('');
  };

  const handleRequestDelete = (name) => {
    if (almacenes.length <= 1) {
      setError('Debe existir al menos un almacén activo en el sistema.');
      return;
    }
    const count = countsByAlmacen.get(name) ?? 0;
    if (count === 0) {
      onDeleteAlmacen(name);
      setDeletingName(null);
      setError('');
      return;
    }
    const fallback = almacenes.find((a) => a !== name) ?? '';
    setEditingName(null);
    setDeletingName(name);
    setTransferTarget(fallback);
    setError('');
  };

  const handleConfirmDeleteWithTransfer = (name) => {
    if (!transferTarget || transferTarget === name) {
      setError('Selecciona un almacén destino para trasladar los insumos.');
      return;
    }
    onDeleteAlmacen(name, transferTarget);
    setDeletingName(null);
    setTransferTarget('');
    setError('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="almacenes-modal-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
      >
        <div className="sm:hidden flex justify-center pt-2.5">
          <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-3.5 pb-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#F26522] flex items-center justify-center shrink-0">
              <Warehouse className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="almacenes-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight"
              >
                Gestionar Almacenes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Crea, renombra o elimina almacenes con traslado seguro
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs font-medium text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Crear nuevo almacén */}
          <form onSubmit={handleCreate} className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nuevo almacén (ej. Barra, Cámara Fría...)"
              aria-label="Nombre de nuevo almacén"
              className="flex-1 min-h-[42px] px-3.5 py-2 text-sm rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F26522]/25 focus:border-[#F26522]"
            />
            <button
              type="submit"
              className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#F26522] hover:bg-[#DC5616] text-white shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Crear</span>
            </button>
          </form>

          {/* Lista de almacenes */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            {almacenes.map((name) => {
              const itemCount = countsByAlmacen.get(name) ?? 0;
              const isEditing = editingName === name;
              const isDeleting = deletingName === name;

              return (
                <div
                  key={name}
                  className="p-3.5 bg-white dark:bg-slate-900 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleConfirmEdit(name);
                            }
                          }}
                          autoFocus
                          aria-label={`Nuevo nombre para ${name}`}
                          className="flex-1 px-3 py-1.5 text-sm font-semibold rounded-lg border border-[#F26522] bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleConfirmEdit(name)}
                          aria-label="Guardar nombre"
                          className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 flex items-center justify-center cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingName(null)}
                          aria-label="Cancelar edición"
                          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                            {itemCount}{' '}
                            {itemCount === 1
                              ? 'insumo asignado'
                              : 'insumos asignados'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(name)}
                            aria-label={`Editar ${name}`}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDelete(name)}
                            disabled={almacenes.length <= 1}
                            aria-label={`Eliminar ${name}`}
                            className="w-8 h-8 rounded-lg border border-rose-200 dark:border-rose-900/70 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {isDeleting && (
                    <div className="rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-3 space-y-2.5">
                      <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          <strong>{name}</strong> tiene{' '}
                          <strong>{itemCount}</strong>{' '}
                          {itemCount === 1 ? 'insumo' : 'insumos'}. Elige a qué
                          almacén trasladarlos antes de eliminarlo:
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select
                          value={transferTarget}
                          onChange={(e) => setTransferTarget(e.target.value)}
                          aria-label="Almacén destino"
                          className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                        >
                          {almacenes
                            .filter((a) => a !== name)
                            .map((target) => (
                              <option key={target} value={target}>
                                Mover a: {target}
                              </option>
                            ))}
                        </select>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setDeletingName(null)}
                            className="px-3 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleConfirmDeleteWithTransfer(name)
                            }
                            className="px-3 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                          >
                            Trasladar y Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
