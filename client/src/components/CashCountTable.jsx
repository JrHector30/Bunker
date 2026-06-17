import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import { MoreVertical, FileText, X, AlertCircle, Trash, Download, Calendar as CalendarIcon, Eye, EyeOff, PlusCircle, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCache } from '../hooks/useCache';
import { useCaja } from '../context/CajaContext';
import { format } from 'date-fns';
import { DropdownRangeDatePicker } from './DropdownRangeDatePicker';
import SmoothDropdown from './ui/SmoothDropdown';

const CashCountTable = ({ onStatusChange }) => {
    const { showConfirmation } = useConfirmation();
    const { showToast } = useNotification();
    const { refreshCajaStatus } = useCaja();
    const [filterDateRange, setFilterDateRange] = useState(undefined);
    const [currentPage, setCurrentPage] = useState(1);

    // Manual Cash Movement Modal & Expandable details states
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [expandedDig, setExpandedDig] = useState({});
    const [expandedTarj, setExpandedTarj] = useState({});

    // Summary Modal States
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [summaryData, setSummaryData] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    // Paloteo States
    const [paloteoData, setPaloteoData] = useState(null);
    const [loadingPaloteo, setLoadingPaloteo] = useState(false);

    const handleOpenSummaryModal = async (targetId = null) => {
        let actualId = targetId;
        if (!actualId) {
            if (filterDateRange?.from && history?.data?.length > 0) {
                actualId = history.data[0].id;
            } else if (currentStatus) {
                actualId = currentStatus.id;
            }
        }

        if (!actualId) {
            showToast("No hay datos de arqueo disponibles.", 'error');
            return;
        }

        setLoadingSummary(true);
        setShowSummaryModal(true);
        try {
            const res = await fetch(`/api/cashier/arqueo/${actualId}`);
            if (res.ok) {
                const data = await res.json();
                setSummaryData(data);
            } else {
                showToast("Error al obtener el resumen de caja.", 'error');
                setShowSummaryModal(false);
            }
        } catch (err) {
            showToast("Error de conexión al obtener el resumen.", 'error');
            setShowSummaryModal(false);
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleOpenPaloteo = async (targetId = null) => {
        let actualId = targetId;
        if (!actualId) {
            if (filterDateRange?.from && history?.data?.length > 0) {
                actualId = history.data[0].id;
            } else if (currentStatus) {
                actualId = currentStatus.id;
            }
        }

        if (!actualId) {
            showToast("No hay datos de arqueo disponibles.", 'error');
            return;
        }

        setLoadingPaloteo(true);
        setPaloteoOpen(true);
        try {
            const res = await fetch(`/api/cashier/arqueo/${actualId}`);
            if (res.ok) {
                const data = await res.json();
                setPaloteoData(data);
            } else {
                showToast("Error al obtener los detalles del paloteo.", 'error');
                setPaloteoOpen(false);
            }
        } catch (err) {
            showToast("Error de conexión al obtener los detalles.", 'error');
            setPaloteoOpen(false);
        } finally {
            setLoadingPaloteo(false);
        }
    };

    const handleRowAction = (actionId, targetId) => {
        if (actionId === 'paloteo') {
            handleOpenPaloteo(targetId);
        } else if (actionId === 'resumen') {
            handleOpenSummaryModal(targetId);
        } else if (actionId === 'pdf') {
            generatePDF(targetId);
        }
    };

    // Modal Form States
    const [movTipo, setMovTipo] = useState('EGRESO');
    const [movComprobante, setMovComprobante] = useState('recibo');
    const [movConcepto, setMovConcepto] = useState('');
    const [movObservacion, setMovObservacion] = useState('');
    const [movMonto, setMovMonto] = useState('');
    const [movError, setMovError] = useState('');
    const [isSavingMov, setIsSavingMov] = useState(false);

    const handleSaveMovement = async (e) => {
        e.preventDefault();
        setMovError('');

        const numericMonto = parseFloat(movMonto);
        if (Number.isNaN(numericMonto) || numericMonto <= 0) {
            setMovError('El monto debe ser un número positivo.');
            return;
        }

        if (!movConcepto.trim()) {
            setMovError('El concepto es obligatorio.');
            return;
        }

        // Limit validation for egresos
        if (movTipo === 'EGRESO') {
            const currentTotalCaja = currentStatus?.totalCaja || 0;
            if (numericMonto > currentTotalCaja) {
                setMovError(`Monto de egreso supera el efectivo disponible en caja (S/. ${currentTotalCaja.toFixed(2)})`);
                return;
            }
        }

        setIsSavingMov(true);
        try {
            const res = await fetch('/api/cashier/movimientos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: movTipo,
                    tipoComprobante: movComprobante,
                    concepto: movConcepto,
                    observacion: movObservacion,
                    monto: numericMonto
                })
            });

            if (res.ok) {
                showToast('Movimiento registrado con éxito.', 'success');
                setShowMovementModal(false);
                // Reset form
                setMovConcepto('');
                setMovObservacion('');
                setMovMonto('');
                // Refresh data
                fetchStatus();
                fetchHistory();
            } else {
                const data = await res.json();
                setMovError(data.error || 'Error al registrar el movimiento.');
            }
        } catch (err) {
            setMovError('Error de conexión con el servidor.');
        } finally {
            setIsSavingMov(false);
        }
    };

    const statusFetcher = useCallback(
        () => fetch('/api/cashier/balance').then(res => res.json()),
        []
    );
    const { data: currentStatus, mutate: fetchStatus } = useCache('cashier_balance', statusFetcher, null);

    useEffect(() => {
        if (currentStatus && onStatusChange) {
            onStatusChange(currentStatus.estado);
        }
    }, [currentStatus]);

    const historyFetcher = useCallback(() => {
        let url = `/api/cashier/history?page=${currentPage}&limit=5`;
        if (filterDateRange?.from) {
            const startStr = format(filterDateRange.from, 'yyyy-MM-dd');
            if (filterDateRange.to) {
                const endStr = format(filterDateRange.to, 'yyyy-MM-dd');
                url += `&startDate=${startStr}&endDate=${endStr}`;
            } else {
                url += `&startDate=${startStr}&endDate=${startStr}`;
            }
        }
        return fetch(url).then(res => res.json());
    }, [currentPage, filterDateRange]);

    const historyKey = React.useMemo(() => {
        if (!filterDateRange?.from) return `cashier_history_${currentPage}_none`;
        const startStr = format(filterDateRange.from, 'yyyy-MM-dd');
        const endStr = filterDateRange.to ? format(filterDateRange.to, 'yyyy-MM-dd') : '';
        return `cashier_history_${currentPage}_${startStr}_${endStr}`;
    }, [currentPage, filterDateRange]);

    const { data: history, loading: historyLoading, mutate: fetchHistory } = useCache(
        historyKey,
        historyFetcher,
        { data: [], meta: { page: 1, totalPages: 1 } }
    );

    // UI State
    const [menuOpen, setMenuOpen] = useState(false);
    const [paloteoOpen, setPaloteoOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showInitialAmountModal, setShowInitialAmountModal] = useState(false);
    const [initialAmount, setInitialAmount] = useState('');
    const [formError, setFormError] = useState(null);

    const statusIntervalRef = useRef(null);
    useEffect(() => {
        statusIntervalRef.current = fetchStatus;
    });

    useEffect(() => {
        // Poll estado cada 10 segundos
        const interval = setInterval(() => {
            statusIntervalRef.current?.();
        }, 10000);

        const handleRefresh = () => {
            fetchStatus();
            fetchHistory();
        };
        window.addEventListener('refreshCashCount', handleRefresh);

        return () => {
            clearInterval(interval);
            window.removeEventListener('refreshCashCount', handleRefresh);
        };
    }, [fetchStatus, fetchHistory]);

    // Handle Shift Toggle
    const handleToggleShift = async () => {
        if (!currentStatus) return;

        if (currentStatus.estado === 'abierto') {
            if (!await showConfirmation("¿Estás seguro de cerrar caja? Asegúrate de que no haya cuentas pendientes.", { type: 'danger' })) return;
            executeToggle(0);
        } else {
            setInitialAmount('');
            setFormError(null);
            setShowInitialAmountModal(true);
        }
    };

    const confirmOpenShift = async (e) => {
        e.preventDefault();
        if (Number.isNaN(initialAmount) || initialAmount === null || initialAmount === '') {
            setFormError("Monto inicial no válido.");
            return;
        }
        executeToggle(Number(initialAmount));
    };

    const executeToggle = (montoInicial) => {
        fetch('/api/cashier/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ montoInicial })
        })
            .then(async res => {
                const body = await res.json();
                if (!res.ok) throw new Error(body.error || "Error al cambiar estado");
                return body;
            })
            .then(async () => {
                fetchStatus();
                setCurrentPage(1);
                fetchHistory();
                setShowInitialAmountModal(false);
                await refreshCajaStatus();
            })
            .catch(err => showToast(err.message, 'error'));
    };

    // Date Formatter
    const formatDate = (dateString, includeTime = true) => {
        if (!dateString) return "--:--";
        const d = new Date(dateString);
        return d.toLocaleString('es-PE', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            ...(includeTime ? { hour: '2-digit', minute: '2-digit', second: '2-digit' } : {}),
            hour12: false
        }).replace(',', '');
    };

    // PDF GENERATION LOGIC
    const generatePDF = async (targetId = null) => {
        let actualId = targetId;

        // Si hay una fecha filtrada y resultados en el historial, tomamos el primero de esa fecha
        if (!actualId) {
            if (filterDateRange?.from && history?.data?.length > 0) {
                actualId = history.data[0].id;
            } else if (currentStatus) {
                actualId = currentStatus.id;
            }
        }

        if (!actualId) {
            showToast("No hay datos de arqueo disponibles para descargar.", 'error');
            return;
        }

        setIsGenerating(true);

        try {
            const res = await fetch(`/api/cashier/arqueo/${actualId}`);
            const fullData = await res.json();

            const doc = new jsPDF();
            doc.setFont("helvetica");

            // HEADER
            doc.setFontSize(22);
            doc.setTextColor(13, 110, 253); // ComandaGo Blue
            doc.setFont("helvetica", "bold");
            doc.text("ComandaGo", 14, 20);

            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            doc.text("Reporte: Arqueo de Caja", 14, 28);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.setFont("helvetica", "normal");

            const reportDate = filterDateRange?.from
                ? (filterDateRange.to
                    ? `${format(filterDateRange.from, 'dd-MM-yyyy')} a ${format(filterDateRange.to, 'dd-MM-yyyy')}`
                    : format(filterDateRange.from, 'dd-MM-yyyy'))
                : formatDate(new Date().toISOString(), false);
            doc.text(`Fecha del Turno: ${reportDate}`, 14, 35);
            doc.text(`Turno ID: #${fullData.id} - Estado: ${fullData.estado.toUpperCase()}`, 14, 40);
            doc.text(`Usuario: ${fullData.usuario?.nombre || 'Administrador'}`, 14, 45);

            // FINANCIAL SUMMARY (Grid)
            let startY = 50;
            doc.setFillColor(248, 249, 250);
            doc.setDrawColor(220, 220, 220);
            doc.rect(14, startY, 180, 22, 'FD');

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text("Total Ventas", 20, startY + 8);
            doc.text("Total Propinas", 80, startY + 8);
            doc.text("Saldo Final (Caja)", 140, startY + 8);

            const saldoFinal = fullData.totalCaja || 0;

            doc.setFontSize(12);
            doc.setTextColor(40, 40, 40);
            doc.setFont("helvetica", "bold");
            doc.text(`S/. ${(fullData.totalBruto || 0).toFixed(2)}`, 20, startY + 16);
            doc.text(`S/. ${(fullData.totalPropinas || 0).toFixed(2)}`, 80, startY + 16);
            doc.text(`S/. ${(saldoFinal || 0).toFixed(2)}`, 140, startY + 16);

            doc.setFont("helvetica", "normal");

            const formatTime = (dateStr) => {
                if (!dateStr) return '-';
                const d = new Date(dateStr);
                return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
            };

            // 1. FLOW HISTORY TABLE
            let currentY = startY + 30;
            doc.setFontSize(12);
            doc.setTextColor(13, 110, 253);
            doc.setFont("helvetica", "bold");
            doc.text("Historial de Flujo de Caja (Inicio)", 14, currentY);

            const flowHistoryRows = [];
            flowHistoryRows.push([
                formatTime(fullData.fechaInicio),
                'Monto Inicial de Apertura',
                '-',
                `S/. ${fullData.montoInicial.toFixed(2)}`
            ]);

            // Combine movements and calculate running starts
            const sortedMovements = [...(fullData.movimientos || [])].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
            let runningStart = fullData.montoInicial;

            sortedMovements.forEach(m => {
                if (m.tipo === 'INGRESO') {
                    runningStart += m.monto;
                    flowHistoryRows.push([
                        formatTime(m.fecha),
                        `Ingreso: ${m.concepto}`,
                        `▲ S/. ${m.monto.toFixed(2)}`,
                        `S/. ${runningStart.toFixed(2)}`
                    ]);
                } else if (m.tipo === 'EGRESO') {
                    runningStart -= m.monto;
                    flowHistoryRows.push([
                        formatTime(m.fecha),
                        `Egreso: ${m.concepto}`,
                        `▼ S/. ${m.monto.toFixed(2)}`,
                        `S/. ${runningStart.toFixed(2)}`
                    ]);
                }
            });

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Hora', 'Descripción', 'Afectación', 'Saldo de Inicio']],
                body: flowHistoryRows,
                theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
                styles: { font: 'helvetica', fontSize: 9 },
                columnStyles: {
                    2: { halign: 'center' },
                    3: { halign: 'right' }
                },
                didParseCell: function (data) {
                    if (data.section === 'body' && data.column.index === 2) {
                        const val = data.cell.raw;
                        if (val.startsWith('▲')) {
                            data.cell.styles.textColor = [40, 167, 69]; // green
                        } else if (val.startsWith('▼')) {
                            data.cell.styles.textColor = [220, 53, 69]; // red
                        }
                    }
                }
            });

            // 2. INGRESOS TABLE
            currentY = doc.lastAutoTable.finalY + 15;
            doc.setFontSize(12);
            doc.setTextColor(13, 110, 253);
            doc.setFont("helvetica", "bold");
            doc.text("Ingresos Registrados", 14, currentY);

            const ingresosList = [];

            // Add sales from comandas
            (fullData.ventas || []).forEach(v => {
                ingresosList.push({
                    fecha: v.hora,
                    hora: formatTime(v.hora),
                    comprobante: (v.doc || 'ticket').toUpperCase(),
                    concepto: `Venta Mesa ${v.mesa}`,
                    observacion: `Pago: ${(v.metodo || 'EFECTIVO').toUpperCase()}${v.propina > 0 ? ` + Propina S/. ${v.propina.toFixed(2)}` : ''}`,
                    monto: `S/. ${(v.total || 0).toFixed(2)}`
                });
            });

            // Add manual incomes
            (fullData.movimientos || []).filter(m => m.tipo === 'INGRESO').forEach(m => {
                ingresosList.push({
                    fecha: m.fecha,
                    hora: formatTime(m.fecha),
                    comprobante: m.tipoComprobante.toUpperCase(),
                    concepto: m.concepto,
                    observacion: `Manual${m.observacion ? `: ${m.observacion}` : ''}`,
                    monto: `S/. ${(m.monto || 0).toFixed(2)}`
                });
            });

            // Sort chronologically
            ingresosList.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

            const ingresosRows = ingresosList.length > 0
                ? ingresosList.map(i => [i.hora, i.comprobante, i.concepto, i.observacion, i.monto])
                : [["-", "-", "Sin ingresos en este turno", "-", "-"]];

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Hora', 'Comprobante', 'Concepto', 'Observación', 'Monto']],
                body: ingresosRows,
                theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
                styles: { font: 'helvetica', fontSize: 9 },
                columnStyles: {
                    4: { halign: 'right' }
                }
            });

            // 3. EGRESOS TABLE
            currentY = doc.lastAutoTable.finalY + 15;
            doc.setFontSize(12);
            doc.setTextColor(13, 110, 253);
            doc.setFont("helvetica", "bold");
            doc.text("Egresos Registrados", 14, currentY);

            const egresosList = (fullData.movimientos || []).filter(m => m.tipo === 'EGRESO');
            egresosList.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

            const egresosRows = egresosList.length > 0
                ? egresosList.map(e => [
                    formatTime(e.fecha),
                    e.tipoComprobante.toUpperCase(),
                    e.concepto,
                    e.observacion || '-',
                    `S/. ${(e.monto || 0).toFixed(2)}`
                ])
                : [["-", "-", "Sin egresos en este turno", "-", "-"]];

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Hora', 'Comprobante', 'Concepto', 'Observación', 'Monto']],
                body: egresosRows,
                theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
                styles: { font: 'helvetica', fontSize: 9 },
                columnStyles: {
                    4: { halign: 'right' }
                }
            });

            // 4. PROPINAS
            currentY = doc.lastAutoTable.finalY + 15;
            doc.setFontSize(12);
            doc.setTextColor(13, 110, 253);
            doc.setFont("helvetica", "bold");
            doc.text("Desglose de Propinas", 14, currentY);

            if (fullData.propinasPorMozo && fullData.propinasPorMozo.length > 0) {
                const propinasRows = fullData.propinasPorMozo.map(m => [
                    m.nombre,
                    `S/. ${(m.propinas || 0).toFixed(2)}`
                ]);

                autoTable(doc, {
                    startY: currentY + 5,
                    head: [['Mozo', 'Total Propinas']],
                    body: propinasRows,
                    theme: 'grid',
                    headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
                    styles: { font: 'helvetica', fontSize: 9 },
                });

                currentY = doc.lastAutoTable.finalY + 10;
                doc.setFontSize(11);
                doc.setTextColor(40, 40, 40);
                doc.setFont("helvetica", "bold");
                doc.text(`Total Propinas Recaudadas: S/. ${(fullData.totalPropinas || 0).toFixed(2)}`, 14, currentY);
            } else {
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.setFont("helvetica", "normal");
                doc.text("No se registraron propinas en este turno.", 14, currentY + 8);
            }

            // Save
            const dateStr = new Date().toISOString().split('T')[0];
            doc.save(`Arqueo_Caja_${dateStr}.pdf`);

        } catch (e) {
            console.error(e);
            showToast("Error generando PDF", 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    // Paloteo Modal
    const PaloteoModal = () => {
        if (!paloteoOpen) return null;

        if (loadingPaloteo) {
            return (
                <div className="modal-overlay" onClick={() => setPaloteoOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, textAlign: 'center', padding: '40px 20px' }}>
                        Cargando Paloteo...
                    </div>
                </div>
            );
        }

        if (!paloteoData) return null;
        const data = paloteoData;
        const productCounts = {};
        if (data.ventas) {
            data.ventas.forEach(v => {
                v.items.forEach(item => {
                    productCounts[item.descripcion] = (productCounts[item.descripcion] || 0) + item.cantidad;
                });
            });
        }

        return (
            <div className="modal-overlay" onClick={() => setPaloteoOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                    <div className="modal-header">
                        <h2>Resumen / Paloteo</h2>
                        <button className="glass-button" onClick={() => setPaloteoOpen(false)}><X size={18} /></button>
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        <table style={{ width: '100%' }}>
                            <thead>
                                <tr style={{ textAlign: 'left' }}>
                                    <th>Producto</th>
                                    <th style={{ textAlign: 'center' }}>Cantidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(productCounts).length === 0 ? (
                                    <tr><td colSpan="2" className="text-center text-muted">No hay ventas registradas</td></tr>
                                ) : (
                                    Object.entries(productCounts).map(([name, count]) => (
                                        <tr key={name} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '8px 0' }}>{name}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{count}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="glass-panel" style={{ padding: 20, marginBottom: 20, overflow: 'visible' }}>

            {/* Header: Title + Toggle Button + Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, position: 'relative', zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <h2 style={{ margin: 0 }}>Arqueo de Caja</h2>
                    {currentStatus && (
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={handleToggleShift}
                                style={{
                                    backgroundColor: currentStatus.estado === 'abierto' ? '#28a745' : '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    padding: '5px 15px',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.9em',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                }}
                            >
                                {currentStatus.estado === 'abierto' ? 'OPEN' : 'CLOSED'}
                            </button>

                            {/* Reset Button */}
                            {/*<button
                                onClick={async () => {
                                    if (!await showConfirmation("⚠️ ¿ESTÁS SEGURO?\n\nEsto eliminará TODO el historial de ventas y reiniciará los contadores a 1.\n\nÚsalo solo para limpiar datos de prueba.", { type: 'danger' })) return;

                                    try {
                                        const res = await fetch('/api/admin/reset-simulation', { method: 'DELETE' });
                                        if (res.ok) {
                                            showToast("Simulación reiniciada correctamente.", 'success');
                                            fetchStatus();
                                            fetchHistory();
                                        } else {
                                            const err = await res.json();
                                            showToast("Error: " + err.error, 'error');
                                        }
                                    } catch (e) {
                                        showToast("Error de conexión", 'error');
                                    }
                                }}
                                className="glass-button"
                                style={{
                                    borderColor: '#dc3545',
                                    color: '#dc3545',
                                    padding: '5px 10px'
                                }}
                                title="Limpiar Historial de Simulación"
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Trash size={14} /> Limpiar
                                </span>
                            </button>*/}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {/* MOVIMIENTO REGISTRATION BUTTON */}
                    <button
                        type="button"
                        className="glass-button primary"
                        disabled={!currentStatus || currentStatus.estado !== 'abierto'}
                        onClick={() => {
                            if (!currentStatus || currentStatus.estado !== 'abierto') {
                                showToast("Debe abrir caja antes de registrar un movimiento.", "error");
                                return;
                            }
                            setMovTipo('EGRESO');
                            setMovComprobante('recibo');
                            setMovConcepto('');
                            setMovObservacion('');
                            setMovMonto('');
                            setMovError('');
                            setShowMovementModal(true);
                        }}
                        title={currentStatus && currentStatus.estado === 'abierto' ? "Registrar Movimiento" : "Abra caja para registrar movimientos"}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            background: currentStatus && currentStatus.estado === 'abierto' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: currentStatus && currentStatus.estado === 'abierto' ? 'black' : 'var(--text-muted)',
                            fontWeight: 'bold',
                            opacity: currentStatus && currentStatus.estado === 'abierto' ? 1 : 0.5,
                            cursor: currentStatus && currentStatus.estado === 'abierto' ? 'pointer' : 'not-allowed'
                        }}
                    >
                        <PlusCircle size={16} /> Movimiento
                    </button>

                    {/* PDF DOWNLOAD BUTTON */}
                    <button
                        className="glass-button"
                        onClick={() => generatePDF(null)}
                        disabled={isGenerating}
                        title="Descargar Reporte Actual"
                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                        <Download size={18} />
                        {isGenerating ? '...' : ''}
                    </button>

                    <DropdownRangeDatePicker
                        mode="range"
                        value={filterDateRange}
                        onChange={(range) => {
                            setFilterDateRange(range);
                            setCurrentPage(1);
                        }}
                        placeholder="Filtrar por Fecha"
                    />
                    {/* Refresh auto-handled */}
                </div>
            </div>

            {/* Table: History List */}
            <div className="table-responsive" style={{ minHeight: 150 }}>
                <table style={{ width: '100%', minWidth: 900 }}>
                    <thead>
                        <tr>
                            <th>N</th>
                            <th>Fecha</th>
                            <th>Inicio</th>
                            <th>Egreso</th>
                            <th>Ingreso (Detalle)</th>
                            <th>Propinas</th>
                            <th>Total en Caja</th>
                            <th>Total en Bruto</th>
                            <th>Pendiente</th>
                            <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody style={{ opacity: historyLoading ? 0.6 : 1, transition: 'opacity 0.1s' }}>
                        {historyLoading && (!history || history.data.length === 0) ? (
                            <tr><td colSpan="10" className="text-center text-muted" style={{ padding: '20px' }}>Cargando registros de caja...</td></tr>
                        ) : !history || !history.data || history.data.length === 0 ? (
                            <tr><td colSpan="10" className="text-center text-muted" style={{ padding: '20px' }}>No se encontraron registros.</td></tr>
                        ) : (
                            history.data.map((item, index) => {
                                const digitalSum = (item.ingresos?.yape || 0) + (item.ingresos?.plin || 0);
                                const cardSum = (item.ingresos?.tarjeta || 0) + (item.ingresos?.izipay || 0) + (item.ingresos?.niubiz || 0);
                                const dimStyle = item.estado === 'cerrado' ? { opacity: 0.6 } : {};
                                return (
                                    <tr key={item.id}>
                                        <td style={dimStyle}>{item.id}</td>
                                        <td style={dimStyle}>
                                            <div style={{ fontWeight: 'bold', color: item.estado === 'abierto' ? '#28a745' : 'var(--text-main)' }}>
                                                Inicio: {formatDate(item.fechaInicio)}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.9em' }}>
                                                Cierre: {item.estado === 'cerrado' ? formatDate(item.fechaFin) : (
                                                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>EN CURSO</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={dimStyle}>S/. {(item.inicio || 0).toFixed(2)}</td>
                                        <td style={dimStyle}>
                                            <div>Efec: S/. {(item.egresos || 0).toFixed(2)}</div>
                                        </td>
                                        <td style={dimStyle}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 10px', fontSize: '0.85em', alignItems: 'center' }}>
                                                <span>Efec: {(item.ingresos?.efectivo || 0).toFixed(2)}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span>Tarj: {cardSum.toFixed(2)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedTarj(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                                                    >
                                                        {expandedTarj[item.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span>Dig: {digitalSum.toFixed(2)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedDig(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                                                    >
                                                        {expandedDig[item.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                                <span>Man: {(item.ingresos?.manual || 0).toFixed(2)}</span>
                                            </div>
                                            {expandedDig[item.id] && (
                                                <div style={{ fontSize: '0.75em', borderTop: '1px solid var(--glass-border)', marginTop: 5, paddingTop: 5, paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 2, animation: 'fadeIn 0.2s ease' }}>
                                                    <span>Yape: S/. {(item.ingresos?.yape || 0).toFixed(2)}</span>
                                                    <span>Plin: S/. {(item.ingresos?.plin || 0).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {expandedTarj[item.id] && (
                                                <div style={{ fontSize: '0.75em', borderTop: '1px solid var(--glass-border)', marginTop: 5, paddingTop: 5, paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 2, animation: 'fadeIn 0.2s ease' }}>
                                                    <span>Izipay: S/. {(item.ingresos?.izipay || 0).toFixed(2)}</span>
                                                    <span>Niubiz: S/. {(item.ingresos?.niubiz || 0).toFixed(2)}</span>
                                                    {(item.ingresos?.tarjeta || 0) > 0 && (
                                                        <span>Tarjeta (Otros): S/. {(item.ingresos?.tarjeta || 0).toFixed(2)}</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ ...dimStyle, color: 'var(--warning)', fontWeight: 'bold' }}>
                                            S/. {(item.totalPropinas || 0).toFixed(2)}
                                        </td>
                                        <td style={{ ...dimStyle, fontWeight: 'bold', color: 'var(--success)' }}>S/. {(item.totalCaja || 0).toFixed(2)}</td>
                                        <td style={{ ...dimStyle, fontWeight: 'bold' }}>S/. {(item.totalBruto || 0).toFixed(2)}</td>
                                        <td style={{ ...dimStyle, color: 'var(--warning)' }}>S/. {(item.totalPendiente || 0).toFixed(2)}</td>
                                        <td style={{ textAlign: 'center', overflow: 'visible', width: 80 }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                <SmoothDropdown id={item.id} dropUp={index === history.data.length - 1} onAction={(actionId) => handleRowAction(actionId, item.id)} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {(history?.meta?.totalPages || 1) > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 15 }}>
                    <button
                        className="glass-button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                        Anterior
                    </button>
                    <span style={{ alignSelf: 'center' }}>
                        Página {currentPage} de {history?.meta?.totalPages || 1}
                    </span>
                    <button
                        className="glass-button"
                        disabled={currentPage === (history?.meta?.totalPages || 1)}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, (history?.meta?.totalPages || 1)))}
                    >
                        Siguiente
                    </button>
                </div>
            )}

            <PaloteoModal />

            {/* Modal de Apertura de Caja */}
            {showInitialAmountModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h2>Apertura de Caja</h2>
                            <button className="glass-button" onClick={() => setShowInitialAmountModal(false)} style={{ padding: 5, border: 'none' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={confirmOpenShift} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            {formError && <div style={{ color: 'white', background: 'var(--danger)', padding: 10, borderRadius: 8 }}>{formError}</div>}
                            <div>
                                <label>Ingrese monto inicial en Caja (S/.)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="glass-input"
                                    value={Number.isNaN(initialAmount) ? '' : initialAmount}
                                    onChange={e => setInitialAmount(e.target.valueAsNumber)}
                                    required
                                    autoFocus
                                    style={{ fontSize: '1.5rem', textAlign: 'center', marginTop: 10 }}
                                />
                            </div>
                            <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: 10 }}>
                                <button type="submit" className="glass-button primary" style={{ width: '100%', fontSize: '1.1rem' }}>Abrir Caja</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Registro de Movimientos (Ingresos/Egresos) */}
            {showMovementModal && (
                <div className="modal-overlay" onClick={() => setShowMovementModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450, width: '90%' }}>
                        <div className="modal-header">
                            <h2 style={{ margin: 0 }}>Registrar Movimiento</h2>
                            <button className="glass-button" onClick={() => setShowMovementModal(false)} style={{ padding: 5, border: 'none' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSaveMovement} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            {movError && (
                                <div style={{ color: 'black', background: 'var(--danger)', padding: 10, borderRadius: 8, fontSize: '0.9rem' }}>
                                    {movError}
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Tipo de Movimiento</label>
                                <select
                                    className="glass-input"
                                    value={movTipo}
                                    onChange={e => setMovTipo(e.target.value)}
                                    style={{ width: '100%', padding: '8px 10px' }}
                                >
                                    <option value="EGRESO">Egreso (Gasto/Salida)</option>
                                    <option value="INGRESO">Ingreso (Entrada Manual)</option>
                                </select>
                                {movTipo === 'EGRESO' && (
                                    <div style={{
                                        marginTop: 8,
                                        padding: '8px 12px',
                                        backgroundColor: '#ffeeba',
                                        color: '#856404',
                                        border: '1px solid #ffeeba',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}>
                                        ⚠️ Límite disponible en Caja: S/. {(currentStatus?.totalCaja || 0).toFixed(2)}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Tipo de Comprobante</label>
                                <select
                                    className="glass-input"
                                    value={movComprobante}
                                    onChange={e => setMovComprobante(e.target.value)}
                                    style={{ width: '100%', padding: '8px 10px' }}
                                >
                                    <option value="boleta">Boleta</option>
                                    <option value="factura">Factura</option>
                                    <option value="recibo">Recibo</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Concepto</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="Ej. Compra de servilletas"
                                    value={movConcepto}
                                    onChange={e => setMovConcepto(e.target.value)}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Observación (Opcional)</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="Detalles adicionales"
                                    value={movObservacion}
                                    onChange={e => setMovObservacion(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Monto (S/.)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="glass-input"
                                    placeholder="0.00"
                                    value={movMonto}
                                    onChange={e => setMovMonto(e.target.value)}
                                    required
                                    style={{ width: '100%', fontSize: '1.2rem', fontWeight: 'bold' }}
                                />
                            </div>

                            <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: 10 }}>
                                <button
                                    type="submit"
                                    className="glass-button primary"
                                    disabled={isSavingMov}
                                    style={{ width: '100%', fontSize: '1.1rem', background: 'var(--primary)', borderColor: 'transparent', opacity: isSavingMov ? 0.7 : 1 }}
                                >
                                    {isSavingMov ? 'Registrando...' : 'Registrar Movimiento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Resumen de Caja */}
            {showSummaryModal && (
                <div className="modal-overlay" onClick={() => setShowSummaryModal(false)}>
                    <div className="modal-content print-ticket" onClick={e => e.stopPropagation()} style={{ background: 'white', color: 'black', width: 350, fontFamily: '"Courier New", monospace', padding: 20 }}>
                        {loadingSummary ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                Cargando Resumen de Caja...
                            </div>
                        ) : !summaryData ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                No se encontraron datos para el arqueo seleccionado.
                            </div>
                        ) : (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: 15, borderBottom: '1px dashed black', paddingBottom: 10 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>COMANDAGO</div>
                                    <div>DEMO</div>
                                    <div style={{ fontSize: '0.8rem' }}>Telf: 519123456789 / RUC: 10000000000</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: 5 }}>
                                        Fecha: {new Date().toLocaleDateString('es-PE')} {new Date().toLocaleTimeString('es-PE', { hour12: false })}
                                    </div>
                                </div>

                                <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 10 }}>RESUMEN DE CAJA</div>

                                <div style={{ fontSize: '0.9rem', marginBottom: 10 }}>
                                    <div>Inicio: {formatDate(summaryData.fechaInicio)}</div>
                                    {summaryData.fechaFin && (
                                        <div>Cierre: {formatDate(summaryData.fechaFin)}</div>
                                    )}
                                    <div>Monto Inicio: S/. {(summaryData.montoInicial || 0).toFixed(2)}</div>
                                </div>

                                <div style={{ borderBottom: '1px dashed black', marginBottom: 5 }}></div>
                                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: 5 }}>VENTAS</div>
                                <div style={{ fontSize: '0.9rem', marginBottom: 5 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Efectivo:</span>
                                        <span>S/. {(summaryData.ingresos?.efectivo || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Tarjeta:</span>
                                        <span>S/. {(summaryData.ingresos?.tarjeta || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Yape:</span>
                                        <span>S/. {(summaryData.ingresos?.yape || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Plin:</span>
                                        <span>S/. {(summaryData.ingresos?.plin || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Izi:</span>
                                        <span>S/. {(summaryData.ingresos?.izipay || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Niubiz:</span>
                                        <span>S/. {(summaryData.ingresos?.niubiz || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px dashed black', paddingTop: 5, display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.05rem', marginBottom: 5 }}>
                                    <span>Total:</span>
                                    <span>S/. {((summaryData.ingresos?.efectivo || 0) +
                                        (summaryData.ingresos?.tarjeta || 0) +
                                        (summaryData.ingresos?.yape || 0) +
                                        (summaryData.ingresos?.plin || 0) +
                                        (summaryData.ingresos?.izipay || 0) +
                                        (summaryData.ingresos?.niubiz || 0)).toFixed(2)}</span>
                                </div>

                                <div style={{ borderBottom: '1px dashed black', marginBottom: 5 }}></div>
                                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: 5 }}>RESUMEN EFECTIVO</div>
                                <div style={{ fontSize: '0.9rem', marginBottom: 5 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Ingreso:</span>
                                        <span>S/. {((summaryData.ingresos?.efectivo || 0) + (summaryData.ingresos?.manual || 0)).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Egreso:</span>
                                        <span>S/. {(summaryData.egresos || 0).toFixed(2)}</span>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.8rem', borderTop: '1px dashed black', paddingTop: 10 }}>
                                    <div>RESUMEN DE CAJA</div>
                                    <div>Generado por el sistema ComandaGo</div>
                                    <div>Este documento no posee ningún valor fiscal!</div>
                                </div>

                                <div className="no-print" style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                                    <button className="glass-button primary" onClick={() => window.print()} style={{ background: 'black', color: 'white' }}>
                                        <Printer size={16} /> Imprimir
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CashCountTable;
