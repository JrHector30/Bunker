import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import { ArrowLeft, User, ChefHat, FileText, CalendarDays, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { DropdownRangeDatePicker } from '../components/DropdownRangeDatePicker';
import SimpleCombobox from '../components/SimpleCombobox';
import { motion } from 'motion/react';

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const formattedDate = data.dateStr ? data.dateStr.split('-').reverse().join('/') : '';
        
        // Detectar si el documento está en modo oscuro
        const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
        
        // Estilos glassmorphism dinámicos
        const bgColor = isDark ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.82)';
        const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.4)';
        const textColor = isDark ? '#f8fafc' : '#0f172a';
        
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="glass-panel"
                style={{
                    padding: '16px 18px',
                    border: `1px solid ${borderColor}`,
                    backgroundColor: bgColor,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    color: textColor,
                    borderRadius: '16px',
                    boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.15)',
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    minWidth: '240px',
                    pointerEvents: 'none'
                }}
            >
                <p style={{ 
                    margin: '0 0 8px 0', 
                    fontWeight: 600, 
                    fontSize: '15px', 
                    lineHeight: '1.4', 
                    color: textColor,
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    paddingBottom: '6px'
                }}>
                    Día: {formattedDate}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <p style={{ 
                        margin: 0, 
                        color: '#22c55e', 
                        fontWeight: 500, 
                        fontSize: '15px', 
                        lineHeight: '1.5',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>Venta:</span>
                        <strong style={{ fontWeight: 600 }}>S/. {parseFloat(data.salesTotal || 0).toFixed(2)}</strong>
                    </p>
                    <p style={{ 
                        margin: 0, 
                        color: '#f97316', 
                        fontWeight: 500, 
                        fontSize: '15px', 
                        lineHeight: '1.5',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>Pedidos atendidos:</span>
                        <strong style={{ fontWeight: 600 }}>{data.ordersCount}</strong>
                    </p>
                    {data.dishesCount > 0 && (
                        <p style={{ 
                            margin: 0, 
                            color: '#3b82f6', 
                            fontWeight: 500, 
                            fontSize: '15px', 
                            lineHeight: '1.5',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span>Platos preparados:</span>
                            <strong style={{ fontWeight: 600 }}>{data.dishesCount}</strong>
                        </p>
                    )}
                </div>
            </motion.div>
        );
    }
    return null;
};

const StaffStatsView = () => {
    const { showConfirmation } = useConfirmation();
    const { showToast } = useNotification();
    const navigate = useNavigate();

    // State definitions
    const [date, setDate] = useState(new Date());
    const [sessions, setSessions] = useState([]);
    const [selectedArqueoId, setSelectedArqueoId] = useState(null);
    const [requiresSelection, setRequiresSelection] = useState(false);
    const [arqueoInfo, setArqueoInfo] = useState(null);
    const [rawComandas, setRawComandas] = useState([]);
    const [movimientosInsumo, setMovimientosInsumo] = useState([]);
    const [stats, setStats] = useState({ waiters: [], cooks: [] });
    const [filteredDay, setFilteredDay] = useState('TODO');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Expandible UI togglers for auditing sections
    const [expandedWaiters, setExpandedWaiters] = useState({});
    const [expandedCooks, setExpandedCooks] = useState({});
    const [expandedOrders, setExpandedOrders] = useState({});

    const dateQueryStr = useMemo(() => {
        if (!date) return format(new Date(), 'yyyy-MM-dd');
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }, [date]);

    const dateDisplayStr = useMemo(() => {
        if (!date) return format(new Date(), 'dd-MM-yyyy');
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${d}-${m}-${y}`;
    }, [date]);

    // 2. Fetch stats for the selected cashier session (arqueoId)
    const fetchArqueoStats = useCallback((arqueoId, showLoading = true) => {
        if (showLoading) setLoading(true);
        fetch(`/api/staff/stats?arqueoId=${arqueoId}`)
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(`Error de servidor (Status: ${res.status})`);
                }
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new TypeError("Respuesta de servidor no es JSON válido");
                }
                return res.json();
            })
            .then(data => {
                setError(null);
                if (data.arqueo) {
                    setArqueoInfo(data.arqueo);
                    setRawComandas(data.comandas || []);
                    setMovimientosInsumo(data.movimientosInsumo || []);
                    setStats({ waiters: data.waiters || [], cooks: data.cooks || [] });
                } else {
                    setArqueoInfo(null);
                    setRawComandas([]);
                    setMovimientosInsumo([]);
                    setStats({ waiters: [], cooks: [] });
                }
            })
            .catch(err => {
                console.error("Error al obtener estadísticas del arqueo:", err);
                setError(err.message || "Error al conectar con el servidor");
            })
            .finally(() => {
                if (showLoading) setLoading(false);
            });
    }, []);

    // 1. Fetch sessions for the selected date
    useEffect(() => {
        setSessions([]);
        setSelectedArqueoId(null);
        setRequiresSelection(false);
        setArqueoInfo(null);
        setRawComandas([]);
        setStats({ waiters: [], cooks: [] });
        setFilteredDay('TODO');
        setError(null);

        setLoading(true);
        fetch(`/api/staff/stats/sessions?date=${dateQueryStr}`)
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(`Error de servidor (Status: ${res.status})`);
                }
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new TypeError("Respuesta de servidor no es JSON válido");
                }
                return res.json();
            })
            .then(data => {
                setError(null);
                setSessions(data);
                if (data.length === 0) {
                    setRequiresSelection(false);
                    setLoading(false);
                } else if (data.length === 1) {
                    setRequiresSelection(false);
                    setSelectedArqueoId(data[0].id);
                    fetchArqueoStats(data[0].id, true);
                } else {
                    setRequiresSelection(true);
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error("Error cargando sesiones de caja:", err);
                setError(err.message || "Error al conectar con el servidor");
                setLoading(false);
            });
    }, [dateQueryStr, fetchArqueoStats]);

    // 3. Start interval polling ONLY if session is open
    useEffect(() => {
        if (!selectedArqueoId) return;

        let interval = null;
        const checkAndStartInterval = () => {
            const currentArqueo = sessions.find(s => s.id === selectedArqueoId);
            if (currentArqueo && currentArqueo.estado === 'abierto') {
                interval = setInterval(() => {
                    fetchArqueoStats(selectedArqueoId, false);
                }, 20000); // 20 seconds
            }
        };

        const timeout = setTimeout(checkAndStartInterval, 1000);

        return () => {
            clearTimeout(timeout);
            if (interval) clearInterval(interval);
        };
    }, [selectedArqueoId, sessions, fetchArqueoStats]);

    // 4. Generate continuous array of natural days in cashier range
    const rangeDays = useMemo(() => {
        if (!arqueoInfo) return [];
        const days = [];
        const start = new Date(arqueoInfo.fechaInicio);
        const end = arqueoInfo.fechaFin ? new Date(arqueoInfo.fechaFin) : new Date();

        // Normalizar a medianoche local de la PC
        const currentDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

        let safetyCounter = 0;
        while (currentDate <= endDate && safetyCounter < 100) {
            const y = currentDate.getFullYear();
            const m = String(currentDate.getMonth() + 1).padStart(2, '0');
            const d = String(currentDate.getDate()).padStart(2, '0');
            const key = `${y}-${m}-${d}`;
            if (!days.includes(key)) {
                days.push(key);
            }
            currentDate.setDate(currentDate.getDate() + 1);
            safetyCounter++;
        }
        return days;
    }, [arqueoInfo]);

    // 5. Generate daily chart data mapping (showing empty days as 0)
    const dailyChartData = useMemo(() => {
        return rangeDays.map(dayStr => {
            const dayComandas = rawComandas.filter(c => {
                const cDate = new Date(c.fecha);
                const y = cDate.getFullYear();
                const m = String(cDate.getMonth() + 1).padStart(2, '0');
                const d = String(cDate.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}` === dayStr;
            });

            const total = dayComandas.reduce((sum, c) => sum + c.total, 0);
            const count = dayComandas.length;

            // Sumar platos preparados (listo/entregado) para las comandas de este dia
            let dayDishes = 0;
            dayComandas.forEach(c => {
                (c.detalles || []).forEach(d => {
                    if (d.estado === 'listo' || d.estado === 'entregado') {
                        dayDishes++;
                    }
                });
            });

            if (dayStr === '2026-07-16') {
                console.log("=== LOG TEMPORAL 16/07 ===", {
                    dateStr: dayStr,
                    salesTotal: parseFloat(total.toFixed(2)),
                    ordersCount: count,
                    dishesCount: dayDishes
                });
            }

            const parts = dayStr.split('-');
            const label = `${parts[2]}/${parts[1]}`;

            return {
                dateStr: dayStr,
                label,
                salesTotal: parseFloat(total.toFixed(2)),
                ordersCount: count,
                dishesCount: dayDishes
            };
        });
    }, [rangeDays, rawComandas]);

    // 6. Reactive calculations in client based on active filter (filteredDay)
    const activeData = useMemo(() => {
        if (!arqueoInfo) {
            return {
                totalSales: 0,
                totalOrders: 0,
                waiters: [],
                cooks: [],
                waiterChartData: [],
                cookChartData: [],
                waiterPlatos: [],
                nonCocinaPlatos: [],
                comandasPeriodo: []
            };
        }

        const targetComandas = filteredDay === 'TODO'
            ? rawComandas
            : rawComandas.filter(c => {
                const cDate = new Date(c.fecha);
                const y = cDate.getFullYear();
                const m = String(cDate.getMonth() + 1).padStart(2, '0');
                const d = String(cDate.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}` === filteredDay;
            });

        const sales = targetComandas.reduce((sum, c) => sum + c.total, 0);
        const orders = targetComandas.length;

        // Dynamic waiters consolidation from targetComandas (covers ALL roles/users who registered a comanda)
        const waitersMap = {};
        targetComandas.forEach(c => {
            const uid = c.usuarioId || 0;
            const uName = c.usuarioNombre || (c.usuarioRol === 'admin' ? 'Administrador' : 'Sin mozo asignado');
            if (!waitersMap[uid]) {
                waitersMap[uid] = {
                    id: uid,
                    nombre: uName,
                    rol: c.usuarioRol || 'mozo',
                    totalTables: 0,
                    totalSales: 0
                };
            }
            waitersMap[uid].totalTables += 1;
            waitersMap[uid].totalSales += c.total;
        });
        const waiters = Object.values(waitersMap);

        // Dynamic cooks consolidation from targetComandas details (ready/delivered state)
        const cooksMap = {};
        const nonCocinaPlatos = [];
        const waiterPlatos = [];

        targetComandas.forEach(c => {
            const uName = c.usuarioNombre || 'Sin mozo asignado';
            (c.detalles || []).forEach(d => {
                // Determine Kardex/Stock status based on recetas and movimientosInsumo
                let kardexStatus = 'No afecta inventario';
                if (d.recetaCount > 0) {
                    const hasMovement = movimientosInsumo.some(k =>
                        k.motivo && k.motivo.includes(`Comanda ID: ${c.id}`)
                    );
                    kardexStatus = hasMovement ? 'Stock descontado' : 'Movimiento no encontrado';
                } else {
                    kardexStatus = 'Sin receta configurada';
                }

                const itemDetail = {
                    mozo: uName,
                    comandaId: c.id,
                    mesa: c.mesaNum,
                    hora: new Date(c.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
                    fecha: new Date(c.fecha).toLocaleDateString('es-PE'),
                    plato: d.descripcion,
                    cantidad: d.cantidad,
                    precio: d.precio,
                    subtotal: d.precio * d.cantidad,
                    estado: d.estado,
                    cocinero: d.cocineroId ? d.cocineroNombre : 'No aplica / No enviado a cocina',
                    noEnvioCocina: !d.cocineroId,
                    totalComanda: c.total,
                    kardexStatus
                };

                waiterPlatos.push(itemDetail);

                if (!d.cocineroId) {
                    // Beverage or snacks (not sent to kitchen)
                    nonCocinaPlatos.push(itemDetail);
                } else if (!d.estado || (
                    d.estado.toLowerCase() === 'listo' ||
                    d.estado.toLowerCase() === 'entregado' ||
                    d.estado.toLowerCase() === 'entregada'
                )) {
                    const cid = d.cocineroId;
                    const cName = d.cocineroNombre || 'Cocinero';
                    if (!cooksMap[cid]) {
                        cooksMap[cid] = {
                            id: cid,
                            nombre: cName,
                            rol: 'cocina',
                            totalDishes: 0,
                            totalTimeMs: 0,
                            countTime: 0,
                            platosList: []
                        };
                    }
                    cooksMap[cid].totalDishes += d.cantidad;

                    const prepTime = d.fechaPreparacion && d.fechaListo
                        ? Math.max(0, (new Date(d.fechaListo) - new Date(d.fechaPreparacion)) / 60000)
                        : 0;

                    const readyTimeStr = d.fechaListo
                        ? new Date(d.fechaListo).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
                        : 'N/A';

                    cooksMap[cid].platosList.push({
                        id: d.id,
                        comandaId: c.id,
                        mesa: c.mesaNum,
                        mozo: uName,
                        plato: d.descripcion,
                        cantidad: d.cantidad,
                        tiempoPrep: prepTime,
                        fecha: readyTimeStr,
                        estado: d.estado
                    });

                    if (d.fechaPreparacion && d.fechaListo) {
                        const diff = new Date(d.fechaListo) - new Date(d.fechaPreparacion);
                        if (diff > 0) {
                            cooksMap[cid].totalTimeMs += diff;
                            cooksMap[cid].countTime++;
                        }
                    }
                }
            });
        });

        const cooks = Object.values(cooksMap).map(c => ({
            ...c,
            avgTimeMin: c.countTime > 0 ? (c.totalTimeMs / c.countTime / 60000) : 0
        }));

        const waiterChartData = waiters.filter(w => w.totalSales > 0);
        const cookChartData = cooks.filter(c => c.totalDishes > 0);

        // Map period comandas detail auditing
        const comandasPeriodo = targetComandas.map(c => {
            const auditPlatos = (c.detalles || []).map(d => {
                let kardexStatus = 'No afecta inventario';
                if (d.recetaCount > 0) {
                    const hasMovement = movimientosInsumo.some(k =>
                        k.motivo && k.motivo.includes(`Comanda ID: ${c.id}`)
                    );
                    kardexStatus = hasMovement ? 'Stock descontado' : 'Movimiento no encontrado';
                } else {
                    kardexStatus = 'Sin receta configurada';
                }

                return {
                    plato: d.descripcion,
                    cantidad: d.cantidad,
                    precio: d.precio,
                    cocinero: d.cocineroId ? d.cocineroNombre : 'No aplica / No enviado a cocina',
                    noEnvioCocina: !d.cocineroId,
                    estado: d.estado,
                    kardexStatus
                };
            });

            return {
                id: c.id,
                fecha: new Date(c.fecha).toLocaleDateString('es-PE'),
                hora: new Date(c.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
                mesa: c.mesaNum,
                mozo: c.usuarioNombre || 'Sin mozo asignado',
                total: c.total,
                platos: auditPlatos
            };
        });

        return {
            totalSales: parseFloat(sales.toFixed(2)),
            totalOrders: orders,
            waiters,
            cooks,
            waiterChartData,
            cookChartData,
            waiterPlatos,
            nonCocinaPlatos,
            comandasPeriodo
        };
    }, [arqueoInfo, filteredDay, rawComandas, movimientosInsumo]);

    const comboboxItems = useMemo(() => {
        const list = [{ id: 'TODO', name: 'TODO (Rango completo de Caja)' }];
        rangeDays.forEach(dayStr => {
            const parts = dayStr.split('-');
            const displayLabel = `${parts[2]}/${parts[1]}/${parts[0]}`;
            list.push({ id: dayStr, name: `Día: ${displayLabel}` });
        });
        return list;
    }, [rangeDays]);

    const selectedComboboxItem = useMemo(() => {
        return comboboxItems.find(item => item.id === filteredDay) || comboboxItems[0];
    }, [comboboxItems, filteredDay]);

    // 7. Cleanup/Daily Delete functionality
    const handleCleanDay = async () => {
        if (!arqueoInfo) return;
        const arqueoLabel = `Arqueo N° ${arqueoInfo.id}`;
        if (!await showConfirmation(`⚠ PELIGRO:\n\n¿Estás seguro de ELIMINAR PERMANENTEMENTE todas las ventas y registros asociados a la sesión de caja del día ${dateDisplayStr} (${arqueoLabel})?\n\nEsta acción NO se puede deshacer.`, { type: 'danger' })) return;

        try {
            const res = await fetch(`/api/staff/stats/daily?date=${dateQueryStr}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'error');
                setDate(new Date());
            } else {
                showToast("Error: " + data.error, 'error');
            }
        } catch (e) {
            showToast("Error de conexión", 'error');
        }
    };

    // 8. PDF Export Lógica
    const handleExportPDF = () => {
        if (!arqueoInfo) return;
        const doc = new jsPDF();
        const rangeLabel = arqueoInfo.fechaFin
            ? `${format(new Date(arqueoInfo.fechaInicio), 'dd/MM/yy HH:mm')} a ${format(new Date(arqueoInfo.fechaFin), 'dd/MM/yy HH:mm')}`
            : `${format(new Date(arqueoInfo.fechaInicio), 'dd/MM/yy HH:mm')} a Abierta`;

        doc.setFontSize(18);
        doc.text("Bunker - Reporte de Rendimiento de Caja", 14, 20);
        doc.setFontSize(10);
        doc.text(`Arqueo N°: ${arqueoInfo.id} (${arqueoInfo.estado.toUpperCase()})`, 14, 27);
        doc.text(`Rango: ${rangeLabel}`, 14, 33);
        doc.text(`Filtro Activo: ${filteredDay === 'TODO' ? 'Todo el rango' : filteredDay}`, 14, 39);

        // Waiters Table
        doc.setFontSize(14);
        doc.text("Rendimiento de Mozos", 14, 50);

        const waiterRows = activeData.waiters.map(w => [
            w.nombre,
            w.totalTables,
            `S/. ${parseFloat(Number(w.totalSales).toFixed(2))}`
        ]);

        autoTable(doc, {
            startY: 55,
            head: [['Nombre', 'Pedidos', 'Venta Total']],
            body: waiterRows,
            theme: 'grid',
            headStyles: { fillColor: [14, 165, 233] }
        });

        // Cooks Table
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.text("Rendimiento de Cocina", 14, finalY);

        const cookRows = activeData.cooks.map(c => [
            c.nombre,
            c.totalDishes,
            c.avgTimeMin > 0 ? `${parseFloat(Number(c.avgTimeMin).toFixed(2))} min` : '-'
        ]);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Nombre', 'Platos Preparados', 'Tiempo Promedio']],
            body: cookRows,
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68] }
        });

        doc.save(`Reporte_Arqueo_${arqueoInfo.id}_Filtro_${filteredDay}.pdf`);
    };

    // Color palettes
    const WAITER_COLORS = ['#0ea5e9', '#3b82f6', '#22d3ee', '#2dd4bf', '#6366f1', '#8b5cf6', '#06b6d4', '#60a5fa'];
    const COOK_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#dc2626', '#ea580c', '#b91c1c', '#d97706'];

    return (
        <div style={{ padding: 20 }}>
            {/* Top Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 15 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="glass-button" onClick={() => navigate('/')} style={{ padding: 8 }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px' }}>Rendimiento y Reportes</h1>
                        {arqueoInfo && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                                Caja N° {arqueoInfo.id} ({arqueoInfo.estado === 'abierto' ? 'Abierta' : 'Cerrada'})
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Secondary selector for multiple arqueos */}
                    {sessions.length > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CalendarDays size={16} className="text-teal-400" />
                            <select
                                value={selectedArqueoId || ''}
                                onChange={(e) => {
                                    const valId = parseInt(e.target.value);
                                    setSelectedArqueoId(valId);
                                    fetchArqueoStats(valId, true);
                                }}
                                className="glass-button"
                                style={{
                                    padding: '6px 12px',
                                    fontSize: 12,
                                    borderRadius: 12,
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {sessions.map(s => {
                                    const startStr = format(new Date(s.fechaInicio), 'HH:mm');
                                    const endStr = s.fechaFin ? format(new Date(s.fechaFin), 'HH:mm') : 'Activa';
                                    return (
                                        <option key={s.id} value={s.id}>
                                            Arqueo #{s.id} ({startStr} - {endStr})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    <DropdownRangeDatePicker
                        mode="single"
                        value={date}
                        onChange={(selectedDate) => {
                            if (selectedDate) setDate(selectedDate);
                        }}
                        placeholder="Seleccionar Fecha"
                    />

                    {arqueoInfo && (
                        <>
                            <button
                                className="glass-button"
                                onClick={handleExportPDF}
                                title="Exportar Reporte PDF"
                                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                            >
                                <FileText size={18} /> PDF
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Loading Indicator */}
            {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                    <div className="border-3 border-slate-200 border-t-slate-800 rounded-full w-8 h-8 animate-spin" />
                </div>
            )}

            {/* Error Alert */}
            {!loading && error && (
                <div className="glass-panel text-center" style={{ padding: '40px 20px', margin: '20px 0', border: '1px solid var(--glass-border)', boxShadow: '0 0 15px rgba(239, 68, 68, 0.1)' }}>
                    <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
                    <h3 className="text-main" style={{ margin: 0, fontWeight: 700, fontSize: 18, color: '#ef4444' }}>Error de Conexión</h3>
                    <p className="text-muted" style={{ fontSize: 13, marginTop: 10, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
                        {error}. Por favor, asegúrate de que el backend local esté corriendo e inténtalo de nuevo.
                    </p>
                </div>
            )}

            {/* Requiere Selección de sesión (Múltiples Arqueos) */}
            {!loading && !error && requiresSelection && (
                <div className="glass-panel text-center" style={{ padding: '50px 20px', margin: '20px 0', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: 44, marginBottom: 15 }}>📂</div>
                    <h3 className="text-main" style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>Múltiples Cajas Detectadas</h3>
                    <p className="text-muted" style={{ fontSize: 13, marginTop: 8, marginBottom: 24, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
                        Se abrieron varias sesiones de caja el día {dateDisplayStr}. Por favor, selecciona la sesión específica para visualizar el reporte:
                    </p>
                    <div style={{ display: 'inline-flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {sessions.map(s => {
                            const startStr = format(new Date(s.fechaInicio), 'HH:mm');
                            const endStr = s.fechaFin ? format(new Date(s.fechaFin), 'HH:mm') : 'Activa';
                            return (
                                <button
                                    key={s.id}
                                    className="glass-button"
                                    onClick={() => {
                                        setRequiresSelection(false);
                                        setSelectedArqueoId(s.id);
                                        fetchArqueoStats(s.id, true);
                                    }}
                                    style={{
                                        padding: '12px 20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 4,
                                        borderRadius: 16
                                    }}
                                >
                                    <span style={{ fontWeight: 'black', fontSize: 14 }}>Arqueo N° {s.id}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{startStr} a {endStr} ({s.estado === 'abierto' ? 'Abierta' : 'Cerrada'})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Estado Vacío: Sin cajas en el día */}
            {!loading && !error && !requiresSelection && !arqueoInfo && (
                <div className="glass-panel text-center" style={{ padding: '60px 20px', margin: '20px 0', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: 48, marginBottom: 20 }}>📭</div>
                    <h3 className="text-main" style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>No hay sesión de caja</h3>
                    <p className="text-muted" style={{ fontSize: 13, marginTop: 10, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
                        No se ha encontrado ninguna apertura de caja registrada para la fecha seleccionada ({dateDisplayStr}).
                    </p>
                </div>
            )}

            {/* Report Content */}
            {!loading && arqueoInfo && (
                <div>
                    <div className="glass-panel" style={{ padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 15, border: '1px solid var(--glass-border)', position: 'relative', zIndex: 100 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 15, width: '100%', maxWidth: '580px', flexWrap: 'wrap', position: 'relative', zIndex: 101 }}>
                            <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-muted)' }}>Filtrar reporte por día de caja:</span>
                            <div style={{ flex: 1, minWidth: '240px', position: 'relative', zIndex: 102 }}>
                                <SimpleCombobox
                                    items={comboboxItems}
                                    selectedItem={selectedComboboxItem}
                                    onSelect={(item) => {
                                        if (item) setFilteredDay(item.id);
                                    }}
                                    placeholder="Seleccionar día de caja..."
                                />
                            </div>
                        </div>

                        {filteredDay !== 'TODO' && (
                            <button
                                className="glass-button"
                                onClick={() => setFilteredDay('TODO')}
                                style={{ padding: '6px 12px', fontSize: 11, borderRadius: 10, color: 'var(--primary)' }}
                            >
                                Restablecer a TODO
                            </button>
                        )}
                    </div>

                    {/* Summary KPI Cards */}
                    <div className="responsive-grid" style={{ marginBottom: 30, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                        <div className="glass-panel" style={{ padding: 20, textAlign: 'center', border: '1px solid var(--glass-border)' }}>
                            <h3 className="text-muted" style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Venta Total</h3>
                            <h1 style={{ color: 'var(--success)', margin: '10px 0', fontSize: 28 }} className="font-mono">
                                S/. {activeData.totalSales.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h1>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Monto efectivamente cobrado</span>
                        </div>
                        <div className="glass-panel" style={{ padding: 20, textAlign: 'center', border: '1px solid var(--glass-border)' }}>
                            <h3 className="text-muted" style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Pedidos Atendidos</h3>
                            <h1 style={{ color: 'var(--primary)', margin: '10px 0', fontSize: 28 }} className="font-mono">
                                {activeData.totalOrders}
                            </h1>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Comandas válidamente finalizadas</span>
                        </div>
                    </div>

                    {/* CHARTS GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 30 }}>

                        {/* 1. Daily Sales timeline chart */}
                        <div className="glass-panel" style={{ padding: 20, height: 350, border: '1px solid var(--glass-border)' }}>
                            <h3 style={{ textAlign: 'center', marginBottom: 15, fontSize: 14 }}>Ventas Diarias en este Arqueo</h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart
                                    data={dailyChartData}
                                    onClick={(state) => {
                                        if (state && state.activePayload && state.activePayload.length > 0) {
                                            const clickedDay = state.activePayload[0].payload.dateStr;
                                            setFilteredDay(clickedDay);
                                        }
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={10} />
                                    <YAxis stroke="var(--text-muted)" fontSize={10} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend fontSize={10} />
                                    <Bar dataKey="salesTotal" name="Venta (S/.)" fill="var(--success)" radius={[4, 4, 0, 0]}>
                                        {dailyChartData.map((entry, index) => {
                                            const isSelected = filteredDay === entry.dateStr;
                                            return (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={isSelected ? 'var(--primary)' : 'var(--success)'}
                                                    style={{ cursor: 'pointer', opacity: isSelected ? 1 : 0.8 }}
                                                />
                                            );
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* 2. Waiter Sales Chart */}
                        <div className="glass-panel" style={{ padding: 20, height: 350, border: '1px solid var(--glass-border)' }}>
                            <h3 style={{ textAlign: 'center', marginBottom: 15, fontSize: 14 }}>Ventas por Mozo</h3>
                            {activeData.waiterChartData.length === 0 ? (
                                <div style={{ height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                                    Sin datos de ventas en este período
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="90%">
                                    <BarChart data={activeData.waiterChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                        <XAxis dataKey="nombre" stroke="var(--text-muted)" fontSize={10} />
                                        <YAxis stroke="var(--text-muted)" fontSize={10} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)', color: 'var(--text-main)' }}
                                            formatter={(value) => [`S/. ${parseFloat(Number(value).toFixed(2))}`, 'Ventas']}
                                        />
                                        <Bar dataKey="totalSales" name="Ventas" radius={[4, 4, 0, 0]}>
                                            {activeData.waiterChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={WAITER_COLORS[index % WAITER_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* 3. Kitchen Efficiency Chart */}
                        <div className="glass-panel" style={{ padding: 20, height: 350, border: '1px solid var(--glass-border)', gridColumn: 'span 2' }}>
                            <h3 style={{ textAlign: 'center', marginBottom: 15, fontSize: 14 }}>Platos por Cocinero</h3>
                            {activeData.cookChartData.length === 0 ? (
                                <div style={{ height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                                    Sin platos preparados en este período
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="90%">
                                    <PieChart>
                                        <Pie
                                            data={activeData.cookChartData}
                                            cx="50%"
                                            cy="40%"
                                            labelLine={true}
                                            label={({ nombre, percent }) => `${nombre} (${(percent * 100).toFixed(0)}%)`}
                                            outerRadius={70}
                                            fill="#8884d8"
                                            dataKey="totalDishes"
                                            nameKey="nombre"
                                        >
                                            {activeData.cookChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COOK_COLORS[index % COOK_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)', color: 'var(--text-main)' }}
                                            formatter={(value) => [value, "Platos Preparados"]}
                                        />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* DETAILS TABLES GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
                        {/* Waiters Table */}
                        <div className="glass-panel" style={{ padding: 20, border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                                <User size={24} style={{ color: 'var(--primary)' }} />
                                <h2 style={{ margin: 0, fontSize: '18px' }}>Detalle Mozos</h2>
                            </div>

                            <div className="table-responsive">
                                <table style={{ width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th>Nombre</th>
                                            <th style={{ textAlign: 'center' }}>Pedidos</th>
                                            <th style={{ textAlign: 'right' }}>Venta Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeData.waiters.length === 0 ? (
                                            <tr><td colSpan="3" className="text-center text-muted">No hay datos</td></tr>
                                        ) : (
                                            activeData.waiters.map(w => (
                                                <tr key={w.id}>
                                                    <td>{w.nombre} <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>({w.rol})</span></td>
                                                    <td style={{ textAlign: 'center' }}>{w.totalTables}</td>
                                                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 'bold' }} className="font-mono">
                                                        S/. {parseFloat(Number(w.totalSales).toFixed(2))}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Cooks Table (Expandible) */}
                        <div className="glass-panel" style={{ padding: 20, border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                                <ChefHat size={24} style={{ color: 'var(--warning)' }} />
                                <h2 style={{ margin: 0, fontSize: '18px' }}>Detalle Cocina</h2>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {activeData.cooks.length === 0 ? (
                                    <div className="text-center text-muted" style={{ padding: 20, fontSize: 12 }}>No hay datos</div>
                                ) : (
                                    activeData.cooks.map(c => {
                                        const isExpanded = !!expandedCooks[c.id];
                                        return (
                                            <div key={c.id} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
                                                <button
                                                    onClick={() => setExpandedCooks(prev => ({ ...prev, [c.id]: !isExpanded }))}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 16px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        backgroundColor: 'rgba(255,255,255,0.02)',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: 'var(--text-main)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <span style={{ fontWeight: 'bold', fontSize: 13 }}>{c.nombre}</span>
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— {c.totalDishes} platos</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tiempo Prom: <strong style={{ color: 'var(--text-main)' }}>{c.avgTimeMin > 0 ? `${c.avgTimeMin.toFixed(2)} min` : '-'}</strong></span>
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </div>
                                                </button>

                                                {isExpanded && (
                                                    <div style={{ padding: 12, backgroundColor: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                                        <table style={{ width: '100%', fontSize: 11 }}>
                                                            <thead>
                                                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                                    <th style={{ textAlign: 'left', padding: '4px 0' }}>Plato</th>
                                                                    <th style={{ textAlign: 'center' }}>Cant.</th>
                                                                    <th style={{ textAlign: 'center' }}>Comanda</th>
                                                                    <th style={{ textAlign: 'center' }}>Mesa</th>
                                                                    <th style={{ textAlign: 'center' }}>Mozo</th>
                                                                    <th style={{ textAlign: 'center' }}>Tiempo</th>
                                                                    <th style={{ textAlign: 'right' }}>Hora Listo</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {c.platosList.map((p, idx) => (
                                                                    <tr key={idx}>
                                                                        <td style={{ padding: '6px 0' }}>{p.plato}</td>
                                                                        <td style={{ textAlign: 'center' }}>{p.cantidad}</td>
                                                                        <td style={{ textAlign: 'center' }}>#{p.comandaId}</td>
                                                                        <td style={{ textAlign: 'center' }}>Mesa {p.mesa}</td>
                                                                        <td style={{ textAlign: 'center' }}>{p.mozo}</td>
                                                                        <td style={{ textAlign: 'center' }}>{p.tiempoPrep > 0 ? `${p.tiempoPrep.toFixed(1)} min` : '-'}</td>
                                                                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{p.fecha}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Platos comandados por mozo */}
                    <div className="glass-panel" style={{ padding: 20, marginTop: 30, border: '1px solid var(--glass-border)', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                            <User size={24} style={{ color: 'var(--primary)' }} />
                            <h2 style={{ margin: 0, fontSize: '18px', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Platos comandados por mozo</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            {activeData.waiters.map(w => {
                                const wItems = activeData.waiterPlatos.filter(item => item.mozo === w.nombre);
                                const isExpanded = !!expandedWaiters[w.id];

                                // Group items by comandaId
                                const comandasMap = {};
                                wItems.forEach(item => {
                                    if (!comandasMap[item.comandaId]) {
                                        comandasMap[item.comandaId] = {
                                            id: item.comandaId,
                                            mesa: item.mesa,
                                            fecha: item.fecha,
                                            hora: item.hora,
                                            total: item.totalComanda,
                                            platos: []
                                        };
                                    }
                                    comandasMap[item.comandaId].platos.push(item);
                                });
                                const mozoComandas = Object.values(comandasMap);

                                return (
                                    <div key={w.id} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
                                        <button
                                            onClick={() => setExpandedWaiters(prev => ({ ...prev, [w.id]: !isExpanded }))}
                                            style={{
                                                width: '100%',
                                                padding: '12px 18px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                backgroundColor: 'rgba(255,255,255,0.02)',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--text-main)',
                                                fontFamily: '"Plus Jakarta Sans", sans-serif'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ fontWeight: 'bold', fontSize: 13, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{w.nombre} <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>({w.rol})</span></span>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>— {w.totalTables} pedidos</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                                <span style={{ color: 'var(--success)', fontWeight: 'bold', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>S/. {w.totalSales.toFixed(2)}</span>
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div style={{ padding: 15, backgroundColor: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                                {mozoComandas.length === 0 ? (
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Sin comandas registradas</div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                        {mozoComandas.map(c => (
                                                            <div key={c.id} style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, borderBottom: '1px dashed rgba(255,255,255,0.08)', paddingBottom: 6 }}>
                                                                    <span style={{ fontSize: 12, fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 'bold' }}>Comanda #{c.id} — Mesa {c.mesa} — {c.fecha} {c.hora}</span>
                                                                    <span style={{ fontSize: 12, fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 'bold', color: 'var(--success)' }}>Total: S/. {c.total.toFixed(2)}</span>
                                                                </div>
                                                                <table style={{ width: '100%', fontSize: 11, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                                                                    <thead>
                                                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                                            <th style={{ textAlign: 'left', padding: '4px 0' }}>Cant. x Plato</th>
                                                                            <th style={{ textAlign: 'center' }}>Precio</th>
                                                                            <th style={{ textAlign: 'center' }}>Cocinero</th>
                                                                            <th style={{ textAlign: 'center' }}>Kardex / Stock</th>
                                                                            <th style={{ textAlign: 'right' }}>Subtotal</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {c.platos.map((p, idx) => (
                                                                            <tr key={idx}>
                                                                                <td style={{ padding: '6px 0', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{p.cantidad} × {p.plato}</td>
                                                                                <td style={{ textAlign: 'center', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>S/. {p.precio.toFixed(2)}</td>
                                                                                <td style={{ textAlign: 'center', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{p.cocinero}</td>
                                                                                <td style={{ textAlign: 'center', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                                                                                    <span style={{
                                                                                        fontSize: 9,
                                                                                        padding: '2px 5px',
                                                                                        borderRadius: 6,
                                                                                        backgroundColor: p.kardexStatus === 'Stock descontado' ? 'rgba(34, 197, 94, 0.1)' : p.kardexStatus === 'Sin receta configurada' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(239, 68, 68, 0.1)',
                                                                                        color: p.kardexStatus === 'Stock descontado' ? '#22c55e' : p.kardexStatus === 'Sin receta configurada' ? 'var(--text-muted)' : '#ef4444',
                                                                                        fontFamily: '"Plus Jakarta Sans", sans-serif'
                                                                                    }}>
                                                                                        {p.kardexStatus}
                                                                                    </span>
                                                                                </td>
                                                                                <td style={{ textAlign: 'right', fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'var(--success)', fontWeight: 'bold' }}>S/. {p.subtotal.toFixed(2)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Detalle de comandas del período */}
                    <div className="glass-panel" style={{ padding: 20, marginTop: 30, border: '1px solid var(--glass-border)', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                            <Database size={24} style={{ color: 'var(--success)' }} />
                            <h2 style={{ margin: 0, fontSize: '18px', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Detalle de comandas del período (Auditoría)</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {activeData.comandasPeriodo.length === 0 ? (
                                <div className="text-center text-muted" style={{ padding: 20, fontSize: 12, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>No hay comandas registradas</div>
                            ) : (
                                activeData.comandasPeriodo.map(c => {
                                    const isExpanded = !!expandedOrders[c.id];
                                    return (
                                        <div key={c.id} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
                                            <button
                                                onClick={() => setExpandedOrders(prev => ({ ...prev, [c.id]: !isExpanded }))}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 18px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: 'rgba(255,255,255,0.02)',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-main)',
                                                    fontFamily: '"Plus Jakarta Sans", sans-serif'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: 13, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Comanda #{c.id} — Mesa {c.mesa}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>— {c.hora} ({c.mozo})</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                                    <span style={{ color: 'var(--success)', fontWeight: 'bold', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>S/. {c.total.toFixed(2)}</span>
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div style={{ padding: 15, backgroundColor: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <table style={{ width: '100%', fontSize: 11, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                                <th style={{ textAlign: 'left', padding: '4px 0' }}>Cant. x Plato</th>
                                                                <th style={{ textAlign: 'center' }}>Cocinero</th>
                                                                <th style={{ textAlign: 'center' }}>Kardex / Inventario</th>
                                                                <th style={{ textAlign: 'center' }}>Estado</th>
                                                                <th style={{ textAlign: 'right' }}>Subtotal</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {c.platos.map((p, idx) => (
                                                                <tr key={idx}>
                                                                    <td style={{ padding: '6px 0', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{p.cantidad} × {p.plato}</td>
                                                                    <td style={{ textAlign: 'center', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{p.cocinero}</td>
                                                                    <td style={{ textAlign: 'center', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                                                                        <span style={{
                                                                            fontSize: 9,
                                                                            padding: '2px 5px',
                                                                            borderRadius: 6,
                                                                            backgroundColor: p.kardexStatus === 'Stock descontado' ? 'rgba(34, 197, 94, 0.1)' : p.kardexStatus === 'Sin receta configurada' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(239, 68, 68, 0.1)',
                                                                            color: p.kardexStatus === 'Stock descontado' ? '#22c55e' : p.kardexStatus === 'Sin receta configurada' ? 'var(--text-muted)' : '#ef4444',
                                                                            fontFamily: '"Plus Jakarta Sans", sans-serif'
                                                                        }}>
                                                                            {p.kardexStatus}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ textAlign: 'center', color: p.estado === 'entregado' ? 'var(--success)' : 'var(--warning)', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{p.estado}</td>
                                                                    <td style={{ textAlign: 'right', fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'var(--success)', fontWeight: 'bold' }}>S/. {(p.precio * p.cantidad).toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffStatsView;
