import React, { useState, useEffect, useRef } from 'react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit, Trash, Save, X, Search, Image as ImageIcon, Sparkles, ArrowUp, ArrowDown, ChevronsUpDown, ArrowLeft, Package, Beaker, BookOpen, AlertTriangle, History, ClipboardCheck, Download, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownRangeDatePicker } from '../components/DropdownRangeDatePicker';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../hooks/useCache';
import CategorizedCombobox from '../components/CategorizedCombobox';
import SimpleCombobox from '../components/SimpleCombobox';

const InventoryView = () => {
    const { showConfirmation } = useConfirmation();
    const { showToast } = useNotification();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab') || 'platos';
    const [activeTab, setActiveTab] = useState(tabParam);

    // Sync tab state when URL search params change
    useEffect(() => {
        if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setSearchParams({ tab: newTab });
    };

    // Data States from Cache
    const fetchProductsAPI = () => fetch('/api/products').then(res => res.json());
    const fetchCategoriesAPI = () => fetch('/api/categories').then(res => res.json());
    const fetchInsumosAPI = () => fetch('/api/insumos').then(res => res.json());
    const fetchKardexAPI = () => fetch('/api/kardex').then(res => res.json());

    const { data: products, mutate: refetchProducts } = useCache('products', fetchProductsAPI, []);
    const { data: categories, mutate: refetchCategories } = useCache('categories', fetchCategoriesAPI, []);
    const { data: insumos, mutate: refetchInsumos } = useCache('insumos', fetchInsumosAPI, []);
    const { data: kardex, mutate: refetchKardex } = useCache('kardex', fetchKardexAPI, []);

    // UI States
    const [formError, setFormError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });
    const [kardexDateFilterRange, setKardexDateFilterRange] = useState(undefined);
    const [kardexCurrentPage, setKardexCurrentPage] = useState(1);

    const fetchData = () => {
        refetchProducts();
        refetchCategories();
    };

    const fetchInsumos = () => {
        refetchInsumos();
        window.dispatchEvent(new Event('insumos-updated'));
    };

    const fetchKardex = () => {
        refetchKardex();
    };

    useEffect(() => {
        if (categories.length > 0 && formData.categoriaId === '') {
            setFormData(prev => ({ ...prev, categoriaId: categories[0].id }));
        }
    }, [categories]);

    useEffect(() => {
        fetchData();
        fetchInsumos();
        if (activeTab === 'kardex') fetchKardex();
    }, [activeTab]);

    // --- SORTING LOGIC ---
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            setSortConfig({ key: '', direction: '' });
            return;
        }
        setSortConfig({ key, direction });
    };

    const sortedProducts = [...products].sort((a, b) => {
        if (!sortConfig.key) return 0;
        let valA = sortConfig.key === 'categoria' ? a.categoria?.nombre || '' : a[sortConfig.key];
        let valB = sortConfig.key === 'categoria' ? b.categoria?.nombre || '' : b[sortConfig.key];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const SortHeader = ({ label, sortKey }) => {
        const isActive = sortConfig.key === sortKey;
        const Icon = isActive ? (sortConfig.direction === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;
        return (
            <th style={{ padding: 15, cursor: 'pointer', userSelect: 'none', color: isActive ? 'var(--primary)' : 'inherit' }} onClick={() => handleSort(sortKey)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                    {label} <Icon size={14} style={{ opacity: isActive ? 1 : 0.3 }} />
                </div>
            </th>
        );
    };

    // --- TAB 1: PLATOS (Original Inventory Logic) ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [filterCategory, setFilterCategory] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '', descripcion: '', precio: '', categoriaId: '', activo: true, imageFile: null, imagePreview: null
    });

    const handleGenerateDescription = async () => {
        if (!formData.nombre) { showToast("Por favor, ingrese un nombre primero.", 'info'); return; }
        setIsGenerating(true);
        try {
            const categoryName = categories.find(c => c.id == formData.categoriaId)?.nombre || '';
            const res = await fetch('/api/generate-description', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productName: formData.nombre, categoryName })
            });
            const data = await res.json();
            if (data.description) setFormData(prev => ({ ...prev, descripcion: data.description }));
        } catch (error) {
            console.error("AI Generation failed", error); showToast("Error generando descripción", 'error');
        } finally { setIsGenerating(false); }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) setFormData({ ...formData, imageFile: file, imagePreview: URL.createObjectURL(file) });
    };

    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                nombre: product.nombre, descripcion: product.descripcion || '', precio: product.precio,
                categoriaId: product.categoriaId, activo: product.activo, imageFile: null, imagePreview: product.imagen ? product.imagen : null
            });
        } else {
            setEditingProduct(null);
            setFormData({
                nombre: '', descripcion: '', precio: '', categoriaId: categories.length > 0 ? categories[0].id : '',
                activo: true, imageFile: null, imagePreview: null
            });
        }
        setIsModalOpen(true);
    };

    const handleDeleteProduct = async (id) => {
        if (!await showConfirmation('¿Seguro que desea eliminar este producto?', { type: 'danger' })) return;
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (res.ok) fetchData();
    };

    const handleSubmitProduct = async (e) => {
        e.preventDefault();
        setFormError(null);

        if (Number.isNaN(formData.precio) || formData.precio === null || formData.precio === '') {
            setFormError("El precio debe ser un número válido.");
            return;
        }
        if (Number.isNaN(formData.categoriaId) || formData.categoriaId === null || formData.categoriaId === '') {
            setFormError("Debe seleccionar una categoría válida.");
            return;
        }
        let imageUrl = editingProduct ? editingProduct.imagen : null;
        if (formData.imageFile) {
            const uploadData = new FormData(); uploadData.append('image', formData.imageFile);
            try {
                const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
                imageUrl = (await res.json()).url;
            } catch (error) { showToast('Falló la subida de imagen', 'error'); return; }
        }
        const payload = { ...formData, imagen: imageUrl };
        const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
        const method = editingProduct ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) { showToast('Plato guardado exitosamente', 'success'); setIsModalOpen(false); fetchData(); }
    };

    // --- TAB 2: INSUMOS ---
    const [isInsumoModalOpen, setIsInsumoModalOpen] = useState(false);
    const [editingInsumo, setEditingInsumo] = useState(null);
    const [insumoForm, setInsumoForm] = useState({ nombre: '', precioCompra: '', unidadMedida: 'kg', stock: '', stockMinimo: '', notificarAlerta: false });

    const handleOpenInsumoModal = (insumo = null) => {
        if (insumo) {
            setEditingInsumo(insumo);
            setInsumoForm({ nombre: insumo.nombre, precioCompra: insumo.precioCompra, unidadMedida: insumo.unidadMedida, stock: insumo.stock, stockMinimo: insumo.stockMinimo || '', notificarAlerta: insumo.notificarAlerta || false });
        } else {
            setEditingInsumo(null);
            setInsumoForm({ nombre: '', precioCompra: '', unidadMedida: 'kg', stock: '', stockMinimo: '', notificarAlerta: false });
        }
        setIsInsumoModalOpen(true);
    };

    const handleSubmitInsumo = async (e) => {
        e.preventDefault();
        setFormError(null);

        if (Number.isNaN(insumoForm.precioCompra) || insumoForm.precioCompra === null || insumoForm.precioCompra === '') {
            setFormError("El precio de compra debe ser un número válido.");
            return;
        }
        if (Number.isNaN(insumoForm.stock) || insumoForm.stock === null || insumoForm.stock === '') {
            setFormError("El stock debe ser un número válido.");
            return;
        }
        if (insumoForm.stockMinimo !== '' && Number.isNaN(insumoForm.stockMinimo)) {
            setFormError("El stock mínimo debe ser un número válido o estar vacío.");
            return;
        }

        // CORRECCIÓN DE PAYLOAD: Mapeo limpio y seguro contra el schema.prisma
        const payload = {
            nombre: String(insumoForm.nombre).trim(),
            unidadMedida: insumoForm.unidadMedida,
            precioCompra: Number(insumoForm.precioCompra) || 0,
            stock: Number(insumoForm.stock) || 0,
            // Si está vacío o nulo, pasamos 0 en lugar de null para evitar el choque con el NOT NULL de PostgreSQL
            stockMinimo: (insumoForm.stockMinimo === '' || insumoForm.stockMinimo === null) ? 0 : Number(insumoForm.stockMinimo),
            notificarAlerta: Boolean(insumoForm.notificarAlerta)
        };

        const url = editingInsumo ? `/api/insumos/${editingInsumo.id}` : '/api/insumos';
        const method = editingInsumo ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast('Insumo guardado exitosamente', 'success');
                setIsInsumoModalOpen(false);
                fetchInsumos();
            } else {
                const errData = await res.json();
                setFormError(errData.error || "Error controlado por el servidor (400).");
            }
        } catch (error) {
            console.error(error);
            setFormError("Error de conexión con el servidor.");
        }
    };

    const handleDeleteInsumo = async (id) => {
        if (await showConfirmation('¿Seguro que desea eliminar este insumo?', { type: 'danger' })) {
            await fetch(`/api/insumos/${id}`, { method: 'DELETE' });
            fetchInsumos();
        }
    };

    // --- TAB 3: RECETARIO ---
    const [selectedPlatoId, setSelectedPlatoId] = useState('');
    const [currentRecipe, setCurrentRecipe] = useState([]);
    const [selectedPlatoObj, setSelectedPlatoObj] = useState(null);

    useEffect(() => {
        if (selectedPlatoId) {
            fetch(`/api/recetas/${selectedPlatoId}`)
                .then(res => res.json())
                .then(data => {
                    const mapped = data.map(d => ({ insumoId: d.insumoId, cantidad: d.cantidad, insumo: d.insumo }));
                    setCurrentRecipe(mapped);
                });

            const p = products.find(p => p.id === parseInt(selectedPlatoId));
            setSelectedPlatoObj(p);
        } else {
            setCurrentRecipe([]);
            setSelectedPlatoObj(null);
        }
    }, [selectedPlatoId, products]);

    const handleAddIngredientRow = () => setCurrentRecipe([...currentRecipe, { insumoId: '', cantidad: '', insumo: null }]);

    const handleIngredientChange = (index, field, value) => {
        const newRecipe = [...currentRecipe];
        newRecipe[index][field] = value;
        if (field === 'insumoId') {
            newRecipe[index].insumo = insumos.find(i => i.id === parseInt(value));
        }
        setCurrentRecipe(newRecipe);
    };

    const handleRemoveIngredient = (index) => setCurrentRecipe(currentRecipe.filter((_, i) => i !== index));

    const handleSaveRecipe = async () => {
        if (!selectedPlatoId) return;
        setFormError(null);

        // Validar NaNs en receta
        const hasInvalidQty = currentRecipe.some(i => i.insumoId && (Number.isNaN(i.cantidad) || i.cantidad === null || i.cantidad === ''));
        if (hasInvalidQty) {
            showToast("Error: Existen cantidades inválidas en la receta.", 'error');
            return;
        }

        const validIngredients = currentRecipe.filter(i => i.insumoId && i.cantidad > 0);

        try {
            const res = await fetch(`/api/recetas/${selectedPlatoId}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingredientes: validIngredients })
            });

            if (res.ok) {
                showToast('Receta guardada. Costos actualizados.', 'success');
                fetchData(); // refresh product list for new cost
            } else {
                showToast('Error al guardar receta.', 'error');
            }
        } catch (e) { showToast('Error de red al guardar receta.', 'error'); }
    };

    // --- RENDER HELPERS ---
    const renderPlatosTab = () => {
        const filteredProducts = sortedProducts.filter(p => {
            const matchesCategory = filterCategory ? p.categoriaId === parseInt(filterCategory) : true;
            const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        const categoryOptions = [
            { id: '', name: 'Todas las categorías' },
            ...categories.map(c => ({
                id: c.id.toString(),
                name: `${c.icono || ''} ${c.nombre}`.trim()
            }))
        ];
        const selectedCategoryOption = categoryOptions.find(opt => opt.id === filterCategory?.toString()) || categoryOptions[0];

        return (
            <>
                <div className="glass-panel" style={{ marginBottom: 20, display: 'flex', gap: 15, padding: 15, alignItems: 'center', textAlign: 'center' }}>
                    <div className="search-container" style={{ flex: 1 }}>
                        <Search size={22} className="text-muted" />
                        <input
                            type="text" placeholder="Buscar plato..." className="search-input"
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', height: 30 }} />
                    <div style={{ width: 220, textAlign: 'left' }}>
                        <SimpleCombobox
                            items={categoryOptions}
                            selectedItem={selectedCategoryOption}
                            onSelect={(opt) => setFilterCategory(opt ? opt.id : '')}
                            placeholder="Todas las categorías"
                        />
                    </div>
                    <button className="glass-button primary" onClick={() => handleOpenModal()}><Plus size={20} /> Nuevo Plato</button>
                </div>

                <div className="glass-panel table-responsive" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--table-header-bg)', textAlign: 'left' }}>
                                <th style={{ padding: 15 }}>Imagen</th>
                                <SortHeader label="Nombre" sortKey="nombre" />
                                <SortHeader label="Categoría" sortKey="categoria" />
                                <SortHeader label="Precio Venta" sortKey="precio" />
                                <th style={{ padding: 15, textAlign: 'center' }}>Costo Prod.</th>
                                <th style={{ padding: 15, textAlign: 'center' }}>Costo %</th>
                                <th style={{ padding: 15 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(prod => {
                                const costo = prod.costoProduccion || 0;
                                const margenPct = prod.precio > 0 ? (costo / prod.precio) * 100 : 0;
                                const isWarning = margenPct > 40;

                                return (
                                    <tr key={prod.id} style={{ borderBottom: '1px solid var(--table-row-border)', textAlign: 'center' }}>
                                        <td style={{ padding: 15 }}>
                                            {prod.imagen ? <img src={prod.imagen} alt={prod.nombre} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8 }} />
                                                : <div style={{ width: 50, height: 50, background: 'var(--item-hover)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} className="text-muted" /></div>}
                                        </td>
                                        <td style={{ padding: 15, fontWeight: 'bold' }}>{prod.nombre}</td>
                                        <td style={{ padding: 15 }}><span style={{ padding: '4px 8px', borderRadius: 4, background: prod.categoria?.color + '40', color: prod.categoria?.color }}>{prod.categoria?.icono} {prod.categoria?.nombre}</span></td>
                                        <td style={{ padding: 15 }} className="font-mono">S/. {prod.precio.toFixed(2)}</td>
                                        <td style={{ padding: 15, color: isWarning ? 'var(--danger)' : 'var(--success)' }} className="font-mono">S/. {costo.toFixed(2)}</td>
                                        <td style={{ padding: 15 }}>
                                            {isWarning ? (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 4, fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                    <AlertTriangle size={14} /> {margenPct.toFixed(1)}%
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.9rem' }}>{margenPct.toFixed(1)}%</span>
                                            )}
                                        </td>
                                        <td style={{ padding: 15 }}>
                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <button className="glass-button" onClick={() => handleOpenModal(prod)}><Edit size={16} /></button>
                                                <button className="glass-button" onClick={() => handleDeleteProduct(prod.id)}><Trash size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    const renderInsumosTab = () => {
        const filteredInsumos = insumos.filter(i => i.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
        const sortedInsumos = [...filteredInsumos].sort((a, b) => {
            if (!sortConfig.key) return 0;
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return (
            <>
                <div className="glass-panel" style={{ marginBottom: 20, display: 'flex', gap: 15, padding: 15, alignItems: 'center' }}>
                    <div className="search-container" style={{ flex: 1 }}>
                        <Search size={22} className="text-muted" />
                        <input
                            type="text" placeholder="Buscar insumo..." className="search-input"
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="glass-button primary" onClick={() => handleOpenInsumoModal()}><Plus size={20} /> Nuevo Insumo</button>
                </div>

                <div className="glass-panel table-responsive" style={{ padding: 0, textAlign: 'center' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--table-header-bg)', textAlign: 'center' }}>
                                <SortHeader label="Nombre" sortKey="nombre" />
                                <SortHeader label="Costo Unitario Bruto" sortKey="precioCompra" />
                                <SortHeader label="Stock Actual" sortKey="stock" />
                                <th style={{ padding: 15, textAlign: 'center' }}>Nivel de Stock</th>
                                <th style={{ padding: 15, textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedInsumos.map(insumo => {
                                const stockPct = Math.min(100, Math.max(0, (insumo.stock / 100) * 100)); // Demo ratio against 100 units
                                return (
                                    <tr key={insumo.id}>
                                        <td style={{ padding: 15, fontWeight: 'bold', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                                                {insumo.nombre}
                                                {insumo.notificarAlerta && insumo.stock <= insumo.stockMinimo && (
                                                    <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center' }} title={`Stock crítico (Mínimo: ${insumo.stockMinimo})`}>
                                                        <AlertTriangle size={16} />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: 15 }}><span className="font-mono">S/. {Number(insumo.precioCompra).toFixed(2)}</span> / {insumo.unidadMedida}</td>
                                        <td style={{ padding: 15, color: (insumo.notificarAlerta && insumo.stock <= insumo.stockMinimo) ? 'var(--warning)' : 'inherit', fontWeight: (insumo.notificarAlerta && insumo.stock <= insumo.stockMinimo) ? 'bold' : 'normal' }}>
                                            {Number(insumo.stock).toFixed(2)} {insumo.unidadMedida}
                                        </td>
                                        <td style={{ padding: 15 }}>
                                            <div style={{ height: 10, width: 150, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                                <div style={{ height: '100%', width: `${stockPct}%`, background: stockPct < 20 ? 'var(--danger)' : 'var(--primary)', transition: 'width 0.3s' }} />
                                            </div>
                                        </td>
                                        <td style={{ padding: 15 }}>
                                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                                <button className="glass-button" onClick={() => handleOpenInsumoModal(insumo)}><Edit size={16} /></button>
                                                <button className="glass-button" onClick={() => handleDeleteInsumo(insumo.id)}><Trash size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    const renderRecetarioTab = () => {
        let draftCosto = 0;
        currentRecipe.forEach(item => {
            const insu = item.insumo || insumos.find(i => i.id === parseInt(item.insumoId));
            if (insu && item.cantidad > 0) draftCosto += (insu.precioCompra * item.cantidad);
        });

        const isWarning = selectedPlatoObj && selectedPlatoObj.precio > 0 ? (draftCosto / selectedPlatoObj.precio) * 100 > 40 : false;

        const comboboxItems = products.map(p => {
            const cat = categories.find(c => c.id === p.categoriaId);
            return {
                id: p.id.toString(),
                name: p.nombre,
                category: cat ? cat.nombre : 'Otros',
                precio: p.precio
            };
        });
        const selectedComboboxItem = comboboxItems.find(item => item.id === selectedPlatoId) || null;
        const categoriesList = categories.map(c => c.nombre);

        return (
            <div className="glass-panel" style={{ padding: 30 }}>
                <div style={{ display: 'flex', gap: 30, marginBottom: 30, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <label style={{ display: 'block', marginBottom: 10, fontSize: '1.1rem', fontWeight: 'bold' }}>Seleccionar Plato del Menú</label>
                        <CategorizedCombobox
                            items={comboboxItems}
                            selectedItem={selectedComboboxItem}
                            onSelect={(item) => setSelectedPlatoId(item ? item.id : '')}
                            categoriesList={categoriesList}
                        />
                        <p className="text-muted" style={{ marginTop: 10, fontSize: '0.9rem' }}>El costo se descontará del stock en Logística al venderse este plato.</p>
                    </div>
                    {selectedPlatoObj && (
                        <div style={{ flex: '1 1 300px', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--glass-border)', padding: 20, borderRadius: 16 }}>
                            <h3 style={{ margin: '0 0 15px 0' }}>Análisis de Costos</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '1.1rem' }}>
                                <span className="text-muted">Precio Venta (PVP):</span>
                                <strong className="font-mono">S/. {selectedPlatoObj.precio.toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '1.1rem' }}>
                                <span className="text-muted">Costo Producción:</span>
                                <strong style={{ color: isWarning ? 'var(--danger)' : 'var(--success)' }} className="font-mono">S/. {draftCosto.toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: 10, marginTop: 10, fontSize: '1.1rem' }}>
                                <span className="text-muted">Margen Bruto:</span>
                                <strong className="font-mono">S/. {(selectedPlatoObj.precio - draftCosto).toFixed(2)}</strong>
                            </div>
                            {isWarning && (
                                <div style={{ background: 'var(--danger)', color: 'white', padding: '8px 15px', borderRadius: 8, marginTop: 15, display: 'flex', alignItems: 'center', gap: 10, fontWeight: 'bold' }}>
                                    <AlertTriangle size={18} /> El costo supera el 40% del Venta.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {selectedPlatoId && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3>Ingredientes de la Receta</h3>
                            <button className="glass-button" onClick={handleAddIngredientRow}><Plus size={18} /> Añadir Insumo</button>
                        </div>

                        {currentRecipe.length === 0 ? (
                            <div className="text-muted" style={{ textAlign: 'center', padding: 40, border: '1px dashed var(--glass-border)', borderRadius: 12 }}>
                                <Beaker size={48} style={{ opacity: 0.5, marginBottom: 15 }} />
                                <div>Este plato no tiene insumos asignados.</div>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="recipe-table" style={{ width: '100%', marginBottom: 20 }}>
                                    <thead>
                                        <tr style={{ background: 'var(--table-header-bg)', textAlign: 'left' }}>
                                            <th style={{ padding: 15 }}>Insumo</th>
                                            <th style={{ padding: 15 }}>Unidad</th>
                                            <th style={{ padding: 15 }}>Cantidad a descontar</th>
                                            <th style={{ padding: 15 }}>Costo Subtotal</th>
                                            <th style={{ padding: 15, width: 60 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentRecipe.map((item, index) => {
                                            const insu = item.insumo || insumos.find(i => i.id === parseInt(item.insumoId));
                                            const subtotal = insu && item.cantidad ? (insu.precioCompra * item.cantidad) : 0;
                                            const insumoOptions = insumos.map(i => ({
                                                id: i.id.toString(),
                                                name: i.nombre
                                            })).sort((a, b) => a.name.localeCompare(b.name));
                                            const selectedInsumoOption = insumoOptions.find(opt => opt.id === item.insumoId?.toString()) || null;

                                            return (
                                                <tr key={index} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                                                    <td style={{ padding: 15 }}>
                                                        <SimpleCombobox
                                                            items={insumoOptions}
                                                            selectedItem={selectedInsumoOption}
                                                            onSelect={(opt) => handleIngredientChange(index, 'insumoId', opt ? opt.id : '')}
                                                            placeholder="Seleccionar Insumo..."
                                                        />
                                                    </td>
                                                    <td style={{ padding: 15 }} className="text-muted">{insu ? insu.unidadMedida : '-'}</td>
                                                    <td style={{ padding: 15 }}>
                                                        <input type="number" step="0.01" className="glass-input font-sans text-xs" style={{ width: 120 }} placeholder="0.00" value={Number.isNaN(item.cantidad) ? '' : item.cantidad} onChange={e => handleIngredientChange(index, 'cantidad', e.target.valueAsNumber)} />
                                                    </td>
                                                    <td style={{ padding: 15 }} className="font-mono">{insu ? `S/. ${subtotal.toFixed(2)}` : '-'}</td>
                                                    <td style={{ padding: 15 }}>
                                                        <button className="glass-button" onClick={() => handleRemoveIngredient(index)} style={{ padding: 8, borderColor: 'transparent' }}><Trash size={18} color="var(--danger)" /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                            <button className="glass-button primary" onClick={handleSaveRecipe} style={{ fontSize: '1.1rem', padding: '12px 30px' }}>
                                <Save size={20} /> Guardar Receta Completa
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // --- TAB 4: KARDEX ---
    const [isKardexModalOpen, setIsKardexModalOpen] = useState(false);
    const [kardexForm, setKardexForm] = useState({ insumoId: '', tipoMovimiento: 'MERMA', cantidad: '', motivo: '' });

    const handleSaveKardexManual = async (e) => {
        e.preventDefault();
        setFormError(null);

        if (Number.isNaN(kardexForm.cantidad) || kardexForm.cantidad === null || kardexForm.cantidad === '') {
            setFormError("La cantidad debe ser un número válido.");
            return;
        }
        if (Number.isNaN(kardexForm.insumoId) || kardexForm.insumoId === null || kardexForm.insumoId === '') {
            setFormError("Debe seleccionar un insumo válido.");
            return;
        }

        // Validar que el usuario esté autenticado
        if (!user || !user.id) {
            showToast("❌ Error: Usuario no autenticado", 'error');
            return;
        }

        try {
            const payload = { ...kardexForm, usuarioId: user.id };
            const res = await fetch('/api/kardex', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsKardexModalOpen(false);
                fetchKardex();
                fetchInsumos();
                setKardexForm({ insumoId: '', tipoMovimiento: 'MERMA', cantidad: '', motivo: '' });
            } else {
                showToast("❌ Error al guardar movimiento", 'error');
            }
        } catch (error) { showToast("❌ Error de conexión", 'error'); }
    };

    const renderKardexTab = () => {
        // --- Pagination & Filtering Logic ---
        const ITEMS_PER_PAGE = 50;

        // Filter by Date
        const filteredKardex = kardex.filter(mov => {
            if (!kardexDateFilterRange || (!kardexDateFilterRange.from && !kardexDateFilterRange.to)) return true;

            const movDate = new Date(mov.fecha);
            const dateToCompare = new Date(movDate.getFullYear(), movDate.getMonth(), movDate.getDate());

            if (kardexDateFilterRange.from && kardexDateFilterRange.to) {
                const fromDate = new Date(kardexDateFilterRange.from.getFullYear(), kardexDateFilterRange.from.getMonth(), kardexDateFilterRange.from.getDate());
                const toDate = new Date(kardexDateFilterRange.to.getFullYear(), kardexDateFilterRange.to.getMonth(), kardexDateFilterRange.to.getDate());
                return dateToCompare >= fromDate && dateToCompare <= toDate;
            } else if (kardexDateFilterRange.from) {
                const fromDate = new Date(kardexDateFilterRange.from.getFullYear(), kardexDateFilterRange.from.getMonth(), kardexDateFilterRange.from.getDate());
                return dateToCompare.getTime() === fromDate.getTime();
            }
            return true;
        });

        // Pagination
        const totalPages = Math.ceil(filteredKardex.length / ITEMS_PER_PAGE) || 1;
        const currentData = filteredKardex.slice(
            (kardexCurrentPage - 1) * ITEMS_PER_PAGE,
            kardexCurrentPage * ITEMS_PER_PAGE
        );

        const handlePrevPage = () => setKardexCurrentPage(p => Math.max(1, p - 1));
        const handleNextPage = () => setKardexCurrentPage(p => Math.min(totalPages, p + 1));

        const handleExportExcel = () => {
            if (filteredKardex.length === 0) {
                showToast("No hay datos para exportar en el rango seleccionado.", 'error');
                return;
            }

            const exportData = filteredKardex.map(mov => {
                const isPositive = ['COMPRA', 'AJUSTE_POSITIVO'].includes(mov.tipoMovimiento);
                const sign = isPositive ? '+' : '-';
                return {
                    "Fecha y Hora": new Date(mov.fecha).toLocaleString(),
                    "Insumo": mov.insumo?.nombre || '-',
                    "Tipo": mov.tipoMovimiento,
                    "Cantidad": `${sign}${mov.cantidad} ${mov.insumo?.unidadMedida || ''}`,
                    "Usuario": mov.usuario?.nombre || 'General / Sistema',
                    "Motivo": mov.motivo || '-'
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Kardex");

            const dateStr = kardexDateFilterRange?.from
                ? (kardexDateFilterRange.to
                    ? `${format(kardexDateFilterRange.from, 'yyyy-MM-dd')}_a_${format(kardexDateFilterRange.to, 'yyyy-MM-dd')}`
                    : format(kardexDateFilterRange.from, 'yyyy-MM-dd'))
                : 'General';
            XLSX.writeFile(workbook, `Reporte_Kardex_${dateStr}.xlsx`);
        };

        return (
            <div className="fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <h2 style={{ margin: 0 }}>Historial de Movimientos</h2>
                        <DropdownRangeDatePicker
                            mode="range"
                            value={kardexDateFilterRange}
                            onChange={(range) => {
                                setKardexDateFilterRange(range);
                                setKardexCurrentPage(1);
                            }}
                            placeholder="Filtrar por Fecha"
                        />
                        <button className="glass-button" onClick={handleExportExcel} style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', padding: '6px 15px', color: 'var(--success)' }}>
                            <Download size={18} /> Exportar Excel
                        </button>
                    </div>
                    <button className="glass-button secondary" onClick={() => setIsKardexModalOpen(true)}>
                        <Plus size={18} /> Nuevo Movimiento Manual
                    </button>
                </div>

                <div className="glass-panel table-responsive" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', justifyItems: 'center', alignItems: 'center', textAlign: 'center' }}>
                        <thead>
                            <tr style={{ background: 'var(--table-header-bg)', textAlign: 'left' }}>
                                <th style={{ padding: 15 }}>Fecha y Hora</th>
                                <th style={{ padding: 15 }}>Insumo</th>
                                <th style={{ padding: 15 }}>Tipo</th>
                                <th style={{ padding: 15 }}>Cantidad</th>
                                <th style={{ padding: 15 }}>Usuario</th>
                                <th style={{ padding: 15 }}>Motivo / Info</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                                        {kardexDateFilterRange?.from ? 'No se registraron movimientos en este periodo.' : 'No hay movimientos registrados.'}
                                    </td>
                                </tr>
                            ) : currentData.map(mov => {
                                const isPositive = ['COMPRA', 'AJUSTE_POSITIVO'].includes(mov.tipoMovimiento);
                                const color = isPositive ? 'var(--success)' : (mov.tipoMovimiento === 'VENTA' ? 'var(--primary)' : 'var(--danger)');
                                return (
                                    <tr key={mov.id} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                                        <td style={{ padding: 15 }}>{new Date(mov.fecha).toLocaleString()}</td>
                                        <td style={{ padding: 15, fontWeight: 'bold' }}>{mov.insumo?.nombre}</td>
                                        <td style={{ padding: 15 }}>
                                            <span style={{ padding: '4px 8px', borderRadius: 4, background: `${color}40`, color: color, fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                {mov.tipoMovimiento}
                                            </span>
                                        </td>
                                        <td style={{ padding: 15, color: color, fontWeight: 'bold' }}>
                                            {isPositive ? '+' : '-'}{mov.cantidad} {mov.insumo?.unidadMedida}
                                        </td>
                                        <td style={{ padding: 15, color: 'rgba(255,255,255,0.8)' }}>
                                            {mov.usuario?.nombre || 'General / Sistema'}
                                        </td>
                                        <td style={{ padding: 15, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>{mov.motivo || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div style={{ padding: 15, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 15, borderTop: '1px solid var(--table-row-border)' }}>
                            <button className="glass-button" disabled={kardexCurrentPage === 1} onClick={handlePrevPage}>Anterior</button>
                            <span style={{ fontSize: '0.9rem' }}>Página {kardexCurrentPage} de {totalPages}</span>
                            <button className="glass-button" disabled={kardexCurrentPage === totalPages} onClick={handleNextPage}>Siguiente</button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- TAB 5: AUDITORÍA ---
    const [auditData, setAuditData] = useState({}); // { insumoId: realStockValue }

    const handleAuditChange = (insumoId, value) => {
        setAuditData(prev => ({ ...prev, [insumoId]: value }));
    };

    const handleApplyAudit = async () => {
        // Validar que el usuario esté autenticado
        if (!user || !user.id) {
            showToast("❌ Error: Usuario no autenticado", 'error');
            return;
        }

        if (!await showConfirmation("¿Desea aplicar estos ajustes de conciliación? Se generarán movimientos de AJUSTE en el Kardex y el stock se actualizará.", { type: 'warning' })) return;

        try {
            const promises = Object.entries(auditData).map(async ([insumoId, stockReal]) => {
                const id = parseInt(insumoId);
                const real = parseFloat(stockReal);
                const insumo = insumos.find(i => i.id === id);
                if (!insumo || isNaN(real)) return null;

                const diferencia = real - insumo.stock;
                if (Math.abs(diferencia) < 0.0001) return null; // No change

                const tipoMovimiento = diferencia > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO';
                const motivo = `Conciliación Física. Stock anterior: ${insumo.stock}, Nuevo: ${real}`;

                return fetch('/api/kardex', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        insumoId: id,
                        tipoMovimiento,
                        cantidad: Math.abs(diferencia),
                        motivo,
                        usuarioId: user.id
                    })
                });
            });

            await Promise.all(promises.filter(p => p !== null));
            showToast("✅ Conciliación aplicada exitosamente.", 'success');
            setAuditData({});
            fetchInsumos();
        } catch (e) { showToast("❌ Error al conciliar.", 'error'); }
    };

    const renderAuditoriaTab = () => {
        let hasChanges = Object.keys(auditData).some(id => {
            const real = parseFloat(auditData[id]);
            const insumo = insumos.find(i => i.id === parseInt(id));
            return insumo && !isNaN(real) && Math.abs(real - insumo.stock) >= 0.0001;
        });

        // Add sorting logic for Auditoria
        const sortedAuditInsumos = [...insumos].sort((a, b) => {
            if (!sortConfig.key) return 0;
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return (
            <div className="fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <h2>Conciliación de Inventario</h2>
                        <p className="text-muted">Ingrese el stock físico real para calcular mermas o excedentes.</p>
                    </div>
                    <button className="glass-button primary" onClick={handleApplyAudit} disabled={!hasChanges}>
                        <ClipboardCheck size={18} /> Aplicar Ajustes
                    </button>
                </div>

                <div className="glass-panel table-responsive" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                <SortHeader label="Insumo" sortKey="nombre" />
                                <SortHeader label="Stock Teórico (Actual)" sortKey="stock" />
                                <th style={{ padding: 15 }}>Stock Físico (Real)</th>
                                <th style={{ padding: 15 }}>Diferencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAuditInsumos.map(insumo => {
                                const realInput = auditData[insumo.id] !== undefined ? auditData[insumo.id] : '';
                                const realValue = parseFloat(realInput);
                                const dif = !isNaN(realValue) ? realValue - insumo.stock : 0;
                                const isDiscrepancy = Math.abs(dif) >= 0.0001;
                                const difColor = dif < 0 ? 'var(--danger)' : (dif > 0 ? 'var(--warning)' : 'var(--success)');

                                return (
                                    <tr key={insumo.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: 15, fontWeight: 'bold' }}>{insumo.nombre}</td>
                                        <td style={{ padding: 15 }}>{insumo.stock.toFixed(2)} {insumo.unidadMedida}</td>
                                        <td style={{ padding: 15 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <input
                                                    type="number" step="0.01" className="glass-input" style={{ width: 120, borderColor: isDiscrepancy ? difColor : 'var(--glass-border)' }}
                                                    placeholder={insumo.stock.toFixed(2)}
                                                    value={realInput}
                                                    onChange={(e) => handleAuditChange(insumo.id, e.target.value)}
                                                />
                                                <span className="text-muted">{insumo.unidadMedida}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: 15 }}>
                                            {isDiscrepancy ? (
                                                <span style={{ color: difColor, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    {dif > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                                                    {Math.abs(dif).toFixed(2)} {insumo.unidadMedida}
                                                </span>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const getModuleTitle = () => {
        switch (activeTab) {
            case 'platos':
                return 'Menú (Platos)';
            case 'insumos':
                return 'Inventario (Insumos)';
            case 'recetario':
                return 'Recetarios (Costeo)';
            case 'kardex':
                return 'Kardex de Inventario';
            case 'auditoria':
                return 'Auditoría de Insumos';
            default:
                return 'Logística';
        }
    };

    return (
        <div className="fade-in" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <button className="glass-button" onClick={() => navigate('/')} style={{ padding: 10 }}><ArrowLeft size={24} /></button>
                    <h1 style={{ margin: 0 }}>{getModuleTitle()}</h1>
                </div>
            </div>

            {activeTab === 'platos' && renderPlatosTab()}
            {activeTab === 'insumos' && renderInsumosTab()}
            {activeTab === 'recetario' && renderRecetarioTab()}
            {activeTab === 'kardex' && renderKardexTab()}
            {activeTab === 'auditoria' && renderAuditoriaTab()}

            {/* Modal para Producto */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingProduct ? 'Editar Plato' : 'Nuevo Plato'}</h2>
                            <button className="glass-button" onClick={() => setIsModalOpen(false)} style={{ padding: 5, border: 'none' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmitProduct} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            <div style={{ display: 'flex', gap: 20 }}>
                                <div style={{ width: 100, height: 100, background: 'rgba(0,0,0,0.2)', borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {formData.imagePreview ? <img src={formData.imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={30} className="text-muted" />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Imagen del Plato</label>
                                    <input type="file" onChange={handleImageChange} accept="image/*" className="glass-input" />
                                </div>
                            </div>
                            <div>
                                <label>Nombre del Plato</label>
                                <input type="text" className="glass-input" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} required />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                <label>Descripción</label>
                                <button type="button" onClick={handleGenerateDescription} disabled={isGenerating} style={{ background: 'linear-gradient(45deg, #7c3aed, #db2777)', border: 'none', borderRadius: 12, padding: '4px 10px', color: 'white', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Sparkles size={12} /> {isGenerating ? 'Generando...' : 'Generar IA'}
                                </button>
                            </div>
                            <textarea className="glass-input" value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />

                            {formError && <div style={{ color: 'white', background: 'var(--danger)', padding: 10, borderRadius: 8, marginBottom: 15 }}>{formError}</div>}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div><label>Categoría</label><select className="glass-input" value={formData.categoriaId} onChange={e => setFormData({ ...formData, categoriaId: Number(e.target.value) })} required>{categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                                <div><label>Precio (S/.)</label><input type="number" step="0.01" className="glass-input" value={Number.isNaN(formData.precio) ? '' : formData.precio} onChange={e => setFormData({ ...formData, precio: e.target.valueAsNumber })} required /></div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}><input type="checkbox" checked={formData.activo} onChange={e => setFormData({ ...formData, activo: e.target.checked })} /> Producto Activo</label>
                            <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: 10 }}>
                                <button type="submit" className="glass-button primary" style={{ width: '100%' }}><Save size={18} /> Guardar Plato</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para Insumo */}
            {isInsumoModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingInsumo ? 'Editar Insumo' : 'Nuevo Insumo'}</h2>
                            <button className="glass-button" onClick={() => setIsInsumoModalOpen(false)} style={{ padding: 5, border: 'none' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmitInsumo} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            {formError && <div style={{ color: 'white', background: 'var(--danger)', padding: 10, borderRadius: 8, marginBottom: 15 }}>{formError}</div>}
                            <div>
                                <label>Nombre del Insumo</label>
                                <input type="text" className="glass-input" value={insumoForm.nombre} onChange={e => setInsumoForm({ ...insumoForm, nombre: e.target.value })} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div>
                                    <label>Precio Compra Inicial (S/.)</label>
                                    <input type="number" step="0.01" className="glass-input" value={Number.isNaN(insumoForm.precioCompra) ? '' : insumoForm.precioCompra} onChange={e => setInsumoForm({ ...insumoForm, precioCompra: e.target.valueAsNumber })} required />
                                </div>
                                <div>
                                    <label>Medida Lógica</label>
                                    <select className="glass-input" value={insumoForm.unidadMedida} onChange={e => setInsumoForm({ ...insumoForm, unidadMedida: e.target.value })}>
                                        <option value="kg">Kilogramos (kg)</option>
                                        <option value="gr">Gramos (gr)</option>
                                        <option value="L">Litros (L)</option>
                                        <option value="ml">Mililitros (ml)</option>
                                        <option value="ud">Unidades (ud)</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div>
                                    <label>Stock Física en Bodega</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="glass-input"
                                        value={Number.isNaN(insumoForm.stock) ? '' : insumoForm.stock}
                                        onChange={e => setInsumoForm({ ...insumoForm, stock: e.target.valueAsNumber })}
                                        required
                                    />
                                    <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 5 }}>Medida Actual.</p>
                                </div>
                                <div>
                                    <label>Stock Mínimo (Alerta)</label>
                                    <input type="number" step="0.01" className="glass-input" value={Number.isNaN(insumoForm.stockMinimo) ? '' : insumoForm.stockMinimo} onChange={e => {
                                        const val = e.target.valueAsNumber;
                                        setInsumoForm({ ...insumoForm, stockMinimo: val, notificarAlerta: (!Number.isNaN(val) && val !== null) ? insumoForm.notificarAlerta : false });
                                    }} />
                                    <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 5 }}>Nivel de escasez.</p>
                                </div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: (!insumoForm.stockMinimo || String(insumoForm.stockMinimo).trim() === '') ? 'not-allowed' : 'pointer', padding: '10px 0', opacity: (!insumoForm.stockMinimo || String(insumoForm.stockMinimo).trim() === '') ? 0.5 : 1 }}>
                                <input type="checkbox" checked={insumoForm.notificarAlerta} disabled={!insumoForm.stockMinimo || String(insumoForm.stockMinimo).trim() === ''} onChange={e => setInsumoForm({ ...insumoForm, notificarAlerta: e.target.checked })} style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'inherit' }} />
                                Activar Alerta de Escasez en Dashboard
                            </label>
                            <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: 10 }}>
                                <button type="submit" className="glass-button primary" style={{ width: '100%' }}><Save size={18} /> Guardar Insumo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para Movimiento Manual Kardex */}
            {isKardexModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Registrar Movimiento Manual</h2>
                            <button className="glass-button" onClick={() => setIsKardexModalOpen(false)} style={{ padding: 5, border: 'none' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSaveKardexManual} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            {formError && <div style={{ color: 'white', background: 'var(--danger)', padding: 10, borderRadius: 8 }}>{formError}</div>}
                            <div>
                                <label>Insumo</label>
                                <select className="glass-input" value={kardexForm.insumoId} onChange={e => setKardexForm({ ...kardexForm, insumoId: Number(e.target.value) })} required>
                                    <option value="">Seleccione un insumo...</option>
                                    {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidadMedida}) - Disp: {i.stock}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div>
                                    <label>Tipo de Movimiento</label>
                                    <select className="glass-input" value={kardexForm.tipoMovimiento} onChange={e => setKardexForm({ ...kardexForm, tipoMovimiento: e.target.value })} required>
                                        <option value="COMPRA">COMPRA (+)</option>
                                        <option value="MERMA">MERMA (-)</option>
                                        <option value="TRANSFERENCIA">TRANSFERENCIA (-)</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Cantidad Afectada</label>
                                    <input type="number" step="0.01" className="glass-input" value={Number.isNaN(kardexForm.cantidad) ? '' : kardexForm.cantidad} onChange={e => setKardexForm({ ...kardexForm, cantidad: e.target.valueAsNumber })} required />
                                </div>
                            </div>
                            <div>
                                <label>Motivo / Justificación</label>
                                <input type="text" className="glass-input" placeholder="Ej: Fugas de agua, Ingreso de factura #123" value={kardexForm.motivo} onChange={e => setKardexForm({ ...kardexForm, motivo: e.target.value })} required />
                            </div>
                            <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: 10 }}>
                                <button type="submit" className="glass-button primary" style={{ width: '100%' }}><Save size={18} /> Registrar en Kardex</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryView;
