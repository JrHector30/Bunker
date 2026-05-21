import React, { useEffect, useState } from 'react';
import { MoreVertical, FileText, X, AlertCircle, Trash, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCache } from '../hooks/useCache';

const CashCountTable = ({ onStatusChange }) => {
    const [filterDate, setFilterDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const statusFetcher = () => fetch('/api/cashier/balance').then(res => res.json());
    const { data: currentStatus, mutate: fetchStatus } = useCache('cashier_balance', statusFetcher, null);

    useEffect(() => {
        if (currentStatus && onStatusChange) {
            onStatusChange(currentStatus.estado);
        }
    }, [currentStatus]);

    const historyFetcher = () => {
        let url = `/api/cashier/history?page=${currentPage}&limit=5`;
        if (filterDate) url += `&date=${filterDate}`;
        return fetch(url).then(res => res.json());
    };
    const historyKey = `cashier_history_${currentPage}_${filterDate}`;
    const { data: history, loading: historyLoading, mutate: fetchHistory } = useCache(historyKey, historyFetcher, { data: [], meta: { page: 1, totalPages: 1 } });

    // Smooth Pagination State
    const [displayHistory, setDisplayHistory] = useState({ data: [], meta: { page: 1, totalPages: 1 } });
    
    useEffect(() => {
        if (history && history.data && history.data.length > 0) {
            setDisplayHistory(history);
        } else if (history && history.data && history.data.length === 0 && !historyLoading) {
            setDisplayHistory(history);
        }
    }, [history, historyLoading]);

    // UI State
    const [menuOpen, setMenuOpen] = useState(false);
    const [paloteoOpen, setPaloteoOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        // Poll status every 10 seconds
        const interval = setInterval(fetchStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    // Handle Shift Toggle
    const handleToggleShift = () => {
        if (!currentStatus) return;

        if (currentStatus.estado === 'abierto') {
            if (!window.confirm("¿Estás seguro de cerrar caja? Asegúrate de que no haya cuentas pendientes.")) return;
        }

        const montoInicial = currentStatus.estado === 'cerrado' ? parseFloat(prompt("Ingrese monto inicial:", "0.00") || 0) : 0;

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
            .then(() => {
                fetchStatus();
                fetchHistory(1, filterDate);
            })
            .catch(err => alert(err.message));
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
    const generatePDF = async () => {
        let targetId = null;

        // Si hay una fecha filtrada y resultados en el historial, tomamos el primero de esa fecha
        if (filterDate && history?.data?.length > 0) {
            targetId = history.data[0].id;
        } else if (currentStatus) {
            targetId = currentStatus.id;
        }

        if (!targetId) {
            alert("No hay datos de arqueo disponibles para descargar.");
            return;
        }
        
        setIsGenerating(true);

        try {
            const res = await fetch(`/api/cashier/arqueo/${targetId}`);
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
            doc.text(`Fecha del Turno: ${formatDate(fullData.fechaInicio, false)}`, 14, 35);
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

            const ingresosEfectivo = fullData.ventas?.filter(v => (v.metodo || 'efectivo').toLowerCase() === 'efectivo').reduce((sum, v) => sum + v.total, 0) || 0;
            const saldoFinal = currentStatus && currentStatus.id === fullData.id 
                ? currentStatus.totalCaja 
                : ((fullData.inicio || fullData.montoInicial || 0) + ingresosEfectivo);

            doc.setFontSize(12);
            doc.setTextColor(40, 40, 40);
            doc.setFont("helvetica", "bold");
            doc.text(`S/. ${(fullData.totalBruto || 0).toFixed(2)}`, 20, startY + 16);
            doc.text(`S/. ${(fullData.totalPropinas || 0).toFixed(2)}`, 80, startY + 16);
            doc.text(`S/. ${(saldoFinal || 0).toFixed(2)}`, 140, startY + 16);

            doc.setFont("helvetica", "normal");

            // SECCIÓN DE EGRESOS
            startY += 32;
            doc.setFontSize(12);
            doc.setTextColor(13, 110, 253);
            doc.setFont("helvetica", "bold");
            doc.text("Egresos Registrados", 14, startY);

            const egresosRows = fullData.egresosList && fullData.egresosList.length > 0 
                ? fullData.egresosList.map(e => [e.motivo, `S/. ${(e.monto || 0).toFixed(2)}`]) 
                : [["Sin egresos en este turno", "-"]];

            autoTable(doc, {
                startY: startY + 5,
                head: [['Motivo', 'Monto']],
                body: egresosRows,
                theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
                styles: { font: 'helvetica', fontSize: 9 },
            });

            // TABLA DE PEDIDOS
            let currentY = doc.lastAutoTable.finalY + 15;
            doc.setFontSize(12);
            doc.setTextColor(13, 110, 253);
            doc.setFont("helvetica", "bold");
            doc.text("Detalle de Pedidos", 14, currentY);

            const tableRows = fullData.ventas?.map(v => [
                v.mesa || 'Barra',
                v.mozo || 'General',
                `S/. ${(v.total || 0).toFixed(2)}`,
                v.propina > 0 ? `S/. ${(v.propina || 0).toFixed(2)}` : '-'
            ]) || [];

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Mesa', 'Mozo', 'Monto', 'Propina']],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
                styles: { font: 'helvetica', fontSize: 9 },
                columnStyles: {
                    2: { halign: 'right' },
                    3: { halign: 'right' }
                }
            });

            // NUEVA SECCIÓN: PROPINAS
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
            alert("Error generando PDF");
        } finally {
            setIsGenerating(false);
        }
    };

    // Paloteo Modal
    const PaloteoModal = () => {
        if (!paloteoOpen || !currentStatus) return null;
        const data = currentStatus;
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
                        <h2>Resumen Actual</h2>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
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
                            <button
                                onClick={async () => {
                                    if (!window.confirm("⚠️ ¿ESTÁS SEGURO?\n\nEsto eliminará TODO el historial de ventas y reiniciará los contadores a 1.\n\nÚsalo solo para limpiar datos de prueba.")) return;

                                    try {
                                        const res = await fetch('/api/admin/reset-simulation', { method: 'DELETE' });
                                        if (res.ok) {
                                            alert("Simulación reiniciada correctamente.");
                                            fetchStatus();
                                            fetchHistory(1, filterDate);
                                        } else {
                                            const err = await res.json();
                                            alert("Error: " + err.error);
                                        }
                                    } catch (e) {
                                        alert("Error de conexión");
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
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {/* PDF DOWNLOAD BUTTON */}
                    <button
                        className="glass-button"
                        onClick={generatePDF}
                        disabled={isGenerating}
                        title="Descargar Reporte Actual"
                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                        <Download size={18} />
                        {isGenerating ? '...' : ''}
                    </button>

                    <input
                        type="date"
                        className="glass-input"
                        style={{ padding: '5px 10px', width: 'auto' }}
                        value={filterDate}
                        onChange={(e) => {
                            setFilterDate(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                    <button className="glass-button" onClick={() => fetchHistory(currentPage, filterDate)}>Refrescar</button>


                    <div style={{ position: 'relative' }}>
                        <button className="glass-button icon" onClick={() => setMenuOpen(!menuOpen)}>
                            <MoreVertical size={18} />
                        </button>
                        {menuOpen && (
                            <div className="glass-panel" style={{
                                position: 'absolute', right: 0, top: 40, width: 220, zIndex: 100,
                                display: 'flex', flexDirection: 'column', gap: 5, padding: 10,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.3)', background: 'rgba(30, 30, 30, 0.95)'
                            }}>
                                <button className="glass-button" style={{ justifyContent: 'flex-start', border: 'none' }} onClick={() => { setPaloteoOpen(true); setMenuOpen(false); }}>
                                    Resumen / Paloteo (Actual)
                                </button>
                                <button className="glass-button" style={{ justifyContent: 'flex-start', border: 'none' }} onClick={generatePDF}>
                                    Exportar PDF
                                </button>
                            </div>
                        )}
                    </div>
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
                            <th>Detalle Propinas</th>
                            <th>Total en Caja</th>
                            <th>Total en Bruto</th>
                            <th>Pendiente</th>
                        </tr>
                    </thead>
                    <tbody style={{ opacity: historyLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                        {historyLoading && displayHistory.data.length === 0 ? (
                            <tr><td colSpan="10" className="text-center text-muted">Cargando registros...</td></tr>
                        ) : displayHistory.data.length === 0 ? (
                            <tr><td colSpan="10" className="text-center text-muted">No se encontraron registros.</td></tr>
                        ) : (
                            displayHistory.data.map(item => (
                                <tr key={item.id} style={{ opacity: item.estado === 'cerrado' ? 0.8 : 1 }}>
                                    <td>{item.id}</td>
                                    <td>
                                        <div style={{ fontWeight: 'bold', color: item.estado === 'abierto' ? '#28a745' : 'var(--text-main)' }}>
                                            Inicio: {formatDate(item.fechaInicio)}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.9em' }}>
                                            Cierre: {item.estado === 'cerrado' ? formatDate(item.fechaFin) : (
                                                <span style={{ color: '#28a745', fontWeight: 'bold' }}>EN CURSO</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>S/. {(item.inicio || 0).toFixed(2)}</td>
                                    <td>
                                        <div>Efec: S/. {(item.egresos || 0).toFixed(2)}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 10px', fontSize: '0.85em' }}>
                                            <span>Efec: {(item.ingresos?.efectivo || 0).toFixed(2)}</span>
                                            <span>Tarj: {(item.ingresos?.tarjeta || 0).toFixed(2)}</span>
                                            <span>Yape: {(item.ingresos?.yape || 0).toFixed(2)}</span>
                                            <span>Izi: {(item.ingresos?.izipay || 0).toFixed(2)}</span>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--warning)', fontWeight: 'bold' }}>
                                        S/. {(item.totalPropinas || 0).toFixed(2)}
                                    </td>
                                    <td>
                                        {item.propinasPorMozo && item.propinasPorMozo.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {item.propinasPorMozo.map(mozo => (
                                                    <div key={mozo.id} style={{ fontSize: '0.8rem', padding: '2px 6px', background: 'rgba(255,193,7,0.1)', borderRadius: 4 }}>
                                                        <strong>{mozo.nombre}:</strong> S/. {(mozo.propinas || 0).toFixed(2)}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin propinas</span>
                                        )}
                                    </td>
                                    <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>S/. {(item.totalCaja || 0).toFixed(2)}</td>
                                    <td style={{ fontWeight: 'bold' }}>S/. {(item.totalBruto || 0).toFixed(2)}</td>
                                    <td style={{ color: 'var(--warning)' }}>S/. {(item.totalPendiente || 0).toFixed(2)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {displayHistory.meta.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 15 }}>
                    <button
                        className="glass-button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                        Anterior
                    </button>
                    <span style={{ alignSelf: 'center' }}>
                        Página {currentPage} de {displayHistory.meta.totalPages}
                    </span>
                    <button
                        className="glass-button"
                        disabled={currentPage === displayHistory.meta.totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, displayHistory.meta.totalPages))}
                    >
                        Siguiente
                    </button>
                </div>
            )}

            <PaloteoModal />
        </div>
    );
};

export default CashCountTable;
