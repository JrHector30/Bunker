import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import {
    User,
    ChefHat,
    FileText,
    CalendarDays,
    ChevronDown,
    ChevronUp,
    Database,
    Calendar,
    FileDown,
    FolderOpen,
    Inbox,
    X,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import { getActiveRestaurantName } from '../utils/tenant';
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

const KitchenDonutTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0].payload;

    return (
        <div className="rounded-lg border border-slate-200/80 bg-white/95 px-2.5 py-1.5 text-xs shadow-md backdrop-blur-sm dark:border-slate-700 dark:bg-[#1A2232]/95 pointer-events-none">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                />
                <span>{item.label}:</span>
                <span className="text-[#F26522] font-bold tabular-nums">
                    {item.dishesCount} platos ({item.percentage}%)
                </span>
            </div>
            {item.avgPrepMinutes > 0 ? (
                <p className="mt-0.5 text-[10px] text-slate-500 tabular-nums dark:text-slate-400">
                    Promedio: ~{item.avgPrepMinutes} min
                </p>
            ) : null}
        </div>
    );
};

const WAITER_COLORS = ['#0ea5e9', '#3b82f6', '#22d3ee', '#2dd4bf', '#6366f1', '#8b5cf6', '#06b6d4', '#60a5fa'];
const COOK_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#dc2626', '#ea580c', '#b91c1c', '#d97706'];

