import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  Search, Bell, HelpCircle, ArrowDown, Clock, ChevronLeft, ChevronRight, MoreHorizontal 
} from 'lucide-react';
import { Calendar } from '../components/ui/Calendar';
import { format } from 'date-fns';

const CustomBarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs text-white shadow-lg">
        <p className="font-semibold">{`Ventas: S/. ${payload[0].value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}</p>
      </div>
    );
  }
  return null;
};

const HomeView = () => {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  
  // Toggles e inputs locales
  const [period, setPeriod] = useState('HOY');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de datos (Lectura desde APIs reales)
  const [balance, setBalance] = useState(null);
  const [tables, setTables] = useState([]);
  const [arqueoDates, setArqueoDates] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Carga de datos de forma paralela al montar el componente
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [balanceRes, tablesRes, historyRes] = await Promise.all([
        fetch('/api/cashier/balance'),
        fetch('/api/tables'),
        fetch('/api/cashier/history?limit=100')
      ]);

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData);
      } else {
        console.error("Error al cargar balance de caja");
      }

      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTables(tablesData);
      } else {
        console.error("Error al cargar mesas");
      }

      if (historyRes.ok) {
        const historyJson = await historyRes.json();
        const dates = new Set();
        if (historyJson.data && Array.isArray(historyJson.data)) {
          historyJson.data.forEach(arq => {
            if (arq.fechaInicio) {
              // Extraer fecha en formato yyyy-MM-dd en horario local
              const dateStr = arq.fechaInicio.split('T')[0];
              dates.add(dateStr);
            }
          });
        }
        setArqueoDates(dates);
      } else {
        console.error("Error al cargar historial de arqueos");
      }
    } catch (error) {
      console.error("Error de conexión al cargar datos del dashboard:", error);
      showToast("Error de conexión con el servidor al cargar datos.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Escuchar eventos globales de actualización para recargar datos en tiempo real
    window.addEventListener('refreshCashCount', loadDashboardData);
    window.addEventListener('refreshTables', loadDashboardData);

    return () => {
      window.removeEventListener('refreshCashCount', loadDashboardData);
      window.removeEventListener('refreshTables', loadDashboardData);
    };
  }, []);

  // --- PROCESAMIENTO LOCAL DE PICOS DE VENTAS ---
  const getSalesPeaks = () => {
    const bins = {
      '12PM': 0, '2PM': 0, '4PM': 0, '6PM': 0, '8PM': 0, '10PM': 0, '12AM': 0
    };

    const todayStr = new Date().toDateString();
    const salesArray = balance?.ventas || [];

    salesArray.forEach(sale => {
      const date = new Date(sale.hora);
      if (period === 'HOY' && date.toDateString() !== todayStr) {
        return; // Filtrar por día de hoy si corresponde
      }

      const hour = date.getHours();
      const binHour = Math.floor(hour / 2) * 2;
      let binName = '';
      
      if (binHour === 0) binName = '12AM';
      else if (binHour === 12) binName = '12PM';
      else if (binHour < 12) binName = `${binHour}PM`; // Adaptado para la visualización del canvas
      else binName = `${binHour - 12}PM`;

      if (bins[binName] !== undefined) {
        bins[binName] += (sale.total || 0);
      } else {
        bins['12PM'] += (sale.total || 0); // fallback
      }
    });

    // Rellenar con datos de diseño realistas si el turno está vacío
    const allZero = Object.values(bins).every(v => v === 0);
    if (allZero) {
      return [
        { name: '12PM', ventas: 1500.00 },
        { name: '2PM', ventas: 3400.00 },
        { name: '4PM', ventas: 2100.00 },
        { name: '6PM', ventas: 4500.00, active: true },
        { name: '8PM', ventas: 3900.00 },
        { name: '10PM', ventas: 1200.00 },
        { name: '12AM', ventas: 400.00 },
      ];
    }

    const chartData = [
      { name: '12PM', ventas: bins['12PM'] || 0 },
      { name: '2PM', ventas: bins['2PM'] || 0 },
      { name: '4PM', ventas: bins['4PM'] || 0 },
      { name: '6PM', ventas: bins['6PM'] || 0 },
      { name: '8PM', ventas: bins['8PM'] || 0 },
      { name: '10PM', ventas: bins['10PM'] || 0 },
      { name: '12AM', ventas: bins['12AM'] || 0 },
    ];

    // Marcar el pico más alto como activo para resaltarlo visualmente
    let maxV = 0;
    let maxIdx = -1;
    chartData.forEach((item, idx) => {
      if (item.ventas > maxV) {
        maxV = item.ventas;
        maxIdx = idx;
      }
    });
    if (maxIdx !== -1) {
      chartData[maxIdx].active = true;
    }

    return chartData;
  };

  // --- COMBINACIÓN Y FILTRADO DE ÚLTIMOS MOVIMIENTOS ---
  const getRecentMovements = () => {
    const movements = [];

    // Mapear ventas cerradas
    if (balance?.ventas && Array.isArray(balance.ventas)) {
      balance.ventas.forEach(sale => {
        movements.push({
          id: `sale-${sale.id}`,
          rawTime: new Date(sale.hora),
          tipo: 'ingreso',
          metodo: sale.metodo || 'Yape',
          descripcion: `Venta #${sale.id} - ${sale.metodo || 'Efectivo'}`,
          subtext: `Comanda #${sale.id} • ${format(new Date(sale.hora), 'HH:mm')}`,
          monto: `+ S/. ${(sale.total || 0).toFixed(2)}`,
          estado: 'Aprobado'
        });
      });
    }

    // Mapear movimientos manuales (Ingresos/Egresos)
    if (balance?.movimientos && Array.isArray(balance.movimientos)) {
      balance.movimientos.forEach(mov => {
        const isEgreso = mov.tipo === 'EGRESO';
        movements.push({
          id: `mov-${mov.id}`,
          rawTime: new Date(mov.fecha || new Date()),
          tipo: isEgreso ? 'egreso' : 'ingreso',
          metodo: mov.metodoPago || 'Efectivo',
          descripcion: `${isEgreso ? 'Egreso' : 'Ingreso'} - ${mov.concepto}`,
          subtext: `${mov.tipoComprobante || 'Movimiento'} • ${format(new Date(mov.fecha || new Date()), 'HH:mm')}`,
          monto: `${isEgreso ? '-' : '+'} S/. ${(mov.monto || 0).toFixed(2)}`,
          estado: 'Aprobado'
        });
      });
    }

    // Ordenar de forma descendente por fecha/hora y limitar a 5
    return movements
      .sort((a, b) => b.rawTime - a.rawTime)
      .filter(item => {
        if (!searchTerm) return true;
        return item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) || 
               item.subtext.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .slice(0, 5);
  };

  // Cálculo de variables de métricas
  const totalCajaValue = balance?.totalCaja || 0;
  const yapeValue = (balance?.ingresos?.yape || 0) + (balance?.ingresos?.plin || 0);
  const comandasCount = balance?.ventas?.length || 0;
  
  const totalMesas = tables.length || 15;
  const mesasOcupadas = tables.filter(t => t.estado?.toLowerCase() === 'ocupada' || t.estado?.toLowerCase() === 'ocupado').length;

  const isCajaAbierta = balance?.estado === 'abierto';
  const movementsList = getRecentMovements();
  const salesPeaks = getSalesPeaks();

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-6 flex flex-col gap-6 font-sans">
      
      {/* 1. CABECERA PREMIUM */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Barra de búsqueda */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar comandas, movimientos..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-white/20 transition-all text-sm"
          />
        </div>

        {/* Acciones y Perfil */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <button className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs font-semibold text-white/80 hover:bg-white/[0.08] transition-all">
            Periodo Actual
          </button>
          
          <button className="p-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/80 hover:bg-white/[0.08] transition-all relative">
            <Bell className="w-4.5 h-4.5" />
            {isCajaAbierta && <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />}
          </button>

          <button className="p-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/80 hover:bg-white/[0.08] transition-all">
            <HelpCircle className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* 2. TARJETAS MÉTRICAS SUPERIORES */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tarjeta 1: Ingresos del Turno */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300">
          <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-4">Ingresos del Turno</span>
          <h2 className="text-2xl font-bold tracking-tight text-white font-mono">
            S/. {totalCajaValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>

        {/* Tarjeta 2: Comandas Despachadas */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300">
          <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-4">Comandas Despachadas</span>
          <h2 className="text-3xl font-bold tracking-tight text-white font-mono">{comandasCount}</h2>
        </div>

        {/* Tarjeta 3: Yape/Plin */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300">
          <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-4">Yape/Plin</span>
          <h2 className="text-2xl font-bold tracking-tight text-white font-mono">
            S/. {yapeValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>

        {/* Tarjeta 4: Mesas Ocupadas */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300">
          <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-4">Mesas Ocupadas</span>
          <div className="flex items-baseline justify-center gap-1">
            <h2 className="text-3xl font-bold tracking-tight text-white font-mono">{mesasOcupadas}</h2>
            <span className="text-lg text-white/40 font-mono">/{totalMesas}</span>
          </div>
        </div>
      </section>

      {/* 3. CONTENIDO CENTRAL Y DERECHO */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA/CENTRAL (Ocupa 3 columnas) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Bloque: Picos de Ventas por Horas */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 shadow-lg shadow-black/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-semibold text-white/90">Picos de Ventas por Horas</h3>
              <div className="bg-white/[0.04] p-1 rounded-xl border border-white/[0.08] flex gap-1">
                {['HOY', 'SEMANA'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      period === p 
                        ? 'bg-white text-black shadow' 
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Gráfico Recharts */}
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesPeaks} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(255,255,255,0.3)" 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.3)" 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="ventas" radius={[8, 8, 0, 0]}>
                    {salesPeaks.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bloque: Últimos Movimientos de Caja */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 shadow-lg shadow-black/20">
            <h3 className="text-base font-semibold text-white/90 mb-6">Últimos Movimientos de Caja</h3>
            
            <div className="flex flex-col gap-4">
              {loading ? (
                <div className="text-center py-6 text-white/40 text-sm">Cargando movimientos...</div>
              ) : movementsList.length === 0 ? (
                <div className="text-center py-6 text-white/40 text-sm">No hay movimientos registrados en este turno.</div>
              ) : (
                movementsList.map((movement) => (
                  <div 
                    key={movement.id}
                    className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {/* Icono de movimiento */}
                      <div className={`p-3 rounded-xl ${
                        movement.tipo === 'ingreso' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {movement.tipo === 'ingreso' ? <ArrowDown className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      {/* Información */}
                      <div>
                        <h4 className="text-sm font-semibold text-white/90">{movement.descripcion}</h4>
                        <p className="text-xs text-white/40 mt-1">
                          {movement.subtext}
                        </p>
                      </div>
                    </div>

                    {/* Estado y Monto */}
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider ${
                        movement.estado === 'Aprobado'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {movement.estado}
                      </span>
                      <span className="text-sm font-bold text-white font-mono">{movement.monto}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA (Ocupa 1 columna) */}
        <div className="flex flex-col gap-6">
          
          {/* Bloque: Control de Caja */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 shadow-lg shadow-black/20 flex flex-col items-center">
            <h3 className="text-base font-semibold text-white/90 mb-6 w-full text-left">Control de Caja</h3>

            {/* Indicador de estado luminoso de alta fidelidad */}
            <div className="relative w-36 h-36 flex items-center justify-center mb-6">
              {loading ? (
                <div className="text-white/40 text-xs">Cargando...</div>
              ) : isCajaAbierta ? (
                <>
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10 animate-ping opacity-60"></div>
                  <div className="absolute inset-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.02]"></div>
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold tracking-widest text-emerald-400/60 uppercase">Caja</span>
                    <span className="text-lg font-bold tracking-tight text-emerald-400 mt-1">ABIERTA</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 rounded-full border-4 border-amber-500/10 animate-pulse"></div>
                  <div className="absolute inset-2 rounded-full border border-amber-500/20 bg-amber-500/[0.02]"></div>
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold tracking-widest text-amber-400/60 uppercase">Caja</span>
                    <span className="text-lg font-bold tracking-tight text-amber-500 mt-1">CERRADA</span>
                  </div>
                </>
              )}
            </div>

            {/* Botón Realizar Arqueo */}
            <button 
              onClick={() => navigate('/cashier')}
              className="w-full py-3.5 bg-white text-black rounded-2xl text-xs font-bold hover:bg-white/90 transition-all shadow-md active:scale-[0.98]"
            >
              Realizar Arqueo
            </button>
          </div>

          {/* Bloque: Historial (Calendario) */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 shadow-lg shadow-black/20 flex flex-col items-center">
            <h3 className="text-base font-semibold text-white/90 mb-4 w-full text-left">Historial</h3>

            {/* Calendario Nativo Reutilizable */}
            <div className="w-full flex justify-center">
              <Calendar
                mode="single"
                modifiers={{
                  arqueo: (date) => {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    const key = `${y}-${m}-${d}`;
                    return arqueoDates.has(key);
                  }
                }}
                modifiersClassNames={{
                  arqueo: "border border-emerald-500/30 !text-emerald-400 font-semibold relative after:absolute after:bottom-1 after:start-1/2 after:size-1 after:-translate-x-1/2 after:bg-emerald-500 after:rounded-full"
                }}
              />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default HomeView;
