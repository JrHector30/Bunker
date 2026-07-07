import React, { useState, useEffect, useRef } from 'react';
import { 
  ChefHat, 
  Flame, 
  CheckCircle2, 
  Search, 
  Filter, 
  X, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Grid, 
  Smartphone,
  RotateCcw,
  Plus,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, OrderStatus } from './types';
import { getInitialOrders } from './data/initialOrders';
import { soundPlayer } from './lib/sound';
import Sidebar from './components/Sidebar';
import KitchenColumn from './components/KitchenColumn';
import SimulationControls from './components/SimulationControls';
import KitchenTimerStopwatch from './components/KitchenTimerStopwatch';
import KitchenFactsFooter from './components/KitchenFactsFooter';

export default function App() {
  // Load initial states from localStorage if they exist to support persistence
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('kitchen_orders');
    return saved ? JSON.parse(saved) : getInitialOrders();
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('kitchen_dark_mode');
    return saved ? JSON.parse(saved) === true : true; // Default to dark mode as seen in the mockup
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('kitchen_sound_enabled');
    return saved ? JSON.parse(saved) === true : true;
  });

  // Simulation speed control
  const [timeSpeed, setTimeSpeed] = useState<number>(1);
  const [simulatedTimeOffset, setSimulatedTimeOffset] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Filters and UI controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState('TODAS');
  const [activeTabletTab, setActiveTabletTab] = useState<OrderStatus>('pendiente');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'tabs'>('grid');
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('kitchen_header_expanded');
    return saved ? JSON.parse(saved) === true : false;
  });

  const [dismissedAlertKeys, setDismissedAlertKeys] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem('kitchen_header_expanded', JSON.stringify(isHeaderExpanded));
  }, [isHeaderExpanded]);

  const [activeChef] = useState({ name: 'Hector', role: 'ADMIN / CAJA' });

  // Keep sound player enabled in sync
  useEffect(() => {
    soundPlayer.setEnabled(soundEnabled);
    localStorage.setItem('kitchen_sound_enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  // Synchronize dark mode class to html element
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('kitchen_dark_mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Save orders to localStorage on change
  useEffect(() => {
    localStorage.setItem('kitchen_orders', JSON.stringify(orders));
  }, [orders]);

  // Play startup sound on first load
  useEffect(() => {
    soundPlayer.playStartupSweep();
    document.title = "Flujo de Cocina - Búnker";
  }, []);

  // Time-ticking loop supporting accelerated speed
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedTimeOffset((prev) => {
        // If speed > 1, accelerate simulated offset
        const increment = 1000 * (timeSpeed - 1);
        return prev + increment;
      });
      setCurrentTime(Date.now() + simulatedTimeOffset);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeSpeed, simulatedTimeOffset]);

  // Monitor order age transitions to play warning sounds
  const previousAlertStates = useRef<{ [key: string]: 'normal' | 'yellow' | 'red' }>({});
  
  useEffect(() => {
    orders.forEach((order) => {
      if (order.status === 'listo') return;
      
      const elapsedMinutes = Math.floor(
        (currentTime - order.createdAt) / 60000 + order.elapsedMinutesOffset
      );
      
      let currentState: 'normal' | 'yellow' | 'red' = 'normal';
      if (elapsedMinutes > 20) {
        currentState = 'red';
      } else if (elapsedMinutes > 10) {
        currentState = 'yellow';
      }

      const prevState = previousAlertStates.current[order.id] || 'normal';
      if (currentState !== prevState) {
        // Status transitioned! Let's alert the chef!
        if (currentState === 'yellow') {
          soundPlayer.playNewOrderBell(); // gentle bell
        } else if (currentState === 'red') {
          soundPlayer.playNewOrderBell(); // double chime for critical
          setTimeout(() => soundPlayer.playNewOrderBell(), 300);
        }
        previousAlertStates.current[order.id] = currentState;
      }
    });
  }, [currentTime, orders]);

  // Order Actions
  const handleAdvance = (id: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id !== id) return order;

        let nextStatus: OrderStatus = 'pendiente';
        let updatedChef = order.chef;

        if (order.status === 'pendiente') {
          nextStatus = 'proceso';
          updatedChef = activeChef.name; // Assign Hector
          soundPlayer.playStartChime();
        } else if (order.status === 'proceso') {
          nextStatus = 'listo';
          soundPlayer.playSuccessChime();
        }

        return {
          ...order,
          status: nextStatus,
          chef: updatedChef,
          history: [...order.history, nextStatus],
        };
      })
    );
  };

  const handleRewind = (id: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id !== id) return order;
        if (order.history.length <= 1) return order;

        const newHistory = [...order.history];
        newHistory.pop(); // remove current status
        const previousStatus = newHistory[newHistory.length - 1];

        soundPlayer.playRewindChime();

        return {
          ...order,
          status: previousStatus,
          chef: previousStatus === 'pendiente' ? undefined : order.chef,
          history: newHistory,
        };
      })
    );
  };

  const handleAddMinutes = (id: string, mins: number) => {
    soundPlayer.playTickChime();
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id !== id) return order;
        return {
          ...order,
          elapsedMinutesOffset: order.elapsedMinutesOffset + mins,
        };
      })
    );
  };

  const handleAddOrder = (orderData: Partial<Order>) => {
    soundPlayer.playNewOrderBell();
    const newOrder: Order = {
      id: `custom-${Date.now()}`,
      quantity: orderData.quantity || 1,
      name: orderData.name || 'Nuevo Plato',
      table: orderData.table || 'MESA 1',
      createdAt: Date.now() - simulatedTimeOffset, // align with simulated timeline
      elapsedMinutesOffset: 0,
      status: 'pendiente',
      modifier: orderData.modifier,
      history: ['pendiente'],
    };

    setOrders((prev) => [newOrder, ...prev]);
  };

  const handleAdvanceAll = (mins: number) => {
    soundPlayer.playNewOrderBell();
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.status === 'listo') return order;
        return {
          ...order,
          elapsedMinutesOffset: order.elapsedMinutesOffset + mins,
        };
      })
    );
  };

  const handleReset = () => {
    soundPlayer.playStartupSweep();
    setOrders(getInitialOrders());
    setSimulatedTimeOffset(0);
    setTimeSpeed(1);
    setSelectedTable('TODAS');
    setSearchQuery('');
    previousAlertStates.current = {};
  };

  // Date and Time Formatting Helpers for Immersive Header
  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    let hrs = d.getHours();
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12; // conversion of '0' to '12'
    const hrsStr = String(hrs).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${hrsStr}:${mins}:${secs} ${ampm}`;
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  };

  // Filtering Logic
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          order.table.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTable = selectedTable === 'TODAS' || order.table === selectedTable;
    return matchesSearch && matchesTable;
  });

  // Extract unique tables for filter dropdown
  const uniqueTables = Array.from(new Set(orders.map((o) => o.table))).sort();

  // Columns data split
  const pendingOrders = filteredOrders.filter((o) => o.status === 'pendiente');
  const processingOrders = filteredOrders.filter((o) => o.status === 'proceso');
  const readyOrders = filteredOrders.filter((o) => o.status === 'listo');

  // Group pending orders by item name to suggest bulk/batch preparation
  const pendingGroups = React.useMemo(() => {
    const groups: Record<string, { total: number; ids: string[] }> = {};
    pendingOrders.forEach((order) => {
      const key = order.name.trim();
      if (!groups[key]) {
        groups[key] = { total: 0, ids: [] };
      }
      groups[key].total += order.quantity || 1;
      groups[key].ids.push(order.id);
    });
    return groups;
  }, [pendingOrders]);

  const bulkAlerts = React.useMemo(() => {
    return Object.entries(pendingGroups)
      .filter(([_, data]) => (data as { total: number; ids: string[] }).total >= 2) // Suggest bulk preparation for 2 or more of the same dish
      .map(([name, data]) => {
        const typedData = data as { total: number; ids: string[] };
        return {
          name,
          total: typedData.total,
          key: `${name}_${typedData.total}` // reset dismissed status if the count changes
        };
      });
  }, [pendingGroups]);

  const activeBulkAlerts = bulkAlerts.filter(alert => !dismissedAlertKeys.includes(alert.key));

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-300 ${
      isDarkMode ? 'bg-[#0A0C10] text-slate-100' : 'bg-slate-100/40 text-slate-800'
    }`}>
      
      {/* Sidebar Component */}
      <Sidebar 
        isDarkMode={isDarkMode} 
        setIsDarkMode={setIsDarkMode} 
        activeChef={activeChef} 
      />

      {/* Main Workflow Container */}
      <main className="flex-1 flex flex-col p-4 md:p-5 overflow-x-hidden">
        
        {/* Upper Header Row - Styled as a modern card panel */}
        <header className={`flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 md:px-5 md:py-4 rounded-3xl border transition-all duration-300 mb-3 ${
          isDarkMode 
            ? 'bg-[#161B22] border-[#30363D] shadow-2xl shadow-black/40' 
            : 'bg-white border-slate-200 shadow-md shadow-slate-100/50'
        }`}>
          {/* Left Section: Brand & Clock info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Brand Logo */}
            <div className="flex items-center gap-3.5 select-none">
              <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <ChefHat className="w-5.5 h-5.5 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  Flujo de Cocina
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-indigo-600 text-white tracking-widest uppercase select-none animate-pulse">
                    Por Plato
                  </span>
                </h1>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 uppercase tracking-wider">
                  Estación Principal • Tablet Console
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block h-8 w-[1px] bg-slate-200 dark:bg-slate-800/80" />

            {/* Live 12-Hour Digital Clock */}
            <div className="flex flex-col text-left select-none">
              <span className="text-xl md:text-2xl font-black tracking-tight text-indigo-600 dark:text-indigo-400 font-mono leading-none">
                {formatTime(currentTime)}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest uppercase mt-1">
                {formatDate(currentTime)}
              </span>
            </div>
          </div>

          {/* Right Section: The Dual Neumorphic Instruments */}
          <div className="flex flex-col sm:flex-row items-center gap-5 justify-center xl:justify-end select-none w-full xl:w-auto py-1">
            <KitchenTimerStopwatch isDarkMode={isDarkMode} soundEnabled={soundEnabled} isCollapsed={!isHeaderExpanded} />
            
            <button
              onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
              title={isHeaderExpanded ? "Contraer panel" : "Expandir para configurar temporizador y cronómetro"}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-black transition-all duration-200 active:scale-95 cursor-pointer shadow-sm shrink-0 ${
                isHeaderExpanded
                  ? isDarkMode
                    ? 'bg-[#1D2433] hover:bg-[#252E40] border-[#3A455C] text-slate-200'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-600'
                  : isDarkMode
                    ? 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/30 text-indigo-400'
                    : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-600'
              }`}
            >
              {isHeaderExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 text-indigo-500" />
                  <span>CONTRAER</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 text-indigo-500 animate-bounce" />
                  <span>CONFIGURAR</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Filter Toolbar (Search & Dropdowns) */}
        <section className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 py-1.5 mb-2 mt-0 select-none">
          {/* Left search */}
          <div className="relative flex-1 max-w-md w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Buscar por plato o número de mesa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all border ${
                isDarkMode 
                  ? 'bg-[#161B22] border-[#30363D] text-white placeholder-slate-600' 
                  : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right layout controls & dropdowns - very responsive and touch-friendly */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            
            {/* Column/Tab Switcher moved here to save premium header space */}
            <div className={`flex p-1 rounded-xl border ${
              isDarkMode ? 'bg-[#0D1117] border-[#30363D]' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setLayoutMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  layoutMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Mostrar columnas en paralelo"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Columnas</span>
              </button>
              <button
                onClick={() => setLayoutMode('tabs')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  layoutMode === 'tabs'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Mostrar pestañas enfocadas"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pestañas</span>
              </button>
            </div>

            {/* Premium sound status display */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`h-10 px-3.5 rounded-xl font-bold text-[11px] flex items-center gap-2 border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow-lg shadow-indigo-600/15'
                  : isDarkMode
                    ? 'bg-[#0D1117] border-[#30363D] text-slate-400 hover:bg-slate-900'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-indigo-100" />
                  <span>Sonido Activado</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sonido Silenciado</span>
                </>
              )}
            </button>

            {/* Dropdown table filter */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">
                <Filter className="w-3 h-3 text-indigo-500" />
                <span className="hidden sm:inline">Mesa:</span>
              </div>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer border uppercase tracking-wider ${
                  isDarkMode
                    ? 'bg-[#161B22] border-[#30363D] text-white'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <option value="TODAS">TODAS LAS MESAS</option>
                {uniqueTables.map((tbl) => (
                  <option key={tbl} value={tbl}>{tbl}</option>
                ))}
              </select>
            </div>

          </div>
        </section>

        {/* Workflow Columns Container */}
        <section className="flex-1 flex flex-col">
          
          {/* Responsive Layout Option: TABS (Highly requested for portrait tablet usability) */}
          {layoutMode === 'tabs' && (
            <div className="mb-6 grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-200/50 dark:bg-slate-900/60 select-none">
              <button
                onClick={() => setActiveTabletTab('pendiente')}
                className={`py-3 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex flex-col md:flex-row items-center justify-center gap-1.5 ${
                  activeTabletTab === 'pendiente'
                    ? 'bg-white dark:bg-slate-950 text-orange-500 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Pendientes</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 font-bold">
                  {pendingOrders.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTabletTab('proceso')}
                className={`py-3 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex flex-col md:flex-row items-center justify-center gap-1.5 ${
                  activeTabletTab === 'proceso'
                    ? 'bg-white dark:bg-slate-950 text-amber-500 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>En Proceso</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 font-bold">
                  {processingOrders.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTabletTab('listo')}
                className={`py-3 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex flex-col md:flex-row items-center justify-center gap-1.5 ${
                  activeTabletTab === 'listo'
                    ? 'bg-white dark:bg-slate-950 text-emerald-500 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finalizados</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 font-bold">
                  {readyOrders.length}
                </span>
              </button>
            </div>
          )}

          {/* Actual Column Rendering with Framer Motion Layout Groups */}
          <div className="flex-1 h-full min-h-[460px]">
            {layoutMode === 'grid' ? (
              // 3-Column Parallel Desktop/Tablet Landscape Grid
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full items-stretch">
                <KitchenColumn
                  id="pendiente"
                  title="Pendientes"
                  icon={<Clock className="w-5 h-5 text-slate-400 animate-pulse" />}
                  orders={pendingOrders}
                  badgeColor="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300"
                  borderColor="border-slate-200 dark:border-slate-800"
                  isDarkMode={isDarkMode}
                  onAdvance={handleAdvance}
                  onRewind={handleRewind}
                  onAddMinutes={handleAddMinutes}
                />

                <KitchenColumn
                  id="proceso"
                  title="En Proceso"
                  icon={<Flame className="w-5 h-5 text-orange-500 animate-pulse" />}
                  orders={processingOrders}
                  badgeColor="bg-orange-500/10 text-orange-500 dark:text-orange-400 border border-orange-500/20"
                  borderColor="border-orange-100 dark:border-orange-950/20"
                  isDarkMode={isDarkMode}
                  onAdvance={handleAdvance}
                  onRewind={handleRewind}
                  onAddMinutes={handleAddMinutes}
                />

                <KitchenColumn
                  id="listo"
                  title="Listos"
                  icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  orders={readyOrders}
                  badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  borderColor="border-emerald-100 dark:border-emerald-950/20"
                  isDarkMode={isDarkMode}
                  onAdvance={handleAdvance}
                  onRewind={handleRewind}
                  onAddMinutes={handleAddMinutes}
                />
              </div>
            ) : (
              // Tabbed Single Focused View for Portrait Tablet and Mobile
              <div className="h-full">
                {activeTabletTab === 'pendiente' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="h-full"
                  >
                    <KitchenColumn
                      id="pendiente"
                      title="Pendientes"
                      icon={<Clock className="w-5 h-5 text-slate-400" />}
                      orders={pendingOrders}
                      badgeColor="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300"
                      borderColor="border-slate-200 dark:border-slate-800"
                      isDarkMode={isDarkMode}
                      onAdvance={handleAdvance}
                      onRewind={handleRewind}
                      onAddMinutes={handleAddMinutes}
                    />
                  </motion.div>
                )}

                {activeTabletTab === 'proceso' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="h-full"
                  >
                    <KitchenColumn
                      id="proceso"
                      title="En Proceso"
                      icon={<Flame className="w-5 h-5 text-orange-500" />}
                      orders={processingOrders}
                      badgeColor="bg-orange-500/10 text-orange-500 dark:text-orange-400 border border-orange-500/20"
                      borderColor="border-orange-100 dark:border-orange-950/20"
                      isDarkMode={isDarkMode}
                      onAdvance={handleAdvance}
                      onRewind={handleRewind}
                      onAddMinutes={handleAddMinutes}
                    />
                  </motion.div>
                )}

                {activeTabletTab === 'listo' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="h-full"
                  >
                    <KitchenColumn
                      id="listo"
                      title="Listos"
                      icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      orders={readyOrders}
                      badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      borderColor="border-emerald-100 dark:border-emerald-950/20"
                      isDarkMode={isDarkMode}
                      onAdvance={handleAdvance}
                      onRewind={handleRewind}
                      onAddMinutes={handleAddMinutes}
                    />
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Footer: Random Kitchen Tips/Facts */}
        <KitchenFactsFooter isDarkMode={isDarkMode} />

        {/* Simulation Controls Drawer Panel */}
        <SimulationControls
          onAddOrder={handleAddOrder}
          onAdvanceAll={handleAdvanceAll}
          onReset={handleReset}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          isDarkMode={isDarkMode}
          timeSpeed={timeSpeed}
          setTimeSpeed={setTimeSpeed}
        />

        {/* Floating Bulk Preparation Suggestions Alert Stack */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
          <AnimatePresence>
            {activeBulkAlerts.map((alert) => (
              <motion.div
                key={alert.key}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="pointer-events-auto w-full bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3 border border-amber-400/20"
              >
                <div className="p-2 rounded-xl bg-white/20 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] font-black tracking-wider uppercase opacity-90">
                    Sugerencia de Lote
                  </h4>
                  <p className="text-xs font-black mt-1 leading-snug">
                    Tenemos {alert.total} "{alert.name}" por preparar.
                  </p>
                  <p className="text-[9px] opacity-80 mt-1 font-bold">
                    Maximiza tiempos: prepara por lote usando una sola mezcla para pedidos acumulados.
                  </p>
                </div>
                <button
                  onClick={() => setDismissedAlertKeys(prev => [...prev, alert.key])}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer self-start"
                  title="Cerrar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
      </main>
    </div>
  );
}
