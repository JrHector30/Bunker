import React, { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, Minus, Send, Trash2, ArrowLeft, Search, Image as ImageIcon, FileText, Info, X } from 'lucide-react';
import { useCache } from '../hooks/useCache';

const WaiterOrderView = () => {
    const { showToast } = useNotification();
    const { tableId } = useParams();
    const navigate = useNavigate();
    const location = useLocation(); // For passed state (new table)
    const { user } = useAuth();

    // Cached Data
    const productsFetcher = () => fetch('/api/products').then(res => res.json());
    const categoriesFetcher = () => fetch('/api/categories').then(res => res.json());
    
    const { data: products, mutate: fetchProducts } = useCache('products', productsFetcher, []);
    const { data: categories, mutate: fetchCategories } = useCache('categories', categoriesFetcher, []);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);

    // Table Info
    const [tableInfo, setTableInfo] = useState({ numero: tableId, comensales: location.state?.comensales || 1 });

    // UI State
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [infoModalProduct, setInfoModalProduct] = useState(null);
    const [mobileCartOpen, setMobileCartOpen] = useState(false); // NEW STATE FOR MOBILE CART

    useEffect(() => {
        const fetchTableData = async () => {
            const tableRes = await fetch(`/api/tables`);
            const tList = await tableRes.json();

            // Find current table info
            const currentTable = tList.find(t => t.id === parseInt(tableId));
            if (currentTable) {
                // If occupied, use DB count. If free (new), use state or default.
                const comandaActiva = currentTable.comandas?.find(c => 
                  c.estado && !['cerrada', 'anulada'].includes(c.estado.toLowerCase())
                );
                const dbComensales = comandaActiva?.comensales;
                let numeroCompleto = currentTable.numero;
                if (currentTable.mesasHijas && currentTable.mesasHijas.length > 0) {
                    const hijasNumeros = currentTable.mesasHijas.map(h => h.numero).join(' - ');
                    numeroCompleto = `${currentTable.numero} - ${hijasNumeros}`;
                }
                setTableInfo({
                    numero: numeroCompleto,
                    comensales: dbComensales || location.state?.comensales || 1
                });
            }
        };
        fetchTableData();
    }, [tableId, location.state]);
    const addToCart = (product) => {
        setCart(prev => {
            // Find existing line with SAME product AND NO observation
            const existing = prev.find(p => p.platoId === product.id && !p.observacion);
            if (existing) {
                return prev.map(p => p.tempId === existing.tempId ? { ...p, cantidad: p.cantidad + 1 } : p);
            }
            return [...prev, {
                tempId: Date.now() + Math.random(),
                platoId: product.id,
                nombre: product.nombre,
                precio: product.precio,
                cantidad: 1,
                observacion: ''
            }];
        });
    };

    const removeFromCart = (tempId) => {
        setCart(prev => prev.filter(p => p.tempId !== tempId));
    };

    const updateQuantity = (tempId, delta) => {
        setCart(prev => prev.map(p => {
            if (p.tempId === tempId) {
                const newQty = p.cantidad + delta;
                return newQty > 0 ? { ...p, cantidad: newQty } : p;
            }
            return p;
        }));
    };

    const handleNoteClick = (item) => {
        // If clicking note on a grouped item (qty > 1), split it immediately
        if (item.cantidad > 1) {
            const newId = Date.now() + Math.random();
            setCart(prev => {
                const updated = prev.map(p => p.tempId === item.tempId ? { ...p, cantidad: p.cantidad - 1 } : p);
                return [...updated, { ...item, tempId: newId, cantidad: 1, observacion: '' }]; // Add empty note item to edit
            });
            // We can't focus easily without refs, but the user will see the new line.
        }
    };

    const updateObservation = (tempId, text) => {
        setCart(prev => prev.map(p => p.tempId === tempId ? { ...p, observacion: text } : p));
    };

    const sendOrder = async () => {
        if (cart.length === 0) return;
        setLoading(true);

        const parsedTableId = parseInt(tableId);
        let previousTables = null;

        // 1. Optimistic Update in Cache
        try {
            const cached = localStorage.getItem('tables');
            if (cached) {
                previousTables = cached;
                const parsed = JSON.parse(cached);
                const updated = parsed.map(t => t.id === parsedTableId ? { ...t, estado: 'ocupada' } : t);
                localStorage.setItem('tables', JSON.stringify(updated));
            }
        } catch (e) {
            console.error(e);
        }

        // 2. Navigate immediately to Tables view
        navigate('/tables');

        // 3. Perform the fetch in the background
        fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mesaId: parsedTableId,
                usuarioId: user.id,
                comensales: tableInfo.comensales, // Send captured count
                detalles: cart.map(item => ({
                    platoId: item.platoId,
                    cantidad: item.cantidad,
                    observacion: item.observacion
                }))
            })
        })
            .then(async res => {
                if (res.ok) {
                    showToast('Pedido enviado a cocina!', 'success');
                    // Dispatch synchronization events
                    window.dispatchEvent(new CustomEvent('refreshTables'));
                    window.dispatchEvent(new CustomEvent('refreshKitchenQueue'));
                    try {
                        const channel = new BroadcastChannel('comandago');
                        channel.postMessage('refreshKitchenQueue');
                        channel.postMessage('refreshTables');
                        channel.close();
                    } catch (e) {}
                } else {
                    throw new Error('Error al enviar pedido');
                }
            })
            .catch(error => {
                console.error(error);
                showToast('Error al enviar pedido', 'error');
                // Revert cache to previous state
                if (previousTables) {
                    localStorage.setItem('tables', previousTables);
                    window.dispatchEvent(new CustomEvent('refreshTables'));
                }
            })
            .finally(() => {
                setLoading(false);
            });
    };

    // Filter Products
    const filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategoryId ? p.categoriaId === selectedCategoryId : true;
        const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch && p.activo;
    });

    const getProductQtyInCart = (prodId) => {
        // Sum of all lines for this product
        return cart.filter(p => p.platoId === prodId).reduce((sum, item) => sum + item.cantidad, 0);
    };

    const totalItemsInCart = cart.reduce((sum, item) => sum + item.cantidad, 0);

    return (
        <React.Fragment>
            
        <div className="order-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', height: 'calc(100vh - 110px)', gap: 20, padding: 20, boxSizing: 'border-box' }}>

            {/* LEFT SIDE: MENU */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflow: 'hidden', boxSizing: 'border-box' }}>

                {/* Header & Search */}
                <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                    <button onClick={() => navigate('/tables')} className="glass-button" style={{ height: 40, width: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className="search-container">
                        <Search size={22} className="text-muted" />
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Categories */}
                <div style={{ paddingBottom: 5 }}>
                    <div className="text-muted" style={{ marginBottom: 10, fontSize: '0.9rem' }}>CATEGORÍAS</div>
                    <div className="mobile-category-grid" style={{ display: 'grid', gridTemplateRows: 'repeat(2, 1fr)', gridAutoFlow: 'column', gridAutoColumns: 'minmax(140px, 1fr)', gap: 15, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 10, scrollSnapType: 'x mandatory' }}>
                        <div
                            className={`glass-panel category-card mobile-category-item ${selectedCategoryId === null ? 'active' : ''}`}
                            style={{
                                background: selectedCategoryId === null ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                cursor: 'pointer', padding: 15, display: 'flex', flexDirection: 'column', gap: 5,
                                transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.1)', scrollSnapAlign: 'start',
                                height: '100%'
                            }}
                            onClick={() => setSelectedCategoryId(null)}
                        >
                            <span style={{ fontSize: '1.5rem' }}>♾️</span>
                            <span style={{ fontWeight: 600 }}>Todas</span>
                            <span className="text-muted" style={{ fontSize: '0.8rem' }}>{products.length} items</span>
                        </div>

                        {categories.map(cat => (
                            <div
                                key={cat.id}
                                className={`glass-panel category-card mobile-category-item ${selectedCategoryId === cat.id ? 'active' : ''}`}
                                style={{
                                    background: selectedCategoryId === cat.id ? 'var(--primary)' : cat.color,
                                    color: 'var(--text-main)',
                                    cursor: 'pointer', padding: 15, display: 'flex', flexDirection: 'column', gap: 5,
                                    transition: 'all 0.2s', border: 'none', scrollSnapAlign: 'start',
                                    height: '100%'
                                }}
                                onClick={() => setSelectedCategoryId(cat.id)}
                            >
                                <span style={{ fontSize: '1.5rem' }}>{cat.icono}</span>
                                <span style={{ fontWeight: 600 }}>{cat.nombre}</span>
                                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{cat._count?.platos || 0} items</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Products */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 5, scrollSnapType: 'y proximity' }}>
                    <div className="text-muted" style={{ marginBottom: 10, fontSize: '0.9rem' }}>
                        {selectedCategoryId ? categories.find(c => c.id === selectedCategoryId)?.nombre : 'TODOS LOS PRODUCTOS'}
                    </div>

                    <div className="mobile-product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gridAutoRows: '210px', gap: 15 }}>
                        {filteredProducts.map((product, index) => {
                            const qty = getProductQtyInCart(product.id);
                            // Add a slight staggered delay to the fade-in based on index
                            const animationDelay = `${index * 0.03}s`;

                            return (
                                <div key={product.id} className="glass-panel fade-in mobile-product-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: qty > 0 ? '1px solid var(--primary)' : 'none', animationDelay, scrollSnapAlign: 'start', height: '100%' }}>
                                    <div className="product-image-container" style={{ height: 100, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                                        {product.imagen ? (
                                            <img src={product.imagen} alt={product.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <ImageIcon size={30} className="text-muted" opacity={0.3} />
                                        )}
                                        {/* INFO BUTTON (Forced Visibility) */}
                                        <button
                                            className="info-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setInfoModalProduct(product);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '10px',
                                                right: '10px',
                                                zIndex: 9999,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '30px',
                                                height: '30px',
                                                borderRadius: '50%',
                                                background: '#3b82f6', // Vivid Blue
                                                border: '2px solid white',
                                                color: 'white',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                                            }}
                                        >
                                            <Info size={16} strokeWidth={3} />
                                        </button>
                                    </div>
                                    <div className="product-body" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                                        <div className="product-info-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                                            <div className="product-name" style={{ fontWeight: 600, fontSize: '0.95rem' }}>{product.nombre}</div>
                                            <div className="product-price" style={{ color: 'var(--success)', fontWeight: 'bold' }}>S/. {product.precio.toFixed(2)}</div>
                                        </div>

                                        <div className="product-actions-wrap" style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            {qty > 0 ? (
                                                <div className="quantity-controls" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 2 }}>
                                                    {/* Note: In split logic, generic +/- affects the first generic line. 
                                                        For simplicity, the menu buttons just add/remove from the generic pool. 
                                                    */}
                                                    <button
                                                        className="glass-button"
                                                        style={{ width: 24, height: 24, padding: 0, borderRadius: '50%' }}
                                                        onClick={() => {
                                                            // Find generic item to remove
                                                            const item = cart.find(p => p.platoId === product.id && !p.observacion);
                                                            if (item) {
                                                                if (item.cantidad === 1) removeFromCart(item.tempId);
                                                                else updateQuantity(item.tempId, -1);
                                                            } else {
                                                                // If no generic item, maybe warn or remove the first one found?
                                                                // Let's just remove the last added one
                                                                const anyItem = cart.slice().reverse().find(p => p.platoId === product.id);
                                                                if (anyItem) {
                                                                    if (anyItem.cantidad === 1) removeFromCart(anyItem.tempId);
                                                                    else updateQuantity(anyItem.tempId, -1);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="quantity-number" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{qty}</span>
                                                    <button
                                                        className="glass-button"
                                                        style={{ width: 24, height: 24, padding: 0, borderRadius: '50%' }}
                                                        onClick={() => addToCart(product)}
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button className="glass-button" style={{ width: 30, height: 30, padding: 0, borderRadius: '50%', marginLeft: 'auto' }} onClick={() => addToCart(product)}>
                                                    <Plus size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* RIGHT SIDE: CART (Desktop side-panel, Mobile bottom-drawer) */}
            <div className={`glass-panel order-cart-panel ${mobileCartOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', padding: 20, height: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                        <h2>Mesa {tableInfo.numero} - {tableInfo.comensales} Pax</h2>
                        <span className="text-muted">{user?.nombre || 'Mozo'}</span>
                    </div>
                    {/* Mobile Only Close Button for Cart Drawer */}
                    <button className="glass-button mobile-cart-close" style={{ height: 40, width: 40, padding: 0, display: 'none', alignItems: 'center', justifyContent: 'center' }} onClick={() => setMobileCartOpen(false)}>
                        <X size={20} />
                    </button>
                    {/* Desktop dummy icon */}
                    <div className="glass-button" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                        <span style={{ fontSize: '1.2rem' }}>📝</span>
                    </div>
                </div>

                {/* Scrollable Cart List */}
                <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 5 }}>
                    {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#888', marginTop: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                            <div style={{ fontSize: '3rem', opacity: 0.2 }}>🍽️</div>
                            Selecciona productos del menú<br />para comenzar el pedido
                        </div>
                    ) : (
                        cart.map((item, idx) => (
                            <div key={item.tempId} style={{ display: 'flex', flexDirection: 'column', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button className="glass-button" style={{ width: 24, height: 24, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => {
                                                if (item.cantidad === 1) removeFromCart(item.tempId);
                                                else updateQuantity(item.tempId, -1);
                                            }}><Minus size={12} /></button>
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', minWidth: 20, textAlign: 'center', lineHeight: 1 }}>{item.cantidad}</span>
                                            <button className="glass-button" style={{ width: 24, height: 24, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => updateQuantity(item.tempId, 1)}><Plus size={12} /></button>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{item.nombre}</div>
                                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>S/. {(item.precio * item.cantidad).toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', gap: 5 }}>
                                        <button
                                            className={`glass-button ${item.observacion ? 'active' : ''}`}
                                            style={{ width: 30, height: 30, padding: 0, borderRadius: 5 }}
                                            onClick={() => handleNoteClick(item)}
                                            title="Agregar Nota"
                                        >
                                            <FileText size={16} />
                                        </button>
                                        <button className="glass-button" style={{ width: 30, height: 30, padding: 0, borderRadius: 5, color: 'var(--danger)', borderColor: 'transparent' }} onClick={() => removeFromCart(item.tempId)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Observation Input */}
                                {(item.observacion !== undefined) && (
                                    <div style={{ marginTop: 8, paddingLeft: 0 }}>
                                        <input
                                            type="text"
                                            placeholder="📝 Nota..."
                                            className="glass-input"
                                            style={{
                                                padding: '5px 10px',
                                                fontSize: '0.85rem',
                                                width: '100%',
                                                borderRadius: 5
                                            }}
                                            value={item.observacion || ''}
                                            onChange={(e) => updateObservation(item.tempId, e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Sticky Footer */}
                <div style={{ position: 'sticky', bottom: 0, background: 'var(--bg-surface)', marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
                    <div className="text-muted" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span>Subtotal</span>
                        <span>S/. {cart.reduce((sum, i) => sum + (i.precio * i.cantidad), 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '2rem', fontWeight: 'bold', marginBottom: 20 }}>
                        <span>Total</span>
                        <span>S/. {cart.reduce((sum, i) => sum + (i.precio * i.cantidad), 0).toFixed(2)}</span>
                    </div>

                    <button
                        className="glass-button primary"
                        style={{ width: '100%', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: '1.2rem', fontWeight: 'bold' }}
                        disabled={cart.length === 0 || loading}
                        onClick={sendOrder}
                    >
                        <Send size={24} /> {loading ? 'Enviando...' : 'Confirmar Pedido'}
                    </button>
                </div>
            </div>

            {/* FLOATING ACTION BUTTON FOR MOBILE (Hidden on desktop) */}
            <button
                className="mobile-cart-fab"
                onClick={() => setMobileCartOpen(true)}
            >
                <div style={{ position: 'relative' }}>
                    <FileText size={24} />
                    {totalItemsInCart > 0 && (
                        <span style={{
                            position: 'absolute', top: -8, right: -12, background: 'var(--bg-surface)', color: 'var(--text-main)', 
                            fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '10px', padding: '2px 6px', border: '1px solid var(--glass-border)'
                        }}>
                            {totalItemsInCart}
                        </span>
                    )}
                </div>
            </button>

            {/* Overlay for Cart Modal on Mobile */}
            {mobileCartOpen && (
                 <div
                     className="sidebar-overlay"
                     onClick={() => setMobileCartOpen(false)}
                     style={{
                         position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                         background: 'rgba(0,0,0,0.5)', zIndex: 1035, /* Below the drawer (1040), above the rest */
                         backdropFilter: 'blur(2px)'
                     }}
                 />
            )}

            {/* INFO MODAL */}
            {infoModalProduct && (
                <div className="modal-overlay" onClick={() => setInfoModalProduct(null)} style={{ zIndex: 1100 }}> {/* highest z-index */}
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                            <h2 style={{ fontSize: '1.2rem' }}>Detalle del Producto</h2>
                            <button className="glass-button" onClick={() => setInfoModalProduct(null)}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 15 }}>
                            {/* Hero Image */}
                            <div style={{ height: 200, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                                {infoModalProduct.imagen ? (
                                    <img src={infoModalProduct.imagen} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                                        <ImageIcon size={40} />
                                    </div>
                                )}
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: 5 }}>{infoModalProduct.nombre}</h3>
                                <div style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '1.2rem' }}>S/. {infoModalProduct.precio.toFixed(2)}</div>
                            </div>

                            <div className="glass-panel" style={{ padding: 15, background: 'rgba(255,255,255,0.03)' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>DESCRIPCIÓN</h4>
                                <p style={{ lineHeight: 1.6, margin: 0 }}>
                                    {infoModalProduct.descripcion || "Sin descripción disponible."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </React.Fragment>
    );
};

export default WaiterOrderView;

