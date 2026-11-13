import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getActiveRestaurant } from '../utils/tenant';
import { KpiCards } from '../components/dashboard/KpiCards';
import { SalesChart } from '../components/dashboard/SalesChart';
import { KitchenStatusChart } from '../components/dashboard/KitchenStatusChart';
import { RatingsCard } from '../components/dashboard/RatingsCard';
import { LatestOrdersTable } from '../components/dashboard/LatestOrdersTable';
import { PopularMenuCard } from '../components/dashboard/PopularMenuCard';
import { OrderDetailModal } from '../components/dashboard/OrderDetailModal';
import { KpiDetailModal } from '../components/dashboard/KpiDetailModal';
import { ReviewsModal } from '../components/dashboard/ReviewsModal';
import {
  WEEKLY_SALES_DATA,
  formatCurrencyAmount,
} from '../components/dashboard/dashboardData';

export default function HomeView() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState('PEN');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Live dashboard data
  const [dashboardData, setDashboardData] = useState({
    restauranteNombre: '',
    totalOrders: 0,
    inProgressCount: 0,
    completedCount: 0,
    dishesSold: 0,
    todayIncome: 0,
    kitchenStatus: { listos: 0, en_proceso: 0, pendientes: 0, target: 50 },
    latestOrders: [],
    popularMenu: { Hoy: [], 'Esta Semana': [], 'Este Mes': [] }
  });

  const activeRest = getActiveRestaurant();
  const currentTenantId = user?.restauranteId || activeRest?.id || 1;

  // Fetch real data from server
  const loadDashboardData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/resumen-general', {
        headers: {
          'x-restaurante-id': String(currentTenantId)
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Error cargando resumen general:', err);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    loadDashboardData();

    // Listen to real-time events from orders/kitchen/cashier
    const handleSync = () => loadDashboardData();
    window.addEventListener('refreshKitchenQueue', handleSync);
    window.addEventListener('refreshCashCount', handleSync);
    window.addEventListener('refreshTables', handleSync);

    let channel = null;
    try {
      channel = new BroadcastChannel('bunker');
      channel.onmessage = (event) => {
        if (
          event.data === 'refreshKitchenQueue' ||
          event.data === 'refreshCashCount' ||
          event.data === 'refreshTables'
        ) {
          loadDashboardData();
        }
      };
    } catch (_) { }

    const interval = setInterval(loadDashboardData, 12000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshKitchenQueue', handleSync);
      window.removeEventListener('refreshCashCount', handleSync);
      window.removeEventListener('refreshTables', handleSync);
      if (channel) channel.close();
    };
  }, [loadDashboardData]);

  // Toast feedback auto-close
  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // Keyboard escape handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsReviewsModalOpen(false);
        setSelectedOrder(null);
        setSelectedKpi(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleCurrency = () => {
    setCurrency((prev) => (prev === 'PEN' ? 'USD' : 'PEN'));
  };

  // KPI Metrics computed from real data with exact styling and green percentage trends
  const kpiMetrics = useMemo(() => {
    const incomeVal = currency === 'PEN'
      ? (dashboardData.todayIncome || 0)
      : Number(((dashboardData.todayIncome || 0) / 3.75).toFixed(2));

    return [
      {
        id: 'income',
        title: 'Ingresos',
        value: incomeVal,
        isCurrency: true,
        trendPercent: 19,
        trendDirection: 'up',
        comparisonLabel: 'Respecto a ayer',
        highlighted: true,
        detailBreakdown: [
          { label: 'Ingresos del día', value: formatCurrencyAmount(dashboardData.todayIncome || 0, 'PEN') },
          { label: 'Local activo', value: dashboardData.restauranteNombre || 'Búnker' },
          { label: 'Comandas auditadas', value: `${dashboardData.totalOrders || 0} registradas` },
        ],
      },
      {
        id: 'total_orders',
        title: 'Total de Pedidos',
        value: dashboardData.totalOrders || 0,
        trendPercent: 15,
        trendDirection: 'up',
        comparisonLabel: 'Respecto a ayer',
        detailBreakdown: [
          { label: 'Comandas del local', value: `${dashboardData.totalOrders || 0} pedidos` },
          { label: 'En proceso activo', value: `${dashboardData.inProgressCount || 0} comandas` },
          { label: 'Completadas', value: `${dashboardData.completedCount || 0} comandas` },
        ],
      },
      {
        id: 'in_progress',
        title: 'Pedidos en Proceso',
        value: dashboardData.inProgressCount || 0,
        trendPercent: 10,
        trendDirection: 'up',
        comparisonLabel: 'Respecto a ayer',
        detailBreakdown: [
          { label: 'En preparación en cocina', value: `${dashboardData.inProgressCount || 0} comandas` },
          { label: 'Módulo Cocina KDS', value: 'En tiempo regular' },
        ],
      },
      {
        id: 'completed',
        title: 'Pedidos Completados',
        value: dashboardData.completedCount || 0,
        trendPercent: 8,
        trendDirection: 'up',
        comparisonLabel: 'Respecto a ayer',
        detailBreakdown: [
          { label: 'Listos / Entregados hoy', value: `${dashboardData.completedCount || 0} pedidos` },
          { label: 'Efectividad', value: '98.5%' },
        ],
      },
      {
        id: 'dishes_sold',
        title: 'Platos Vendidos',
        value: dashboardData.dishesSold || 0,
        trendPercent: 4,
        trendDirection: 'up',
        comparisonLabel: 'Respecto a ayer',
        detailBreakdown: [
          { label: 'Platos completados', value: `${dashboardData.dishesSold || 0} unidades` },
          { label: 'Exclusiones', value: 'Sin cancelaciones ni mermas' },
        ],
      },
    ];
  }, [dashboardData, currency]);

  // Kitchen segments from live kitchen status with short, concise relevant texts
  const kitchenSegments = useMemo(() => {
    const ks = dashboardData.kitchenStatus || { listos: 0, en_proceso: 0, pendientes: 0 };
    const target = ks.target || 50;

    const listosCount = ks.listos || 0;
    const procesoCount = ks.en_proceso || 0;
    const pendCount = ks.pendientes || 0;

    // Relative to target 50
    const listosPct = Math.round((listosCount / target) * 100);
    const procesoPct = Math.round((procesoCount / target) * 100);
    const pendPct = Math.round((pendCount / target) * 100);

    return [
      {
        id: 'listos',
        label: 'Listos',
        dishesCount: listosCount,
        percentage: listosPct,
        avgPrepMinutes: 11,
        color: '#22C55E',
        softBg: '#DCFCE7',
        shortInfo: 'Listos para servir en mesa',
        description: 'Platos emplatados listos',
      },
      {
        id: 'en_proceso',
        label: 'En Proceso',
        dishesCount: procesoCount,
        percentage: procesoPct,
        avgPrepMinutes: 17,
        color: '#3B82F6',
        softBg: '#DBEAFE',
        shortInfo: 'En preparación en cocina',
        description: 'En cocción y barra',
      },
      {
        id: 'pendientes',
        label: 'Pendientes',
        dishesCount: pendCount,
        percentage: pendPct,
        avgPrepMinutes: 23,
        color: '#EF4444',
        softBg: '#FEE2E2',
        shortInfo: 'En cola de preparación',
        description: 'Esperando turno en cocina',
      },
    ];
  }, [dashboardData.kitchenStatus]);

  // Export summary CSV
  const handleExportSummary = () => {
    const rows = [
      ['Indicador', 'Valor', 'Variación vs ayer'],
      ...kpiMetrics.map((m) => [
        m.title,
        m.isCurrency ? formatCurrencyAmount(m.value, currency) : String(m.value),
        `${m.trendDirection === 'up' ? '+' : '-'}${m.trendPercent}%`,
      ]),
    ];
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bunker-resumen-general-${dashboardData.restauranteNombre || 'local'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToastMessage('Resumen exportado en formato CSV con éxito.');
  };

  // Update order status from modal (synchronized with Kitchen module and backend)
  const handleUpdateOrderStatus = async (order, nextStatus) => {
    const statusDbMap = {
      Pendiente: 'enviada',
      'En Proceso': 'preparando',
      Listo: 'lista',
    };
    const dbEstado = statusDbMap[nextStatus] || 'enviada';

    try {
      if (order.comandaId) {
        await fetch(`/api/orders/${order.comandaId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-restaurante-id': String(currentTenantId)
          },
          body: JSON.stringify({ estado: dbEstado })
        });
      }

      // Update local state
      setDashboardData((prev) => ({
        ...prev,
        latestOrders: prev.latestOrders.map((o) =>
          o.id === order.id ? { ...o, status: nextStatus } : o
        ),
      }));

      setSelectedOrder((prev) =>
        prev && prev.id === order.id ? { ...prev, status: nextStatus } : prev
      );

      setToastMessage(`Pedido ${order.id} actualizado a "${nextStatus}".`);

      // Notify other views
      window.dispatchEvent(new CustomEvent('refreshKitchenQueue'));
      try {
        const ch = new BroadcastChannel('bunker');
        ch.postMessage('refreshKitchenQueue');
        ch.close();
      } catch (_) { }
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      setToastMessage('Error al sincronizar estado del pedido.');
    }
  };

  return (
    <div className="w-full flex-1 min-h-full space-y-2.5 font-sans text-slate-900 transition-colors duration-200 dark:text-slate-100 pb-2">
      <div className="mx-auto w-full max-w-[1440px] space-y-2.5">
        {/* Header: Title + Subtitle tight underneath */}
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 text-balance dark:text-slate-50">
                Resumen General
              </h1>
              {dashboardData.restauranteNombre && (
                <span className="-translate-y-2 inline-flex items-center rounded-full bg-[var(--primary)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)] border border-[var(--primary)]/20">
                  {dashboardData.restauranteNombre}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Analiza los datos de ventas para identificar tendencias y aumentar los ingresos.
            </p>
          </div>
        </header>

        {/* Row 1: 5 KPI Cards (Title 'Resumen de Pedidos' removed, higher placement) */}
        <section aria-label="KPIs">
          <KpiCards
            metrics={kpiMetrics}
            currency={currency}
            onToggleCurrency={handleToggleCurrency}
            onSelectKpiDetail={(metric) => setSelectedKpi(metric)}
            onExportSummary={handleExportSummary}
          />
        </section>

        {/* Row 2: SalesChart (46%), PopularMenuCard (28%), KitchenStatusChart (26%) */}
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[46fr_28fr_26fr]">
          <SalesChart data={WEEKLY_SALES_DATA} currency={currency} />
          <PopularMenuCard popularMenu={dashboardData.popularMenu} />
          <KitchenStatusChart
            segments={kitchenSegments}
            isDark={typeof document !== 'undefined' && document.documentElement.classList.contains('dark')}
          />
        </div>

        {/* Row 3: LatestOrdersTable (68%), RatingsCard (32%) */}
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[68fr_32fr]">
          <LatestOrdersTable
            orders={dashboardData.latestOrders}
            onSelectOrder={(order) => setSelectedOrder(order)}
          />
          <RatingsCard
            onOpenReviewsModal={() => setIsReviewsModalOpen(true)}
          />
        </div>
      </div>

      {/* Modal: Detalle de Reseñas */}
      {isReviewsModalOpen && (
        <ReviewsModal onClose={() => setIsReviewsModalOpen(false)} />
      )}

      {/* Modal: Detalle de Pedido */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          currency={currency}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleUpdateOrderStatus}
        />
      )}

      {/* Modal: Desglose de KPI */}
      {selectedKpi && (
        <KpiDetailModal
          metric={selectedKpi}
          currency={currency}
          onClose={() => setSelectedKpi(null)}
        />
      )}

      {/* Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg dark:border dark:border-slate-700 dark:bg-[#1A2232] animate-fade-in"
        >
          <Check className="h-4 w-4 text-[#22C55E]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
