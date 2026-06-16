import React, { useEffect, useState } from 'react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Calculator, X, Minus, Trash2, ArrowRightLeft, Printer, ChefHat, RotateCcw } from 'lucide-react';
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

    // United / Merged Tables Modal States
    const [showMergeMode, setShowMergeMode] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [tablesState, setTablesState] = useState([]);
    const [draggingTableId, setDraggingTableId] = useState(null);
    const [showGlobalMergeModal, setShowGlobalMergeModal] = useState(false);
    const [globalMergePadreId, setGlobalMergePadreId] = useState(null);
    const [globalMergeHijaId, setGlobalMergeHijaId] = useState(null);

    // States for dynamically modifying comensales of occupied tables upon merge
    const [isUpdatingDiners, setIsUpdatingDiners] = useState(false);
    const [updatingComandaId, setUpdatingComandaId] = useState(null);

    // Fetch edit mode on mount
    const fetchEditMode = async () => {
        try {
            const res = await fetch('/api/config/tables-edit-mode');
            const data = await res.json();
            setIsEditMode(data.enabled);
        } catch (e) {
            console.error("Error fetching edit mode:", e);
        }
    };

    // Sync tablesState when tables data updates
    useEffect(() => {
        if (tables && tables.length > 0) {
            setTablesState(prev => {
                return tables.map(t => {
                    const existing = prev.find(p => p.id === t.id);
                    if (isEditMode && existing) {
                        return { ...t, posX: existing.posX, posY: existing.posY };
                    }
                    return t;
                });
            });
        } else {
            setTablesState([]);
        }
    }, [tables, isEditMode]);

    const checkCollisionClient = (tableId, targetPosX, targetPosY, allTables) => {
        const table = allTables.find(t => t.id === tableId);
        if (!table) return false;

        const widthPct = 8.33;
        const heightPct = 11.76;

        const rect1 = {
            left: targetPosX - widthPct / 2,
            right: targetPosX + widthPct / 2,
            top: targetPosY - heightPct / 2,
            bottom: targetPosY + heightPct / 2
        };

        for (const other of allTables) {
            if (other.id === tableId) continue;
            if (other.mesaPadreId === table.id || table.mesaPadreId === other.id) continue;

            const otherWidthPct = 8.33;
            const otherHeightPct = 11.76;

            const otherPosX = other.posX ?? 15;
            const otherPosY = other.posY ?? 25;

            const rect2 = {
                left: otherPosX - otherWidthPct / 2,
                right: otherPosX + otherWidthPct / 2,
                top: otherPosY - otherHeightPct / 2,
                bottom: otherPosY + otherHeightPct / 2
            };

            const overlapX = rect1.left < rect2.right && rect1.right > rect2.left;
            const overlapY = rect1.top < rect2.bottom && rect1.bottom > rect2.top;

            if (overlapX && overlapY) {
                return true;
            }
        }
        return false;
    };

    const handleToggleEditMode = async (enable) => {
        if (enable) {
            try {
                await fetch('/api/config/tables-edit-mode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled: true })
                });
                setIsEditMode(true);
                showToast("Modo Edición habilitado.", "success");
            } catch (e) {
                showToast("Error de conexión", "error");
            }
        } else {
            try {
                const positions = tablesState.map(t => ({
                    id: t.id,
                    posX: t.posX ?? 15,
                    posY: t.posY ?? 25
                }));

                const posRes = await fetch('/api/tables/positions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ positions })
                });

                if (posRes.ok) {
                    await fetch('/api/config/tables-edit-mode', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enabled: false })
                    });
                    setIsEditMode(false);
                    showToast("Posiciones guardadas y salón bloqueado.", "success");
                    fetchTables();
                } else {
                    const err = await posRes.json();
                    showToast("Error al guardar: " + err.error, "error");
                }
            } catch (e) {
                showToast("Error al guardar posiciones.", "error");
            }
        }
    };

    const handleResetPositions = async () => {
        if (!await showConfirmation("¿Desea continuar con restablecer la posición de todas las mesas?", { type: "warning" })) {
            return;
        }

        try {
            // Ordenar las mesas por número de forma ascendente
            const sortedTables = [...tablesState].sort((a, b) => parseInt(a.numero, 10) - parseInt(b.numero, 10));

            const xValues = [15, 32, 50, 68, 85];
            const positions = sortedTables.map((t, index) => {
                const cols = 5;
                const colIndex = index % cols;
                const rowIndex = Math.floor(index / cols);
                return {
                    id: t.id,
                    posX: xValues[colIndex],
                    posY: 25 + rowIndex * 25
                };
            });

            const posRes = await fetch('/api/tables/positions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ positions })
            });

            if (posRes.ok) {
                showToast("Posiciones de las mesas restablecidas con éxito", "success");
                fetchTables();
            } else {
                const err = await posRes.json();
                showToast("Error al restablecer posiciones: " + err.error, "error");
            }
        } catch (e) {
            showToast("Error de conexión al restablecer posiciones", "error");
        }
    };

    const handlePointerDown = (e, table) => {
        if (!isEditMode) return;
        if (e.button !== 0) return;
        e.preventDefault();

        setDraggingTableId(table.id);
        const card = e.currentTarget;
        const container = card.parentElement;
        const rect = container.getBoundingClientRect();

        const startX = e.clientX;
        const startY = e.clientY;
        const startPosX = table.posX ?? 15;
        const startPosY = table.posY ?? 25;

        let currentPosX = startPosX;
        let currentPosY = startPosY;

        const handlePointerMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            const deltaXPct = (deltaX / rect.width) * 100;
            const deltaYPct = (deltaY / rect.height) * 100;

            let newPosX = Math.max(5, Math.min(95, startPosX + deltaXPct));
            let newPosY = Math.max(5, Math.min(95, startPosY + deltaYPct));

            setTablesState(prev => prev.map(t => t.id === table.id ? { ...t, posX: newPosX, posY: newPosY } : t));
            currentPosX = newPosX;
            currentPosY = newPosY;
        };

        const handlePointerUp = () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            setDraggingTableId(null);

            const collides = checkCollisionClient(table.id, currentPosX, currentPosY, tablesState);
            if (collides) {
                showToast("Las mesas no pueden sobreponerse.", "error");
                setTablesState(prev => prev.map(t => t.id === table.id ? { ...t, posX: startPosX, posY: startPosY } : t));
            }
        };

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
    };

    const handleMerge = async (padreId, hijaId) => {
        // Encontrar la mesa padre actual y su comanda en el estado local de antemano
        const parentTable = tables.find(t => t.id === padreId);
        const activeComanda = parentTable?.comandas?.[0];

        try {
            const res = await fetch('/api/tables/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mesaPadreId: padreId, mesaHijaId: hijaId })
            });

            if (res.ok) {
                setShowMergeMode(false);
                closeModal();

                if (parentTable && parentTable.estado === 'ocupada' && activeComanda) {
                    setIsUpdatingDiners(true);
                    setUpdatingComandaId(activeComanda.id);

                    // Construimos la representación de mesa padre actualizada en memoria local para velocidad instantánea
                    const currentHijas = parentTable.mesasHijas || [];
                    const nuevaHija = tables.find(t => t.id === hijaId) || { id: hijaId, numero: '', capacidad: 6, estado: 'ocupada' };
                    const updatedParent = {
                        ...parentTable,
                        mesasHijas: [...currentHijas, nuevaHija]
                    };

                    setSelectedFreeTable(updatedParent);

                    const numMesas = 1 + updatedParent.mesasHijas.length;
                    const minLimit = numMesas === 1 ? 1 : (6 * (numMesas - 1) + 1);
                    const maxLimit = 6 * numMesas;

                    const rawComensales = activeComanda.comensales || 0;
                    const initialDiners = Math.min(maxLimit, Math.max(rawComensales, minLimit));

                    setDinersCount(initialDiners);
                    setShowDinersModal(true);
                } else {
                    showToast("Mesas unidas con éxito", "success");
                    fetchTables();
                }
            } else {
                const err = await res.json();
                showToast("Error: " + err.error, "error");
            }
        } catch (e) {
            showToast("Error de conexión", "error");
        }
    };

    const handleUnmerge = async (hijaId) => {
        if (!await showConfirmation("¿Estás seguro de que quieres separar esta mesa?", { type: "warning" })) return;
        try {
            const res = await fetch('/api/tables/unmerge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mesaHijaId: hijaId })
            });

            if (res.ok) {
                showToast("Mesas separadas con éxito", "success");
                closeModal();
                fetchTables();
            } else {
                const err = await res.json();
                showToast("Error: " + err.error, "error");
            }
        } catch (e) {
            showToast("Error de conexión", "error");
        }
    };

    const getTableDisplayName = (table) => {
        if (table.mesasHijas && table.mesasHijas.length > 0) {
            const hijasNumeros = table.mesasHijas.map(h => h.numero).join(' - ');
            return `${table.numero} - ${hijasNumeros}`;
        }
        return table.numero;
    };

    const getCombinedCapacity = (table) => {
        const hijasCapacidad = table.mesasHijas?.reduce((acc, h) => acc + h.capacidad, 0) || 0;
        return Math.min(18, table.capacidad + hijasCapacidad);
    };

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
        const numMesas = 1 + (table.mesasHijas?.length || 0);
        const minLimit = numMesas === 1 ? 1 : (6 * (numMesas - 1) + 1);
        setDinersCount(minLimit);
        setIsUpdatingDiners(false);
        setUpdatingComandaId(null);
        setShowDinersModal(true);
    };

    const confirmDiners = async () => {
        if (Number.isNaN(dinersCount) || dinersCount === null || dinersCount === '') {
            showToast("Cantidad de comensales no válida", 'error');
            return;
        }

        const numMesas = 1 + (selectedFreeTable?.mesasHijas?.length || 0);
        const minLimit = numMesas === 1 ? 1 : (6 * (numMesas - 1) + 1);
        const maxLimit = 6 * numMesas;

        if (dinersCount < minLimit) {
            showToast(`Mínimo ${minLimit} comensales para esta configuración de mesas`, 'info');
            return;
        }
        if (dinersCount > maxLimit) {
            showToast(`Límite de comensales excedido. Una mesa ${numMesas === 1 ? 'individual' : 'unida'} tiene un máximo de ${maxLimit} personas.`, 'warning');
            return;
        }

        if (isUpdatingDiners) {
            try {
                const res = await fetch(`/api/orders/${updatingComandaId}/comensales`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ comensales: dinersCount })
                });
                if (res.ok) {
                    showToast("Comensales actualizados con éxito", "success");
                    setShowDinersModal(false);
                    setIsUpdatingDiners(false);
                    setUpdatingComandaId(null);
                    fetchTables();
                } else {
                    const err = await res.json();
                    showToast("Error al actualizar comensales: " + err.error, "error");
                }
            } catch (e) {
                showToast("Error de conexión", "error");
            }
        } else {
            setShowDinersModal(false);
            navigate(`/order/${selectedFreeTable.id}`, { state: { comensales: dinersCount } });
        }
    };

    useEffect(() => {
        fetchTables(); // Fetch immediately on mount to bypass cache delay
        fetchEditMode();
        const interval = setInterval(() => {
            fetchTables();
            fetchEditMode();
        }, 1500); // Poll every 1.5 seconds (down from 3s)
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
        setShowMergeMode(false);
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
            await fetch(`/api/orders/details/${detailId}`, {
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

        const isTableMerged = selectedTable.mesasHijas && selectedTable.mesasHijas.length > 0;
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
                                Mesa {getTableDisplayName(selectedTable)} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {modalType === 'view' && (
                                <button
                                    className={`glass-button ${showTransferMode ? 'active' : ''}`}
                                    onClick={() => {
                                        if (isTableMerged) return;
                                        setShowTransferMode(!showTransferMode);
                                        setShowMergeMode(false);
                                    }}
                                    disabled={isTableMerged}
                                    style={{
                                        opacity: isTableMerged ? 0.35 : 1,
                                        cursor: isTableMerged ? 'not-allowed' : 'pointer'
                                    }}
                                    title={isTableMerged ? "No se puede trasladar una mesa unida" : "Trasladar mesa"}
                                >
                                    <ArrowRightLeft size={20} />
                                </button>
                            )}
                            {modalType === 'view' && (user?.rol === 'mozo' || user?.rol === 'admin') && (
                                <button
                                    className={`glass-button ${showMergeMode ? 'active' : ''}`}
                                    onClick={() => {
                                        setShowMergeMode(!showMergeMode);
                                        setShowTransferMode(false);
                                    }}
                                    title="Unir mesas"
                                    style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
                                >
                                    🔗 Unir
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
                        ) : showMergeMode ? (
                            <div style={{ textAlign: 'center' }}>
                                <h3>Selecciona la mesa libre a unir:</h3>
                                <p className="text-muted" style={{ marginBottom: 20 }}>
                                    Se unirá a la Mesa {selectedTable.numero}
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 }}>
                                    {tablesState
                                        .filter(t => t.estado === 'libre' && t.id !== selectedTable.id && !t.mesaPadreId)
                                        .map(t => (
                                            <button
                                                key={t.id}
                                                className="glass-button"
                                                style={{
                                                    border: '1px solid var(--success)', color: 'var(--success)',
                                                    height: 60, fontSize: '1.2rem', fontWeight: 'bold'
                                                }}
                                                onClick={() => handleMerge(selectedTable.id, t.id)}
                                            >
                                                {t.numero}
                                            </button>
                                        ))
                                    }
                                </div>
                                {tablesState.filter(t => t.estado === 'libre' && t.id !== selectedTable.id && !t.mesaPadreId).length === 0 && (
                                    <p className="text-muted">No hay mesas libres disponibles para unir.</p>
                                )}
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

                        {!showTransferMode && !showMergeMode && selectedTable.mesasHijas && selectedTable.mesasHijas.length > 0 && (
                            <div style={{ marginTop: 20, borderTop: '1px solid var(--glass-border)', paddingTop: 15 }}>
                                <h4 style={{ marginBottom: 10, color: 'var(--text-main)' }}>Mesas Unidas:</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {selectedTable.mesasHijas.map(hija => (
                                        <div key={hija.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 8 }}>
                                            <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Mesa {hija.numero}</span>
                                            {(user?.rol === 'mozo' || user?.rol === 'admin') && (
                                                <button
                                                    className="glass-button"
                                                    style={{ padding: '4px 10px', borderColor: '#ff4b4b', color: '#ff4b4b', height: 'auto', fontSize: '0.8rem' }}
                                                    onClick={() => handleUnmerge(hija.id)}
                                                >
                                                    Separar
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
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
                                        Imprimir Mesa {getTableDisplayName(selectedTable)} 🧾
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
                <div className="modal-content print-ticket" onClick={e => e.stopPropagation()} style={{ background: 'white', color: 'black', width: 350, fontFamily: '"Courier New", monospace', padding: 20 }}>
                    <div style={{ textAlign: 'center', marginBottom: 15, borderBottom: '1px dashed black', paddingBottom: 10 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>COMANDAGO</div>
                        <div>DEMO</div>
                        <div style={{ fontSize: '0.8rem' }}>Telf: 519123456789 / RUC: 10000000000</div>
                        <div style={{ fontSize: '0.8rem', marginTop: 5 }}>Fecha: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                    </div>

                    <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 10 }}>PRECUENTA</div>

                    <div style={{ fontSize: '0.9rem', marginBottom: 10 }}>
                        <div>Ambiente: Salon Principal</div>
                        <div>Mesa: {getTableDisplayName(selectedTable)}</div>
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

                    <div className="no-print" style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                        <button className="glass-button primary" onClick={() => window.print()} style={{ background: 'black', color: 'white' }}>
                            <Printer size={16} /> Imprimir
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderGlobalMergeModal = () => {
        if (!showGlobalMergeModal) return null;

        const freeTables = tablesState.filter(t => t.estado === 'libre' && !t.mesaPadreId);

        return (
            <div className="modal-overlay" onClick={() => { setShowGlobalMergeModal(false); setGlobalMergePadreId(null); setGlobalMergeHijaId(null); }}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
                    <div className="modal-header">
                        <h2 style={{ color: 'var(--text-main)' }}>🔗 Unir Mesas Libres</h2>
                        <button className="glass-button" style={{ padding: 5 }} onClick={() => { setShowGlobalMergeModal(false); setGlobalMergePadreId(null); setGlobalMergeHijaId(null); }}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: 'var(--text-main)' }}>1. Selecciona la Mesa Principal (Padre):</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 8 }}>
                                {freeTables.map(t => (
                                    <button
                                        key={t.id}
                                        className={`glass-button ${globalMergePadreId === t.id ? 'active' : ''}`}
                                        style={{
                                            height: 50,
                                            fontWeight: 'bold',
                                            borderColor: globalMergePadreId === t.id ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                            color: globalMergePadreId === t.id ? 'var(--primary)' : ''
                                        }}
                                        onClick={() => {
                                            setGlobalMergePadreId(t.id);
                                            if (globalMergeHijaId === t.id) setGlobalMergeHijaId(null);
                                        }}
                                    >
                                        {t.numero}
                                    </button>
                                ))}
                            </div>
                            {freeTables.length === 0 && <p className="text-muted">No hay mesas libres disponibles.</p>}
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: 'var(--text-main)' }}>2. Selecciona la Mesa a acoplar (Hija):</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 8 }}>
                                {freeTables
                                    .filter(t => t.id !== globalMergePadreId)
                                    .map(t => (
                                        <button
                                            key={t.id}
                                            className={`glass-button ${globalMergeHijaId === t.id ? 'active' : ''}`}
                                            style={{
                                                height: 50,
                                                fontWeight: 'bold',
                                                borderColor: globalMergeHijaId === t.id ? 'var(--success)' : 'rgba(255,255,255,0.1)',
                                                color: globalMergeHijaId === t.id ? 'var(--success)' : ''
                                            }}
                                            onClick={() => setGlobalMergeHijaId(t.id)}
                                        >
                                            {t.numero}
                                        </button>
                                    ))}
                            </div>
                            {!globalMergePadreId && <p className="text-muted">Selecciona primero la mesa principal.</p>}
                            {globalMergePadreId && freeTables.filter(t => t.id !== globalMergePadreId).length === 0 && (
                                <p className="text-muted">No hay otras mesas libres.</p>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                        <button className="glass-button" onClick={() => { setShowGlobalMergeModal(false); setGlobalMergePadreId(null); setGlobalMergeHijaId(null); }}>
                            Cancelar
                        </button>
                        <button
                            className="glass-button primary"
                            disabled={!globalMergePadreId || !globalMergeHijaId}
                            onClick={() => {
                                handleMerge(globalMergePadreId, globalMergeHijaId);
                                setShowGlobalMergeModal(false);
                                setGlobalMergePadreId(null);
                                setGlobalMergeHijaId(null);
                            }}
                        >
                            Confirmar Unión
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 className="high-end-title" style={{ margin: 0 }}>Salón Principal</h1>
                {(user?.rol === 'admin' || user?.rol === 'mozo') && (
                    <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                        <button
                            className="glass-button"
                            onClick={() => setShowGlobalMergeModal(true)}
                            style={{
                                borderColor: 'var(--success)',
                                color: 'var(--success)',
                                fontWeight: 'bold'
                            }}
                        >
                            🔗 Unir Mesas
                        </button>

                        <div
                            className="glass-button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '7px 5px 7px 22px',
                                cursor: 'default',
                                borderColor: isEditMode ? 'var(--success)' : 'rgba(255,255,255,0.15)',
                                color: isEditMode ? 'var(--success)' : 'var(--text-main)',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isEditMode}
                                    onChange={(e) => handleToggleEditMode(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="group peer ring-0 bg-rose-500 rounded-full outline-none duration-300 after:duration-300 w-10 h-6 shadow-md peer-checked:bg-emerald-500 peer-focus:outline-none after:content-[''] after:rounded-full after:absolute after:bg-gray-50 after:outline-none after:h-4 after:w-4 after:top-1 after:left-1 after:flex after:justify-center after:items-center peer-checked:after:translate-x-4 peer-hover:after:scale-95">
                                    <svg className="absolute top-1 left-5 stroke-gray-900 w-4 h-4" height="16" preserveAspectRatio="xMidYMid meet" viewBox="0 0 100 100" width="16" x="0" xmlns="http://www.w3.org/2000/svg" y="0">
                                        <path d="M30,46V38a20,20,0,0,1,40,0v8a8,8,0,0,1,8,8V74a8,8,0,0,1-8,8H30a8,8,0,0,1-8-8V54A8,8,0,0,1,30,46Zm32-8v8H38V38a12,12,0,0,1,24,0Z" fill-rule="evenodd"></path>
                                    </svg>
                                    <svg className="absolute top-1 left-1 stroke-gray-900 w-4 h-4" height="16" preserveAspectRatio="xMidYMid meet" viewBox="0 0 100 100" width="16" x="0" xmlns="http://www.w3.org/2000/svg" y="0">
                                        <path className="svg-fill-primary" d="M50,18A19.9,19.9,0,0,0,30,38v8a8,8,0,0,0-8,8V74a8,8,0,0,0,8,8H70a8,8,0,0,0,8-8V54a8,8,0,0,0-8-8H38V38a12,12,0,0,1,23.6-3,4,4,0,1,0,7.8-2A20.1,20.1,0,0,0,50,18Z"></path>
                                    </svg>
                                </div>
                            </label>

                            <div className="relative w-24 h-5 select-none text-left" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                                <span
                                    className={`absolute left-0 top-0 text-sm font-bold transition-all duration-500 transform ${isEditMode ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}
                                    style={{ color: 'var(--success)' }}
                                >
                                    Modo Edición
                                </span>
                                <span
                                    className={`absolute left-0 top-0 text-sm font-bold transition-all duration-500 transform ${!isEditMode ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}
                                    style={{ color: 'var(--warning)' }}
                                >
                                    Bloqueado
                                </span>
                            </div>
                        </div>

                        {/* Botón de Reset de Posición */}
                        <button
                            onClick={handleResetPositions}
                            className="group flex items-center justify-center p-2 rounded-lg bg-gray-950/40 border border-gray-900 hover:border-gray-800 transition-all duration-200"
                            title="Restablecer posición de todas las mesas"
                            style={{ height: 40, width: 40 }}
                        >
                            <RotateCcw
                                className="text-gray-400 group-hover:text-white group-hover:-rotate-180 transition-transform duration-500 ease-out"
                                size={16}
                            />
                        </button>
                    </div>
                )}
            </div>
            <div className="salon-contenedor">
                {tablesState.length === 0 && <p className="text-muted" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', padding: '2rem' }}>No hay datos registrados o cargando...</p>}
                {tablesState.map(table => {
                    const debaBloquear = table.estado === 'libre' && !isCajaAbierta;
                    const isDaughter = table.mesaPadreId !== null;
                    const padreMesa = isDaughter ? tablesState.find(t => t.id === table.mesaPadreId) : null;
                    const badgeText = padreMesa ? `→ Mesa ${padreMesa.numero}` : 'Unida';

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

                    let claseNeon = isDaughter
                        ? 'mesa-unida-dashed'
                        : (debaBloquear ? 'mesa-apagada' : (table.estado === 'ocupada' ? 'mesa-ocupada-neon' : 'mesa-libre-neon'));

                    let finalTop = table.posY !== undefined && table.posY !== null ? table.posY : 25;
                    finalTop -= 10; // Aplicado a TODAS las mesas para mantener alineación

                    return (
                        <div
                            key={table.id}
                            className={`mesa-mapa ${claseNeon}`}
                            onPointerDown={(e) => handlePointerDown(e, table)}
                            onClick={() => {
                                if (isEditMode) return;
                                if (isDaughter) {
                                    showToast(`Esta mesa está unida a la Mesa ${padreMesa ? padreMesa.numero : ''}. Realice el pedido en ella.`, "info");
                                    return;
                                }
                                handleTableClick(table);
                            }}
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
                                zIndex: draggingTableId === table.id ? 100 : (table.estado === 'ocupada' ? 35 : 20),

                                transition: draggingTableId === table.id ? 'none' : 'all 0.15s ease',
                                boxShadow: isDaughter ? 'none' : (debaBloquear
                                    ? 'var(--mesa-shadow-apagada, none)'
                                    : (table.estado === 'ocupada' ? 'var(--mesa-shadow-ocupada, 0 0 25px rgba(255, 234, 0, 0.35))' : 'var(--mesa-shadow-libre, 0 0 15px rgba(0, 255, 136, 0.15))')),
                                border: isDaughter
                                    ? '1px dashed rgba(255, 255, 255, 0.3)'
                                    : (debaBloquear
                                        ? '1px solid var(--mesa-border-apagada, rgba(75, 85, 99, 0.4))'
                                        : (table.estado === 'ocupada' ? '1px solid var(--mesa-border-ocupada, #ffea00)' : '1px solid var(--mesa-border-libre, #00ff88)')),
                                opacity: isDaughter ? 0.5 : (debaBloquear ? 0.4 : 1),
                                cursor: isEditMode ? 'move' : (isDaughter || debaBloquear ? 'not-allowed' : 'pointer')
                            }}
                        >
                            {/* 🛡️ Renderizado Geométrico de Sillas Dinámicas alrededor de la mesa */}
                            {(() => {
                                const count = table.estado === 'ocupada' ? totalComensales : getCombinedCapacity(table);
                                const chairColor = isDaughter ? '#9ca3af' : (debaBloquear ? '#9ca3af' : (table.estado === 'ocupada' ? '#ffea00' : '#00ff88'));

                                if (!count || count <= 0) return null;

                                return (
                                    <div className="sillas-container" style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none' }}>
                                        {Array.from({ length: count }).map((_, index) => {
                                            // Calcular el ángulo de distribución matemática radial para colocar cada silla simétricamente
                                            const angle = (index * (360 / count)) * (Math.PI / 180);
                                            const radius = count > 6 ? 66 : 62; // Distancia ajustada para la mesa
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
                                                        boxShadow: (debaBloquear || isDaughter) ? 'none' : `0 0 8px ${chairColor}`,
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
                                {getTableDisplayName(table)}
                            </div>
                            <div className="badge-estado" style={{
                                fontSize: '0.65rem',
                                letterSpacing: 1,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: isDaughter ? 'rgba(255,255,255,0.05)' : (debaBloquear ? 'var(--badge-bg-cerrada, transparent)' : (table.estado === 'ocupada' ? 'var(--badge-bg-ocupada, transparent)' : 'var(--badge-bg-libre, transparent)')),
                                color: isDaughter ? '#9ca3af' : (debaBloquear ? 'var(--badge-text-cerrada, #9ca3af)' : (table.estado === 'ocupada' ? 'var(--badge-text-ocupada, #ffea00)' : 'var(--badge-text-libre, #00ff88)')),
                                fontWeight: 'bold'
                            }}>
                                {isDaughter ? badgeText : (debaBloquear ? 'CERRADA' : (table.estado === 'ocupada' ? 'OCUPADA' : 'LIBRE'))}
                            </div>

                            <div style={{
                                fontSize: '0.65rem',
                                marginTop: 3,
                                color: 'var(--text-main, #fff)',
                                background: 'var(--item-hover, rgba(255,255,255,0.1))',
                                padding: '2px 6px',
                                borderRadius: 10,
                                visibility: (!isDaughter && table.estado !== 'libre' && table.comandas?.[0]?.usuario) ? 'visible' : 'hidden'
                            }}>
                                🤵 {(!isDaughter && table.estado !== 'libre' && table.comandas?.[0]?.usuario) ? table.comandas[0].usuario.nombre.split(' ')[0] : 'Vacio'}
                            </div>

                            {!isDaughter && table.estado !== 'libre' && !isEditMode && (
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
            {renderGlobalMergeModal()}
            {/* Diners Modal */}
            {/* Diners Modal */}
            {showDinersModal && (() => {
                const numMesas = 1 + (selectedFreeTable?.mesasHijas?.length || 0);
                const minLimit = numMesas === 1 ? 1 : (6 * (numMesas - 1) + 1);
                const maxLimit = 6 * numMesas;
                const isMinDisabled = dinersCount <= minLimit;
                const isMaxDisabled = dinersCount >= maxLimit;

                return (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: 400, textAlign: 'center' }}>
                            <h2>Mesa {getTableDisplayName(selectedFreeTable || {})}</h2>
                            <p className="text-muted" style={{ marginBottom: 5 }}>Ingrese cantidad de comensales</p>
                            <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 15 }}>
                                Rango permitido: {minLimit} - {maxLimit} comensales ({numMesas} {numMesas === 1 ? 'mesa' : 'mesas unidas'})
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, margin: '20px 0' }}>
                                <button
                                    className="glass-button"
                                    onClick={() => !isMinDisabled && setDinersCount(dinersCount - 1)}
                                    disabled={isMinDisabled}
                                    style={{
                                        width: 55,
                                        height: 55,
                                        borderRadius: '50%',
                                        opacity: isMinDisabled ? 0.35 : 1,
                                        cursor: isMinDisabled ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: isMinDisabled ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'
                                    }}
                                >
                                    <Minus />
                                </button>
                                <span style={{ fontSize: '3.5rem', fontWeight: 'bold', minWidth: '80px', display: 'inline-block' }}>{dinersCount}</span>
                                <button
                                    className="glass-button"
                                    onClick={() => !isMaxDisabled && setDinersCount(dinersCount + 1)}
                                    disabled={isMaxDisabled}
                                    style={{
                                        width: 55,
                                        height: 55,
                                        borderRadius: '50%',
                                        opacity: isMaxDisabled ? 0.35 : 1,
                                        cursor: isMaxDisabled ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: isMaxDisabled ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'
                                    }}
                                >
                                    <Plus />
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                <button className="glass-button" onClick={() => {
                                    setShowDinersModal(false);
                                    setIsUpdatingDiners(false);
                                    setUpdatingComandaId(null);
                                }} style={{ flex: 1 }}>Cancelar</button>
                                <button className="glass-button primary" onClick={confirmDiners} style={{ flex: 1 }}>Continuar</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default TablesView;
