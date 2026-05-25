import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { DollarSign, Users, Clock, Receipt } from 'lucide-react';
import '../index.css';

// --- MOCK DATA ---
const salesData = [
  { name: 'Lun', ventas: 4000 },
  { name: 'Mar', ventas: 3000 },
  { name: 'Mié', ventas: 2000 },
  { name: 'Jue', ventas: 2780 },
  { name: 'Vie', ventas: 1890 },
  { name: 'Sáb', ventas: 2390 },
  { name: 'Dom', ventas: 3490 },
];

const categoryData = [
  { name: 'Comida', value: 400 },
  { name: 'Bebidas', value: 300 },
  { name: 'Postres', value: 300 },
  { name: 'Otros', value: 200 },
];

// Fallback colors for pie chart if CSS vars aren't directly supported by Recharts Cell
const COLORS = ['var(--primary)', '#22c55e', '#fcc419', '#8884d8'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel" style={{ padding: '10px 15px', border: '1px solid var(--glass-border)' }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-main)' }}>{label}</p>
        <p style={{ margin: 0, color: 'var(--primary)' }}>
          {`Ventas: S/ ${payload[0].value}`}
        </p>
      </div>
    );
  }
  return null;
};

const KPI_Card = ({ title, value, icon: Icon, subtext, trend }) => {
  return (
    <div className="glass-panel fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, minWidth: '220px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', margin: 0 }}>{title}</h3>
        <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
          <Icon size={20} color="var(--primary)" />
        </div>
      </div>
      <div>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)', fontFamily: '"Roboto Mono", monospace' }}>
          {value}
        </div>
        <div style={{ fontSize: '0.85rem', color: trend === 'up' ? 'var(--success)' : 'var(--text-muted)', marginTop: '5px' }}>
          {subtext}
        </div>
      </div>
    </div>
  );
};

const HomeView = () => {
  const { mode } = useTheme();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', paddingBottom: '20px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 className="high-end-title" style={{ marginBottom: '5px' }}>Dashboard</h1>
          <p className="text-muted" style={{ margin: 0 }}>Resumen general de operaciones (Mock Data)</p>
        </div>
      </div>

      {/* KPI GRID */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        <KPI_Card title="Total Ventas (Hoy)" value="S/ 1,240.50" icon={DollarSign} subtext="+12% vs ayer" trend="up" />
        <KPI_Card title="Mesas Ocupadas" value="12 / 20" icon={Users} subtext="60% de capacidad" trend="neutral" />
        <KPI_Card title="Pedidos Pendientes" value="8" icon={Clock} subtext="Tiempo prom: 15min" trend="neutral" />
        <KPI_Card title="Ticket Promedio" value="S/ 42.30" icon={Receipt} subtext="Estable" trend="neutral" />
      </div>

      {/* CHARTS GRID */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', 
        gap: '20px'
      }} className="charts-grid-wrapper">

        {/* BAR CHART */}
        <div className="glass-panel fade-in" style={{ padding: '20px', minHeight: '350px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-main)' }}>Ventas Últimos 7 Días</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(value) => `S/ ${value}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="ventas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PIE CHART */}
        <div className="glass-panel fade-in" style={{ padding: '20px', minHeight: '350px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-main)' }}>Ventas por Categoría</h3>
          <div style={{ width: '100%', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--glass-border)', color: 'var(--text-main)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-main)' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'var(--text-main)', fontSize: '0.85rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      
    </div>
  );
};

export default HomeView;