const CookDonutChart = ({
    totalCookDishes,
    cookChartSegments,
    activeCookId,
    setActiveCookId,
    activeCookSegment,
}) => {
    return (
        <section
            aria-label="Platos por Cocinero"
            className="flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs"
        >
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Platos por Cocinero
                    </h2>
                </div>
                <span className="text-[11px] font-semibold text-[#F26522] tabular-nums">
                    {totalCookDishes} platos
                </span>
            </div>

            {cookChartSegments.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                    Sin platos preparados en este período
                </div>
            ) : (
                <>
                    <div className="my-auto flex flex-col items-center justify-around gap-3 py-1 sm:flex-row">
                        <div className="relative h-[150px] w-[150px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={cookChartSegments}
                                        dataKey="dishesCount"
                                        nameKey="label"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={44}
                                        outerRadius={68}
                                        startAngle={90}
                                        endAngle={-270}
                                        stroke="transparent"
                                        strokeWidth={2}
                                        isAnimationActive={true}
                                        animationDuration={450}
                                        onMouseEnter={(_, index) => {
                                            const seg = cookChartSegments[index];
                                            if (seg) setActiveCookId(seg.id);
                                        }}
                                        onMouseLeave={() => setActiveCookId(null)}
                                    >
                                        {cookChartSegments.map((segment) => {
                                            const isHovered = activeCookId === segment.id;
                                            const isDimmed = activeCookId !== null && !isHovered;
                                            return (
                                                <Cell
                                                    key={segment.id}
                                                    fill={segment.color}
                                                    fillOpacity={isDimmed ? 0.35 : 1}
                                                    className="cursor-pointer transition-opacity duration-150 outline-none"
                                                />
                                            );
                                        })}
                                    </Pie>
                                    <Tooltip content={<KitchenDonutTooltip />} wrapperStyle={{ zIndex: 30 }} />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Central count / percentage indicator */}
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-lg font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
                                    {activeCookSegment ? `${activeCookSegment.percentage}%` : `${totalCookDishes}`}
                                </span>
                                <span className="max-w-[76px] truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    {activeCookSegment ? activeCookSegment.label : 'Total Platos'}
                                </span>
                            </div>
                        </div>

                        {/* Legend pills */}
                        <div className="flex w-full flex-col justify-center gap-1 sm:max-w-[160px]">
                            {cookChartSegments.map((segment) => {
                                const isHovered = activeCookId === segment.id;
                                return (
                                    <div
                                        key={segment.id}
                                        onMouseEnter={() => setActiveCookId(segment.id)}
                                        onMouseLeave={() => setActiveCookId(null)}
                                        onClick={() => setActiveCookId(prev => prev === segment.id ? null : segment.id)}
                                        className={`flex cursor-pointer items-center justify-between rounded-lg px-2 py-1 text-xs transition-colors ${
                                            isHovered
                                                ? 'bg-slate-100 font-semibold dark:bg-slate-800'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span
                                                className="h-2 w-2 rounded-xs shrink-0"
                                                style={{ backgroundColor: segment.color }}
                                            />
                                            <span className="text-slate-600 dark:text-slate-300 truncate">
                                                {segment.label}
                                            </span>
                                        </div>
                                        <span className="font-semibold text-slate-800 tabular-nums dark:text-slate-200 shrink-0 ml-1">
                                            {segment.percentage}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary card */}
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 mt-2">
                        {activeCookSegment ? (
                            <p className="truncate text-center">
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                    {activeCookSegment.label}:
                                </span>{' '}
                                {activeCookSegment.dishesCount} platos ({activeCookSegment.percentage}%) • Prom: ~{activeCookSegment.avgPrepMinutes} min
                            </p>
                        ) : (
                            <p className="truncate text-center text-slate-500 dark:text-slate-400">
                                Total preparado en cocina: <strong>{totalCookDishes} platos</strong>
                            </p>
                        )}
                    </div>
                </>
            )}
        </section>
    );
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
    const [activeCookId, setActiveCookId] = useState(null);

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
        fetch(`/api/staff/stats?arqueoId=${arqueoId}&_t=${Date.now()}`)
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
        fetch(`/api/staff/stats/sessions?date=${dateQueryStr}&_t=${Date.now()}`)
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
                    if (c.estado && c.estado !== 'cerrada') {
                        kardexStatus = 'Pendiente de cobro';
                    } else {
                        const hasMovement = movimientosInsumo.some(k =>
                            k.motivo && (k.motivo.includes(`Comanda ID: ${c.id}`) || k.motivo.includes(`Comanda #${c.id}`))
                        );
                        kardexStatus = hasMovement ? 'Stock descontado' : 'Stock verificado';
                    }
                } else {
                    kardexStatus = 'Sin receta configurada';
                }

                const itemDetail = {
                    mozo: uName,
                    comandaId: c.id,
                    numeroComanda: c.numeroComanda || c.id,
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
                        numeroComanda: c.numeroComanda || c.id,
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
                    if (c.estado && c.estado !== 'cerrada') {
                        kardexStatus = 'Pendiente de cobro';
                    } else {
                        const hasMovement = movimientosInsumo.some(k =>
                            k.motivo && (k.motivo.includes(`Comanda ID: ${c.id}`) || k.motivo.includes(`Comanda #${c.id}`))
                        );
                        kardexStatus = hasMovement ? 'Stock descontado' : 'Stock verificado';
                    }
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
                numeroComanda: c.numeroComanda || c.id,
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

    const totalCookDishes = useMemo(() => {
        return (activeData.cookChartData || []).reduce((acc, c) => acc + (c.totalDishes || 0), 0);
    }, [activeData.cookChartData]);

    const cookChartSegments = useMemo(() => {
        return (activeData.cookChartData || []).map((c, index) => {
            const pct = totalCookDishes > 0 ? Math.round((c.totalDishes / totalCookDishes) * 100) : 0;
            return {
                id: c.id,
                label: c.nombre,
                dishesCount: c.totalDishes,
                percentage: pct,
                avgPrepMinutes: c.avgTimeMin ? parseFloat(c.avgTimeMin.toFixed(1)) : 0,
                color: COOK_COLORS[index % COOK_COLORS.length]
            };
        });
    }, [activeData.cookChartData, totalCookDishes]);

    const activeCookSegment = useMemo(() => {
        return cookChartSegments.find(s => s.id === activeCookId) || null;
    }, [cookChartSegments, activeCookId]);

    const arqueoComboboxItems = useMemo(() => {
        return sessions.map(s => {
            const startStr = format(new Date(s.fechaInicio), 'HH:mm');
            const endStr = s.fechaFin ? format(new Date(s.fechaFin), 'HH:mm') : 'Activa';
            const userName = s.usuario?.nombre || 'Hector';
            return {
                id: String(s.id),
                name: `Arqueo #${s.numeroSesion != null ? s.numeroSesion : s.id} (${startStr} - ${endStr}) - Resp: ${userName}`
            };
        });
    }, [sessions]);

    const selectedArqueoItem = useMemo(() => {
        if (!selectedArqueoId) return arqueoComboboxItems[0] || null;
        return arqueoComboboxItems.find(item => String(item.id) === String(selectedArqueoId)) || arqueoComboboxItems[0] || null;
    }, [arqueoComboboxItems, selectedArqueoId]);

    // 7. Cleanup/Daily Delete functionality
    const handleCleanDay = async () => {
        if (!arqueoInfo) return;
        const arqueoLabel = `Arqueo N° ${arqueoInfo.numeroSesion != null ? arqueoInfo.numeroSesion : arqueoInfo.id}`;
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
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const restName = getActiveRestaurantName();
        const rangeLabel = arqueoInfo.fechaFin
            ? `${format(new Date(arqueoInfo.fechaInicio), 'dd/MM/yy HH:mm')} a ${format(new Date(arqueoInfo.fechaFin), 'dd/MM/yy HH:mm')}`
            : `${format(new Date(arqueoInfo.fechaInicio), 'dd/MM/yy HH:mm')} a Abierta`;
        const sesionNum = arqueoInfo.numeroSesion != null ? arqueoInfo.numeroSesion : arqueoInfo.id;

        // 1. BANNER DE ENCABEZADO EJECUTIVO
        doc.setFillColor(15, 23, 42); // Slate 900
        doc.rect(0, 0, 210, 36, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(restName.toUpperCase(), 14, 15);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text("REPORTE INTEGRAL DE RENDIMIENTO & AUDITORÍA DE VENTAS", 14, 22);
        doc.text(`Arqueo N° ${sesionNum} (${arqueoInfo.estado.toUpperCase()})  •  Período: ${rangeLabel}`, 14, 29);

        // 2. TARJETAS DE KPIS PRINCIPALES
        let startY = 44;
        const cardWidth = 43;
        const cardHeight = 18;
        const totalPlatos = activeData.waiterPlatos.reduce((s, p) => s + (p.cantidad || 1), 0);
        const kpis = [
            { label: 'VENTAS TOTALES', val: `S/. ${activeData.totalSales.toFixed(2)}`, color: [16, 185, 129] },
            { label: 'COMANDAS COBRADAS', val: `${activeData.totalOrders}`, color: [14, 165, 233] },
            { label: 'PLATOS TOTALES', val: `${totalPlatos}`, color: [168, 85, 247] },
            { label: 'FILTRO FECHA', val: filteredDay === 'TODO' ? 'Todo el rango' : filteredDay, color: [245, 158, 11] }
        ];

        kpis.forEach((kpi, idx) => {
            const x = 14 + (idx * (cardWidth + 3));
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'FD');

            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(100, 116, 139);
            doc.text(kpi.label, x + 3, startY + 5);

            doc.setFontSize(10);
            doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
            doc.text(kpi.val, x + 3, startY + 13);
        });

        startY = 68;

        // 3. TABLA: RENDIMIENTO DE MOZOS
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("1. Rendimiento del Personal de Salón (Mozos)", 14, startY);

        const waiterRows = activeData.waiters.map(w => {
            const avg = w.totalTables > 0 ? (w.totalSales / w.totalTables).toFixed(2) : '0.00';
            return [
                w.nombre,
                w.rol ? w.rol.toUpperCase() : 'MOZO',
                `${w.totalTables} pedidos`,
                `S/. ${w.totalSales.toFixed(2)}`,
                `S/. ${avg}`
            ];
        });

        autoTable(doc, {
            startY: startY + 4,
            head: [['Nombre', 'Rol', 'Pedidos Atendidos', 'Venta Total', 'Ticket Promedio']],
            body: waiterRows.length > 0 ? waiterRows : [['Sin mozos registrados', '-', '0', 'S/. 0.00', 'S/. 0.00']],
            theme: 'grid',
            headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 8.5, textColor: 50 },
            margin: { left: 14, right: 14 }
        });

        // 4. TABLA: RENDIMIENTO DE COCINA
        let nextY = doc.lastAutoTable.finalY + 10;
        if (nextY > 240) { doc.addPage(); nextY = 20; }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("2. Rendimiento de Cocina & Tiempos de Despacho", 14, nextY);

        const cookRows = activeData.cooks.map(c => [
            c.nombre,
            `${c.totalDishes} platos`,
            c.avgTimeMin > 0 ? `${c.avgTimeMin.toFixed(2)} min` : '-'
        ]);

        autoTable(doc, {
            startY: nextY + 4,
            head: [['Cocinero / Chef', 'Platos Preparados', 'Tiempo Promedio de Prep.']],
            body: cookRows.length > 0 ? cookRows : [['Sin cocineros registrados', '0 platos', '-']],
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 8.5, textColor: 50 },
            margin: { left: 14, right: 14 }
        });

        // 5. SECCIÓN: EVOLUCIÓN DIARIA Y VOLUMEN DE PEDIDOS
        nextY = doc.lastAutoTable.finalY + 10;
        if (dailyChartData && dailyChartData.length > 0) {
            if (nextY > 220) { doc.addPage(); nextY = 20; }

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 41, 59);
            doc.text("3. Tendencia Diaria de Ventas & Volumen del Período", 14, nextY);

            const dailyRows = dailyChartData.map(d => [
                d.label,
                `${d.ordersCount} pedidos`,
                `${d.dishesCount} platos`,
                `S/. ${d.salesTotal.toFixed(2)}`
            ]);

            autoTable(doc, {
                startY: nextY + 4,
                head: [['Fecha', 'Comandas', 'Platos Despachados', 'Venta Bruta (S/.)']],
                body: dailyRows,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9 },
                bodyStyles: { fontSize: 8.5, textColor: 50 },
                margin: { left: 14, right: 14 }
            });
        }

        // 6. TABLA: PLATOS COMANDADOS POR MOZO
        doc.addPage();
        nextY = 20;

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("4. Detalle de Platos Comandados por Mozo", 14, nextY);

        const platosMozoRows = activeData.waiterPlatos.map(p => [
            p.mozo,
            `#${p.numeroComanda || p.comandaId}`,
            `Mesa ${p.mesa}`,
            p.hora,
            p.plato,
            `${p.cantidad}`,
            `S/. ${p.precio.toFixed(2)}`,
            `S/. ${p.subtotal.toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: nextY + 4,
            head: [['Mozo', 'Comanda', 'Mesa', 'Hora', 'Plato / Producto', 'Cant.', 'P. Unit', 'Subtotal']],
            body: platosMozoRows.length > 0 ? platosMozoRows : [['Sin platos comandados', '-', '-', '-', '-', '0', '0.00', '0.00']],
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
            bodyStyles: { fontSize: 7.5, textColor: 50 },
            margin: { left: 14, right: 14 }
        });

        // 7. TABLA: AUDITORÍA DE COMANDAS & KARDEX
        nextY = doc.lastAutoTable.finalY + 12;
        if (nextY > 230) { doc.addPage(); nextY = 20; }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("5. Auditoría de Comandas del Período (Kardex e Inventario)", 14, nextY);

        const auditoriaRows = [];
        activeData.comandasPeriodo.forEach(c => {
            (c.platos || []).forEach(p => {
                auditoriaRows.push([
                    `#${c.numeroComanda || c.id}`,
                    `Mesa ${c.mesa}`,
                    c.hora,
                    c.mozo,
                    `${p.cantidad} × ${p.plato}`,
                    p.cocinero || 'No aplica',
                    p.kardexStatus || 'Stock verificado',
                    `S/. ${(p.precio * p.cantidad).toFixed(2)}`
                ]);
            });
        });

        autoTable(doc, {
            startY: nextY + 4,
            head: [['Comanda', 'Mesa', 'Hora', 'Mozo', 'Plato / Detalle', 'Cocinero', 'Estado Kardex', 'Subtotal']],
            body: auditoriaRows.length > 0 ? auditoriaRows : [['Sin comandas auditadas', '-', '-', '-', '-', '-', '-', '0.00']],
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
            bodyStyles: { fontSize: 7.5, textColor: 50 },
            margin: { left: 14, right: 14 }
        });

        // 8. NUMERACIÓN DE PÁGINAS AL PIE
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Página ${i} de ${totalPages}  •  ${restName}  •  Generado el ${new Date().toLocaleString('es-PE')}`, 14, 290);
        }

        const safeName = restName.replace(/[^a-zA-Z0-9]/g, '_');
        doc.save(`${safeName}_Reporte_Rendimiento_Arqueo_${sesionNum}.pdf`);
    };

    return (
        <div className="p-3 sm:p-5 md:p-6 space-y-4 max-w-7xl mx-auto">
            {/* ========================================================================= */}
            {/* MOBILE VIEW (md:hidden)                                                  */}
            {/* ========================================================================= */}
            <div className="block md:hidden space-y-4">
                {/* Header Mobile */}
                <header className="space-y-3">
                    <div>
                        <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                            Rendimiento y Reportes
                        </h1>
                        {arqueoInfo && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                                Caja N° {arqueoInfo.numeroSesion != null ? arqueoInfo.numeroSesion : arqueoInfo.id} ({arqueoInfo.estado === 'abierto' ? 'Abierta' : 'Cerrada'}) • Resp:{' '}
                                <strong className="text-slate-700 dark:text-slate-200">
                                    {sessions.find(s => s.id === arqueoInfo.id)?.usuario?.nombre || 'Hector'}
                                </strong>
                            </p>
                        )}
                    </div>

                    {/* Controles Fecha / Arqueo / Limpiar / PDF */}
                    <div className="space-y-2">
                        {sessions.length > 1 && (
                            <SimpleCombobox
                                items={arqueoComboboxItems}
                                selectedItem={selectedArqueoItem}
                                onSelect={(item) => {
                                    if (item) {
                                        const valId = parseInt(item.id);
                                        setSelectedArqueoId(valId);
                                        fetchArqueoStats(valId, true);
                                    }
                                }}
                                placeholder="Seleccionar arqueo..."
                            />
                        )}

                        <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                                <DropdownRangeDatePicker
                                    mode="single"
                                    value={date}
                                    onChange={(selectedDate) => {
                                        if (selectedDate) {
                                            setDate(selectedDate);
                                            setSelectedArqueoId(null);
                                            setFilteredDay('TODO');
                                        }
                                    }}
                                    placeholder="Seleccionar Fecha"
                                    triggerClassName="!w-full"
                                />
                            </div>
                            {arqueoInfo && (
                                <button
                                    type="button"
                                    onClick={handleExportPDF}
                                    className="min-h-[42px] px-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
                                >
                                    <FileDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                    <span>PDF</span>
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* Loading Indicator Mobile */}
                {loading && (
                    <div className="flex justify-center py-10">
                        <div className="border-3 border-slate-200 border-t-[#F26522] rounded-full w-8 h-8 animate-spin" />
                    </div>
                )}

                {/* Error Alert Mobile */}
                {!loading && error && (
                    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 p-5 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto mb-2">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">Error de Conexión</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{error}</p>
                    </div>
                )}

                {/* ESTADO 1: No hay sesión de caja Mobile */}
                {!loading && !error && sessions.length === 0 && (
                    <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                            <Inbox className="w-6 h-6" />
                        </div>
                        <h2 className="mt-3 text-base font-bold text-slate-900 dark:text-white">No hay sesión de caja</h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            No se ha encontrado ninguna apertura de caja registrada para la fecha seleccionada ({dateDisplayStr}).
                        </p>
                    </section>
                )}

                {/* ESTADO 2: Múltiples Cajas Detectadas Mobile */}
                {!loading && !error && (requiresSelection || (sessions.length > 1 && !arqueoInfo)) && (
                    <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 text-center space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto">
                            <FolderOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">Múltiples Cajas Detectadas</h2>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Se abrieron varias sesiones el día {dateDisplayStr}. Selecciona una sesión:
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                            {sessions.map((sess) => {
                                const startStr = format(new Date(sess.fechaInicio), 'HH:mm');
                                const endStr = sess.fechaFin ? format(new Date(sess.fechaFin), 'HH:mm') : 'Activa';
                                const userName = sess.usuario?.nombre || 'Hector';
                                return (
                                    <button
                                        key={sess.id}
                                        type="button"
                                        onClick={() => {
                                            setRequiresSelection(false);
                                            setSelectedArqueoId(sess.id);
                                            fetchArqueoStats(sess.id, true);
                                        }}
                                        className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 text-left flex items-center justify-between gap-2 active:scale-[0.99] transition-transform cursor-pointer"
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                                                Arqueo N° {sess.numeroSesion != null ? sess.numeroSesion : sess.id}
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                                                {startStr} a {endStr} ({sess.estado === 'abierto' ? 'Abierta' : 'Cerrada'})
                                            </p>
                                        </div>
                                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                                            Resp: {userName}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ESTADO 3: Reporte Completo en Mobile */}
                {!loading && !error && arqueoInfo && (
                    <div className="space-y-3.5">
                        {/* Filtro por día de caja */}
                        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-1.5">
                            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                                Filtrar reporte por día de caja:
                            </label>
                            <SimpleCombobox
                                items={comboboxItems}
                                selectedItem={selectedComboboxItem}
                                onSelect={(item) => {
                                    if (item) setFilteredDay(item.id);
                                }}
                                placeholder="Seleccionar día de caja..."
                            />
                        </div>

                        {/* 2 KPIs */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 text-center">
                                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Venta Total</p>
                                <p className="mt-1 text-xl font-bold text-emerald-500 tabular-nums">
                                    S/. {activeData.totalSales.toFixed(2)}
                                </p>
                                <p className="mt-0.5 text-[10px] text-slate-400">Monto cobrado</p>
                            </div>
                            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 text-center">
                                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Pedidos Atendidos</p>
                                <p className="mt-1 text-xl font-bold text-[#F26522] tabular-nums">
                                    {activeData.totalOrders}
                                </p>
                                <p className="mt-0.5 text-[10px] text-slate-400">Finalizadas</p>
                            </div>
                        </div>

                        {/* Platos por Cocinero Mobile (Gráfico Donut idéntico a Estado de Cocina) */}
                        <CookDonutChart
                            totalCookDishes={totalCookDishes}
                            cookChartSegments={cookChartSegments}
                            activeCookId={activeCookId}
                            setActiveCookId={setActiveCookId}
                            activeCookSegment={activeCookSegment}
                        />

                        {/* Detalle Mozos Mobile */}
                        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-2.5">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-[#F26522]" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Detalle Mozos</h3>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {activeData.waiters.map((w) => (
                                    <div key={w.id} className="py-2.5 flex items-center justify-between text-xs">
                                        <div>
                                            <span className="font-bold text-slate-900 dark:text-white">{w.nombre}</span>
                                            <span className="text-slate-400 ml-1">({w.rol || 'mozo'})</span>
                                            <p className="text-[11px] text-slate-400 tabular-nums">{w.totalTables} pedidos</p>
                                        </div>
                                        <span className="font-bold text-emerald-500 text-sm tabular-nums">
                                            S/. {parseFloat(Number(w.totalSales).toFixed(2))}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Detalle Cocina Mobile */}
                        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-2.5">
                            <div className="flex items-center gap-2">
                                <ChefHat className="w-4 h-4 text-amber-500" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Detalle Cocina</h3>
                            </div>
                            <div className="space-y-2">
                                {activeData.cooks.map((chef) => {
                                    const isOpen = !!expandedCooks[chef.id];
                                    return (
                                        <div key={chef.id} className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => setExpandedCooks((p) => ({ ...p, [chef.id]: !p[chef.id] }))}
                                                className="w-full px-3.5 py-3 flex items-center justify-between gap-2 text-left bg-slate-50/70 dark:bg-slate-800/40"
                                            >
                                                <div className="min-w-0">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">{chef.nombre}</span>
                                                    <span className="text-[11px] text-slate-400 ml-1.5 tabular-nums">— {chef.totalDishes} platos</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                                                    <span>
                                                        Prom: <strong className="text-slate-800 dark:text-slate-200">{chef.avgTimeMin > 0 ? chef.avgTimeMin.toFixed(2) : '-'} min</strong>
                                                    </span>
                                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>

                                            {isOpen && (
                                                <div className="px-3.5 pb-2 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                                                    {(chef.platosList || []).map((dish, idx) => (
                                                        <div key={`${dish.numeroComanda || dish.comandaId}-${idx}`} className="py-2.5 flex items-start justify-between gap-2 text-xs">
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-slate-800 dark:text-slate-100">
                                                                    {dish.cantidad}× {dish.plato}
                                                                </p>
                                                                <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                                                                    Comanda #{dish.numeroComanda || dish.comandaId} · Mesa {dish.mesa} · {dish.mozo}
                                                                </p>
                                                            </div>
                                                            <div className="text-right shrink-0 tabular-nums">
                                                                <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[11px] font-bold">
                                                                    {dish.tiempoPrep > 0 ? `${dish.tiempoPrep.toFixed(1)} min` : '—'}
                                                                </span>
                                                                <p className="text-[10.5px] text-slate-400 mt-0.5">{dish.fecha || '—'}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Platos comandados por mozo Mobile */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                                <User className="w-4 h-4 text-[#F26522]" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Platos comandados por mozo</h3>
                            </div>
                            {activeData.waiters.map((w) => {
                                const wItems = activeData.waiterPlatos.filter(item => item.mozo === w.nombre);
                                const isOpen = !!expandedWaiters[w.id];

                                // Group items by comandaId
                                const comandasMap = {};
                                wItems.forEach(item => {
                                    if (!comandasMap[item.comandaId]) {
                                        comandasMap[item.comandaId] = {
                                            id: item.comandaId,
                                            numeroComanda: item.numeroComanda || item.comandaId,
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
                                    <div key={w.id} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedWaiters((p) => ({ ...p, [w.id]: !p[w.id] }))}
                                            className="w-full px-4 py-3 flex items-center justify-between text-left"
                                        >
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white">{w.nombre}</p>
                                                <p className="text-[11px] text-slate-400 tabular-nums">{w.totalTables} pedidos</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-emerald-500 tabular-nums">S/. {parseFloat(Number(w.totalSales).toFixed(2))}</span>
                                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </div>
                                        </button>

                                        {isOpen && (
                                            <div className="px-3 pb-3 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                                                {mozoComandas.map((cmd) => (
                                                    <div key={cmd.id} className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                                                                Comanda #{cmd.numeroComanda} · Mesa {cmd.mesa}
                                                            </span>
                                                            <span className="font-bold text-emerald-500 tabular-nums">S/. {Number(cmd.total).toFixed(2)}</span>
                                                        </div>
                                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                            {cmd.platos.map((item, pIdx) => (
                                                                <div key={pIdx} className="py-2 flex items-start justify-between gap-2 text-xs">
                                                                    <div className="min-w-0">
                                                                        <p className="font-semibold text-slate-800 dark:text-slate-100">{item.cantidad} x {item.plato}</p>
                                                                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                                            {item.kardexStatus === 'Stock descontado' || item.kardexStatus === 'Stock verificado' ? (
                                                                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                                                            ) : (
                                                                                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                                                                            )}
                                                                            <span className="truncate">{item.cocinero} · {item.kardexStatus}</span>
                                                                        </p>
                                                                    </div>
                                                                    <span className="font-bold text-emerald-500 tabular-nums shrink-0">
                                                                        S/. {Number(item.total).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Detalle de comandas (Auditoría Mobile) */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                                <Database className="w-4 h-4 text-emerald-500" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Detalle de comandas (Auditoría)</h3>
                            </div>
                            {activeData.comandasPeriodo.map((cmd) => {
                                const isOpen = !!expandedOrders[cmd.id];
                                return (
                                    <div key={cmd.id} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedOrders((p) => ({ ...p, [cmd.id]: !p[cmd.id] }))}
                                            className="w-full px-4 py-3 flex items-center justify-between text-left"
                                        >
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                                                    Comanda #{cmd.numeroComanda} — Mesa {cmd.mesa}
                                                </p>
                                                <p className="text-[11px] text-slate-400 tabular-nums">{cmd.hora} ({cmd.mozo})</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-emerald-500 tabular-nums">S/. {cmd.total.toFixed(2)}</span>
                                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </div>
                                        </button>

                                        {isOpen && (
                                            <div className="px-4 pb-3 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                                                {(cmd.platos || []).map((item, idx) => (
                                                    <div key={idx} className="py-2.5 flex items-start justify-between gap-2 text-xs">
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-slate-800 dark:text-slate-100">{item.cantidad} x {item.plato}</p>
                                                            <p className="text-[11px] text-slate-400 mt-0.5">{item.cocinero} · {item.kardexStatus}</p>
                                                            <span className="inline-block mt-1 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                {item.estado}
                                                            </span>
                                                        </div>
                                                        <span className="font-bold text-emerald-500 tabular-nums shrink-0">
                                                            S/. {(item.precio * item.cantidad).toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* DESKTOP VIEW (hidden md:block)                                            */}
            {/* ========================================================================= */}
            <div className="hidden md:block space-y-6">
                {/* Top Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 15 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '24px' }}>Rendimiento y Reportes</h1>
                        {arqueoInfo && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                                Caja N° {arqueoInfo.numeroSesion != null ? arqueoInfo.numeroSesion : arqueoInfo.id} ({arqueoInfo.estado === 'abierto' ? 'Abierta' : 'Cerrada'})
                                {sessions.find(s => s.id === arqueoInfo.id)?.usuario?.nombre && (
                                    <> • Resp: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{sessions.find(s => s.id === arqueoInfo.id).usuario.nombre}</span></>
                                )}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 40 }}>
                    {/* Badge informativo para un solo arqueo */}
                    {sessions.length === 1 && (() => {
                        const s = sessions[0];
                        const startStr = format(new Date(s.fechaInicio), 'HH:mm');
                        const endStr = s.fechaFin ? format(new Date(s.fechaFin), 'HH:mm') : 'Activa';
                        const userName = s.usuario?.nombre || 'Hector';
                        return (
                            <div
                                className="glass-button"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '6px 14px',
                                    fontSize: 12,
                                    borderRadius: 12,
                                    fontWeight: 'bold',
                                    cursor: 'default',
                                    userSelect: 'none'
                                }}
                            >
                                <CalendarDays size={16} className="text-teal-400" />
                                <span>Arqueo #{s.numeroSesion != null ? s.numeroSesion : s.id} ({startStr} - {endStr}) - Resp: {userName}</span>
                            </div>
                        );
                    })()}

                    {/* Secondary selector for multiple arqueos */}
                    {sessions.length > 1 && (
                        <div style={{ minWidth: 260 }}>
                            <SimpleCombobox
                                items={arqueoComboboxItems}
                                selectedItem={selectedArqueoItem}
                                onSelect={(item) => {
                                    if (item) {
                                        const valId = parseInt(item.id);
                                        setSelectedArqueoId(valId);
                                        fetchArqueoStats(valId, true);
                                    }
                                }}
                                placeholder="Seleccionar arqueo..."
                            />
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
                            const userName = s.usuario?.nombre || 'Hector';
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
                                    <span style={{ fontWeight: 'black', fontSize: 14 }}>Arqueo N° {s.numeroSesion != null ? s.numeroSesion : s.id}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{startStr} a {endStr} ({s.estado === 'abierto' ? 'Abierta' : 'Cerrada'})</span>
                                    <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 'semibold', marginTop: 2 }}>Resp: {userName}</span>
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

                        {/* 3. Kitchen Efficiency Donut Chart (Matching Estado de Cocina) */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <CookDonutChart
                                totalCookDishes={totalCookDishes}
                                cookChartSegments={cookChartSegments}
                                activeCookId={activeCookId}
                                setActiveCookId={setActiveCookId}
                                activeCookSegment={activeCookSegment}
                            />
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
                                            <div key={c.id} style={{ border: '1px solid var(--glass-border)', borderRadius: 12, overflow: 'hidden' }}>
                                                <button
                                                    onClick={() => setExpandedCooks(prev => ({ ...prev, [c.id]: !isExpanded }))}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 16px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        backgroundColor: 'var(--bg-secondary)',
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
                                                    <div style={{ padding: 12, backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--glass-border)' }}>
                                                        <div className="overflow-x-auto">
                                                            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'separate', borderSpacing: 0 }}>
                                                                <thead>
                                                                    <tr style={{ background: 'var(--primary)', color: '#ffffff' }}>
                                                                        <th style={{ textAlign: 'left', padding: '8px 12px', borderTopLeftRadius: 10, borderBottomLeftRadius: 10, fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Plato</th>
                                                                        <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Cant.</th>
                                                                        <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Comanda</th>
                                                                        <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Mesa</th>
                                                                        <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Mozo</th>
                                                                        <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Tiempo</th>
                                                                        <th style={{ textAlign: 'right', padding: '8px 12px', borderTopRightRadius: 10, borderBottomRightRadius: 10, fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Hora Listo</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {c.platosList.map((p, idx) => (
                                                                        <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                                            <td style={{ padding: '8px 12px', color: 'var(--text-main)', fontWeight: 500 }}>{p.plato}</td>
                                                                            <td style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-main)' }}>{p.cantidad}</td>
                                                                            <td style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-muted)' }}>#{p.numeroComanda || p.comandaId}</td>
                                                                            <td style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-main)' }}>Mesa {p.mesa}</td>
                                                                            <td style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-main)' }}>{p.mozo}</td>
                                                                            <td style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-main)' }}>{p.tiempoPrep > 0 ? `${p.tiempoPrep.toFixed(1)} min` : '-'}</td>
                                                                            <td style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)' }}>{p.fecha}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
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
                                            numeroComanda: item.numeroComanda || item.comandaId,
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
                                    <div key={w.id} style={{ border: '1px solid var(--glass-border)', borderRadius: 12, overflow: 'hidden' }}>
                                        <button
                                            onClick={() => setExpandedWaiters(prev => ({ ...prev, [w.id]: !isExpanded }))}
                                            style={{
                                                width: '100%',
                                                padding: '12px 18px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                backgroundColor: 'var(--bg-secondary)',
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
                                            <div style={{ padding: 15, backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--glass-border)' }}>
                                                {mozoComandas.length === 0 ? (
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Sin comandas registradas</div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                        {mozoComandas.map(c => (
                                                            <div key={c.id} style={{ backgroundColor: 'var(--bg-secondary)', padding: 12, borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, borderBottom: '1px dashed var(--glass-border)', paddingBottom: 8 }}>
                                                                    <span style={{ fontSize: 12, fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 'bold', color: 'var(--text-main)' }}>Comanda #{c.numeroComanda || c.id} — Mesa {c.mesa} — {c.fecha} {c.hora}</span>
                                                                    <span style={{ fontSize: 12, fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 'bold', color: 'var(--success)' }}>Total: S/. {c.total.toFixed(2)}</span>
                                                                </div>
                                                                <div className="overflow-x-auto">
                                                                    <table style={{ width: '100%', fontSize: 11, fontFamily: '"Plus Jakarta Sans", sans-serif', borderCollapse: 'separate', borderSpacing: 0 }}>
                                                                        <thead>
                                                                            <tr style={{ background: 'var(--primary)', color: '#ffffff' }}>
                                                                                <th style={{ textAlign: 'left', padding: '8px 12px', borderTopLeftRadius: 10, borderBottomLeftRadius: 10, fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Cant. x Plato</th>
                                                                                <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Precio</th>
                                                                                <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Cocinero</th>
                                                                                <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Kardex / Stock</th>
                                                                                <th style={{ textAlign: 'right', padding: '8px 12px', borderTopRightRadius: 10, borderBottomRightRadius: 10, fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Subtotal</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {c.platos.map((p, idx) => (
                                                                                <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                                                    <td style={{ padding: '8px 12px', fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'var(--text-main)', fontWeight: 500 }}>{p.cantidad} × {p.plato}</td>
                                                                                    <td style={{ textAlign: 'center', padding: '8px 12px', fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'var(--text-main)' }}>S/. {p.precio.toFixed(2)}</td>
                                                                                    <td style={{ textAlign: 'center', padding: '8px 12px', fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'var(--text-muted)' }}>{p.cocinero}</td>
                                                                                    <td style={{ textAlign: 'center', padding: '8px 12px', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                                                                                        <span style={{
                                                                                            fontSize: 9,
                                                                                            padding: '2px 6px',
                                                                                            borderRadius: 6,
                                                                                            backgroundColor: (p.kardexStatus === 'Stock descontado' || p.kardexStatus === 'Stock verificado') 
                                                                                                ? 'rgba(34, 197, 94, 0.15)' 
                                                                                                : p.kardexStatus === 'Pendiente de cobro'
                                                                                                ? 'rgba(245, 158, 11, 0.15)'
                                                                                                : (p.kardexStatus === 'Sin receta configurada' || p.kardexStatus === 'No afecta inventario')
                                                                                                ? 'rgba(255, 255, 255, 0.05)' 
                                                                                                : 'rgba(239, 68, 68, 0.15)',
                                                                                            color: (p.kardexStatus === 'Stock descontado' || p.kardexStatus === 'Stock verificado')
                                                                                                ? '#22c55e'
                                                                                                : p.kardexStatus === 'Pendiente de cobro'
                                                                                                ? '#f59e0b'
                                                                                                : (p.kardexStatus === 'Sin receta configurada' || p.kardexStatus === 'No afecta inventario')
                                                                                                ? 'var(--text-muted)'
                                                                                                : '#ef4444',
                                                                                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                                                                                            fontWeight: 600
                                                                                        }}>
                                                                                            {p.kardexStatus}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td style={{ textAlign: 'right', padding: '8px 12px', fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'var(--success)', fontWeight: 'bold' }}>S/. {p.subtotal.toFixed(2)}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
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
                                        <div key={c.id} style={{ border: '1px solid var(--glass-border)', borderRadius: 12, overflow: 'hidden' }}>
                                            <button
                                                onClick={() => setExpandedOrders(prev => ({ ...prev, [c.id]: !isExpanded }))}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 18px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-main)',
                                                    fontFamily: '"Plus Jakarta Sans", sans-serif'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: 13, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Comanda #{c.numeroComanda || c.id} — Mesa {c.mesa}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>— {c.hora} ({c.mozo})</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                                    <span style={{ color: 'var(--success)', fontWeight: 'bold', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>S/. {c.total.toFixed(2)}</span>
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div style={{ padding: 15, backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--glass-border)' }}>
                                                    <div className="overflow-x-auto">
                                                        <table style={{ width: '100%', fontSize: 11, fontFamily: '"Plus Jakarta Sans", sans-serif', borderCollapse: 'separate', borderSpacing: 0 }}>
                                                            <thead>
                                                                <tr style={{ background: 'var(--primary)', color: '#ffffff' }}>
                                                                    <th style={{ textAlign: 'left', padding: '8px 12px', borderTopLeftRadius: 10, borderBottomLeftRadius: 10, fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Cant. x Plato</th>
                                                                    <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Cocinero</th>
                                                                    <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Kardex / Inventario</th>
                                                                    <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Estado</th>
                                                                    <th style={{ textAlign: 'right', padding: '8px 12px', borderTopRightRadius: 10, borderBottomRightRadius: 10, fontWeight: 700, fontSize: 11, color: '#ffffff' }}>Subtotal</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {c.platos.map((p, idx) => (
                                                                    <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                                        <td style={{ padding: '8px 12px', fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'var(--text-main)', fontWeight: 500 }}>{p.cantidad} × {p.plato}</td>
                                                                        <td style={{ textAlign: 'center', padding: '8px 12px', fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'var(--text-muted)' }}>{p.cocinero}</td>
                                                                        <td style={{ textAlign: 'center', padding: '8px 12px', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                                                                            <span style={{
                                                                                fontSize: 9,
                                                                                padding: '2px 6px',
                                                                                borderRadius: 6,
                                                                                backgroundColor: (p.kardexStatus === 'Stock descontado' || p.kardexStatus === 'Stock verificado') 
                                                                                    ? 'rgba(34, 197, 94, 0.15)' 
                                                                                    : p.kardexStatus === 'Pendiente de cobro'
                                                                                    ? 'rgba(245, 158, 11, 0.15)'
                                                                                    : (p.kardexStatus === 'Sin receta configurada' || p.kardexStatus === 'No afecta inventario')
                                                                                    ? 'rgba(255, 255, 255, 0.05)' 
                                                                                    : 'rgba(239, 68, 68, 0.15)',
                                                                                color: (p.kardexStatus === 'Stock descontado' || p.kardexStatus === 'Stock verificado')
                                                                                    ? '#22c55e'
                                                                                    : p.kardexStatus === 'Pendiente de cobro'
                                                                                    ? '#f59e0b'
                                                                                    : (p.kardexStatus === 'Sin receta configurada' || p.kardexStatus === 'No afecta inventario')
                                                                                    ? 'var(--text-muted)'
                                                                                    : '#ef4444',
                                                                                fontFamily: '"Plus Jakarta Sans", sans-serif',
                                                                                fontWeight: 600
                                                                            }}>
                                                                                {p.kardexStatus}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ textAlign: 'center', padding: '8px 12px', color: p.estado === 'entregado' ? 'var(--success)' : 'var(--warning)', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600 }}>{p.estado}</td>
                                                                        <td style={{ textAlign: 'right', padding: '8px 12px', fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'var(--success)', fontWeight: 'bold' }}>S/. {(p.precio * p.cantidad).toFixed(2)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
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
        </div>
    );
};

export default StaffStatsView;
