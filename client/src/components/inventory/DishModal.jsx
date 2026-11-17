import React, { useEffect, useState, useRef, useMemo } from 'react';
import { X, Image as ImageIcon, AlertCircle, Upload, Check, Tag } from 'lucide-react';
import CloseButton from '../ui/CloseButton';
import FilterCombobox from './FilterCombobox';
import { areNamesMatching } from '../../utils/textMatching';

export const DishModal = ({
  isOpen,
  mode = 'create',
  initialDish = null,
  categories = [],
  existingDishes = [],
  onClose,
  onSave,
}) => {
  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [precio, setPrecio] = useState('');
  const [costoProduccion, setCostoProduccion] = useState('');
  const [estado, setEstado] = useState('Activo');
  const [imagen, setImagen] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialDish) {
      setNombre(initialDish.nombre || '');
      setCategoriaId(initialDish.categoriaId ? String(initialDish.categoriaId) : (categories[0]?.id ? String(categories[0].id) : ''));
      setPrecio(initialDish.precio !== undefined ? String(initialDish.precio) : (initialDish.precioVenta !== undefined ? String(initialDish.precioVenta) : ''));
      setCostoProduccion(initialDish.costoProduccion !== undefined ? String(initialDish.costoProduccion) : (initialDish.costoProd !== undefined ? String(initialDish.costoProd) : ''));
      setEstado(initialDish.estado || (initialDish.activo === false ? 'Inactivo' : 'Activo'));
      setImagen(initialDish.imagen || '');
      setImagePreview(initialDish.imagen || '');
      setImageFile(null);
    } else {
      setNombre('');
      setCategoriaId(categories[0]?.id ? String(categories[0].id) : '');
      setPrecio('');
      setCostoProduccion('');
      setEstado('Activo');
      setImagen('');
      setImagePreview('');
      setImageFile(null);
    }
    setError('');
    setIsSubmitting(false);
  }, [isOpen, mode, initialDish, categories]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const existingMatch = useMemo(() => {
    if (!isOpen || !nombre.trim() || mode === 'edit') return null;
    return existingDishes.find((item) => {
      if (initialDish && item.id === initialDish.id) return false;
      return areNamesMatching(nombre, item.nombre);
    });
  }, [isOpen, nombre, existingDishes, mode, initialDish]);

  if (!isOpen) return null;

  const parsedPrecio = Number(precio) || 0;
  const parsedCosto = Number(costoProduccion) || 0;
  const previewPct = parsedPrecio > 0 ? (parsedCosto / parsedPrecio) * 100 : 0;
  const previewMargin = Math.max(0, 100 - previewPct);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setError('La imagen debe ser de 15MB como máximo.');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Ingresa el nombre del plato.');
      return;
    }
    if (!categoriaId) {
      setError('Selecciona una categoría.');
      return;
    }
    if (Number.isNaN(Number(precio)) || Number(precio) <= 0) {
      setError('El precio de venta debe ser mayor a S/. 0.00.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = imagen;
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const resUpload = await fetch('/api/upload', { method: 'POST', body: uploadData });
        if (resUpload.ok) {
          const upData = await resUpload.json();
          finalImageUrl = upData.url;
        }
      }

      const existingCost = initialDish?.costoProduccion !== undefined
        ? initialDish.costoProduccion
        : (initialDish?.costoProd !== undefined ? initialDish.costoProd : (existingMatch?.costoProd || 0));

      await onSave({
        id: existingMatch ? existingMatch.id : initialDish?.id,
        nombre: nombre.trim(),
        categoriaId: parseInt(categoriaId, 10),
        precio: parseFloat(precio),
        costoProduccion: parseFloat(existingCost) || 0,
        estado,
        activo: estado === 'Activo',
        imagen: finalImageUrl,
        isExistingMatch: Boolean(existingMatch),
        matchedDish: existingMatch,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar el plato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = categories.map((c) => ({
    value: String(c.id),
    label: c.nombre,
    emoji: c.icono || '🍽️',
  }));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dish-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2
              id="dish-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              {mode === 'create' ? 'Nuevo Plato' : 'Editar Plato'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mode === 'create'
                ? 'Registra un nuevo plato en la carta de este local.'
                : 'Actualiza los datos y costos del plato.'}
            </p>
          </div>
          <CloseButton onClick={onClose} className="scale-90" />
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {existingMatch && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold">Plato existente detectado</p>
                <p className="mt-0.5">
                  Ya existe un plato con nombre coincidente:{' '}
                  <strong>&quot;{existingMatch.nombre}&quot;</strong>. Al guardar se actualizará este plato en lugar de duplicarlo.
                </p>
              </div>
            </div>
          )}

          {/* Imagen + Nombre */}
          <div className="flex items-start gap-4">
            <div className="relative group shrink-0 flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 overflow-hidden flex items-center justify-center shadow-xs">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-3 py-1 rounded-full text-[11px] font-bold border-0 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                {imagePreview ? 'Cambiar foto' : 'Subir foto'}
              </button>
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del Plato *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Lomo Saltado Criollo"
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-full border-0 shadow-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Categoría *
                </label>
                <div className="w-full">
                  <FilterCombobox
                    value={categoriaId}
                    defaultValue=""
                    icon={Tag}
                    ariaLabel="Seleccionar categoría"
                    onChange={(val) => setCategoriaId(val)}
                    options={categoryOptions}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Precios y Costos */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Precio de Venta (S/.) *
              </label>
              <input
                type="number"
                step="0.10"
                min="0"
                required
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 text-xs font-bold rounded-full border-0 shadow-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Costo Prod. Estimado (S/.)
              </label>
              <input
                type="number"
                step="0.10"
                min="0"
                value={costoProduccion}
                onChange={(e) => setCostoProduccion(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 text-xs font-bold rounded-full border-0 shadow-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors tabular-nums"
              />
            </div>
          </div>

          {/* Estado del Plato con estilo Pill */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Estado en Carta
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Activo', label: 'Activo', dot: 'bg-emerald-500', activeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30' },
                { id: 'Agotado hoy', label: 'Agotado hoy', dot: 'bg-amber-500', activeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/30' },
                { id: 'Inactivo', label: 'Inactivo', dot: 'bg-slate-400', activeClass: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 ring-2 ring-zinc-500/30' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setEstado(st.id)}
                  className={`px-3 py-2 rounded-full text-xs font-bold border-0 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                    estado === st.id
                      ? st.activeClass
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                  <span>{st.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {estado === 'Activo'
                ? 'Visible para pedidos en Mesas y Comandas.'
                : 'No se mostrará a los mozos al tomar pedidos en salón.'}
            </p>
          </div>

          {/* Indicadores de Rentabilidad en tiempo real */}
          {parsedPrecio > 0 && (
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Costo %</span>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    previewPct > 40
                      ? 'text-red-600 dark:text-red-400'
                      : previewPct >= 30
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {previewPct.toFixed(1)}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-medium">Margen Bruto</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {previewMargin.toFixed(1)}% (S/. {(parsedPrecio - parsedCosto).toFixed(2)})
                </span>
              </div>
            </div>
          )}

          {/* Pie de modal con acciones Pill */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 active:scale-95 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-md border-0 active:scale-95 bg-[#F26522] hover:bg-[#DC5616] text-white disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{mode === 'create' ? 'Guardar Plato' : 'Guardar Cambios'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default DishModal;
