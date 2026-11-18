import React, { useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ChefHat,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Search,
  Layers,
  CheckCircle2,
  Package,
  SlidersHorizontal,
  Eye,
  EyeOff,
  ChevronDown,
  Save,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import { useCache } from '../hooks/useCache';
import { FilterCombobox } from '../components/inventory/FilterCombobox';
import { SmoothDropDown } from '../components/ui/CategorySmoothDropDown';
import { CustomCheckbox } from '../components/ui/CustomCheckbox';
import { CloseButton } from '../components/ui/CloseButton';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';

const EMOJI_CATEGORIES = [
  {
    id: 'platos',
    name: 'Platos & Fondos',
    icon: '🍽️',
    emojis: ['🍽️', '🍲', '🥘', '🍳', '🍛', '🍱', '🥗', '🥪', '🥙', '🌮', '🥩', '🥓', '🍗', '🍖', '🥟', '🍤'],
  },
  {
    id: 'rapidas',
    name: 'Comida Rápida',
    icon: '🍔',
    emojis: ['🍔', '🍕', '🌭', '🍟', '🌯', '🌮', '🥪', '🍗', '🍖', '🥩', '🧀', '🧆', '🥙', '🌭', '🍟', '🥓'],
  },
  {
    id: 'carnes',
    name: 'Parrillas & Carnes',
    icon: '🥩',
    emojis: ['🥩', '🍖', '🍗', '🥓', '🍢', '🥩', '🍖', '🐂', '🐖', '🔥', '🪵', '🌶️'],
  },
  {
    id: 'mariscos',
    name: 'Pescados & Mariscos',
    icon: '🐟',
    emojis: ['🐟', '🐠', '🦐', '🦑', '🦀', '🦞', '🍣', '🐙', '🦈', '🎣', '🐡', '🌊'],
  },
  {
    id: 'bebidas',
    name: 'Bebidas & Tragos',
    icon: '🍹',
    emojis: ['🍹', '🍸', '🍺', '🍻', '🍷', '🥂', '🍾', '🥃', '🥤', '🧃', '🧉', '🧊', '🧋', '🥛', '🍼'],
  },
  {
    id: 'cafe',
    name: 'Cafetería & Desayunos',
    icon: '☕',
    emojis: ['☕', '🍵', '🫖', '🥤', '🥐', '🥯', '🥞', '🧇', '🍞', '🥖', '🥨', '🍯', '🍪'],
  },
  {
    id: 'postres',
    name: 'Postres & Dulces',
    icon: '🍰',
    emojis: ['🍰', '🎂', '🧁', '🍦', '🍨', '🍧', '🍩', '🍪', '🍫', '🍮', '🍬', '🍭', '🍯', '🍓', '🍒', '🍎', '🍇', '🍉'],
  },
  {
    id: 'otros',
    name: 'Especiales & Extras',
    icon: '⭐',
    emojis: ['⭐', '🔥', '👑', '🎉', '🏷️', '📦', '🎁', '🥑', '🍋', '🧄', '🧅', '🍄', '🧂', '🍅', '🥬'],
  },
];

const EmojiSelector = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(EMOJI_CATEGORIES[0].id);

  const currentCategory = EMOJI_CATEGORIES.find((cat) => cat.id === activeTab) || EMOJI_CATEGORIES[0];

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[var(--text-main)] font-sans uppercase tracking-wide">
        Icono de la Categoría
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--bg-secondary)] hover:bg-[var(--glass-border)]/50 transition-all cursor-pointer ${
            isOpen ? 'ring-2 ring-[var(--primary)]' : ''
          }`}
          title="Clic para seleccionar emoji"
        >
          <span className="text-xl leading-none">{value || '🍽️'}</span>
          <span className="text-xs font-semibold text-[var(--text-muted)] font-sans">
            {value ? 'Cambiar icono' : 'Elegir icono'}
          </span>
          <ChevronDown
            size={14}
            className={`text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Expandable Emoji Catalog Panel */}
      {isOpen && (
        <div className="mt-1 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Category Navigation Tabs (SuperAdminView button style) */}
          <div className="flex gap-1.5 overflow-x-auto pb-2.5 mb-2.5 scrollbar-none border-b border-slate-100 dark:border-slate-800">
            {EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`px-3 py-1.5 rounded-full border-0 text-[11px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 ${
                  activeTab === cat.id
                    ? 'text-white shadow-md font-bold'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300'
                }`}
                style={activeTab === cat.id ? { backgroundColor: 'var(--primary, #F26522)' } : undefined}
              >
                <span className="text-xs">{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Emoji Grid */}
          <div className="grid grid-cols-8 sm:grid-cols-8 gap-1.5 max-h-48 overflow-y-auto p-1">
            {currentCategory.emojis.map((emoji, index) => {
              const isSelected = value === emoji;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    onChange(emoji);
                    setIsOpen(false);
                  }}
                  className={`w-9 h-9 rounded-xl border-0 flex items-center justify-center text-xl transition-all cursor-pointer hover:scale-125 active:scale-95 ${
                    isSelected
                      ? 'ring-2'
                      : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700'
                  }`}
                  style={isSelected ? {
                    backgroundColor: 'color-mix(in srgb, var(--primary, #F26522) 20%, transparent)',
                    outlineColor: 'var(--primary, #F26522)',
                  } : undefined}
                  title={`Seleccionar ${emoji}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const COCINA_OPTIONS = [
  { value: 'Todos', label: 'Todos los destinos' },
  { value: 'Cocina', label: 'Envía a Cocina (KDS)', indicatorClass: 'bg-emerald-500' },
  { value: 'NoCocina', label: 'Sin envío a Cocina', indicatorClass: 'bg-slate-400' },
];

const STATUS_OPTIONS = [
  { value: 'Todos', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'Solo Activas', indicatorClass: 'bg-emerald-500' },
  { value: 'INACTIVO', label: 'Solo Inactivas', indicatorClass: 'bg-slate-400' },
];

export const CategoriesView = () => {
  const { showConfirmation } = useConfirmation();
  const { showToast } = useNotification();

  const fetcher = () => fetch(`/api/categories?_t=${Date.now()}`).then((res) => res.json());
  const { data: rawCategories = [], mutate: fetchCategories } = useCache('categories', fetcher, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [cocinaFilter, setCocinaFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortField, setSortField] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    color: '#F26522',
    icono: '🍽️',
    activo: true,
    enviarCocina: true,
  });

  // Modal Delete Target
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Normalize backend categories
  const categories = useMemo(() => {
    return (rawCategories || []).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      icono: c.icono || '🍽️',
      color: c.color || '#F26522',
      cocina: c.enviarCocina !== false,
      productos: c._count?.platos ?? c.platos?.length ?? 0,
      estado: c.activo !== false ? 'ACTIVO' : 'INACTIVO',
      raw: c,
    }));
  }, [rawCategories]);

  const kpis = useMemo(() => {
    let activas = 0;
    let cocinaCount = 0;
    let totalProductos = 0;
    for (const c of categories) {
      if (c.estado === 'ACTIVO') activas += 1;
      if (c.cocina) cocinaCount += 1;
      totalProductos += c.productos;
    }
    return { total: categories.length, activas, cocinaCount, totalProductos };
  }, [categories]);

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = categories.filter((c) => {
      if (cocinaFilter === 'Cocina' && !c.cocina) return false;
      if (cocinaFilter === 'NoCocina' && c.cocina) return false;
      if (statusFilter !== 'Todos' && c.estado !== statusFilter) return false;
      if (q && !c.nombre.toLowerCase().includes(q)) return false;
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'nombre') {
        cmp = a.nombre.localeCompare(b.nombre, 'es');
      } else if (sortField === 'cocina') {
        cmp = Number(a.cocina) - Number(b.cocina);
      } else if (sortField === 'productos') {
        cmp = a.productos - b.productos;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [categories, searchQuery, cocinaFilter, statusFilter, sortField, sortDir]);

  const allSelected =
    filteredAndSorted.length > 0 &&
    filteredAndSorted.every((c) => selectedIds.includes(c.id));

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSorted.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat.raw || cat);
      setFormData({
        nombre: cat.nombre,
        color: cat.color || '#F26522',
        icono: cat.icono || '🍽️',
        activo: cat.estado === 'ACTIVO',
        enviarCocina: cat.cocina,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        nombre: '',
        color: '#F26522',
        icono: '🍽️',
        activo: true,
        enviarCocina: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = formData.nombre.trim();
    if (!cleanName) return;

    const url = editingCategory
      ? `/api/categories/${editingCategory.id}`
      : '/api/categories';
    const method = editingCategory ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          nombre: cleanName,
          activo: Boolean(formData.activo),
          enviarCocina: Boolean(formData.enviarCocina),
        }),
      });

      if (res.ok) {
        showToast('Categoría guardada exitosamente', 'success');
        window.dispatchEvent(new CustomEvent('categories-updated'));
        setIsModalOpen(false);
        fetchCategories();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Error al guardar categoría', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Error de conexión al guardar categoría', 'error');
    }
  };

  const handleQuickToggleEstado = async (cat) => {
    const nextActivo = cat.estado !== 'ACTIVO';
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: cat.nombre,
          color: cat.color,
          icono: cat.icono,
          enviarCocina: cat.cocina,
          activo: nextActivo,
        }),
      });
      if (res.ok) {
        fetchCategories();
        window.dispatchEvent(new CustomEvent('categories-updated'));
        showToast(
          `Categoría "${cat.nombre}" marcada como ${nextActivo ? 'Activa' : 'Inactiva'}.`,
          'info'
        );
      } else {
        showToast('No se pudo actualizar el estado', 'error');
      }
    } catch {
      showToast('Error de red al actualizar estado', 'error');
    }
  };

  const handleQuickToggleCocina = async (cat) => {
    const nextCocina = !cat.cocina;
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: cat.nombre,
          color: cat.color,
          icono: cat.icono,
          enviarCocina: nextCocina,
          activo: cat.estado === 'ACTIVO',
        }),
      });
      if (res.ok) {
        fetchCategories();
        window.dispatchEvent(new CustomEvent('categories-updated'));
        showToast(
          `"${cat.nombre}" ${nextCocina ? 'ahora envía a Cocina (KDS)' : 'ya no envía a Cocina'}.`,
          'info'
        );
      } else {
        showToast('No se pudo actualizar destino de cocina', 'error');
      }
    } catch {
      showToast('Error de red al actualizar cocina', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { ids, label } = deleteTarget;
    setDeleteTarget(null);

    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
          return res.ok;
        })
      );
      const allOk = results.every(Boolean);
      if (allOk) {
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
        fetchCategories();
        window.dispatchEvent(new CustomEvent('categories-updated'));
        showToast(
          ids.length > 1
            ? `${ids.length} categorías eliminadas.`
            : `Categoría "${label}" eliminada.`,
          'success'
        );
      } else {
        showToast('Algunas categorías no pudieron eliminarse', 'warning');
      }
    } catch (error) {
      console.error(error);
      showToast('Error al eliminar categorías', 'error');
    }
  };

  const buildRowMenuItems = (cat) => [
    {
      id: 'edit',
      label: 'Editar Categoría',
      icon: Pencil,
      onClick: () => handleOpenModal(cat),
    },
    {
      id: 'toggle-cocina',
      label: cat.cocina ? 'Quitar de Cocina (KDS)' : 'Enviar a Cocina (KDS)',
      icon: ChefHat,
      onClick: () => handleQuickToggleCocina(cat),
    },
    {
      id: 'toggle-status',
      label: cat.estado === 'ACTIVO' ? 'Desactivar Categoría' : 'Activar Categoría',
      icon: cat.estado === 'ACTIVO' ? EyeOff : Eye,
      onClick: () => handleQuickToggleEstado(cat),
    },
    {
      id: 'delete',
      label: 'Eliminar Categoría',
      icon: Trash2,
      danger: true,
      dividerBefore: true,
      onClick: () => setDeleteTarget({ ids: [cat.id], label: cat.nombre }),
    },
  ];

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-65" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    );
  };

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto w-full space-y-4 sm:space-y-5">
      {/* Encabezado */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[22px] sm:text-[24px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              Gestión de Categorías
            </h1>
            <span className="text-xs font-medium text-slate-400 tabular-nums">
              {categories.length} familias
            </span>
          </div>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organiza las familias de tu carta, su color identificador en el POS y envío a Cocina (KDS).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setDeleteTarget({
                  ids: selectedIds,
                  label: `${selectedIds.length} categorías`,
                })
              }
              className="min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar ({selectedIds.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenModal(null)}
            className="min-h-[40px] w-full sm:w-auto border-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-md transition-colors cursor-pointer whitespace-nowrap active:scale-95"
            style={{ backgroundColor: 'var(--primary, #F26522)' }}
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Categoría</span>
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section
        aria-label="Resumen de categorías"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        <button
          type="button"
          onClick={() => {
            setCocinaFilter('Todos');
            setStatusFilter('Todos');
          }}
          className={`text-left rounded-2xl bg-white dark:bg-slate-900 border p-3.5 sm:p-4 transition-all cursor-pointer ${
            cocinaFilter === 'Todos' && statusFilter === 'Todos'
              ? 'border-slate-300 dark:border-slate-700 shadow-xs'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Total Categorías
            </span>
            <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {kpis.total}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Familias registradas en carta
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter((s) => (s === 'ACTIVO' ? 'Todos' : 'ACTIVO'))
          }
          className={`text-left rounded-2xl bg-white dark:bg-slate-900 border p-3.5 sm:p-4 transition-all cursor-pointer ${
            statusFilter === 'ACTIVO'
              ? 'border-emerald-500 ring-2 ring-emerald-500/15'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Categorías Activas
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {kpis.activas}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Visibles en toma de pedidos
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setCocinaFilter((c) => (c === 'Cocina' ? 'Todos' : 'Cocina'))
          }
          className={`text-left rounded-2xl bg-white dark:bg-slate-900 border p-3.5 sm:p-4 transition-all cursor-pointer ${
            cocinaFilter === 'Cocina'
              ? 'border-[#F26522] ring-2 ring-[#F26522]/15'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Envío a Cocina (KDS)
            </span>
            <span className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-[#F26522] flex items-center justify-center">
              <ChefHat className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-[#F26522] tabular-nums">
            {kpis.cocinaCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Imprimen / salen en monitor
          </p>
        </button>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Platos Vinculados
            </span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <Package className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {kpis.totalProductos}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Items totales distribuidos
          </p>
        </div>
      </section>

      {/* Contenedor Principal: Toolbar + Tabla PC Web + Tarjetas Mobile */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {/* Toolbar */}
        <div className="p-4 sm:px-5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar categoría..."
              className="w-full min-h-[40px] pl-10 pr-8 py-2 text-[13px] rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 p-0 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterCombobox
              value={cocinaFilter}
              defaultValue="Todos"
              icon={ChefHat}
              ariaLabel="Filtrar por envío a cocina"
              onChange={setCocinaFilter}
              options={COCINA_OPTIONS}
            />

            <FilterCombobox
              value={statusFilter}
              defaultValue="Todos"
              icon={SlidersHorizontal}
              ariaLabel="Filtrar por estado"
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>

        {/* ================= PC WEB: VISTA TABLA (md+) ================= */}
        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-white text-[11px] font-bold tracking-wider uppercase" style={{ backgroundColor: 'var(--primary, #F26522)' }}>
                <th className="py-3.5 px-4 w-12">
                  <CustomCheckbox
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    ariaLabel="Seleccionar todas las categorías"
                  />
                </th>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('nombre')}
                    className="inline-flex items-center gap-1.5 font-bold uppercase cursor-pointer bg-transparent border-0 p-0 text-white"
                  >
                    <span>Categoría</span>
                    {renderSortIcon('nombre')}
                  </button>
                </th>
                <th className="py-3.5 px-4">Color</th>
                <th className="py-3.5 px-4 text-center">
                  <button
                    type="button"
                    onClick={() => toggleSort('cocina')}
                    className="inline-flex items-center gap-1.5 font-bold uppercase cursor-pointer bg-transparent border-0 p-0 text-white"
                  >
                    <span>Cocina (KDS)</span>
                    {renderSortIcon('cocina')}
                  </button>
                </th>
                <th className="py-3.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('productos')}
                    className="inline-flex items-center gap-1.5 font-bold uppercase cursor-pointer ml-auto bg-transparent border-0 p-0 text-white"
                  >
                    <span>Productos</span>
                    {renderSortIcon('productos')}
                  </button>
                </th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-5 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[13px]">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                    No se encontraron categorías con ese criterio.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((cat) => {
                  const isChecked = selectedIds.includes(cat.id);
                  return (
                    <tr
                      key={cat.id}
                      className={`transition-colors ${
                        isChecked
                          ? 'bg-orange-50/40 dark:bg-orange-950/20'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <CustomCheckbox
                          checked={isChecked}
                          onChange={() => toggleSelectOne(cat.id)}
                          ariaLabel={`Seleccionar ${cat.nombre}`}
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            style={{
                              backgroundColor: `${cat.color}26`,
                              borderColor: `${cat.color}66`,
                            }}
                            className="w-9 h-9 rounded-xl border flex items-center justify-center text-lg shrink-0"
                          >
                            <span aria-hidden="true">{cat.icono}</span>
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {cat.nombre}
                          </span>
                        </div>
                      </td>

                      {/* Solo muestra el círculo de color, sin # */}
                      <td className="py-3 px-4">
                        <span
                          style={{ backgroundColor: cat.color }}
                          title={cat.color}
                          aria-label={`Color ${cat.color}`}
                          className="inline-block w-6 h-6 rounded-full border border-black/15 shadow-xs align-middle"
                        />
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleQuickToggleCocina(cat)}
                          title="Clic para cambiar envío a cocina"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            cat.cocina
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900 hover:bg-emerald-100/70'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/70 dark:border-slate-700 hover:bg-slate-200/60'
                          }`}
                        >
                          <ChefHat className="w-3.5 h-3.5" />
                          <span>{cat.cocina ? 'SÍ · KDS' : 'NO'}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                        {cat.productos} items
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleQuickToggleEstado(cat)}
                          title="Clic para activar o desactivar"
                          className={`border-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide transition-colors cursor-pointer ${
                            cat.estado === 'ACTIVO'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/70'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200/70'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              cat.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {cat.estado}
                        </button>
                      </td>

                      <td className="py-3 px-5 text-right">
                        <SmoothDropDown
                          items={buildRowMenuItems(cat)}
                          ariaLabel={`Acciones para ${cat.nombre}`}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ================= MOBILE: LISTA DE TARJETAS (< md) ================= */}
        <div aria-label="Lista de categorías móvil" className="md:hidden p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2 px-1 pb-1">
            <CustomCheckbox
              checked={allSelected}
              onChange={toggleSelectAll}
              labelText={`Todas (${filteredAndSorted.length})`}
              ariaLabel="Seleccionar todas las categorías"
            />

            <button
              type="button"
              onClick={() => toggleSort('nombre')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 cursor-pointer"
            >
              <span>Orden: {sortDir === 'asc' ? 'A–Z' : 'Z–A'}</span>
              {renderSortIcon('nombre')}
            </button>
          </div>

          {filteredAndSorted.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No se encontraron categorías con ese criterio.
            </div>
          ) : (
            filteredAndSorted.map((cat) => {
              const isChecked = selectedIds.includes(cat.id);
              return (
                <div
                  key={cat.id}
                  className={`rounded-xl border p-3.5 transition-colors space-y-2.5 ${
                    isChecked
                      ? 'border-[#F26522] bg-orange-50/30 dark:bg-orange-950/20'
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CustomCheckbox
                        checked={isChecked}
                        onChange={() => toggleSelectOne(cat.id)}
                        ariaLabel={`Seleccionar ${cat.nombre}`}
                        className="shrink-0"
                      />

                      <div
                        style={{
                          backgroundColor: `${cat.color}24`,
                          borderColor: `${cat.color}66`,
                        }}
                        className="w-11 h-11 rounded-xl border flex items-center justify-center text-xl shrink-0 relative"
                      >
                        <span aria-hidden="true">{cat.icono}</span>
                        <span
                          style={{ backgroundColor: cat.color }}
                          className="w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 absolute -bottom-0.5 -right-0.5"
                        />
                      </div>

                      <div className="min-w-0">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {cat.nombre}
                        </h2>
                        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                          {cat.productos} platos vinculados
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <SmoothDropDown
                        items={buildRowMenuItems(cat)}
                        ariaLabel={`Acciones para ${cat.nombre}`}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickToggleCocina(cat)}
                      className={`border-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                        cat.cocina
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-200/70 text-slate-500'
                      }`}
                    >
                      <ChefHat className="w-3.5 h-3.5" />
                      <span>{cat.cocina ? 'Cocina: SÍ' : 'Cocina: NO'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickToggleEstado(cat)}
                      className={`border-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                        cat.estado === 'ACTIVO'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-200/70 text-slate-500'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          cat.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      <span>{cat.estado}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Modal Crear / Editar Categoría (Conserva la estructura original del modal bunker, con el selector de emojis actualizado a estilo SuperAdmin) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="modal-content w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden -mt-1 pb-2 flex justify-center">
              <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
            </div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <CloseButton onClick={() => setIsModalOpen(false)} className="scale-90" />
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-main)] font-sans uppercase tracking-wide">
                  Nombre de la Categoría
                </label>
                <input
                  type="text"
                  className="w-full min-h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-[#F26522]"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Hamburguesas, Pastas..."
                  required
                />
              </div>

              <div>
                <EmojiSelector
                  value={formData.icono}
                  onChange={(val) => setFormData({ ...formData, icono: val })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-main)] font-sans uppercase tracking-wide">
                  Color de Distintivo
                </label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="cursor-pointer"
                    style={{ width: 44, height: 38, border: 'none', background: 'transparent', borderRadius: 8 }}
                  />
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-black/20 border border-[var(--glass-border)]">
                    {formData.color}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* Enviar a Cocina Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                      <ChefHat size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold font-sans text-[var(--text-main)]">
                        Enviar a Cocina
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] font-sans">
                        {formData.enviarCocina
                          ? 'Genera comanda en pantalla de cocina'
                          : 'No se envía a cocina'}
                      </span>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={Boolean(formData.enviarCocina)}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        enviarCocina: !prev.enviarCocina,
                      }))
                    }
                    ariaLabel="Enviar a Cocina"
                  />
                </div>

                {/* Categoría Activa Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        formData.activo
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {formData.activo ? (
                        <CheckCircle size={18} />
                      ) : (
                        <AlertCircle size={18} />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold font-sans text-[var(--text-main)]">
                        Categoría Activa
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] font-sans">
                        {formData.activo
                          ? 'Activa (Visible en la carta)'
                          : 'Inactiva (Oculta en la carta)'}
                      </span>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={Boolean(formData.activo)}
                    onChange={() =>
                      setFormData((prev) => ({ ...prev, activo: !prev.activo }))
                    }
                    ariaLabel="Categoría Activa"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 min-h-[42px] rounded-xl bg-transparent border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[42px] border-0 rounded-xl text-white text-xs font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
                  style={{ backgroundColor: 'var(--primary, #F26522)' }}
                >
                  <Save size={16} /> {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Eliminar Confirmación */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Eliminar {deleteTarget.ids.length > 1 ? 'categorías' : 'categoría'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ¿Seguro que deseas eliminar{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {deleteTarget.label}
              </strong>
              ? Se eliminará la categoría y sus platos asociados.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 min-h-[42px] rounded-xl bg-transparent border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 min-h-[42px] border-0 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesView;
