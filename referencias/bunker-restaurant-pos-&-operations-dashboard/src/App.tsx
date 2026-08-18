/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HeaderNav } from './components/HeaderNav';
import { QuickKpiBar } from './components/QuickKpiBar';
import { FloorPlanView } from './components/FloorPlanView';
import { TableDetailModal } from './components/TableDetailModal';
import { RevenueAnalyticsSection } from './components/RevenueAnalyticsSection';
import { StaffLeaderboardSection } from './components/StaffLeaderboardSection';
import { NewOrderModal } from './components/NewOrderModal';
import { NewReservationModal } from './components/NewReservationModal';
import { OperationalAlertsDrawer } from './components/OperationalAlertsDrawer';
import { 
  INITIAL_TABLES, 
  STAFF_MEMBERS, 
  REVENUE_DATA, 
  INITIAL_ALERTS, 
  MENU_CATALOG 
} from './data/restaurantData';
import { 
  TableItem, 
  TableStatus, 
  TableZone, 
  RevenuePeriod, 
  OperationalAlert, 
  OrderItem 
} from './types';
import { playPosChime } from './utils/audio';

export default function App() {
  const [tables, setTables] = useState<TableItem[]>(INITIAL_TABLES);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(
    () => INITIAL_TABLES.find(t => t.number === 84) || INITIAL_TABLES[0]
  );
  const [isFullModalOpen, setIsFullModalOpen] = useState<boolean>(false);
  const [activeZone, setActiveZone] = useState<TableZone>('all');
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>('day');
  const [alerts, setAlerts] = useState<OperationalAlert[]>(INITIAL_ALERTS);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals & Drawers
  const [isNewOrderOpen, setIsNewOrderOpen] = useState<boolean>(false);
  const [isNewReservationOpen, setIsNewReservationOpen] = useState<boolean>(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);

  // Live Timer Simulation: increments minutes for occupied tables
  useEffect(() => {
    const timer = setInterval(() => {
      setTables(prev => prev.map(t => {
        if (t.status === 'occupied' || t.status === 'billing') {
          return { ...t, seatedMinutes: (t.seatedMinutes || 0) + 1 };
        }
        return t;
      }));
    }, 60000); // every minute in real life

    return () => clearInterval(timer);
  }, []);

  // Update table status
  const handleUpdateTableStatus = (tableId: string, status: TableStatus) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        if (status === 'free') {
          return {
            ...t,
            status: 'free',
            guestsCount: 0,
            seatedMinutes: 0,
            activeOrders: [],
            billRequestedAt: undefined,
            notes: undefined
          };
        }
        return { ...t, status };
      }
      return t;
    }));

    if (selectedTable && selectedTable.id === tableId) {
      setSelectedTable(prev => prev ? { ...prev, status } : null);
    }
  };

  // Assign Waiter
  const handleAssignWaiter = (tableId: string, waiterId: string, waiterName: string) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return { ...t, waiterId, waiterName };
      }
      return t;
    }));
    if (selectedTable?.id === tableId) {
      setSelectedTable(prev => prev ? { ...prev, waiterId, waiterName } : null);
    }
  };

  // Add Order Item to table
  const handleAddOrderItem = (tableId: string, item: OrderItem) => {
    if (soundEnabled) playPosChime('order');
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          status: t.status === 'free' ? 'occupied' : t.status,
          activeOrders: [...t.activeOrders, item]
        };
      }
      return t;
    }));

    if (selectedTable?.id === tableId) {
      setSelectedTable(prev => prev ? {
        ...prev,
        status: prev.status === 'free' ? 'occupied' : prev.status,
        activeOrders: [...prev.activeOrders, item]
      } : null);
    }
  };

  // Remove Order Item
  const handleRemoveOrderItem = (tableId: string, orderId: string) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          activeOrders: t.activeOrders.filter(o => o.id !== orderId)
        };
      }
      return t;
    }));

    if (selectedTable?.id === tableId) {
      setSelectedTable(prev => prev ? {
        ...prev,
        activeOrders: prev.activeOrders.filter(o => o.id !== orderId)
      } : null);
    }
  };

  // Trigger Billing
  const handleTriggerBill = (tableId: string) => {
    if (soundEnabled) playPosChime('alert');
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return { ...t, status: 'billing', billRequestedAt: 'Ahora' };
      }
      return t;
    }));

    const target = tables.find(t => t.id === tableId);
    if (target) {
      const newAlert: OperationalAlert = {
        id: `alt-${Date.now()}`,
        type: 'urgent',
        title: `Mesa #${target.number} solicita cuenta`,
        message: `Cuenta de $${target.activeOrders.reduce((s, i) => s + (i.price * i.quantity), 0).toFixed(2)} lista para cobrar.`,
        timestamp: 'Recién',
        tableNumber: target.number,
        actionText: 'Cobrar Mesa'
      };
      setAlerts(prev => [newAlert, ...prev]);
    }

    if (selectedTable?.id === tableId) {
      setSelectedTable(prev => prev ? { ...prev, status: 'billing' } : null);
    }
  };

  // Free table
  const handleFreeTable = (tableId: string) => {
    if (soundEnabled) playPosChime('cash');
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          status: 'cleaning',
          guestsCount: 0,
          seatedMinutes: 0,
          activeOrders: [],
          notes: 'Mesa liberada, en sanitización.',
          billRequestedAt: undefined
        };
      }
      return t;
    }));

    if (selectedTable?.id === tableId) {
      setSelectedTable(null);
    }
  };

  // Handle New Order Creation from Modal
  const handleCreateNewOrder = (
    tableId: string, 
    guestsCount: number, 
    waiterId: string, 
    waiterName: string, 
    initialItems: OrderItem[]
  ) => {
    if (soundEnabled) playPosChime('order');
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          status: 'occupied',
          guestsCount,
          waiterId,
          waiterName,
          seatedMinutes: 1,
          seatedAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          activeOrders: initialItems,
        };
      }
      return t;
    }));
  };

  // Handle New Reservation Creation
  const handleCreateReservation = (
    tableId: string,
    clientName: string,
    time: string,
    guestsCount: number,
    notes?: string
  ) => {
    if (soundEnabled) playPosChime('order');
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          status: 'reserved',
          reservationName: `${clientName} (${guestsCount}p)`,
          reservationTime: time,
          notes: notes || undefined,
        };
      }
      return t;
    }));
  };

  // Simulate Live POS Event
  const handleSimulateEvent = () => {
    const freeOrOcc = tables.filter(t => t.status === 'free' || t.status === 'occupied');
    if (freeOrOcc.length === 0) return;
    const randomTable = freeOrOcc[Math.floor(Math.random() * freeOrOcc.length)];

    if (randomTable.status === 'free') {
      const randomItem = MENU_CATALOG[Math.floor(Math.random() * MENU_CATALOG.length)];
      const initialItem: OrderItem = {
        id: `ord-${Date.now()}`,
        name: randomItem.name,
        category: randomItem.category,
        price: randomItem.price,
        quantity: 2,
        status: 'cooking',
        cookedBy: 'Chef Bruno',
        minutesElapsed: 1
      };
      handleCreateNewOrder(randomTable.id, 2, 'staff-1', 'Lucas Vega', [initialItem]);
      setAlerts(prev => [{
        id: `alt-sim-${Date.now()}`,
        type: 'info',
        title: `Mesa #${randomTable.number} ocupada (Simulador)`,
        message: `Se sentaron 2 comensales con ${randomItem.name}.`,
        timestamp: 'Recién',
        tableNumber: randomTable.number,
        actionText: 'Ver Mesa'
      }, ...prev]);
    } else {
      handleTriggerBill(randomTable.id);
    }
  };

  // Reset to original mock data
  const handleResetData = () => {
    setTables(INITIAL_TABLES);
    setAlerts(INITIAL_ALERTS);
    setSelectedTable(null);
  };

  // Calculation for KPI top bar
  const totalPeriodSales = tables.reduce((acc, t) => {
    return acc + t.activeOrders.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, 4890.0); // Baseline plus active table subtotals

  const kitchenActiveCount = tables.reduce((acc, t) => {
    return acc + t.activeOrders.filter(o => o.status === 'cooking').length;
  }, 8);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col selection:bg-emerald-500 selection:text-black font-sans pb-12">
      
      {/* Top Header & Sticky Navigation */}
      <HeaderNav
        tables={tables}
        alerts={alerts}
        onOpenNewOrder={() => setIsNewOrderOpen(true)}
        onOpenNewReservation={() => setIsNewReservationOpen(true)}
        onSimulateEvent={handleSimulateEvent}
        onResetData={handleResetData}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        activeZoneTab={activeZone}
        onSelectZone={setActiveZone}
        onOpenAlerts={() => setIsAlertsOpen(true)}
      />

      {/* Main Dashboard Container */}
      <main className="max-w-[1600px] w-full mx-auto px-4 lg:px-6 pt-5 flex-1 flex flex-col">
        
        {/* 1. Fila Superior (KPIs Rápidos) */}
        <QuickKpiBar
          tables={tables}
          totalPeriodSales={totalPeriodSales}
          periodSalesGrowth={18.4}
          avgDeliveryMinutes={11.4}
          avgTicketAmount={54.80}
          kitchenActiveTicketsCount={kitchenActiveCount}
        />

        {/* 2. Bento Grid Layout - Central & Lower modules */}
        <div id="bunker-bento-grid" className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 items-stretch">
          
          {/* Bento Left / Floor Plan (7 Columns on large screens) */}
          <div className="xl:col-span-7 flex flex-col">
            <FloorPlanView
              tables={tables}
              selectedTable={selectedTable}
              onSelectTable={(table) => setSelectedTable(table)}
              activeZone={activeZone}
              onChangeZone={setActiveZone}
              onQuickStatusChange={handleUpdateTableStatus}
              onOpenFullModal={(table) => {
                setSelectedTable(table);
                setIsFullModalOpen(true);
              }}
            />
          </div>

          {/* Bento Right / Revenue & Leaderboard (5 Columns on large screens) */}
          <div className="xl:col-span-5 flex flex-col gap-5">
            
            {/* Ganancias con filtros interactivos (Día / Semana / Mes / Año) */}
            <div className="flex-1">
              <RevenueAnalyticsSection
                currentPeriod={revenuePeriod}
                onChangePeriod={setRevenuePeriod}
              />
            </div>

            {/* Rendimiento de Mozos y Cocineros (Leaderboard / Velocidad) */}
            <div className="flex-1">
              <StaffLeaderboardSection />
            </div>

          </div>

        </div>

      </main>

      {/* Table Detail Drawer / Modal */}
      {isFullModalOpen && selectedTable && (
        <TableDetailModal
          table={selectedTable}
          onClose={() => setIsFullModalOpen(false)}
          onUpdateTableStatus={handleUpdateTableStatus}
          onAssignWaiter={handleAssignWaiter}
          onAddOrderItem={handleAddOrderItem}
          onRemoveOrderItem={handleRemoveOrderItem}
          onTriggerBill={handleTriggerBill}
          onFreeTable={handleFreeTable}
        />
      )}

      {/* New Order Modal */}
      <NewOrderModal
        tables={tables}
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
        onSubmit={handleCreateNewOrder}
      />

      {/* New Reservation Modal */}
      <NewReservationModal
        tables={tables}
        isOpen={isNewReservationOpen}
        onClose={() => setIsNewReservationOpen(false)}
        onSubmit={handleCreateReservation}
      />

      {/* Live Alerts Drawer */}
      <OperationalAlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onActionClick={(alert) => {
          if (alert.tableNumber) {
            const t = tables.find(item => item.number === alert.tableNumber);
            if (t) setSelectedTable(t);
          }
          setIsAlertsOpen(false);
        }}
        onDismissAlert={(id) => setAlerts(prev => prev.filter(a => a.id !== id))}
      />

      {/* Bottom status bar */}
      <footer className="mt-8 border-t border-[#161f36] pt-4 text-center text-xs text-slate-500 max-w-[1600px] mx-auto px-4 w-full flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>BUNKER Gastro & Lounge • Sistema Integral de Operaciones POS & Salón</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>KDS Cocina: <b className="text-slate-300">En Línea</b></span>
          <span>Impresora Comandas: <b className="text-emerald-400">Conectada</b></span>
          <span>Plano Interactivo: <b className="text-amber-400">Activo</b></span>
        </div>
      </footer>

    </div>
  );
}
