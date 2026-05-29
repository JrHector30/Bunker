import React, { useEffect, useState } from 'react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Calculator, X, Minus, Trash2, ArrowRightLeft, Printer, ChefHat } from 'lucide-react';
import { numberToLetters } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../hooks/useCache';
import { useCaja } from '../context/CajaContext';

const TablesView = () => {
    const { showConfirmation } = useConfirmation();
    const { showToast } = useNotification();
    const { user } = useAuth();
    const fetcher = () => fetch('/api/tables')
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                // Filtrar mesas 100 y 101, y limpiar cualquier elemento nulo o undefinido
                const filteredData = data.filter(t => t && t.numero !== '100' && t.numero !== '101');
                // Asegurar orden numérico correcto
                filteredData.sort((a, b) => parseInt(a.numero, 10) - parseInt(b.numero, 10));
                return filteredData;
            }
            return [];
        });

    const { data: tables, mutate: fetchTables } = useCache('tables', fetcher, []);

    const [selectedTableId, setSelectedTableId] = useState(null);
    const { isCajaAbierta } = useCaja();
    const [modalType, setModalType] = useState(null); // 'view' | 'pre-check'
    const [showTransferMode, setShowTransferMode] = useState(false);

    // Diners Modal State
    const [showDinersModal, setShowDinersModal] = useState(false);
    const [selectedFreeTable, setSelectedFreeTable] = useState(null);
    const [dinersCount, setDinersCount] = useState(2);
    const [showTicket, setShowTicket] = useState(false); // Ticket modal state
    const navigate = useNavigate();

    // Handlers
    const handleTableClick = (table) => {
        // Si la mesa ya está ocupada o tiene ítems, permitimos ver la comanda pase lo que pase con la caja
        if (table.estado === 'ocupada' || (table.comandas && table.comandas.length > 0)) {
            navigate(`/order/${table.id}`);
            return;
        }

        // 🛡️ CONTROL LOCAL INMEDIATO: Si está libre pero la caja está cerrada, disparamos el Toast y bloqueamos
        if (!isCajaAbierta) {
            showToast('Operación denegada. Se requiere la apertura de caja para iniciar comandas.', 'error');
            return;
        }

        // Flujo ordinario si la caja está abierta
        setSelectedFreeTable(table);
        setDinersCount(2); // Default
        setShowDinersModal(true);
    };

    const confirmDiners = async () => {
        if (Number.isNaN(dinersCount) || dinersCount === null || dinersCount === '') {
            showToast("Cantidad de comensales no válida", 'error');
            return;
        }
        if (dinersCount < 1) return showToast("Mínimo 1 comensal", 'info');
        setShowDinersModal(false);
        navigate(`/order/${selectedFreeTable.id}`, { state: { comensales: dinersCount } });
    };

    useEffect(() => {
        const interval = setInterval(fetchTables, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'libre': return 'var(--success)';
            case 'ocupada': return 'var(--warning)';
            default: return 'var(--text-muted)';
        }
    };

    const handleOpenModal = (e, table, type) => {
        e.stopPropagation();

        // HOTFIX: Si la mesa no tiene comandas activas válidas, forzamos la recarga al servidor para limpiar caché
        if (!table.comandas || table.comandas.length === 0) {
            fetchTables();
            showToast("Sincronizando mesa con el servidor...", 'info');
        }

        setSelectedTableId(table.id);
        setModalType(type);
        setShowTransferMode(false); // Reset
    };

    const closeModal = () => {
        setSelectedTableId(null);
        setModalType(null);
        setShowTransferMode(false);
    };

    // --- Helper Functions for API ---
    const handleTransfer = async (targetTableId) => {
        if (!await showConfirmation(`¿Trasladar pedido a la Mesa ${targetTableId}?`, { type: 'warning' })) return; // ID is mostly internal, but useful for debug. Ideally use number.

        try {
            const res = await fetch('/api/tables/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromTableId: selectedTableId, toTableId: targetTableId })
            });

            if (res.ok) {
                showToast('Mesa trasladada con éxito', 'success');
                closeModal();
                fetchTables();
            } else {
                const err = await res.json();
                showToast('Error: ' + err.error, 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Error de conexión', 'error');
        }
    };

    const updateQuantity = async (detailId, currentQty, delta) => {
        // ... (existing update logic)
        const newQty = currentQty + delta;
        try {
            if (newQty <= 0) {
                if (await showConfirmation('¿Eliminar este item del pedido?', { type: 'danger' })) {
                    await fetch(`/api/orders/details/${detailId}`, { method: 'DELETE' });
                }
            } else {
                await fetch(`/api/orders/details/${detailId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cantidad: newQty })
                });
            }
            fetchTables();
        } catch (error) { console.error(error); }
    };

    const deleteItem = async (detailId) => {
        if (!await showConfirmation('¿Eliminar este item definitivamente?', { type: 'danger' })) return;
        try {
            await fetch(`/api/orders/details/${detailId}`, { method: 'DELETE' });
            fetchTables();
        } catch (error) { console.error(error); }
    };

    const updateItemStatus = async (detailId, newState) => {
        try {
            await fetch(`/api/orders/details/${detailId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: newState })
            });
            fetchTables();
        } catch (error) { console.error(error); }
    };

    const getItemStatusBadge = (status) => {
        const styles = {
            pendiente: { bg: 'var(--danger)', color: '#ffffff', icon: '🕑' },
            enviada: { bg: 'rgba(0, 0, 255, 0.2)', color: '#4dabf7', icon: '🔵' },
            preparando: { bg: 'var(--warning)', color: '#ffffff', icon: '🟠' },
            lista: { bg: '#88f798', color: '#ffffff', icon: '☑️' },
            listo: { bg: '#88f798', color: '#ffffff', icon: '☑️' },
            entregado: { bg: 'rgba(255, 255, 255, 0.1)', color: '#888', icon: '✅' }
        };
        const s = styles[status] || styles['pendiente'];
        return (
            <span style={{
                background: s.bg, color: s.color,
                padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontWeight: 500
            }}>
                {s.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    // --- GROUPING LOGIC ---
    const getGroupedDetails = () => {
        const selectedTable = tables.find(t => t.id === selectedTableId);
        if (!selectedTable || !selectedTable.comandas) return [];

        // Buscar la comanda activa (cualquier estado que no sea cerrada ni anulada)
        const comandaActiva = selectedTable.comandas.find(c =>
            c.estado && !['cerrada', 'anulada'].includes(c.estado.toLowerCase())
        );
        if (!comandaActiva) return [];

        const rawDetalles = comandaActiva.detalles || [];
        const grouped = [];
        rawDetalles.forEach(detail => {
            const cookName = detail.cocinero?.nombre || '';
            // La llave siempre debe ser detallada para preservar la integridad de los items
            const platoIdReal = detail.plato?.id;
            const key = `${platoIdReal}-${detail.estado}-${detail.observacion || ''}-${cookName}`;
            const existing = grouped.find(g => g.key === key);
            if (existing) {
                existing.cantidad += detail.cantidad;
                existing.detailIds.push(detail.id);
            } else {
                grouped.push({
                    key, platoId: platoIdReal, nombre: detail.plato?.nombre || 'Desconocido',
                    precio: detail.plato?.precio || 0, estado: detail.estado, cantidad: detail.cantidad,
                    detailIds: [detail.id],
                    observacion: detail.observacion,
                    cocineroNombre: cookName,
                    enviarCocina: detail.plato?.categoria?.enviarCocina ?? true // default to true
                });
            }
        });
        return grouped;
    };

    const calculateTotal = (groupedItems) => {
        return groupedItems.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
    };

    const renderModalContent = () => {
        const selectedTable = tables.find(t => t.id === selectedTableId);
        if (!selectedTable || !modalType) return null;

        const groupedItems = getGroupedDetails();

        // NUEVA CONSOLIDACIÓN LIMPIA PARA PRE-CUENTA (Une Coca Colas con notas distintas en una sola fila)
        const preCheckItems = [];
        if (modalType === 'pre-check') {
            groupedItems.forEach(item => {
                const existing = preCheckItems.find(p => p.platoId === item.platoId);
                if (existing) {
                    existing.cantidad += item.cantidad;
                } else {
                    preCheckItems.push({
                        platoId: item.platoId,
                        nombre: item.nombre,
                        precio: item.precio,
                        cantidad: item.cantidad
                    });
                }
            });
        }

        const freeTables = tables.filter(t => t.estado === 'libre');

        return (
            <div className="modal-overlay" onClick={closeModal}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div>
                            <h2 style={{ color: 'var(--text-main)' }}>{modalType === 'pre-check' ? 'Pre-cuenta' : 'Pedido Activo'}</h2>
                            <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                Mesa {selectedTable.numero} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {modalType === 'view' && (
                                <button
                                    className={`glass-button ${showTransferMode ? 'active' : ''}`}
                                    onClick={() => setShowTransferMode(!showTransferMode)}
                                    title="Trasladar mesa"
                                >
                                    <ArrowRightLeft size={20} />
                                </button>
                            )}
                            <button className="glass-button" style={{ padding: 5 }} onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="modal-body">
                        {showTransferMode ? (
                            <div style={{ textAlign: 'center' }}>
                                <h3>Selecciona la mesa de destino:</h3>
                                <p className="text-muted" style={{ marginBottom: 20 }}>El pedido actual se moverá a la mesa seleccionada.</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 }}>
                                    {freeTables.map(t => (
                                        <button
                                            key={t.id}
                                            className="glass-button"
                                            style={{
                                                border: '1px solid var(--success)', color: 'var(--success)',
                                                height: 60, fontSize: '1.2rem', fontWeight: 'bold'
                                            }}
                                            onClick={() => handleTransfer(t.id)}
                                        >
                                            {t.numero}
                                        </button>
                                    ))}
                                    {freeTables.length === 0 && <p>No hay mesas libres.</p>}
                                </div>
                            </div>
                        ) : (
                            groupedItems.length === 0 ? (
                                <p className="text-muted">No hay items en el pedido.</p>
                            ) : modalType === 'pre-check' ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--text-main)' }}>
                                            <th style={{ padding: 10, textAlign: 'center' }}>Cant.</th>
                                            <th style={{ padding: 10 }}>Producto</th>
                                            <th style={{ padding: 10, textAlign: 'right' }}>P. Unit.</th>
                                            <th style={{ padding: 10, textAlign: 'right' }}>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preCheckItems.map((item, index) => (
                                            <tr key={index} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                                                <td style={{ padding: 10, textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>
                                                    {item.cantidad}
                                                </td>
                                                <td style={{ padding: 10, fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                                                    {item.nombre}
                                                </td>
                                                <td style={{ padding: 10, textAlign: 'right' }}>S/. {item.precio.toFixed(2)}</td>
                                                <td style={{ padding: 10, textAlign: 'right' }}>S/. {(item.cantidad * item.precio).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--text-main)' }}>
                                            <th style={{ padding: 10 }}>Cant.</th>
                                            <th style={{ padding: 10 }}>Producto</th>
                                            <th style={{ padding: 10 }}>Estado</th>
                                            <th style={{ padding: 10, textAlign: 'center' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupedItems.map((item) => (
                                            <tr key={item.key} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                                                <td style={{ padding: 10, verticalAlign: 'top' }}>
                                                    <span style={{
                                                        fontWeight: 'bold',
                                                        fontSize: '1.2rem',
                                                        color: 'var(--primary)'
                                                    }}>
                                                        {item.cantidad}x
                                                    </span>
                                                </td>
                                                <td style={{ padding: 10 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                                                        {item.nombre}
                                                    </div>
                                                    {item.observacion && (
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--warning)', marginTop: 4, fontStyle: 'italic' }}>
                                                            ⚠️ {item.observacion}
                                                        </div>
                                                    )}
                                                    {item.cocineroNombre && (
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <ChefHat size={12} /> {item.cocineroNombre}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: 10 }}>
                                                    {getItemStatusBadge(item.estado)}
                                                </td>
                                                <td style={{ padding: 10, textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                                                        {item.estado === 'lista' ? (
                                                            <button
                                                                className="glass-button primary"
                                                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                                onClick={() => { item.detailIds.forEach(id => updateItemStatus(id, 'entregado')); }}
                                                            >
                                                                Entregar
                                                            </button>
                                                        ) : (!item.enviarCocina && (item.estado === 'pendiente' || item.estado === 'enviada')) ? (
                                                            <button
                                                                className="glass-button"
                                                                style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'var(--success)', color: 'white', borderColor: 'transparent' }}
                                                                onClick={() => { item.detailIds.forEach(id => updateItemStatus(id, 'listo')); }}
                                                                title="Marcar bebida/producto como Listo inmediatamente"
                                                            >
                                                                ✓ Listo
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="glass-button"
                                                                style={{ color: 'var(--danger)', padding: 5, borderColor: 'transparent' }}
                                                                onClick={() => deleteItem(item.detailIds[0])}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}
                    </div>

                    {!showTransferMode && (
                        <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            {modalType === 'pre-check' ? (
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                    Total: S/. {calculateTotal(groupedItems).toFixed(2)}
                                </div>
                            ) : (
                                <div>
                                    <button
                                        className="glass-button"
                                        style={{ background: 'var(--danger)', color: 'white', borderColor: 'transparent', fontWeight: 'bold' }}
                                        onClick={async () => {
                                            const table = tables.find(t => t.id === selectedTableId);
                                            const comandaActiva = table?.comandas?.find(c =>
                                                c.estado && !['cerrada', 'anulada'].includes(c.estado.toLowerCase())
                                            );
                                            const comandaId = comandaActiva?.id;
                                            if (!comandaId) return;

                                            const motivo = await showConfirmation({
                                                title: "Motivo de Anulación",
                                                message: "Por favor, detalle la razón por la cual se está cancelando la comanda total:",
                                                inputType: "text",
                                                type: "danger"
                                            });
                                            // Si cerró el modal o presionó cancelar, retornamos de forma segura
                                            if (motivo === null || motivo.trim() === '') return;

                                            try {
                                                const res = await fetch(`/api/orders/${comandaId}/cancel`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ motivo, usuarioResponsable: "Mozo/Admin", usuarioId: user.id })
                                                });
                                                if (res.ok) {
                                                    showToast("Pedido anulado y mesa liberada.", 'success');
                                                    closeModal();
                                                    fetchTables();
                                                } else {
                                                    const err = await res.json();
                                                    showToast("Error: " + err.error, 'error');
                                                }
                                            } catch (e) {
                                                console.error(e);
                                            }
                                        }}
                                    >
                                        Anular Pedido Total
                                    </button>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                                <button className="glass-button" onClick={closeModal}>Cerrar</button>
                                {modalType === 'pre-check' && (
                                    <button className="glass-button primary" onClick={() => setShowTicket(true)}>
                                        Imprimir 🧾
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div >
        );
    };

    const renderTicket = () => {
        if (!showTicket || !selectedTableId) return null;

        const selectedTable = tables.find(t => t.id === selectedTableId);
        const groupedItems = getGroupedDetails();
        const total = calculateTotal(groupedItems);
        const totalLetras = numberToLetters(total);
        const comandaId = selectedTable.comandas?.[0]?.id || "---";

        return (
            <div className="modal-overlay" onClick={() => setShowTicket(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'white', color: 'black', width: 350, fontFamily: '"Courier New", monospace', padding: 20 }}>
                    <div style={{ textAlign: 'center', marginBottom: 15, borderBottom: '1px dashed black', paddingBottom: 10 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>COMANDAGO</div>
                        <div>DEMO</div>
                        <div style={{ fontSize: '0.8rem' }}>Telf: 519123456789 / RUC: 10000000000</div>
                        <div style={{ fontSize: '0.8rem', marginTop: 5 }}>Fecha: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                    </div>

                    <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 10 }}>PRECUENTA</div>

                    <div style={{ fontSize: '0.9rem', marginBottom: 10 }}>
                        <div>Ambiente: Salon Principal</div>
                        <div>Mesa: {selectedTable.numero}</div>
                        <div>Mozo: {selectedTable.comandas?.[0]?.usuarioId || 'General'}</div>
                        <div>Pedido #: {comandaId}</div>
                    </div>

                    <div style={{ borderBottom: '1px dashed black', marginBottom: 5 }}></div>
                    <div style={{ display: 'flex', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        <span style={{ width: 30 }}>Cant</span>
                        <span style={{ flex: 1 }}>Producto</span>
                        <span style={{ width: 60, textAlign: 'right' }}>Total</span>
                    </div>
                    <div style={{ borderBottom: '1px dashed black', marginBottom: 5 }}></div>

                    <div style={{ marginBottom: 15 }}>
                        {groupedItems.map(item => (
                            <div key={item.key} style={{ display: 'flex', fontSize: '0.9rem', marginBottom: 2 }}>
                                <span style={{ width: 30 }}>{item.cantidad}</span>
                                <span style={{ flex: 1 }}>{item.nombre}</span>
                                <span style={{ width: 60, textAlign: 'right' }}>S/ {(item.precio * item.cantidad).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ borderTop: '1px dashed black', paddingTop: 10, textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem' }}>
                        Total: S/ {total.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: 5, textAlign: 'right' }}>
                        Son: {totalLetras}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.8rem', borderTop: '1px dashed black', paddingTop: 10 }}>
                        <div>PRECUENTA</div>
                        <div>Generado por el sistema ComandaGo</div>
                        <div>Este documento no posee ningún valor fiscal!</div>
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                        <button className="glass-button primary" onClick={() => window.print()} style={{ background: 'black', color: 'white' }}>
                            <Printer size={16} /> Imprimir
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (isCajaAbierta === null) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
                <p>Cargando distribución del salón...</p>
            </div>
        );
    }

    return (
        <div>
            <h1 className="high-end-title" style={{ marginBottom: 20 }}>Salón Principal</h1>
            <div className="salon-contenedor">
                {tables.length === 0 && <p className="text-muted" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', padding: '2rem' }}>No hay datos registrados o cargando...</p>}
                {tables.map(table => {
                    const debaBloquear = table.estado === 'libre' && !isCajaAbierta;
                    const comandaActiva = table.comandas?.find(c => c.estado && !['cerrada', 'anulada'].includes(c.estado.toLowerCase()));
                    // Extraer la cantidad real de comensales desde la comanda activa en la BD (por defecto usa la capacidad si no hay orden)
                    const totalComensales = table.estado === 'ocupada' && comandaActiva ? (comandaActiva.comensales || 2) : 0;
                    
                    // Cálculo de productos de barra pendientes (no enviados a cocina)
                    const itemsBarraPendientes = comandaActiva?.detalles?.filter(d => 
                        d.estado !== 'entregado' && 
                        d.estado !== 'listo' && 
                        d.estado !== 'anulado' && 
                        d.plato?.categoria?.enviarCocina === false
                    ).reduce((acc, curr) => acc + curr.cantidad, 0) || 0;

                    let claseNeon = debaBloquear ? 'mesa-apagada' : (table.estado === 'ocupada' ? 'mesa-ocupada-neon' : 'mesa-libre-neon');
                    
                    let finalTop = table.posY !== undefined && table.posY !== null ? table.posY : 25;
                    finalTop -= 10; // Aplicado a TODAS las mesas para mantener alineación

                    return (
                        <div
                            key={table.id}
                            className={`mesa-mapa ${claseNeon}`}
                            onClick={() => handleTableClick(table)}
                            style={{
                                position: 'absolute',
                                left: `${table.posX !== undefined && table.posX !== null ? table.posX : 15}%`,
                                top: `${finalTop}%`,
                                transform: 'translate(-50%, -50%)',
                                width: '100px',
                                height: '100px',
                                background: 'var(--mesa-bg, rgba(15, 15, 20, 0.8))',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '16px',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                
                                // 🛡️ SOLUCIÓN BUG 1: Elevar el z-index si la mesa está ocupada para que sus botones floten encima de la fila inferior
                                zIndex: table.estado === 'ocupada' ? 35 : 20, 
                                
                                transition: 'all 0.15s ease',
                                boxShadow: debaBloquear 
                                    ? 'var(--mesa-shadow-apagada, none)' 
                                    : (table.estado === 'ocupada' ? 'var(--mesa-shadow-ocupada, 0 0 25px rgba(255, 234, 0, 0.35))' : 'var(--mesa-shadow-libre, 0 0 15px rgba(0, 255, 136, 0.15))'),
                                border: debaBloquear
                                    ? '1px solid var(--mesa-border-apagada, rgba(75, 85, 99, 0.4))'
                                    : (table.estado === 'ocupada' ? '1px solid var(--mesa-border-ocupada, #ffea00)' : '1px solid var(--mesa-border-libre, #00ff88)'),
                                opacity: debaBloquear ? 0.4 : 1,
                                cursor: debaBloquear ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {/* 🛡️ Renderizado Geométrico de Sillas Dinámicas alrededor de la mesa */}
                            {(() => {
                                const count = table.estado === 'ocupada' ? totalComensales : table.capacidad;
                                const chairColor = debaBloquear ? '#9ca3af' : (table.estado === 'ocupada' ? '#ffea00' : '#00ff88');
                                
                                if (!count || count <= 0) return null;

                                return (
                                    <div className="sillas-container" style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none' }}>
                                        {Array.from({ length: count }).map((_, index) => {
                                            // Calcular el ángulo de distribución matemática radial para colocar cada silla simétricamente
                                            const angle = (index * (360 / count)) * (Math.PI / 180);
                                            const radius = 62; // Distancia ajustada para la mesa más pequeña
                                            const x = Math.cos(angle) * radius;
                                            const y = Math.sin(angle) * radius;
                                            const rotation = (index * (360 / count)) + 90;

                                            return (
                                                <div 
                                                    key={index}
                                                    className="silla-dinamica"
                                                    style={{
                                                        position: 'absolute',
                                                        width: '18px',
                                                        height: '14px',
                                                        borderRadius: '6px 6px 2px 2px',
                                                        background: chairColor,
                                                        borderBottom: '3px solid rgba(0,0,0,0.3)',
                                                        boxShadow: debaBloquear ? 'none' : `0 0 8px ${chairColor}`,
                                                        left: `calc(50% + ${x}px)`,
                                                        top: `calc(50% + ${y}px)`,
                                                        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                );
                            })()}

                            {/* Contenido ordinario de la mesa (Número, Badge, Mozo y Botones satélite) */}
                            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', marginBottom: 2, color: 'var(--text-main, #fff)' }}>
                                {table.numero}
                            </div>
                            <div className="badge-estado" style={{ 
                                fontSize: '0.65rem', 
                                letterSpacing: 1, 
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: debaBloquear ? 'var(--badge-bg-cerrada, transparent)' : (table.estado === 'ocupada' ? 'var(--badge-bg-ocupada, transparent)' : 'var(--badge-bg-libre, transparent)'),
                                color: debaBloquear ? 'var(--badge-text-cerrada, #9ca3af)' : (table.estado === 'ocupada' ? 'var(--badge-text-ocupada, #ffea00)' : 'var(--badge-text-libre, #00ff88)'),
                                fontWeight: 'bold'
                            }}>
                                {debaBloquear ? 'CERRADA' : (table.estado === 'ocupada' ? 'OCUPADA' : 'LIBRE')}
                            </div>

                            <div style={{ 
                                fontSize: '0.65rem', 
                                marginTop: 3, 
                                color: 'var(--text-main, #fff)', 
                                background: 'var(--item-hover, rgba(255,255,255,0.1))', 
                                padding: '2px 6px', 
                                borderRadius: 10,
                                visibility: (table.estado !== 'libre' && table.comandas?.[0]?.usuario) ? 'visible' : 'hidden'
                            }}>
                                🤵 {(table.estado !== 'libre' && table.comandas?.[0]?.usuario) ? table.comandas[0].usuario.nombre.split(' ')[0] : 'Vacio'}
                            </div>

                            {table.estado !== 'libre' && (
                                <div className="satelite-buttons" style={{ position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 12, zIndex: 50 }}>
                                    <button className="glass-button primary" style={{ padding: '12px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={(e) => { e.stopPropagation(); navigate(`/order/${table.id}`); }}>
                                        <Plus size={24} />
                                    </button>
                                    <button className="glass-button" style={{ padding: '12px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }} onClick={(e) => handleOpenModal(e, table, 'view')}>
                                        <Eye size={24} />
                                        {itemsBarraPendientes > 0 && (
                                            <span style={{
                                                position: 'absolute',
                                                top: -6,
                                                right: -6,
                                                background: '#ff0055',
                                                color: 'white',
                                                fontSize: '0.70rem',
                                                fontWeight: 'bold',
                                                width: '18px',
                                                height: '18px',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                borderRadius: '50%',
                                                boxShadow: '0 0 12px #ff0055, inset 0 0 4px rgba(255,255,255,0.5)',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                zIndex: 60,
                                                animation: 'pulse 2s infinite'
                                            }}>
                                                {itemsBarraPendientes}
                                            </span>
                                        )}
                                    </button>
                                    <button className="glass-button" style={{ padding: '12px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={(e) => handleOpenModal(e, table, 'pre-check')}>
                                        <Calculator size={24} />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {renderModalContent()}
            {renderTicket()}
            {/* Diners Modal */}
            {showDinersModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 400, textAlign: 'center' }}>
                        <h2>Mesa {selectedFreeTable?.numero}</h2>
                        <p className="text-muted">Ingrese cantidad de comensales</p>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, margin: '30px 0' }}>
                            <button className="glass-button" onClick={() => setDinersCount(Math.max(1, dinersCount - 1))} style={{ width: 50, height: 50, borderRadius: '50%' }}>
                                <Minus />
                            </button>
                            <span style={{ fontSize: '3rem', fontWeight: 'bold' }}>{dinersCount}</span>
                            <button className="glass-button" onClick={() => setDinersCount(dinersCount + 1)} style={{ width: 50, height: 50, borderRadius: '50%' }}>
                                <Plus />
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="glass-button" onClick={() => setShowDinersModal(false)} style={{ flex: 1 }}>Cancelar</button>
                            <button className="glass-button primary" onClick={confirmDiners} style={{ flex: 1 }}>Continuar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TablesView;
