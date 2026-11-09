import React, { useState, useMemo } from 'react';
import { Search, X, Plus } from 'lucide-react';

export const AddIngredientModal = ({
  isOpen,
  onClose,
  insumos = [],
  onAddIngredient,
  existingInsumoIds = [],
}) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quantities, setQuantities] = useState({});

  // Categorías únicas derivadas de los insumos reales
  const categories = useMemo(() => {
    const set = new Set();
    insumos.forEach((i) => {
      if (i.categoria) set.add(i.categoria);
    });
    const list = Array.from(set).sort();
    return [{ id: 'all', label: 'Todos' }, ...list.map((c) => ({ id: c, label: c }))];
  }, [insumos]);

  const filteredItems = useMemo(() => {
    return insumos.filter((item) => {
      const name = item.nombre || '';
      const cat = item.categoria || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || cat === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [insumos, searchTerm, selectedCategory]);

  const handleAdd = (item) => {
    const qty = quantities[item.id] || 0.1;
    onAddIngredient(item, qty);
  };

  const handleQuantityChange = (id, val) => {
    const num = parseFloat(val);
    setQuantities((prev) => ({
      ...prev,
      [id]: isNaN(num) ? '' : num,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0d0d12] border border-slate-200/90 dark:border-zinc-800/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] text-zinc-900 dark:text-zinc-100 transition-colors">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/90 dark:border-zinc-800/80 flex items-center justify-between bg-slate-50/60 dark:bg-zinc-900/40">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Catálogo de Insumos / Materia Prima
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Selecciona los insumos registrados del local para añadirlos al escandallo de la receta.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Buscador y Filtro por Categorías */}
        <div className="p-3.5 border-b border-slate-200/90 dark:border-zinc-800/80 space-y-2.5 bg-white dark:bg-[#0d0d12]">
          <div className="relative">
            <Search className="size-3.5 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar insumo por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-700 transition-colors"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'shadow-xs border-0 text-white'
                    : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200/60 dark:border-zinc-800/60'
                }`}
                style={
                  selectedCategory === cat.id
                    ? { backgroundColor: 'var(--primary)', color: '#ffffff' }
                    : {}
                }
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Insumos */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60 p-2 text-xs">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-zinc-500">
              No se encontraron insumos con ese criterio.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isAlreadyAdded = existingInsumoIds.includes(item.id);
              const qty = quantities[item.id] !== undefined ? quantities[item.id] : 0.1;

              return (
                <div
                  key={item.id}
                  className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-zinc-900/40 rounded-xl transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {item.nombre}
                      </span>
                      {isAlreadyAdded && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800/50">
                          En receta
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      <span>{item.categoria || 'General'}</span>
                      <span>·</span>
                      <span>
                        Costo: <strong className="font-mono text-zinc-700 dark:text-zinc-300">S/. {parseFloat(item.precioCompra || 0).toFixed(2)}</strong> / {item.unidadMedida || 'und'}
                      </span>
                      {item.stockActual !== undefined && (
                        <>
                          <span>·</span>
                          <span>Stock: {parseFloat(item.stockActual || 0)} {item.unidadMedida || 'und'}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0.001"
                        value={qty}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        className="w-16 bg-transparent text-right font-mono text-xs text-zinc-900 dark:text-white focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                        {item.unidadMedida || 'und'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAdd(item)}
                      className="px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 border-0 text-white"
                      style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
                    >
                      <Plus size={12} />
                      <span>{isAlreadyAdded ? 'Añadir +' : 'Añadir'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200/90 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/30 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddIngredientModal;
