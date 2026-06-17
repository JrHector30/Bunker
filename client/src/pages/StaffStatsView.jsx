import React, { useEffect, useState, useRef } from 'react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import { ArrowLeft, Trash, User, ChefHat, Calendar, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { DropdownRangeDatePicker } from '../components/DropdownRangeDatePicker';

const StaffStatsView = () => {
    const { showConfirmation } = useConfirmation();
    const { showToast } = useNotification();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ waiters: [], cooks: [] });
    const [date, setDate] = useState(new Date());
    const [loading, setLoading] = useState(false);

    const dateQueryStr = React.useMemo(() => date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'), [date]);
    const dateDisplayStr = React.useMemo(() => date ? format(date, 'dd-MM-yyyy') : format(new Date(), 'dd-MM-yyyy'), [date]);

    const fetchStats = () => {
        setLoading(true);
        fetch(`/api/staff/stats?date=${dateQueryStr}`)
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchStats();
    }, [dateQueryStr]);

    const handleCleanDay = async () => {
        if (!await showConfirmation(`⚠ PELIGRO:\n\n¿Estás seguro de ELIMINAR PERMANENTEMENTE todas las ventas del día ${dateDisplayStr}?\n\nEsta acción NO se puede deshacer.`, { type: 'danger' })) return;

        try {
            const res = await fetch(`/api/staff/stats/daily?date=${dateQueryStr}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'error');
                fetchStats();
            } else {
                showToast("Error: " + data.error, 'error');
            }
        } catch (e) {
            showToast("Error de conexión", 'error');
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text("ComandaGo - Reporte de Personal", 14, 20);
        doc.setFontSize(12);
        doc.text(`Fecha: ${dateDisplayStr}`, 14, 28);

        // Waiters Table
        doc.setFontSize(14);
        doc.text("Rendimiento de Mozos", 14, 40);

        const waiterRows = stats.waiters.map(w => [
            w.nombre,
            w.totalTables,
            `S/. ${parseFloat(Number(w.totalSales).toFixed(2))}`
        ]);

        autoTable(doc, {
            startY: 45,
            head: [['Nombre', 'Pedidos', 'Venta Total']],
            body: waiterRows,
            theme: 'grid',
            headStyles: { fillColor: [40, 167, 69] }
        });

        // Cooks Table
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.text("Rendimiento de Cocina", 14, finalY);

        const cookRows = stats.cooks.map(c => [
            c.nombre,
            c.totalDishes,
            c.avgTimeMin > 0 ? `${parseFloat(Number(c.avgTimeMin).toFixed(2))} min` : '-'
        ]);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Nombre', 'Platos', 'Tiempo Prom.']],
            body: cookRows,
            theme: 'grid',
            headStyles: { fillColor: [255, 193, 7] }
        });

        doc.save(`Reporte_Personal_${date}.pdf`);
    };

    // Calculate Totals
    const totalSales = stats.waiters.reduce((acc, w) => acc + w.totalSales, 0);
    const totalOrders = stats.waiters.reduce((acc, w) => acc + w.totalTables, 0);

    // Filter out zero values for cleaner charts
    const waiterData = stats.waiters.filter(w => w.totalSales > 0);
    const cookData = stats.cooks.filter(c => c.totalDishes > 0);

    // Paletas de colores distintivas
    // Mozos: Tonos fríos (Azules, Celestes, Turquesas) - Representan servicio/atención
    const WAITER_COLORS = ['#0ea5e9', '#3b82f6', '#22d3ee', '#2dd4bf', '#6366f1', '#8b5cf6', '#06b6d4', '#60a5fa'];

    // Cocineros: Tonos cálidos (Rojos, Naranjas, Amarillos) - Representan calor/cocina
    const COOK_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#dc2626', '#ea580c', '#b91c1c', '#d97706'];

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="glass-button" onClick={() => navigate('/')} style={{ padding: 8 }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1>Reporte de Personal</h1>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <DropdownRangeDatePicker
                        mode="single"
                        value={date}
                        onChange={(selectedDate) => {
                            if (selectedDate) {
                                setDate(selectedDate);
                            }
                        }}
                        placeholder="Seleccionar Fecha"
                    />

                    <button
                        className="glass-button"
                        onClick={handleExportPDF}
                        title="Exportar Reporte PDF"
                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                        <FileText size={18} /> PDF
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="responsive-grid" style={{ marginBottom: 30, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                <div className="glass-panel" style={{ padding: 20, textAlign: 'center' }}>
                    <h3 className="text-muted" style={{ margin: 0 }}>Venta Total</h3>
                    <h1 style={{ color: 'var(--success)', margin: '10px 0' }}>S/. {parseFloat(Number(totalSales).toFixed(2))}</h1>
                </div>
                <div className="glass-panel" style={{ padding: 20, textAlign: 'center' }}>
                    <h3 className="text-muted" style={{ margin: 0 }}>Pedidos Atendidos</h3>
                    <h1 style={{ color: 'var(--primary)', margin: '10px 0' }}>{totalOrders}</h1>
                </div>
            </div>

            {/* CHARTS SECTION */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginBottom: 30 }}>

                {/* Waiter Sales Chart */}
                <div className="glass-panel" style={{ padding: 20, height: 350 }}>
                    <h3 style={{ textAlign: 'center', marginBottom: 20 }}>Ventas por Mozo</h3>
                    {waiterData.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            Sin datos de ventas
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={waiterData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="nombre" stroke="var(--text-muted)" />
                                <YAxis stroke="var(--text-muted)" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#333', borderColor: '#555', color: '#fff' }}
                                    formatter={(value) => [`S/. ${parseFloat(Number(value).toFixed(2))}`, 'Ventas']}
                                />
                                <Bar dataKey="totalSales" name="Ventas" radius={[5, 5, 0, 0]}>
                                    {waiterData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={WAITER_COLORS[index % WAITER_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Kitchen Efficiency Chart */}
                <div className="glass-panel" style={{ padding: 20, height: 350 }}>
                    <h3 style={{ textAlign: 'center', marginBottom: 20 }}>Platos por Cocinero</h3>
                    {cookData.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            Sin datos de cocina
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="90%">
                            <PieChart>
                                <Pie
                                    data={cookData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ nombre, percent }) => `${nombre} (${(percent * 100).toFixed(0)}%)`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="totalDishes"
                                    nameKey="nombre"
                                >
                                    {cookData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COOK_COLORS[index % COOK_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#333', borderColor: '#555', color: '#fff' }}
                                    formatter={(value) => [value, "Platos Preparados"]}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
                {/* Waiters Table */}
                <div className="glass-panel" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                        <User size={24} style={{ color: 'var(--primary)' }} />
                        <h2>Detalle Mozos</h2>
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
                                {stats.waiters.length === 0 ? (
                                    <tr><td colSpan="3" className="text-center text-muted">No hay datos</td></tr>
                                ) : (
                                    stats.waiters.map(w => (
                                        <tr key={w.id}>
                                            <td>{w.nombre}</td>
                                            <td style={{ textAlign: 'center' }}>{w.totalTables}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 'bold' }}>
                                                S/. {parseFloat(Number(w.totalSales).toFixed(2))}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Cooks Table */}
                <div className="glass-panel" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                        <ChefHat size={24} style={{ color: 'var(--warning)' }} />
                        <h2>Detalle Cocina</h2>
                    </div>

                    <div className="table-responsive">
                        <table style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th style={{ textAlign: 'center' }}>Platos</th>
                                    <th style={{ textAlign: 'center' }}>Tiempo Prom.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.cooks.length === 0 ? (
                                    <tr><td colSpan="3" className="text-center text-muted">No hay datos</td></tr>
                                ) : (
                                    stats.cooks.map(c => (
                                        <tr key={c.id}>
                                            <td>{c.nombre}</td>
                                            <td style={{ textAlign: 'center' }}>{c.totalDishes}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                {c.avgTimeMin > 0 ? `${parseFloat(Number(c.avgTimeMin).toFixed(2))} min` : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffStatsView;
