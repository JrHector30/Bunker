import React, { useState, useEffect } from 'react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash, Save, X, ChefHat, ArrowUp, ArrowDown, ChevronsUpDown, ArrowLeft, Smile } from 'lucide-react';
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
    const [isOpen, setIsOpen] = useState(true); // Open by default for easy visual access

    const currentCategory = EMOJI_CATEGORIES.find(c => c.id === activeTab) || EMOJI_CATEGORIES[0];

    return (
        <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--text-main)] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                    <Smile size={14} className="text-[var(--primary)]" />
                    <span>Icono (Emoji)</span>
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-normal">Toca cualquier icono para seleccionarlo</span>
            </label>

            {/* Current Selected Big Emoji Button + Manual Input */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-13 h-13 rounded-2xl bg-[var(--bg-surface)] border-2 flex items-center justify-center text-3xl shadow-md transition-all active:scale-95 cursor-pointer flex-shrink-0"
                    title="Clic para desplegar u ocultar catálogo de emojis"
                    style={{
                        borderColor: value ? 'var(--primary)' : 'var(--glass-border)',
                        boxShadow: value ? '0 0 12px rgba(249, 115, 22, 0.25)' : undefined
                    }}
                >
                    {value || '❓'}
                </button>

                <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            className="glass-input text-center text-lg font-bold"
                            style={{ width: '70px', height: '40px', padding: '0 6px' }}
                            value={value}
                            onChange={e => onChange(e.target.value)}
                            placeholder="🍕"
                            maxLength={4}
                        />
                        <button
                            type="button"
                            onClick={() => setIsOpen(!isOpen)}
                            className="px-3 py-2 rounded-xl text-xs font-bold border border-[var(--glass-border)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:bg-[var(--primary)] hover:text-white transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                        >
                            <span>{isOpen ? '▲ Ocultar catálogo' : '🎨 Selector de Emojis'}</span>
                        </button>
                        {value && (
                            <button
                                type="button"
                                onClick={() => onChange('')}
                                className="p-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                                title="Limpiar icono"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Accessible Emoji Grid Panel */}
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
                                    onClick={() => onChange(emoji)}
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
    const fetcher = () => fetch('/api/categories').then(res => res.json());
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
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                showToast('Categoría guardada exitosamente', 'success');
                setIsModalOpen(false);
                fetchCategories();
            } else {
                showToast('Error al guardar categoría', 'error');
            }
        } catch (error) {
            console.error(error);
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
                        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            <div>
                                <label>Nombre</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <EmojiSelector
                                    value={formData.icono}
                                    onChange={val => setFormData({ ...formData, icono: val })}
                                />
                            </div>

                            <div>
                                <label>Color</label>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        style={{ width: 50, height: 40, border: 'none', background: 'transparent' }}
                                    />
                                    <span>{formData.color}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <CustomCheckbox
                                    checked={formData.enviarCocina}
                                    onChange={e => setFormData({ ...formData, enviarCocina: e.target.checked })}
                                >
                                    <span className="ml-2 text-sm flex items-center gap-1.5 select-none" style={{ color: 'var(--text-main)' }}>
                                        <ChefHat size={16} /> Enviar a Cocina
                                    </span>
                                </CustomCheckbox>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <CustomCheckbox
                                    checked={formData.activo}
                                    onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                                    labelText="Categoría Activa"
                                />
                            </div>

                            <button type="submit" className="glass-button primary" style={{ marginTop: 10 }}>
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
