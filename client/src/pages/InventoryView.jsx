import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash, Save, X, Search, Image as ImageIcon, Sparkles, ArrowUp, ArrowDown, ChevronsUpDown, ArrowLeft, Package, Beaker, BookOpen, AlertTriangle, History, ClipboardCheck } from 'lucide-react';

const InventoryView = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('platos'); // 'platos', 'insumos', 'recetario'

    // Data States
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [insumos, setInsumos] = useState([]);
    const [kardex, setKardex] = useState([]);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });

    useEffect(() => {
        fetchData();
        fetchInsumos();
        if (activeTab === 'kardex') fetchKardex();
    }, [activeTab]);

    const fetchData = async () => {
        const [prodRes, catRes] = await Promise.all([
            fetch('/api/products'),
            fetch('/api/categories')
        ]);
        const p = await prodRes.json();
        const c = await catRes.json();
        setProducts(p);
        setCategories(c);
        if (c.length > 0 && formData.categoriaId === '') setFormData(prev => ({ ...prev, categoriaId: c[0].id }));
    };

    const fetchInsumos = async () => {
        const res = await fetch('/api/insumos');
        const data = await res.json();
        setInsumos(data);
    };

    const fetchKardex = async () => {
        const res = await fetch('/api/kardex');
        const data = await res.json();
        setKardex(data);
    };

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
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
        if (!formData.nombre) { alert("Por favor, ingrese un nombre primero."); return; }
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
            console.error("AI Generation failed", error); alert("Error generando descripción");
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
        if (!confirm('¿Seguro que desea eliminar este producto?')) return;
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (res.ok) fetchData();
    };

    const handleSubmitProduct = async (e) => {
        e.preventDefault();
        let imageUrl = editingProduct ? editingProduct.imagen : null;
        if (formData.imageFile) {
            const uploadData = new FormData(); uploadData.append('image', formData.imageFile);
            try {
                const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
                imageUrl = (await res.json()).url;
            } catch (error) { alert('Falló la subida de imagen'); return; }
        }
        const payload = { ...formData, imagen: imageUrl };
        const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
        const method = editingProduct ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) { setIsModalOpen(false); fetchData(); }
    };

    // --- TAB 2: INSUMOS ---
    const [isInsumoModalOpen, setIsInsumoModalOpen] = useState(false);
    const [editingInsumo, setEditingInsumo] = useState(null);
    const [insumoForm, setInsumoForm] = useState({ nombre: '', precioCompra: '', unidadMedida: 'kg', stock: '' });

    const handleOpenInsumoModal = (insumo = null) => {
        if (insumo) {
            setEditingInsumo(insumo);
            setInsumoForm({ nombre: insumo.nombre, precioCompra: insumo.precioCompra, unidadMedida: insumo.unidadMedida, stock: insumo.stock });
        } else {
            setEditingInsumo(null);
            setInsumoForm({ nombre: '', precioCompra: '', unidadMedida: 'kg', stock: '' });
        }
        setIsInsumoModalOpen(true);
    };

    const handleSubmitInsumo = async (e) => {
        e.preventDefault();
        const url = editingInsumo ? `/api/insumos/${editingInsumo.id}` : '/api/insumos';
        const method = editingInsumo ? 'PUT' : 'POST';
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(insumoForm) });
        setIsInsumoModalOpen(false);
        fetchInsumos();
    };

    const handleDeleteInsumo = async (id) => {
        if (confirm('¿Seguro que desea eliminar este insumo?')) {
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
        const validIngredients = currentRecipe.filter(i => i.insumoId && parseFloat(i.cantidad) > 0);

        try {
            const res = await fetch(`/api/recetas/${selectedPlatoId}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingredientes: validIngredients })
            });

            if (res.ok) {
                alert('Receta guardada. Costos actualizados.');
                fetchData(); // refresh product list for new cost
            } else {
                alert('Error al guardar receta.');
            }
        } catch (e) { alert('Error de red al guardar receta.'); }
    };

    // --- RENDER HELPERS ---
    const renderPlatosTab = () => {
        const filteredProducts = sortedProducts.filter(p => {
            const matchesCategory = filterCategory ? p.categoriaId === parseInt(filterCategory) : true;
            const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        return (
            <>
                <div className="glass-panel" style={{ marginBottom: 20, display: 'flex', gap: 15, padding: 15, alignItems: 'center' }}>
                    <div className="search-container" style={{ flex: 1 }}>
                        <Search size={22} className="text-muted" />
                        <input
                            type="text" placeholder="Buscar plato..." className="search-input"
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', height: 30 }} />
                    <select className="glass-input" style={{ width: 200 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option value="">Todas las categorías</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
                    </select>
                    <button className="glass-button primary" onClick={() => handleOpenModal()}><Plus size={20} /> Nuevo Plato</button>
                </div>

                <div className="glass-panel table-responsive" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                <th style={{ padding: 15 }}>Imagen</th>
                                <SortHeader label="Nombre" sortKey="nombre" />
                                <SortHeader label="Categoría" sortKey="categoria" />
                                <SortHeader label="Precio Venta" sortKey="precio" />
                                <th style={{ padding: 15 }}>Costo Prod.</th>
                                <th style={{ padding: 15 }}>Costo %</th>
                                <th style={{ padding: 15 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(prod => {
                                const costo = prod.costoProduccion || 0;
                                const margenPct = prod.precio > 0 ? (costo / prod.precio) * 100 : 0;
                                const isWarning = margenPct > 40;

                                return (
                                    <tr key={prod.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: 15 }}>
                                            {prod.imagen ? <img src={prod.imagen} alt={prod.nombre} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8 }} />
                                                : <div style={{ width: 50, height: 50, background: 'var(--item-hover)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} className="text-muted" /></div>}
                                        </td>
                                        <td style={{ padding: 15, fontWeight: 'bold' }}>{prod.nombre}</td>
                                        <td style={{ padding: 15 }}><span style={{ padding: '4px 8px', borderRadius: 4, background: prod.categoria?.color + '40', color: prod.categoria?.color }}>{prod.categoria?.icono} {prod.categoria?.nombre}</span></td>
                                        <td style={{ padding: 15 }}>S/. {prod.precio.toFixed(2)}</td>
                                        <td style={{ padding: 15, color: isWarning ? 'var(--danger)' : 'var(--success)' }}>S/. {costo.toFixed(2)}</td>
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

                <div className="glass-panel table-responsive" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                <th style={{ padding: 15 }}>Nombre</th>
                                <th style={{ padding: 15 }}>Costo Unitario Bruto</th>
                                <th style={{ padding: 15 }}>Stock Actual</th>
                                <th style={{ padding: 15 }}>Nivel de Stock</th>
                                <th style={{ padding: 15 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInsumos.map(insumo => {
                                const stockPct = Math.min(100, Math.max(0, (insumo.stock / 100) * 100)); // Demo ratio against 100 units
                                return (
                                    <tr key={insumo.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: 15, fontWeight: 'bold' }}>{insumo.nombre}</td>
                                        <td style={{ padding: 15 }}>S/. {insumo.precioCompra.toFixed(2)} / {insumo.unidadMedida}</td>
                                        <td style={{ padding: 15 }}>{insumo.stock} {insumo.unidadMedida}</td>
                                        <td style={{ padding: 15 }}>
                                            <div style={{ height: 8, width: 150, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${stockPct}%`, background: stockPct < 20 ? 'var(--danger)' : 'var(--primary)', transition: 'width 0.3s' }} />
                                            </div>
                                        </td>
                                        <td style={{ padding: 15 }}>
                                            <div style={{ display: 'flex', gap: 10 }}>
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

        return (
            <div className="glass-panel" style={{ padding: 30 }}>
                <div style={{ display: 'flex', gap: 30, marginBottom: 30, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <label style={{ display: 'block', marginBottom: 10, fontSize: '1.1rem', fontWeight: 'bold' }}>Seleccionar Plato del Menú</label>
                        <select className="glass-input" style={{ fontSize: '1.1rem', padding: 15 }} value={selectedPlatoId} onChange={e => setSelectedPlatoId(e.target.value)}>
                            <option value="">-- Elija un plato --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                        <p className="text-muted" style={{ marginTop: 10, fontSize: '0.9rem' }}>El costo se descontará del stock en Logística al venderse este plato.</p>
                    </div>

                    {selectedPlatoObj && (
                        <div style={{ flex: '1 1 300px', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--glass-border)', padding: 20, borderRadius: 16 }}>
                            <h3 style={{ margin: '0 0 15px 0' }}>Análisis de Costos</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '1.1rem' }}>
                                <span className="text-muted">Precio Venta (PVP):</span>
                                <strong>S/. {selectedPlatoObj.precio.toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '1.1rem' }}>
                                <span className="text-muted">Costo Producción:</span>
                                <strong style={{ color: isWarning ? 'var(--danger)' : 'var(--success)' }}>S/. {draftCosto.toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: 10, marginTop: 10, fontSize: '1.1rem' }}>
                                <span className="text-muted">Margen Bruto:</span>
                                <strong>S/. {(selectedPlatoObj.precio - draftCosto).toFixed(2)}</strong>
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
                                <table style={{ width: '100%', marginBottom: 20 }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
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
                                            return (
                                                <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: 15 }}>
                                                        <select className="glass-input" value={item.insumoId} onChange={e => handleIngredientChange(index, 'insumoId', e.target.value)}>
                                                            <option value="">-- Seleccionar Insumo --</option>
                                                            {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: 15 }} className="text-muted">{insu ? insu.unidadMedida : '-'}</td>
                                                    <td style={{ padding: 15 }}>
                                                        <input type="number" step="0.01" className="glass-input" style={{ width: 120 }} placeholder="0.00" value={item.cantidad} onChange={e => handleIngredientChange(index, 'cantidad', e.target.value)} />
                                                    </td>
                                                    <td style={{ padding: 15 }}>{insu ? `S/. ${subtotal.toFixed(2)}` : '-'}</td>
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
        try {
            const userId = 1; // Assuming admin/manager ID 1 for now (if not using auth context yet)
            const payload = { ...kardexForm, usuarioId: userId };
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
                alert("Error al guardar movimiento");
            }
        } catch (error) { alert("Error de conexión"); }
    };

    const renderKardexTab = () => {
        return (
            <div className="fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h2>Historial de Movimientos</h2>
                    <button className="glass-button secondary" onClick={() => setIsKardexModalOpen(true)}>
                        <Plus size={18} /> Nuevo Movimiento Manual
                    </button>
                </div>

                <div className="glass-panel table-responsive" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                <th style={{ padding: 15 }}>Fecha y Hora</th>
                                <th style={{ padding: 15 }}>Insumo</th>
                                <th style={{ padding: 15 }}>Tipo</th>
                                <th style={{ padding: 15 }}>Cantidad</th>
                                <th style={{ padding: 15 }}>Motivo / Info</th>
                            </tr>
                        </thead>
                        <tbody>
                            {kardex.length === 0 ? (
                                <tr><td colSpan="5" style={{ padding: 20, textAlign: 'center' }}>No hay movimientos registrados.</td></tr>
                            ) : kardex.map(mov => {
                                const isPositive = ['COMPRA', 'AJUSTE_POSITIVO'].includes(mov.tipoMovimiento);
                                const color = isPositive ? 'var(--success)' : (mov.tipoMovimiento === 'VENTA' ? 'var(--primary)' : 'var(--danger)');
                                return (
                                    <tr key={mov.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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
                                        <td style={{ padding: 15, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>{mov.motivo || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
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
        if (!confirm("¿Desea aplicar estos ajustes de conciliación? Se generarán movimientos de AJUSTE en el Kardex y el stock se actualizará.")) return;

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
                        usuarioId: 1 // Admin
                    })
                });
            });

            await Promise.all(promises.filter(p => p !== null));
            alert("Conciliación aplicada exitosamente.");
            setAuditData({});
            fetchInsumos();
        } catch (e) { alert("Error al conciliar."); }
    };

    const renderAuditoriaTab = () => {
        let hasChanges = Object.keys(auditData).some(id => {
            const real = parseFloat(auditData[id]);
            const insumo = insumos.find(i => i.id === parseInt(id));
            return insumo && !isNaN(real) && Math.abs(real - insumo.stock) >= 0.0001;
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
                                <th style={{ padding: 15 }}>Insumo</th>
                                <th style={{ padding: 15 }}>Stock Teórico (Actual)</th>
                                <th style={{ padding: 15 }}>Stock Físico (Real)</th>
                                <th style={{ padding: 15 }}>Diferencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {insumos.map(insumo => {
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

    return (
        <div className="fade-in" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <button className="glass-button" onClick={() => navigate('/')} style={{ padding: 10 }}><ArrowLeft size={24} /></button>
                    <h1 style={{ margin: 0 }}>Logística y Recetas</h1>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--glass-border)', paddingBottom: 15, overflowX: 'auto' }}>
                <button className={`glass-button ${activeTab === 'platos' ? 'primary' : ''}`} onClick={() => { setActiveTab('platos'); setSearchTerm(''); }}>
                    <BookOpen size={18} /> Menú (Platos)
                </button>
                <button className={`glass-button ${activeTab === 'insumos' ? 'primary' : ''}`} onClick={() => { setActiveTab('insumos'); setSearchTerm(''); }}>
                    <Package size={18} /> Inventario (Insumos)
                </button>
                <button className={`glass-button ${activeTab === 'recetario' ? 'primary' : ''}`} onClick={() => setActiveTab('recetario')}>
                    <Beaker size={18} /> Recetarios (Costeo)
                </button>
                <button className={`glass-button ${activeTab === 'kardex' ? 'primary' : ''}`} onClick={() => setActiveTab('kardex')}>
                    <History size={18} /> Kardex
                </button>
                <button className={`glass-button ${activeTab === 'auditoria' ? 'primary' : ''}`} onClick={() => setActiveTab('auditoria')}>
                    <ClipboardCheck size={18} /> Auditoría
                </button>
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

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div><label>Categoría</label><select className="glass-input" value={formData.categoriaId} onChange={e => setFormData({ ...formData, categoriaId: e.target.value })} required>{categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                                <div><label>Precio (S/.)</label><input type="number" step="0.01" className="glass-input" value={formData.precio} onChange={e => setFormData({ ...formData, precio: e.target.value })} required /></div>
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
                            <div>
                                <label>Nombre del Insumo</label>
                                <input type="text" className="glass-input" value={insumoForm.nombre} onChange={e => setInsumoForm({ ...insumoForm, nombre: e.target.value })} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div>
                                    <label>Precio Compra Inicial (S/.)</label>
                                    <input type="number" step="0.01" className="glass-input" value={insumoForm.precioCompra} onChange={e => setInsumoForm({ ...insumoForm, precioCompra: e.target.value })} required />
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
                            <div>
                                <label>Stock Física en Bodega</label>
                                <input type="number" step="0.01" className="glass-input" value={insumoForm.stock} onChange={e => setInsumoForm({ ...insumoForm, stock: e.target.value })} required />
                                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 5 }}>Expresado en la Medida Lógica seleccionada.</p>
                            </div>
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
                            <div>
                                <label>Insumo</label>
                                <select className="glass-input" value={kardexForm.insumoId} onChange={e => setKardexForm({ ...kardexForm, insumoId: e.target.value })} required>
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
                                    <input type="number" step="0.01" className="glass-input" value={kardexForm.cantidad} onChange={e => setKardexForm({ ...kardexForm, cantidad: e.target.value })} required />
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
