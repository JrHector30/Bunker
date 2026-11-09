import React, { useState, useEffect } from 'react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash, Save, X, ChefHat, ArrowUp, ArrowDown, ChevronsUpDown, ArrowLeft, Smile, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react';
import { useCache } from '../hooks/useCache';
import { CustomCheckbox } from '../components/ui/CustomCheckbox';
import { DeleteButton } from '../components/ui/DeleteButton';
import { CloseButton } from '../components/ui/CloseButton';
import { EditButton } from '../components/ui/EditButton';

const EMOJI_CATEGORIES = [
    {
        id: 'platos',
        name: 'Platos & Fondos',
        icon: '🍽️',
        emojis: ['🍽️', '🍲', '🍜', '🍝', '🍛', '🍚', '🥗', '🥘', '🥣', '🥢', '🍴', '🥟', '🍱', '🍙', '🍘', '🍳']
    },
    {
        id: 'rapidas',
        name: 'Comida Rápida',
        icon: '🍔',
        emojis: ['🍔', '🍕', '🌭', '🍟', '🥪', '🌮', '🌯', '🍗', '🍖', '🥓', '🧀', '🥨', '🥐', '🥖', '🥙', '🧆']
    },
    {
        id: 'carnes',
        name: 'Parrillas & Carnes',
        icon: '🥩',
        emojis: ['🥩', '🍖', '🍗', '🍢', '🍡', '🥓', '🐖', '🐂', '🐓', '🔥', '🫕', '🌶️']
    },
    {
        id: 'mariscos',
        name: 'Pescados & Mariscos',
        icon: '🐟',
        emojis: ['🐟', '🐠', '🦐', '🦑', '🦀', '🦞', '🐙', '🦪', '🐡', '🍣', '🍙', '🌊']
    },
    {
        id: 'bebidas',
        name: 'Bebidas & Tragos',
        icon: '🍹',
        emojis: ['🍹', '🍸', '🍺', '🍻', '🍷', '🥂', '🍾', '🥃', '🥤', '🧋', '🧃', '🧊', '🍶', '🧉', '🍸']
    },
    {
        id: 'cafe',
        name: 'Cafetería & Desayunos',
        icon: '☕',
        emojis: ['☕', '🍵', '🥛', '🧃', '🥞', '🧇', '🍳', '🍞', '🥐', '🥯', '🍯', '🧈', '🍪']
    },
    {
        id: 'postres',
        name: 'Postres & Dulces',
        icon: '🍰',
        emojis: ['🍰', '🎂', '🧁', '🍦', '🍨', '🍧', '🍩', '🍪', '🍫', '🍮', '🥧', '🍬', '🍭', '🍓', '🍌', '🍍', '🍎', '🍉']
    },
    {
        id: 'otros',
        name: 'Especiales & Extras',
        icon: '⭐',
        emojis: ['⭐', '🔥', '👑', '🎉', '🏷️', '📦', '🎁', '🥑', '🍋', '🧄', '🧅', '🍄', '🧂', '🍅', '🥬']
    }
];

const EmojiSelector = ({ value, onChange }) => {
    const [activeTab, setActiveTab] = useState('platos');
    const [isOpen, setIsOpen] = useState(false); // Closed by default for sleek, clean UI

    const currentCategory = EMOJI_CATEGORIES.find(c => c.id === activeTab) || EMOJI_CATEGORIES[0];

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-main)] font-sans uppercase tracking-wide flex items-center gap-1.5">
                    <Smile size={14} className="text-[var(--primary)]" />
                    <span>Icono de Categoría</span>
                </label>
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="text-[11px] text-[var(--text-muted)] hover:text-rose-400 bg-transparent border-none cursor-pointer flex items-center gap-1 font-sans"
                        title="Quitar icono"
                    >
                        <X size={12} /> Quitar
                    </button>
                )}
            </div>

            {/* Minimalist Compact Button */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`h-10 px-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer bg-[var(--bg-surface)] hover:border-[var(--primary)] ${
                        isOpen ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-sm' : 'border-[var(--glass-border)]'
                    }`}
                    title="Clic para seleccionar emoji"
                >
                    <span className="text-xl leading-none">{value || '🍽️'}</span>
                    <span className="text-xs font-semibold text-[var(--text-muted)] font-sans">
                        {value ? 'Cambiar icono' : 'Elegir icono'}
                    </span>
                    <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Expandable Emoji Catalog Panel */}
            {isOpen && (
                <div className="mt-1 p-2.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--glass-border)] shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Category Navigation Tabs */}
                    <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none border-b border-[var(--glass-border)]">
                        {EMOJI_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setActiveTab(cat.id)}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer ${
                                    activeTab === cat.id
                                        ? 'bg-[var(--primary)] text-white shadow-sm font-bold scale-[1.03]'
                                        : 'bg-black/20 text-[var(--text-muted)] hover:text-[var(--text-main)] border border-transparent hover:border-[var(--glass-border)]'
                                }`}
                            >
                                <span className="text-xs">{cat.icon}</span>
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Emoji Touch Tiles Grid */}
                    <div className="grid grid-cols-8 gap-1.5 p-1 max-h-40 overflow-y-auto scrollbar-thin">
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
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer hover:scale-125 active:scale-95 ${
                                        isSelected
                                            ? 'bg-[var(--primary)]/20 border-2 border-[var(--primary)] shadow-[0_0_10px_rgba(249,115,22,0.4)] ring-2 ring-[var(--primary)]/50'
                                            : 'bg-black/20 hover:bg-black/40 border border-[var(--glass-border)]/50'
                                    }`}
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

const CategoriesView = () => {
    const { showConfirmation } = useConfirmation();
    const { showToast } = useNotification();
    const navigate = useNavigate();
    const fetcher = () => fetch(`/api/categories?_t=${Date.now()}`).then(res => res.json());
    const { data: categories, mutate: fetchCategories } = useCache('categories', fetcher, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });
    const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        nombre: '',
        color: '#000000',
        icono: '',
        activo: true,
        enviarCocina: true // Default True
    });

    const handleOpenModal = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                nombre: category.nombre,
                color: category.color,
                icono: category.icono || '',
                activo: category.activo,
                enviarCocina: category.enviarCocina !== false // Default true if undefined
            });
        } else {
            setEditingCategory(null);
            setFormData({
                nombre: '',
                color: '#339af0', // Default pleasant blue
                icono: '',
                activo: true,
                enviarCocina: true
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!await showConfirmation('¿Estás seguro? Se eliminará la categoría y TODOS los productos dentro de ella. Esta acción no se puede deshacer.', { type: 'danger' })) return;

        try {
            const res = await fetch(`/api/categories/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                // Optimistic Local Update
                fetchCategories(categories.filter(c => c.id !== id)); // Sync and update optimistically
                setSelectedCategoryIds(prev => prev.filter(selectedId => selectedId !== id));
                window.dispatchEvent(new CustomEvent('categories-updated'));
            } else {
                const err = await res.json();
                showToast(err.error, 'error');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleBulkDelete = async () => {
        const count = selectedCategoryIds.length;
        if (!await showConfirmation(`¿Estás seguro? Se eliminarán las ${count} categorías seleccionadas y TODOS los productos dentro de ellas. Esta acción no se puede deshacer.`, { type: 'danger' })) return;

        try {
            const results = await Promise.all(
                selectedCategoryIds.map(async (id) => {
                    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
                    return res.ok;
                })
            );

            const allOk = results.every(ok => ok);
            if (allOk) {
                showToast('Categorías seleccionadas eliminadas exitosamente', 'success');
            } else {
                showToast('Algunas categorías no pudieron ser eliminadas', 'warning');
            }

            setSelectedCategoryIds([]);
            fetchCategories();
        } catch (error) {
            console.error(error);
            showToast('Error al eliminar categorías seleccionadas', 'error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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
                    activo: Boolean(formData.activo),
                    enviarCocina: Boolean(formData.enviarCocina)
                })
            });

            if (res.ok) {
                const savedCategory = await res.json();
                showToast('Categoría guardada exitosamente', 'success');
                window.dispatchEvent(new CustomEvent('categories-updated'));
                setIsModalOpen(false);

                // Optimistic Local State Update for instantaneous visual response
                if (editingCategory) {
                    const updated = (categories || []).map(c => 
                        c.id === editingCategory.id ? { ...c, ...savedCategory, activo: Boolean(formData.activo) } : c
                    );
                    fetchCategories(updated);
                } else {
                    fetchCategories([...(categories || []), savedCategory]);
                }

                // Background sync
                setTimeout(() => {
                    fetchCategories();
                }, 150);
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.error || 'Error al guardar categoría', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Error de conexión al guardar categoría', 'error');
        }
    };

    // --- SORTING LOGIC ---
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            setSortConfig({ key: '', direction: '' }); // Reset
            return;
        }
        setSortConfig({ key, direction });
    };

    const sortedCategories = [...categories].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let valA, valB;

        if (sortConfig.key === 'nombre') {
            valA = a.nombre.toLowerCase();
            valB = b.nombre.toLowerCase();
        } else if (sortConfig.key === 'enviarCocina') {
            // Sort by Boolean (Kitchen First)
            valA = a.enviarCocina ? 1 : 0;
            valB = b.enviarCocina ? 1 : 0;
        } else if (sortConfig.key === 'productos') {
            valA = a._count?.platos || 0;
            valB = b._count?.platos || 0;
        } else {
            return 0;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const SortHeader = ({ label, sortKey, className }) => {
        const isActive = sortConfig.key === sortKey;
        const Icon = isActive
            ? (sortConfig.direction === 'asc' ? ArrowUp : ArrowDown)
            : ChevronsUpDown;

        return (
            <th
                className={className}
                style={{ padding: 15, cursor: 'pointer', userSelect: 'none', color: isActive ? 'var(--primary)' : 'inherit' }}
                onClick={() => handleSort(sortKey)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {label}
                    <Icon size={14} style={{ opacity: isActive ? 1 : 0.3 }} />
                </div>
            </th>
        );
    };

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="glass-button" onClick={() => navigate('/')} style={{ padding: 8 }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="high-end-title" style={{ margin: 0 }}>Gestión de Categorías</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {selectedCategoryIds.length > 0 && (
                        <DeleteButton
                            onClick={handleBulkDelete}
                            title={`Eliminar seleccionadas (${selectedCategoryIds.length})`}
                            className="scale-90"
                        />
                    )}
                    <button className="glass-button primary" onClick={() => handleOpenModal()}>
                        <Plus size={20} /> Nueva Categoría
                    </button>
                </div>
            </div>

            <div className="glass-panel table-responsive" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                            <th style={{ padding: 15, width: 50, textAlign: 'center' }}>
                                <CustomCheckbox
                                    checked={sortedCategories.length > 0 && selectedCategoryIds.length === sortedCategories.length}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedCategoryIds(sortedCategories.map(c => c.id));
                                        } else {
                                            setSelectedCategoryIds([]);
                                        }
                                    }}
                                />
                            </th>
                            <SortHeader label="Nombre" sortKey="nombre" />
                            <th className="col-optional" style={{ padding: 15 }}>Icono</th>
                            <th className="col-optional" style={{ padding: 15 }}>Color</th>
                            <SortHeader label="Cocina" sortKey="enviarCocina" className="col-optional" />
                            <SortHeader label="Productos" sortKey="productos" className="col-optional" />
                            <th style={{ padding: 15 }}>Estado</th>
                            <th style={{ padding: 15 }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedCategories.map(cat => (
                            <tr key={cat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: 15, width: 50, textAlign: 'center' }}>
                                    <CustomCheckbox
                                        checked={selectedCategoryIds.includes(cat.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedCategoryIds(prev => [...prev, cat.id]);
                                            } else {
                                                setSelectedCategoryIds(prev => prev.filter(id => id !== cat.id));
                                            }
                                        }}
                                    />
                                </td>
                                <td style={{ padding: 15, fontWeight: 'bold' }}>{cat.nombre}</td>
                                <td className="col-optional" style={{ padding: 15, fontSize: '1.5rem' }}>{cat.icono}</td>
                                <td className="col-optional" style={{ padding: 15 }}>
                                    <div style={{
                                        width: 24, height: 24, borderRadius: '50%',
                                        background: cat.color, border: '1px solid rgba(255,255,255,0.2)'
                                    }} />
                                </td>
                                <td className="col-optional" style={{ padding: 15 }}>
                                    {cat.enviarCocina !== false ? (
                                        <span style={{ color: 'var(--success)', display: 'flex', gap: 5, alignItems: 'center' }}>
                                            <ChefHat size={16} /> SÍ
                                        </span>
                                    ) : (
                                        <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>NO</span>
                                    )}
                                </td>
                                <td className="col-optional" style={{ padding: 15 }}>{cat._count?.platos || 0} items</td>
                                <td style={{ padding: 15 }}>
                                    {cat.activo ? <span className="badge status-ok">Activo</span> : <span className="badge status-error">Inactivo</span>}
                                </td>
                                <td style={{ padding: 15 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <EditButton onClick={() => handleOpenModal(cat)} className="scale-75 -my-2 -mx-1" />
                                        <DeleteButton
                                            onClick={() => handleDelete(cat.id)}
                                            title="Eliminar categoría"
                                            className="scale-75 -my-2 -mx-1"
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
                            <CloseButton onClick={() => setIsModalOpen(false)} className="scale-90" />
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-[var(--text-main)] font-sans uppercase tracking-wide">
                                    Nombre de la Categoría
                                </label>
                                <input
                                    type="text"
                                    className="glass-input text-sm font-sans font-medium text-[var(--text-main)] px-3.5 py-2.5 rounded-xl border border-[var(--glass-border)] focus:outline-none"
                                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    placeholder="Ej. Hamburguesas, Pastas..."
                                    required
                                />
                            </div>

                            <div>
                                <EmojiSelector
                                    value={formData.icono}
                                    onChange={val => setFormData({ ...formData, icono: val })}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-[var(--text-main)] font-sans uppercase tracking-wide">Color de Distintivo</label>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        className="cursor-pointer"
                                        style={{ width: 44, height: 38, border: 'none', background: 'transparent', borderRadius: 8 }}
                                    />
                                    <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-black/20 border border-[var(--glass-border)]">{formData.color}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--glass-border)]">
                                {/* Enviar a Cocina Toggle */}
                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/20 border border-[var(--glass-border)]">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                                            <ChefHat size={18} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold font-sans text-[var(--text-main)]">Enviar a Cocina</span>
                                            <span className="text-[11px] text-[var(--text-muted)] font-sans">
                                                {formData.enviarCocina ? 'Genera comanda en pantalla de cocina' : 'No se envía a cocina'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={Boolean(formData.enviarCocina)}
                                        onClick={() => setFormData(prev => ({ ...prev, enviarCocina: !prev.enviarCocina }))}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer border-none outline-none ${
                                            formData.enviarCocina ? 'bg-amber-500' : 'bg-slate-600'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                                formData.enviarCocina ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Categoría Activa Toggle */}
                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/20 border border-[var(--glass-border)]">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.activo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                            {formData.activo ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold font-sans text-[var(--text-main)]">Categoría Activa</span>
                                            <span className="text-[11px] text-[var(--text-muted)] font-sans">
                                                {formData.activo ? 'Activa (Visible en la carta)' : 'Inactiva (Oculta en la carta)'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={Boolean(formData.activo)}
                                        onClick={() => setFormData(prev => ({ ...prev, activo: !prev.activo }))}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer border-none outline-none ${
                                            formData.activo ? 'bg-emerald-500' : 'bg-slate-600'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                                formData.activo ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="glass-button primary font-sans" style={{ marginTop: 8 }}>
                                <Save size={18} /> Guardar
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoriesView;
