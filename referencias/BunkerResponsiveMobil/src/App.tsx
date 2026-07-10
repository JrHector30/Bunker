import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  UtensilsCrossed, 
  ChefHat, 
  DollarSign, 
  Grid, 
  BookOpen, 
  Package, 
  History, 
  ShieldCheck, 
  Users, 
  TrendingUp, 
  PhoneCall, 
  Settings, 
  Moon, 
  Sun, 
  LogOut, 
  Menu, 
  MoreHorizontal, 
  User, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Plus, 
  Filter, 
  Download, 
  FileSpreadsheet, 
  Copy, 
  Smartphone, 
  Tablet, 
  Check, 
  Info, 
  Sparkles, 
  Sliders, 
  RotateCw,
  Bell,
  Clock,
  Send,
  SlidersHorizontal,
  Lock,
  ArrowRight,
  ThumbsUp,
  Award,
  CreditCard,
  Layers,
  Receipt,
  MapPin,
  Link,
  Eye,
  Flame,
  Volume2,
  VolumeX,
  Maximize2,
  FileText,
  CheckCircle,
  Trash2,
  Printer,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  FileDown
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { mockPlates, mockKitchenTickets, mockTables, proposalsSpec, ProposalSpec } from './designData';
import { NavigationProposal, DeviceType, ActiveView, Plate, KitchenTicket, RestaurantTable } from './types';

const themes = {
  naranja: {
    name: 'Naranja Corporativo',
    primary: '#f97316',
    text: 'text-orange-500',
    textMuted: 'text-orange-400',
    bgLight: 'bg-orange-500/10',
    borderLight: 'border-orange-500/20',
    lineGlow: 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8),0_0_4px_rgba(249,115,22,0.8)]',
    beamGradient: 'from-orange-500/25 via-orange-500/4 to-transparent',
    glowColor: 'rgba(249,115,22,0.15)',
    btnPrimary: 'bg-orange-500 hover:bg-orange-600 text-white shadow-[0_2px_8px_rgba(249,115,22,0.3)]',
    tabBorder: 'border-orange-500'
  },
  rojo: {
    name: 'Rojo Carmesí',
    primary: '#ef4444',
    text: 'text-red-500',
    textMuted: 'text-red-400',
    bgLight: 'bg-red-500/10',
    borderLight: 'border-red-500/20',
    lineGlow: 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8),0_0_4px_rgba(239,68,68,0.8)]',
    beamGradient: 'from-red-500/25 via-red-500/4 to-transparent',
    glowColor: 'rgba(239,68,68,0.15)',
    btnPrimary: 'bg-red-500 hover:bg-red-600 text-white shadow-[0_2px_8px_rgba(239,68,68,0.3)]',
    tabBorder: 'border-red-500'
  },
  verde: {
    name: 'Verde Esmeralda',
    primary: '#10b981',
    text: 'text-emerald-500',
    textMuted: 'text-emerald-400',
    bgLight: 'bg-emerald-500/10',
    borderLight: 'border-emerald-500/20',
    lineGlow: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8),0_0_4px_rgba(16,185,129,0.8)]',
    beamGradient: 'from-emerald-500/25 via-emerald-500/4 to-transparent',
    glowColor: 'rgba(16,185,129,0.15)',
    btnPrimary: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]',
    tabBorder: 'border-emerald-500'
  },
  azul: {
    name: 'Azul Eléctrico',
    primary: '#3b82f6',
    text: 'text-blue-500',
    textMuted: 'text-blue-400',
    bgLight: 'bg-blue-500/10',
    borderLight: 'border-blue-500/20',
    lineGlow: 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8),0_0_4px_rgba(59,130,246,0.8)]',
    beamGradient: 'from-blue-500/25 via-blue-500/4 to-transparent',
    glowColor: 'rgba(59,130,246,0.15)',
    btnPrimary: 'bg-blue-500 hover:bg-blue-600 text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]',
    tabBorder: 'border-blue-500'
  },
  amarillo: {
    name: 'Amarillo Neón',
    primary: '#eab308',
    text: 'text-yellow-500',
    textMuted: 'text-yellow-400',
    bgLight: 'bg-yellow-500/10',
    borderLight: 'border-yellow-500/20',
    lineGlow: 'bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.8),0_0_4px_rgba(234,179,8,0.8)]',
    beamGradient: 'from-yellow-500/25 via-yellow-500/4 to-transparent',
    glowColor: 'rgba(234,179,8,0.15)',
    btnPrimary: 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-[0_2px_8px_rgba(234,179,8,0.3)]',
    tabBorder: 'border-yellow-500'
  }
};

export default function App() {
  // Simulator state
  const [proposal, setProposal] = useState<NavigationProposal>('B');
  const [device, setDevice] = useState<DeviceType>('phone');
  const [themeColor, setThemeColor] = useState<'naranja' | 'rojo' | 'verde' | 'azul' | 'amarillo'>('naranja');
  const activeTheme = themes[themeColor];
  const [activeView, setActiveView] = useState<ActiveView>('platos'); // Default to target screenshot view
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isLogisticaExpanded, setIsLogisticaExpanded] = useState<boolean>(true);
  
  // Tables customized state matching official screenshot
  const [isTablesLocked, setIsTablesLocked] = useState<boolean>(true);
  const [isUnitingMesas, setIsUnitingMesas] = useState<boolean>(false);
  const initialTablesState = [
    { id: 'T1', number: 1, status: 'occupied', occupant: 'Mel', seats: ['left', 'right'] },
    { id: 'T2', number: 2, status: 'available', seats: ['left', 'right'] },
    { id: 'T3', number: 3, status: 'available', seats: ['left', 'right'] },
    { id: 'T4', number: 4, status: 'available', seats: ['left', 'right'] },
    { id: 'T5', number: 5, status: 'available', seats: ['top', 'bottom', 'left', 'right'] },
    { id: 'T6', number: 6, status: 'available', seats: ['top', 'bottom', 'left', 'right'] },
    { id: 'T7', number: 7, status: 'available', seats: ['top', 'bottom', 'left', 'right'] },
    { id: 'T8', number: 8, status: 'occupied', occupant: 'Hector', seats: ['right'] },
    { id: 'T9', number: 9, status: 'occupied', occupant: 'Hector', seats: ['right'] },
    { id: 'T10', number: 10, status: 'available', seats: ['top', 'bottom', 'left', 'right'] },
    { id: 'T11', number: 11, status: 'available', seats: ['top', 'bottom', 'left', 'right'] },
    { id: 'T12', number: 12, status: 'occupied', occupant: 'Hector', seats: ['right'] },
    { id: 'T13', number: 13, status: 'available', seats: ['top', 'bottom', 'left', 'right'] },
    { id: 'T14', number: 14, status: 'available', seats: ['top', 'bottom', 'left', 'right'] },
    { id: 'T15', number: 15, status: 'available', seats: ['top', 'bottom', 'left', 'right'] },
  ];
  const [customTables, setCustomTables] = useState<any[]>(initialTablesState);
  
  // Kitchen state matching official screenshot
  const [kitchenSearch, setKitchenSearch] = useState<string>('');
  const [selectedKitchenTable, setSelectedKitchenTable] = useState<string>('Todas');
  const [isKitchenSoundActive, setIsKitchenSoundActive] = useState<boolean>(true);
  const [isKitchenExpanded, setIsKitchenExpanded] = useState<boolean>(false);
  const [activeKitchenColTab, setActiveKitchenColTab] = useState<'pending' | 'preparing' | 'ready'>('pending');
  
  const initialKitchenState = [
    { id: 'KT1', plate: 'Hamburguesa Completa', quantity: 1, table: 'MESA 9', status: 'pending', elapsedMinutes: 84, critical: true },
    { id: 'KT2', plate: 'Ceviche', quantity: 1, table: 'MESA 1', status: 'pending', elapsedMinutes: 83, critical: true },
    { id: 'KT3', plate: 'Lomo Saltado', quantity: 1, table: 'MESA 7', status: 'preparing', elapsedMinutes: 9, critical: false },
    { id: 'KT4', plate: 'Milanesa Napolitana', quantity: 1, table: 'MESA 12', occupant: 'Hector', status: 'ready', elapsedMinutes: 84 },
    { id: 'KT5', plate: 'Sudado de Pescado', quantity: 1, table: 'MESA 1', occupant: 'Hector', status: 'ready', elapsedMinutes: 83, customNote: 'bajo en sal' },
    { id: 'KT6', plate: 'Arroz con Mariscos', quantity: 1, table: 'MESA 8', occupant: 'Hector', status: 'ready', elapsedMinutes: 20 },
  ];
  const [customKitchenTickets, setCustomKitchenTickets] = useState<any[]>(initialKitchenState);
  
  // Countdown timers state
  const [tempTimer, setTempTimer] = useState<number>(20); // 00:20
  const [cronTimer, setCronTimer] = useState<number>(0);  // 00:00
  const [isTempRunning, setIsTempRunning] = useState<boolean>(false);
  const [isCronRunning, setIsCronRunning] = useState<boolean>(false);

  // Auto-updating clock
  const [kitchenTime, setKitchenTime] = useState<string>('06:12:26 PM');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // hour '0' should be '12'
      const hoursStr = String(hours).padStart(2, '0');
      setKitchenTime(`${hoursStr}:${minutes}:${seconds} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Countdown intervals
  useEffect(() => {
    let interval: any;
    if (isTempRunning) {
      interval = setInterval(() => {
        setTempTimer(prev => (prev > 0 ? prev - 1 : 20)); // loop or stop
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTempRunning]);

  useEffect(() => {
    let interval: any;
    if (isCronRunning) {
      interval = setInterval(() => {
        setCronTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCronRunning]);

  const getSpanishDate = () => {
    const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC'];
    const now = new Date();
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
  };
  
  // Propuesta B bottom sheet state
  const [isMoreOpen, setIsMoreOpen] = useState<boolean>(false);
  const [logisticaInSheetExpanded, setLogisticaInSheetExpanded] = useState<boolean>(true);
  
  // Propuesta A mobile sidebar drawer open state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  
  // Touch pointer feedback coordinates
  const [touchCoords, setTouchCoords] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [showTouchIndicator, setShowTouchIndicator] = useState<boolean>(true);
  
  // Plate filter state for mockup screen
  const [plateSearch, setPlateSearch] = useState<string>('');
  const [plateCategory, setPlateCategory] = useState<string>('Todos');

  // Checkout status
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);

  // Arqueo de Caja state variables
  const [arqueosSearch, setArqueosSearch] = useState<string>('');
  
  const initialArqueos = [
    { id: 48, start: '08/07/2026 14:47:34', end: null, status: 'EN CURSO', initialAmt: 100.0, expenses: 0.0, cash: 0.0, card: 45.0, digital: 30.0, manual: 0.0, tips: 2.25, totalCaja: 100.0, totalGross: 75.0 },
    { id: 47, start: '07/07/2026 13:13:26', end: '07/07/2026 18:48:52', status: 'CERRADO', initialAmt: 50.0, expenses: 0.0, cash: 32.50, card: 233.0, digital: 65.0, manual: 0.0, tips: 10.0, totalCaja: 82.50, totalGross: 330.50 },
    { id: 46, start: '04/07/2026 17:56:03', end: '07/07/2026 01:25:45', status: 'CERRADO', initialAmt: 100.0, expenses: 0.0, cash: 15.0, card: 20.0, digital: 25.0, manual: 0.0, tips: 6.25, totalCaja: 115.0, totalGross: 60.0 },
    { id: 45, start: '01/07/2026 16:02:27', end: '03/07/2026 21:51:24', status: 'CERRADO', initialAmt: 50.0, expenses: 0.0, cash: 0.0, card: 47.0, digital: 50.0, manual: 0.0, tips: 0.0, totalCaja: 50.0, totalGross: 97.0 },
    { id: 44, start: '21/06/2026 02:12:15', end: '30/06/2026 00:38:28', status: 'CERRADO', initialAmt: 100.0, expenses: 15.0, cash: 5.0, card: 0.0, digital: 0.0, manual: 0.0, tips: 0.0, totalCaja: 90.0, totalGross: 5.0 },
  ];
  const [customArqueos, setCustomArqueos] = useState<any[]>(initialArqueos);

  const initialCuentasAbiertas = [
    { id: 'ca1', table: 'Mesa 9', total: 25.00, items: [{ name: 'Hamburguesa Completa', qty: 1, price: 25.00 }] },
    { id: 'ca2', table: 'Mesa 12', total: 35.00, items: [{ name: 'Milanesa Napolitana', qty: 1, price: 35.00 }] },
    { id: 'ca3', table: 'Mesa 1', total: 85.00, items: [{ name: 'Sudado de Pescado', qty: 1, price: 60.00 }, { name: 'Ceviche', qty: 1, price: 25.00 }] },
    { id: 'ca4', table: 'Mesa 8', total: 50.00, items: [{ name: 'Arroz con Mariscos', qty: 1, price: 50.00 }] },
    { id: 'ca5', table: 'Mesa 7', total: 45.00, items: [{ name: 'Lomo Saltado', qty: 1, price: 45.00 }] },
  ];
  const [customCuentasAbiertas, setCustomCuentasAbiertas] = useState<any[]>(initialCuentasAbiertas);
  const [showAddMovementModal, setShowAddMovementModal] = useState<boolean>(false);
  const [movementForm, setMovementForm] = useState({ type: 'INGRESOS', amount: '', description: '' });

  // Interactive feedback
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [rating, setRating] = useState<number | null>(null);

  // Active user data (matches screenshot)
  const currentUser = {
    name: 'Hector',
    role: 'ADMIN / CAJA',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
  };

  // Sound/Vibration effect simulation helper
  const triggerTactileFeedback = () => {
    // If the browser supports navigator.vibrate, do a tiny tick
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  // Track click position on the simulated device for visual touch indicator
  const handleDeviceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showTouchIndicator) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTouchCoords({ x, y, visible: true });
    triggerTactileFeedback();
  };

  useEffect(() => {
    if (touchCoords.visible) {
      const timer = setTimeout(() => {
        setTouchCoords(prev => ({ ...prev, visible: false }));
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [touchCoords.visible]);

  // Reset states when changing proposals
  useEffect(() => {
    setIsMoreOpen(false);
    setIsSidebarOpen(false);
  }, [proposal]);

  // Render correct Lucide Icon based on string name
  const renderMenuIcon = (iconName: string, className = "w-5 h-5") => {
    switch(iconName) {
      case 'Home': return <Home className={className} />;
      case 'UtensilsCrossed': return <UtensilsCrossed className={className} />;
      case 'ChefHat': return <ChefHat className={className} />;
      case 'DollarSign': return <DollarSign className={className} />;
      case 'Grid': return <Grid className={className} />;
      case 'Package': return <Package className={className} />;
      case 'BookOpen': return <BookOpen className={className} />;
      case 'History': return <History className={className} />;
      case 'ShieldCheck': return <ShieldCheck className={className} />;
      case 'Users': return <Users className={className} />;
      case 'TrendingUp': return <TrendingUp className={className} />;
      case 'PhoneCall': return <PhoneCall className={className} />;
      case 'Settings': return <Settings className={className} />;
      default: return <Grid className={className} />;
    }
  };

  // Render content of active view
  const renderActiveViewContent = () => {
    switch (activeView) {
      case 'platos':
        return (
          <div>
            {/* Title & Add button */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  Menú (Platos)
                  <span className="text-[9px] font-normal text-gray-400">({mockPlates.length} items)</span>
                </h2>
                <p className="text-[8px] sm:text-[9px] text-gray-500">Gestión de platillos gastronómicos</p>
              </div>
              <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-[9px] sm:text-[10px] px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-[0_2px_8px_rgba(255,107,0,0.3)]">
                <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Nuevo
              </button>
            </div>

            {/* Search & Filter */}
            <div className="grid grid-cols-12 gap-1.5 mb-3">
              <div className="col-span-8 relative">
                <Search className="w-3 h-3 text-gray-500 absolute left-2.5 top-2.5" />
                <input 
                  type="text" 
                  placeholder="Buscar plato..." 
                  value={plateSearch}
                  onChange={(e) => setPlateSearch(e.target.value)}
                  className="w-full bg-[#11131d] border border-gray-800 rounded-lg pl-8 pr-2 py-1.5 text-[10px] text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="col-span-4 relative">
                <select 
                  value={plateCategory}
                  onChange={(e) => setPlateCategory(e.target.value)}
                  className="w-full bg-[#11131d] border border-gray-800 rounded-lg px-2 py-1.5 text-[9px] text-gray-300 focus:outline-none appearance-none cursor-pointer h-full"
                >
                  <option value="Todos">Categorías</option>
                  <option value="Bebidas">Bebidas</option>
                  <option value="Marino">Marino</option>
                  <option value="Plato Principal">Plato P.</option>
                  <option value="Postres">Postres</option>
                </select>
                <ChevronDown className="w-2.5 h-2.5 text-gray-400 absolute right-2 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Quick action secondary buttons */}
            <div className="flex gap-1.5 mb-3">
              <button className="flex-1 bg-[#131521] hover:bg-[#1c1f30] text-gray-300 border border-gray-800 text-[10px] py-1.5 rounded-md flex items-center justify-center gap-1.5">
                <Copy className="w-3 h-3 text-orange-400" /> Plantilla
              </button>
              <button className="flex-1 bg-[#131521] hover:bg-[#1c1f30] text-gray-300 border border-gray-800 text-[10px] py-1.5 rounded-md flex items-center justify-center gap-1.5">
                <FileSpreadsheet className="w-3 h-3 text-emerald-500" /> Excel
              </button>
            </div>

            {/* HIGH-FIDELITY INTERACTIVE PLATES TABLE */}
            <div className="bg-[#0e1017] rounded-xl border border-gray-900 overflow-hidden">
              <div className="bg-[#141622] px-2.5 py-1.5 grid grid-cols-12 gap-1 text-[8px] font-bold text-gray-400 uppercase tracking-wider">
                <div className="col-span-6">Nombre</div>
                <div className="col-span-3 text-right">Precio</div>
                <div className="col-span-3 text-center">Stock</div>
              </div>
              <div className="divide-y divide-[#171926]">
                {mockPlates
                  .filter(p => {
                    const matchesSearch = p.name.toLowerCase().includes(plateSearch.toLowerCase());
                    const matchesCat = plateCategory === 'Todos' || p.category === plateCategory;
                    return matchesSearch && matchesCat;
                  })
                  .map(plate => (
                    <div key={plate.id} className="px-2.5 py-2.5 grid grid-cols-12 gap-1 text-[10px] items-center hover:bg-[#121422] transition-colors">
                      <div className="col-span-6 flex items-center gap-1.5">
                        <span className="text-xs">{plate.emoji}</span>
                        <div className="min-w-0">
                          <span className="font-semibold text-gray-100 block truncate text-[10px] sm:text-[11px]">{plate.name}</span>
                          <span className="text-[8px] px-1 bg-gray-800 rounded text-gray-400 inline-block mt-0.5">{plate.category}</span>
                        </div>
                      </div>
                      <div className="col-span-3 text-right font-mono font-bold text-gray-200">
                        S/. {plate.price.toFixed(2)}
                      </div>
                      <div className="col-span-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-medium ${plate.stock > 20 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {plate.stock} u.
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        );

      case 'inicio':
        return (
          <div className="space-y-4">
            {/* 1. Header de Bienvenida */}
            <div className="mb-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className={`text-base font-extrabold tracking-tight flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    ¡Bienvenido, Hector! <span className="animate-bounce">🪄</span>
                  </h2>
                  <p className={`text-[9px] flex items-center gap-1 mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <MapPin className="w-2.5 h-2.5 text-orange-500 shrink-0" /> Búnker • Salón y Comandas • Perú
                  </p>
                </div>
                {/* Profile mini status badge */}
                <div className={`flex items-center gap-1.5 p-1 rounded-full border pr-2.5 ${isDarkMode ? 'bg-[#121422] border-[#1f2235]' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="relative">
                    <img src={currentUser.avatar} alt="Hector Q." className="w-6 h-6 rounded-full object-cover border border-orange-500" />
                    <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-500 border border-[#08090c] rounded-full"></span>
                  </div>
                  <div className="text-left">
                    <span className={`block text-[8px] font-bold leading-none ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Hector Q.</span>
                    <span className="block text-[6px] text-emerald-500 font-mono font-bold">ADMIN LIVE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Mi Tarjeta Panel */}
            <div className={`rounded-2xl border p-3.5 shadow-md relative overflow-hidden ${isDarkMode ? 'bg-[#10121d]/80 border-[#1b1e2c]' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2.5">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Mi Tarjeta</span>
                <MoreHorizontal className="w-3.5 h-3.5 text-gray-500 cursor-pointer hover:text-gray-300" />
              </div>
              
              {/* Card visual style from screenshot */}
              <div className={`rounded-xl p-3 border relative shadow-sm ${isDarkMode ? 'bg-gradient-to-br from-[#181b2a] to-[#0e1017] border-[#262a42]' : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'}`}>
                {/* Ambient glow in dark mode */}
                {isDarkMode && <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>}
                
                <div className="flex justify-between items-start mb-3">
                  {/* Chip outline icon */}
                  <div className="bg-[#ff6b00]/10 p-1 rounded-lg border border-orange-500/20">
                    <CreditCard className="w-4 h-4 text-orange-500" />
                  </div>
                  {/* Live Status Tag & Date */}
                  <div className="text-right">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-[7px] text-emerald-400 font-bold border border-emerald-500/20 uppercase tracking-widest">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                      EN VIVO
                    </span>
                    <span className="block text-[8px] text-gray-400 font-mono mt-0.5">09/07/2026</span>
                  </div>
                </div>
                
                {/* VISA emblem in absolute center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-[9px] font-extrabold italic text-white px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(255,107,0,0.3)] border border-orange-400 tracking-wider">
                    VISA
                  </div>
                </div>
                
                {/* Card information */}
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <span className="text-[6px] text-gray-500 block uppercase font-bold tracking-wider">GANANCIA SEMANAL</span>
                    <span className={`text-xs font-mono font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>S/. 405.50</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[6px] text-gray-500 block uppercase font-bold tracking-wider">ADMINISTRADOR</span>
                    <span className={`text-[8px] font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>HECTOR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Categoría (3 Square Cards) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Categoría</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {/* Card 1: Órdenes */}
                <div className={`rounded-xl border p-2 flex flex-col items-center text-center transition-all ${isDarkMode ? 'bg-[#10121d]/85 border-[#1b1e2c]' : 'bg-white border-gray-200'}`}>
                  <div className="w-7 h-7 rounded-full border border-orange-500/10 flex items-center justify-center mb-1 bg-orange-500/5">
                    <ChefHat className="w-3.5 h-3.5 text-orange-500" />
                  </div>
                  <span className="text-[6px] font-bold text-gray-400 block tracking-wider uppercase">ÓRDENES</span>
                  <span className={`text-[9px] font-extrabold block mt-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>0 Activas</span>
                  <span className="text-[5.5px] text-gray-500">Comandas Activas</span>
                </div>

                {/* Card 2: Tiempo */}
                <div className={`rounded-xl border p-2 flex flex-col items-center text-center transition-all ${isDarkMode ? 'bg-[#10121d]/85 border-[#1b1e2c]' : 'bg-white border-gray-200'}`}>
                  <div className="w-7 h-7 rounded-full border border-orange-500/10 flex items-center justify-center mb-1 bg-orange-500/5">
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                  </div>
                  <span className="text-[6px] font-bold text-gray-400 block tracking-wider uppercase">TIEMPO</span>
                  <span className={`text-[9px] font-extrabold block mt-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>0 min</span>
                  <span className="text-[5.5px] text-gray-500">Espera Promedio</span>
                </div>

                {/* Card 3: Mesas */}
                <div className={`rounded-xl border p-2 flex flex-col items-center text-center transition-all ${isDarkMode ? 'bg-[#10121d]/85 border-[#1b1e2c]' : 'bg-white border-gray-200'}`}>
                  <div className="w-7 h-7 rounded-full border border-orange-500/10 flex items-center justify-center mb-1 bg-orange-500/5">
                    <Layers className="w-3.5 h-3.5 text-orange-500" />
                  </div>
                  <span className="text-[6px] font-bold text-gray-400 block tracking-wider uppercase">MESAS</span>
                  <span className={`text-[9px] font-extrabold block mt-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>0/15</span>
                  <span className="text-[5.5px] text-gray-500">Ocupación Local</span>
                </div>
              </div>
            </div>

            {/* 4. Pedidos Atendidos Panel */}
            <div className={`rounded-2xl border p-3 shadow-md ${isDarkMode ? 'bg-[#10121d]/80 border-[#1b1e2c]' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pedidos Atendidos</span>
                  <span className="bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[6px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">COMISIÓN</span>
                </div>
                <MoreHorizontal className="w-3.5 h-3.5 text-gray-500 cursor-pointer hover:text-gray-300" />
              </div>
              
              <div className={`rounded-xl p-2 border flex items-center justify-between ${isDarkMode ? 'bg-[#151726]/40 border-[#22263e]' : 'bg-gray-50 border-gray-150'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg border border-orange-500/10 flex items-center justify-center bg-orange-500/5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  </div>
                  <div className="text-left">
                    <span className="text-[6px] text-gray-500 block font-bold uppercase tracking-wider">LÍDER DEL DÍA</span>
                    <span className={`text-[9px] font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ninguno</span>
                  </div>
                </div>
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[7px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Eficiencia +24%
                </span>
              </div>
            </div>

            {/* 5. Cierre de Mesas Panel */}
            <div className={`rounded-2xl border p-3 shadow-md ${isDarkMode ? 'bg-[#10121d]/80 border-[#1b1e2c]' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cierre de Mesas</span>
                <button className={`p-1 rounded-lg border text-orange-500 transition-colors ${isDarkMode ? 'bg-[#0d0e16] border-[#1c1e2d] hover:bg-orange-500/10' : 'bg-gray-100 border-gray-200 hover:bg-orange-500/5'}`}>
                  <Download className="w-3 h-3" />
                </button>
              </div>
              
              <div className={`rounded-xl p-5 border flex flex-col items-center justify-center text-center min-h-[85px] ${isDarkMode ? 'bg-[#090a10]/60 border-[#181926]' : 'bg-gray-50/50 border-gray-150'}`}>
                <Receipt className="w-5 h-5 text-gray-500 mb-1" />
                <p className="text-[8px] text-gray-500 max-w-[170px] leading-relaxed font-medium">
                  No hay mesas cerradas para el filtro seleccionado.
                </p>
              </div>
            </div>

            {/* 6. Estadísticas / Caja del Día & Calendario & Flujo */}
            <div className="border-t border-gray-800/20 my-4 pt-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Estadísticas de Caja</span>
                <MoreHorizontal className="w-3.5 h-3.5 text-gray-500" />
              </div>
              
              {/* Grid of Caja del Día & Calendario */}
              <div className="grid grid-cols-1 gap-3">
                {/* Caja del Día with elegant circular progress */}
                <div className={`rounded-2xl border p-3 flex flex-col items-center text-center shadow-md relative ${isDarkMode ? 'bg-[#10121d]/80 border-[#1b1e2c]' : 'bg-white border-gray-200'}`}>
                  <span className="text-[6.5px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Caja del Día</span>
                  
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="32" cy="32" r="26" stroke={isDarkMode ? '#1a1b26' : '#e5e7eb'} strokeWidth="3" fill="transparent" />
                      <circle cx="32" cy="32" r="26" stroke="#ff6b00" strokeWidth="3.5" strokeDasharray="163" strokeDashoffset="163" strokeLinecap="round" fill="transparent" />
                    </svg>
                    <div className="z-10 flex flex-col items-center leading-none">
                      <span className="text-[5.5px] text-gray-500 font-bold uppercase tracking-wider">CAJA</span>
                      <span className={`text-[10px] font-mono font-black mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>S/. 0</span>
                      <span className="bg-emerald-500/10 text-emerald-500 text-[5.5px] font-bold px-1 py-0.5 rounded-full mt-1 flex items-center gap-0.5">
                        📈 0%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Calendar Widget */}
                <div className={`rounded-2xl border p-3.5 shadow-md ${isDarkMode ? 'bg-[#10121d]/80 border-[#1b1e2c]' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <button className="text-gray-500 hover:text-orange-500 p-0.5" onClick={triggerTactileFeedback}>
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span className={`text-[8px] font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Julio 2026</span>
                    <button className="text-gray-500 hover:text-orange-500 p-0.5" onClick={triggerTactileFeedback}>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 text-[6.5px] text-center font-bold text-gray-500 uppercase mb-1">
                    <div>Do</div><div>Lu</div><div>Ma</div><div>Mi</div><div>Ju</div><div>Vi</div><div>Sá</div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-y-1 text-center text-[7.5px] font-mono font-bold">
                    {/* Faded days of June */}
                    <div className="text-gray-700/40 py-0.5">28</div>
                    <div className="text-gray-700/40 py-0.5">29</div>
                    <div className="text-gray-700/40 py-0.5">30</div>
                    
                    {/* Days of July */}
                    <div className="text-gray-400 py-0.5">1</div>
                    <div className="text-gray-400 py-0.5">2</div>
                    <div className="text-gray-400 py-0.5">3</div>
                    <div className="text-gray-400 py-0.5">4</div>
                    <div className="text-gray-400 py-0.5">5</div>
                    <div className="text-gray-400 py-0.5">6</div>
                    <div className="text-gray-400 py-0.5">7</div>
                    <div className="text-gray-400 py-0.5">8</div>
                    
                    {/* Active Day 9 */}
                    <div className="relative flex items-center justify-center py-0.5 font-bold">
                      <span className="absolute inset-0 bg-[#ff6b00]/25 rounded-full border border-orange-500 scale-90"></span>
                      <span className="text-orange-500 relative z-10 font-black">9</span>
                    </div>
                    
                    <div className="text-gray-400 py-0.5">10</div>
                    <div className="text-gray-400 py-0.5">11</div>
                    <div className="text-gray-400 py-0.5">12</div>
                    <div className="text-gray-400 py-0.5">13</div>
                    <div className="text-gray-400 py-0.5">14</div>
                    <div className="text-gray-400 py-0.5">15</div>
                    <div className="text-gray-400 py-0.5">16</div>
                    <div className="text-gray-400 py-0.5">17</div>
                    <div className="text-gray-400 py-0.5">18</div>
                    <div className="text-gray-400 py-0.5">19</div>
                    <div className="text-gray-400 py-0.5">20</div>
                    <div className="text-gray-400 py-0.5">21</div>
                    <div className="text-gray-400 py-0.5">22</div>
                    <div className="text-gray-400 py-0.5">23</div>
                    <div className="text-gray-400 py-0.5">24</div>
                    <div className="text-gray-400 py-0.5">25</div>
                    <div className="text-gray-400 py-0.5">26</div>
                    <div className="text-gray-400 py-0.5">27</div>
                    <div className="text-gray-400 py-0.5">28</div>
                    <div className="text-gray-400 py-0.5">29</div>
                    <div className="text-gray-400 py-0.5">30</div>
                    <div className="text-gray-400 py-0.5">31</div>
                    
                    {/* Faded days of Aug */}
                    <div className="text-gray-700/40 py-0.5">1</div>
                  </div>
                </div>

                {/* Flujo de Fondos */}
                <div className={`rounded-2xl border p-3.5 shadow-md relative ${isDarkMode ? 'bg-[#10121d]/80 border-[#1b1e2c]' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[6.5px] text-gray-500 font-bold uppercase tracking-wider">Flujo de Fondos</span>
                    <select className={`border text-[7px] rounded px-1 py-0.5 focus:outline-none focus:border-orange-500 cursor-pointer ${isDarkMode ? 'bg-[#08090d] border-[#1c1e2d] text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                      <option>Esta semana</option>
                      <option>Este mes</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-between items-end mb-2.5">
                    <div>
                      <span className={`text-[11px] font-mono font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>S/. 0.00</span>
                      <span className="text-[6px] text-emerald-500 block mt-0.5">
                        📈 10.2% vs semana anterior ()
                      </span>
                    </div>
                  </div>
                  
                  {/* Mini Chart visualization */}
                  <div className={`h-14 w-full flex items-end justify-between gap-1 pt-2 border-t relative ${isDarkMode ? 'border-gray-800/40' : 'border-gray-200/50'}`}>
                    {/* Fake chart bars */}
                    {[8, 12, 10, 15, 22, 14, 19, 26, 23, 31, 28, 36].map((val, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end z-10">
                        <div 
                          className="w-full bg-orange-500/20 hover:bg-orange-500/50 rounded-t transition-all"
                          style={{ height: `${val}%` }}
                        ></div>
                      </div>
                    ))}
                    
                    {/* Scale indicators */}
                    <div className="absolute left-1 top-1 text-[5px] text-gray-600 font-mono">1.0K</div>
                    <div className="absolute left-1 top-6 text-[5px] text-gray-600 font-mono">500</div>
                    <div className="absolute left-1 bottom-1 text-[5px] text-gray-600 font-mono">0</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'mesas':
        return (
          <div className="space-y-4">
            {/* Header / Controles de Mesas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-800/20">
              <div>
                <h2 className={`text-base font-extrabold tracking-tight font-display ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Salón Principal</h2>
              </div>
              
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Button Unir Mesas */}
                <button 
                  onClick={() => { triggerTactileFeedback(); setIsUnitingMesas(!isUnitingMesas); }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    isUnitingMesas 
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.35)]' 
                      : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  <Link className="w-2.5 h-2.5" />
                  Unir Mesas
                </button>

                {/* Bloqueado Toggle switch */}
                <button 
                  onClick={() => { triggerTactileFeedback(); setIsTablesLocked(!isTablesLocked); }}
                  className={`px-2 py-0.5 sm:py-1 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors ${
                    isDarkMode ? 'bg-[#0e1019]/90 border-[#1b1e2c] hover:bg-gray-800/80' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-5.5 h-3 rounded-full relative p-0.5 transition-colors ${isTablesLocked ? 'bg-[#f43f5e]' : 'bg-gray-600'}`}>
                    <div className={`w-2 h-2 bg-white rounded-full transition-transform ${isTablesLocked ? 'translate-x-2.5' : 'translate-x-0'}`}></div>
                  </div>
                  <Lock className={`w-2.5 h-2.5 ${isTablesLocked ? 'text-rose-500' : 'text-gray-400'}`} />
                  <span className={`text-[7.5px] font-black uppercase tracking-wider ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Bloqueado
                  </span>
                </button>

                {/* Restablecer Button */}
                <button 
                  onClick={() => { 
                    triggerTactileFeedback(); 
                    setCustomTables(initialTablesState); 
                    setIsUnitingMesas(false); 
                    setIsTablesLocked(true); 
                  }}
                  title="Restablecer"
                  className={`p-1 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                    isDarkMode ? 'bg-[#0e1019]/90 border-[#1b1e2c] text-gray-400 hover:text-white hover:bg-gray-800' : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <RotateCw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Informative message if locked */}
            {isTablesLocked && (
              <div className={`p-2 rounded-xl text-[8px] flex items-center gap-1.5 border leading-relaxed ${
                isDarkMode ? 'bg-amber-500/5 border-amber-500/10 text-amber-400/90' : 'bg-amber-50 border-amber-100 text-amber-700'
              }`}>
                <Info className="w-3 h-3 text-amber-500 shrink-0" />
                <span>Las mesas están <strong>Bloqueadas</strong>. Desbloquea para interactuar y cambiar el estado libre/ocupado.</span>
              </div>
            )}

            {/* Interactive Grid of 15 Tables */}
            <div className="grid grid-cols-5 gap-x-2 gap-y-7 pt-2 pb-5">
              {customTables.map(table => {
                const isOccupied = table.status === 'occupied';
                
                return (
                  <div 
                    key={table.id}
                    onClick={() => {
                      triggerTactileFeedback();
                      if (!isTablesLocked) {
                        setCustomTables(prev => prev.map(t => {
                          if (t.id === table.id) {
                            const nextStatus = t.status === 'available' ? 'occupied' : 'available';
                            return {
                              ...t,
                              status: nextStatus,
                              occupant: nextStatus === 'occupied' ? 'Hector' : undefined
                            };
                          }
                          return t;
                        }));
                      }
                    }}
                    className={`relative p-1 rounded-xl border flex flex-col items-center justify-center min-h-[54px] sm:min-h-[60px] transition-all select-none ${
                      isTablesLocked ? 'cursor-default' : 'cursor-pointer hover:scale-105'
                    } ${
                      isOccupied 
                        ? 'border-yellow-500 bg-[#10121d] shadow-[0_0_8px_rgba(234,179,8,0.25)]' 
                        : 'border-emerald-500 bg-[#0d0e15] shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                    }`}
                  >
                    {/* Glowing Seat indicators (chair tabs) */}
                    {table.seats.includes('top') && (
                      <span className={`absolute top-[-3px] left-1/2 -translate-x-1/2 w-2 h-1 rounded-sm z-10 shadow-sm ${
                        isOccupied ? 'bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.7)]' : 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.7)]'
                      }`} />
                    )}
                    {table.seats.includes('bottom') && (
                      <span className={`absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-2 h-1 rounded-sm z-10 shadow-sm ${
                        isOccupied ? 'bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.7)]' : 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.7)]'
                      }`} />
                    )}
                    {table.seats.includes('left') && (
                      <span className={`absolute left-[-3px] top-1/2 -translate-y-1/2 w-1 h-2 rounded-sm z-10 shadow-sm ${
                        isOccupied ? 'bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.7)]' : 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.7)]'
                      }`} />
                    )}
                    {table.seats.includes('right') && (
                      <span className={`absolute right-[-3px] top-1/2 -translate-y-1/2 w-1 h-2 rounded-sm z-10 shadow-sm ${
                        isOccupied ? 'bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.7)]' : 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.7)]'
                      }`} />
                    )}

                    {/* Table Number */}
                    <span className="text-[11px] sm:text-xs font-black text-white font-mono leading-none">
                      {table.number}
                    </span>

                    {/* Status Label */}
                    <span className={`text-[6px] font-extrabold tracking-wider uppercase mt-1 leading-none ${
                      isOccupied ? 'text-yellow-400' : 'text-emerald-400'
                    }`}>
                      {isOccupied ? 'Ocupada' : 'Libre'}
                    </span>

                    {/* Occupant Pill */}
                    {isOccupied && table.occupant && (
                      <span className="mt-1 bg-gray-850/80 border border-gray-700/60 rounded px-1 py-0.5 text-[5px] sm:text-[5.5px] text-gray-300 font-bold max-w-[95%] truncate leading-none">
                        👤 {table.occupant}
                      </span>
                    )}

                    {/* Floating mini action buttons below occupied tables */}
                    {isOccupied && (
                      <div 
                        className="absolute bottom-[-16px] left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-1 w-max"
                        onClick={(e) => e.stopPropagation()} // Prevent clicking actions from toggling table state
                      >
                        {/* Plus button */}
                        <button 
                          onClick={() => triggerTactileFeedback()}
                          className="w-4 h-4 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-black text-[9px] flex items-center justify-center cursor-pointer shadow-md shadow-orange-500/20 border-none outline-none"
                        >
                          +
                        </button>
                        {/* Eye button */}
                        <button 
                          onClick={() => triggerTactileFeedback()}
                          className="w-4 h-4 rounded-full bg-[#0e1019] border border-gray-700/60 text-gray-300 hover:text-white hover:bg-gray-800 flex items-center justify-center cursor-pointer shadow-sm"
                        >
                          <Eye className="w-2.5 h-2.5 text-gray-400" />
                        </button>
                        {/* Calculator button */}
                        <button 
                          onClick={() => triggerTactileFeedback()}
                          className="w-4 h-4 rounded-full bg-[#0e1019] border border-gray-700/60 text-gray-300 hover:text-white hover:bg-gray-800 flex items-center justify-center cursor-pointer shadow-sm"
                        >
                          <Receipt className="w-2.5 h-2.5 text-gray-400" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'cocina':
        const filteredKitchenTickets = customKitchenTickets.filter(ticket => {
          const matchesSearch = ticket.plate.toLowerCase().includes(kitchenSearch.toLowerCase()) || 
                                ticket.table.toLowerCase().includes(kitchenSearch.toLowerCase());
          const matchesTable = selectedKitchenTable === 'Todas' || ticket.table.replace(/\s+/g, '').toUpperCase() === selectedKitchenTable.replace(/\s+/g, '').toUpperCase();
          return matchesSearch && matchesTable;
        });

        const pendingCount = filteredKitchenTickets.filter(t => t.status === 'pending').length;
        const preparingCount = filteredKitchenTickets.filter(t => t.status === 'preparing').length;
        const readyCount = filteredKitchenTickets.filter(t => t.status === 'ready').length;

        // Table options for dropdown filtering
        const tableOptions = ['Todas', 'MESA 1', 'MESA 7', 'MESA 8', 'MESA 9', 'MESA 12'];

        return (
          <div className="space-y-3">
            {/* 1. Header de Cocina principal */}
            <div className={`p-3 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-[#0b0d14] border-gray-800/60' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex flex-col gap-2.5">
                {/* Row 1: Brand Info */}
                <div className="flex items-center gap-2.5">
                  <div className="bg-[#ff6b00] p-1.5 rounded-lg text-white shadow-lg shadow-orange-500/20 flex items-center justify-center shrink-0">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-[11px] font-black tracking-wider text-white uppercase">
                        FLUJO DE COCINA
                      </h2>
                      <span className="bg-[#ff6b00] text-white font-black text-[6.5px] px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">
                        POR PLATO
                      </span>
                    </div>
                    <p className="text-[6.5px] font-black text-gray-500 tracking-widest uppercase mt-0.5">
                      ESTACIÓN PRINCIPAL • TABLET CONSOLE
                    </p>
                  </div>
                </div>

                {/* Row 2: Large digital clock centered */}
                <div className="text-center my-1">
                  <div className="text-2xl font-black text-[#ff6b00] font-mono tracking-wider leading-none">
                    {kitchenTime}
                  </div>
                  <div className="text-[6.5px] font-extrabold uppercase tracking-widest text-[#5e6675] mt-1.5 font-sans">
                    {getSpanishDate()}
                  </div>
                </div>

                {/* Row 3: Timers and Expand button */}
                <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-gray-800/40">
                  <div className="flex items-center gap-4">
                    {/* TEMP timer */}
                    <div className="flex items-center gap-1">
                      <div className="w-8 h-8 rounded-full border border-orange-500/20 bg-orange-500/5 flex flex-col items-center justify-center relative shrink-0">
                        <span className="text-[7px] font-black font-mono text-orange-400">00:{String(tempTimer).padStart(2, '0')}</span>
                        <span className="text-[4.5px] text-gray-500 font-black tracking-widest uppercase leading-none mt-0.5">TEMP</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <button 
                          onClick={() => { triggerTactileFeedback(); setTempTimer(20); }}
                          title="Recargar Timer"
                          className="w-3 h-3 rounded-full bg-[#181a26] border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer"
                        >
                          <RotateCw className="w-1.5 h-1.5" />
                        </button>
                        <button 
                          onClick={() => { triggerTactileFeedback(); setIsTempRunning(!isTempRunning); }}
                          title={isTempRunning ? "Pausar" : "Iniciar"}
                          className="w-3.5 h-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all cursor-pointer"
                        >
                          {isTempRunning ? <span className="text-[5px] font-black">⏸</span> : <span className="text-[5px] font-black">▶</span>}
                        </button>
                      </div>
                    </div>

                    {/* CRON timer */}
                    <div className="flex items-center gap-1">
                      <div className="w-8 h-8 rounded-full border border-orange-500/20 bg-orange-500/5 flex flex-col items-center justify-center relative shrink-0">
                        <span className="text-[7px] font-black font-mono text-orange-400">
                          {String(Math.floor(cronTimer / 60)).padStart(2, '0')}:{String(cronTimer % 60).padStart(2, '0')}
                        </span>
                        <span className="text-[4.5px] text-gray-500 font-black tracking-widest uppercase leading-none mt-0.5">CRON</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <button 
                          onClick={() => { triggerTactileFeedback(); setCronTimer(0); }}
                          title="Reiniciar Cronómetro"
                          className="w-3 h-3 rounded-full bg-[#181a26] border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer"
                        >
                          <RotateCw className="w-1.5 h-1.5" />
                        </button>
                        <button 
                          onClick={() => { triggerTactileFeedback(); setIsCronRunning(!isCronRunning); }}
                          title={isCronRunning ? "Pausar" : "Iniciar"}
                          className="w-3.5 h-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all cursor-pointer"
                        >
                          {isCronRunning ? <span className="text-[5px] font-black">⏸</span> : <span className="text-[5px] font-black">▶</span>}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* EXPANDIR Button */}
                  <button 
                    onClick={() => { triggerTactileFeedback(); setIsKitchenExpanded(!isKitchenExpanded); }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[6.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      isKitchenExpanded 
                        ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_8px_rgba(255,107,0,0.3)]' 
                        : 'border-orange-500/30 text-orange-500 bg-transparent hover:bg-orange-500/10'
                    }`}
                  >
                    <Maximize2 className="w-2 h-2" />
                    <span>{isKitchenExpanded ? 'CONTRAER' : 'EXPANDIR'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Barra de Búsqueda y Filtros de Cocina */}
            <div className="flex flex-col gap-1.5">
              {/* Search input with relative sizing */}
              <div className="relative w-full">
                <Search className="w-3 h-3 text-gray-400 absolute left-3 top-2.5" />
                <input 
                  type="text" 
                  placeholder="Buscar por plato o número de mesa..." 
                  value={kitchenSearch}
                  onChange={(e) => setKitchenSearch(e.target.value)}
                  className={`w-full border border-gray-800 rounded-xl pl-8 pr-3 py-1.5 text-[8.5px] font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all ${
                    isDarkMode ? 'bg-[#0c0e15] text-white placeholder-gray-500' : 'bg-white text-gray-800 placeholder-gray-400'
                  }`}
                />
              </div>

              {/* Volume sound & Mesa selection dropdown */}
              <div className="flex items-center gap-2">
                {/* Sonido Toggle Button */}
                <button 
                  onClick={() => { triggerTactileFeedback(); setIsKitchenSoundActive(!isKitchenSoundActive); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 border rounded-full text-[7.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    isKitchenSoundActive
                      ? 'border-[#4a2e1f] bg-[#2d1b11]/30 text-[#ff6b00]'
                      : 'border-gray-800 bg-transparent text-gray-500'
                  }`}
                >
                  {isKitchenSoundActive ? <Volume2 className="w-3 h-3 text-orange-500" /> : <VolumeX className="w-3 h-3" />}
                  <span>{isKitchenSoundActive ? 'SONIDO ACTIVADO' : 'SILENCIADO'}</span>
                </button>

                {/* Table Filter Selector Dropdown */}
                <div className="relative flex-1">
                  <select 
                    value={selectedKitchenTable}
                    onChange={(e) => setSelectedKitchenTable(e.target.value)}
                    className={`w-full border border-gray-800 rounded-full px-3 py-1.5 pr-7 text-[7.5px] font-black uppercase tracking-wider appearance-none cursor-pointer focus:outline-none ${
                      isDarkMode ? 'bg-[#0c0e15] text-gray-300' : 'bg-white text-gray-700'
                    }`}
                  >
                    {tableOptions.map(opt => (
                      <option key={opt} value={opt}>
                        {opt === 'Todas' ? 'TODAS LAS MESAS' : opt.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-2.5 h-2.5 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 3. Cuadrantes Rápidos (Counters Row) */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0e1019] border-gray-800/60' : 'bg-white border-gray-200'}`}>
                <div>
                  <span className="text-[6.5px] font-black uppercase tracking-wider text-[#525f7a] block">PENDIENTES</span>
                  <span className="text-sm font-black font-mono text-white leading-none block mt-1">{pendingCount}</span>
                </div>
                <div className="w-5.5 h-5.5 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3 text-blue-500" />
                </div>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0e1019] border-gray-800/60' : 'bg-white border-gray-200'}`}>
                <div>
                  <span className="text-[6.5px] font-black uppercase tracking-wider text-[#525f7a] block">EN PROCESO</span>
                  <span className="text-sm font-black font-mono text-white leading-none block mt-1">{preparingCount}</span>
                </div>
                <div className="w-5.5 h-5.5 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Flame className="w-3 h-3 text-orange-500" />
                </div>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0e1019] border-gray-800/60' : 'bg-white border-gray-200'}`}>
                <div>
                  <span className="text-[6.5px] font-black uppercase tracking-wider text-[#525f7a] block">LISTOS</span>
                  <span className="text-sm font-black font-mono text-white leading-none block mt-1">{readyCount}</span>
                </div>
                <div className="w-5.5 h-5.5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                </div>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0e1019] border-gray-800/60' : 'bg-white border-gray-200'}`}>
                <div>
                  <span className="text-[6.5px] font-black uppercase tracking-wider text-[#525f7a] block">ESPERA PROMEDIO</span>
                  <span className="text-sm font-black font-mono text-white leading-none block mt-1">65 <span className="text-[10px] text-gray-400 font-sans font-medium">min</span></span>
                </div>
                <div className="w-5.5 h-5.5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Sliders className="w-3 h-3 text-amber-500" />
                </div>
              </div>
            </div>

            {/* Mobile-Only Segmented Tabs for ticket columns to prevent horizontal layout break */}
            <div className="flex p-0.5 bg-[#090b14] rounded-xl border border-gray-800/60 gap-1 md:hidden mt-2.5">
              <button 
                onClick={() => { triggerTactileFeedback(); setActiveKitchenColTab('pending'); }}
                className={`flex-1 py-1 rounded-lg text-[7.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                  activeKitchenColTab === 'pending' 
                    ? 'bg-[#131b2e] border border-[#1e2a4a] text-blue-400 font-black' 
                    : 'text-[#525f7a]'
                }`}
              >
                <Clock className="w-2.5 h-2.5" />
                <span>PENDIENTES ({pendingCount})</span>
              </button>
              <button 
                onClick={() => { triggerTactileFeedback(); setActiveKitchenColTab('preparing'); }}
                className={`flex-1 py-1 rounded-lg text-[7.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                  activeKitchenColTab === 'preparing' 
                    ? 'bg-[#291a13] border border-[#4d2d18] text-orange-400 font-black' 
                    : 'text-[#525f7a]'
                }`}
              >
                <Flame className="w-2.5 h-2.5" />
                <span>EN PROCESO ({preparingCount})</span>
              </button>
              <button 
                onClick={() => { triggerTactileFeedback(); setActiveKitchenColTab('ready'); }}
                className={`flex-1 py-1 rounded-lg text-[7.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                  activeKitchenColTab === 'ready' 
                    ? 'bg-[#10241b] border border-[#1b402e] text-emerald-400 font-black' 
                    : 'text-[#525f7a]'
                }`}
              >
                <CheckCircle className="w-2.5 h-2.5" />
                <span>LISTOS ({readyCount})</span>
              </button>
            </div>

            {/* 4. Columnas de Comandas (Pendientes, En Proceso, Listos) */}
            <div className={`grid grid-cols-1 ${isKitchenExpanded ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-3 mt-3`}>
              
              {/* PENDIENTES */}
              <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#08090c] border-gray-800/60' : 'bg-gray-50 border-gray-200'} ${
                activeKitchenColTab === 'pending' ? 'block' : 'hidden md:block'
              }`}>
                <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-gray-800/10 dark:border-gray-850/60">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <h3 className="text-[9.5px] font-black uppercase text-gray-200 tracking-wider">PENDIENTES</h3>
                  </div>
                  <span className="bg-[#11131c] text-[#525f7a] font-mono text-[7px] font-black px-1.5 py-0.5 rounded-full border border-gray-800">
                    {pendingCount}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {filteredKitchenTickets.filter(t => t.status === 'pending').map(ticket => (
                    <div 
                      key={ticket.id} 
                      className={`relative p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                        ticket.critical 
                          ? 'border-rose-500/40 bg-[#161013] shadow-[0_0_8px_rgba(239,68,68,0.1)]' 
                          : 'border-gray-800 bg-[#0e1019]'
                      }`}
                    >
                      {ticket.critical && (
                        <div className="absolute -top-1.5 right-2 bg-rose-500 text-white text-[5.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                          CRÍTICO
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-100 flex items-center">
                          <span className="text-orange-500 text-[9px] font-black mr-1">1x</span> {ticket.plate}
                        </span>
                        <span className={`text-[7px] font-bold flex items-center gap-1 ${ticket.critical ? 'text-rose-400' : 'text-gray-400'}`}>
                          <Clock className={`w-3 h-3 ${ticket.critical ? 'text-rose-500' : 'text-gray-400'}`} />
                          Hace {ticket.elapsedMinutes} min
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-0.5">
                        <span className="bg-[#1c1e2d] border border-[#2d3047] text-gray-300 font-black text-[7.5px] px-1.5 py-0.5 rounded uppercase leading-none">
                          {ticket.table}
                        </span>
                        
                        <button 
                          onClick={() => {
                            triggerTactileFeedback();
                            setCustomKitchenTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: 'preparing' } : t));
                          }}
                          className="bg-[#ff6b00] hover:bg-orange-600 text-white font-black text-[7px] px-2.5 py-1 rounded-md flex items-center gap-1 uppercase transition-all shadow-[0_2px_6px_rgba(255,107,0,0.25)] border-none cursor-pointer"
                        >
                          <Flame className="w-2.5 h-2.5 text-white" /> EMPEZAR →
                        </button>
                      </div>
                    </div>
                  ))}

                  {pendingCount === 0 && (
                    <div className="py-8 text-center text-gray-500 text-[8px] font-bold uppercase tracking-wide">
                      No hay platos pendientes
                    </div>
                  )}
                </div>
              </div>

              {/* EN PROCESO */}
              <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#08090c] border-gray-800/60' : 'bg-gray-50 border-gray-200'} ${
                activeKitchenColTab === 'preparing' ? 'block' : 'hidden md:block'
              }`}>
                <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-gray-800/10 dark:border-gray-850/60">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <h3 className="text-[9.5px] font-black uppercase text-gray-200 tracking-wider">EN PROCESO</h3>
                  </div>
                  <span className="bg-[#11131c] text-[#525f7a] font-mono text-[7px] font-black px-1.5 py-0.5 rounded-full border border-gray-800">
                    {preparingCount}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {filteredKitchenTickets.filter(t => t.status === 'preparing').map(ticket => (
                    <div 
                      key={ticket.id} 
                      className="p-3 rounded-xl border border-orange-500/20 bg-[#161211] flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-100 flex items-center">
                          <span className="text-orange-500 text-[9px] font-black mr-1">1x</span> {ticket.plate}
                        </span>
                        <span className="text-[7px] font-bold text-orange-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-orange-500" />
                          Hace {ticket.elapsedMinutes} min
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-0.5">
                        <div className="flex items-center gap-1">
                          <span className="bg-[#1c1e2d] border border-[#2d3047] text-gray-300 font-black text-[7.5px] px-1.5 py-0.5 rounded uppercase leading-none">
                            {ticket.table}
                          </span>
                          {ticket.occupant && (
                            <span className="bg-gray-800 text-gray-400 font-bold text-[6px] px-1 py-0.5 rounded flex items-center gap-0.5">
                              👤 {ticket.occupant}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {/* Return button */}
                          <button 
                            onClick={() => {
                              triggerTactileFeedback();
                              setCustomKitchenTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: 'pending' } : t));
                            }}
                            title="Regresar a Pendientes"
                            className="p-1 rounded bg-[#10121d] border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 flex items-center justify-center cursor-pointer shadow-sm"
                          >
                            <RotateCw className="w-2.5 h-2.5" />
                          </button>

                          {/* Complete button */}
                          <button 
                            onClick={() => {
                              triggerTactileFeedback();
                              setCustomKitchenTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: 'ready', occupant: 'Hector' } : t));
                            }}
                            className="bg-[#ff6b00] hover:bg-orange-600 text-white font-black text-[7px] px-2 py-1 rounded flex items-center gap-1 uppercase transition-all cursor-pointer border-none shadow-[0_2px_6px_rgba(255,107,0,0.25)]"
                          >
                            ✓ LISTO
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {preparingCount === 0 && (
                    <div className="py-8 flex flex-col items-center justify-center text-center">
                      <Flame className="w-4 h-4 text-orange-500/50 animate-pulse mb-1.5" />
                      <p className="text-[7.5px] text-gray-500 font-extrabold uppercase tracking-wide">Sin platos en proceso</p>
                    </div>
                  )}
                </div>
              </div>

              {/* LISTOS */}
              <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#08090c] border-gray-800/60' : 'bg-gray-50 border-gray-200'} ${
                activeKitchenColTab === 'ready' ? 'block' : 'hidden md:block'
              }`}>
                <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-gray-800/10 dark:border-gray-850/60">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <h3 className="text-[9.5px] font-black uppercase text-gray-200 tracking-wider">LISTOS</h3>
                  </div>
                  <span className="bg-[#11131c] text-[#525f7a] font-mono text-[7px] font-black px-1.5 py-0.5 rounded-full border border-gray-800">
                    {readyCount}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {filteredKitchenTickets.filter(t => t.status === 'ready').map(ticket => (
                    <div 
                      key={ticket.id} 
                      className="p-3 rounded-xl border border-gray-800 bg-[#0e1019] flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-100 flex items-center">
                          <span className="text-orange-500 text-[9px] font-black mr-1">1x</span> {ticket.plate}
                        </span>
                        <span className="text-[7px] font-bold text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          Hace {ticket.elapsedMinutes} min
                        </span>
                      </div>

                      {/* Custom note box for comments if any */}
                      {ticket.customNote && (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-1 text-rose-400 text-[7px] font-black uppercase tracking-wider flex items-center gap-1">
                          <span>📝 {ticket.customNote}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-0.5">
                        <div className="flex items-center gap-1">
                          <span className="bg-[#1c1e2d] border border-[#2d3047] text-gray-300 font-black text-[7.5px] px-1.5 py-0.5 rounded uppercase leading-none">
                            {ticket.table}
                          </span>
                          {ticket.occupant && (
                            <span className="bg-gray-800 text-gray-400 font-bold text-[6px] px-1 py-0.5 rounded flex items-center gap-0.5">
                              👤 {ticket.occupant}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {/* Return button */}
                          <button 
                            onClick={() => {
                              triggerTactileFeedback();
                              setCustomKitchenTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: 'preparing' } : t));
                            }}
                            title="Regresar a En Proceso"
                            className="p-1 rounded bg-[#10121d] border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 flex items-center justify-center cursor-pointer shadow-sm"
                          >
                            <RotateCw className="w-2.5 h-2.5" />
                          </button>
                          
                          {/* Delivery complete button */}
                          <button 
                            onClick={() => {
                              triggerTactileFeedback();
                              setCustomKitchenTickets(prev => prev.filter(t => t.id !== ticket.id));
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[7px] px-2 py-1 rounded flex items-center gap-1 uppercase transition-all cursor-pointer border-none shadow-[0_2px_6px_rgba(16,185,129,0.25)]"
                          >
                            ✓ LISTO
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {readyCount === 0 && (
                    <div className="py-8 text-center text-gray-500 text-[8px] font-bold uppercase tracking-wide">
                      No hay platos listos
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* 5. Pie de Página Carousel (Footer Quote) */}
            <div className={`p-2 rounded-2xl border flex items-center justify-between text-center ${
              isDarkMode ? 'bg-[#0a0c11] border-gray-800/40 text-gray-400' : 'bg-gray-50 border-gray-150 text-gray-600'
            }`}>
              <button 
                onClick={triggerTactileFeedback}
                className="p-1 hover:text-orange-500 transition-colors cursor-pointer border-none bg-transparent font-bold text-[9px]"
              >
                ◀
              </button>
              <p className="text-[7.5px] italic max-w-[85%] font-medium leading-normal">
                "Las mandolinas aseguran un grosor uniforme de las verduras para una cocción pareja."
              </p>
              <button 
                onClick={triggerTactileFeedback}
                className="p-1 hover:text-orange-500 transition-colors cursor-pointer border-none bg-transparent font-bold text-[9px]"
              >
                ▶
              </button>
            </div>
          </div>
        );

      case 'caja': {
        const activeThemeObj = themes[themeColor];
        
        // Dynamic calculations for bottom cards based on the "EN CURSO" session (Arqueo 48)
        const activeArqueo = customArqueos.find(a => a.status === 'EN CURSO') || customArqueos[0] || {
          initialAmt: 100.0, expenses: 0.0, cash: 0.0, card: 45.0, digital: 30.0, manual: 0.0, tips: 2.25, totalCaja: 100.0, totalGross: 75.0
        };

        const totalInCaja = activeArqueo.initialAmt + activeArqueo.cash - activeArqueo.expenses;
        const totalGross = activeArqueo.cash + activeArqueo.card + activeArqueo.digital;
        const digitalFlow = activeArqueo.digital;
        const cardFlow = activeArqueo.card;

        // Filter arqueos based on search query
        const filteredArqueos = customArqueos.filter(arq => {
          const searchLower = arqueosSearch.toLowerCase();
          return (
            arq.id.toString().includes(searchLower) ||
            arq.start.toLowerCase().includes(searchLower) ||
            (arq.end && arq.end.toLowerCase().includes(searchLower)) ||
            arq.status.toLowerCase().includes(searchLower)
          );
        });

        // Calculate total of active open bills in salon
        const totalCuentasAbiertas = customCuentasAbiertas.reduce((acc, curr) => acc + curr.total, 0);

        return (
          <div className="space-y-4">
            {/* 1. Header Row - Matching Screenshot layout */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                  Arqueo de Caja
                </h1>
                <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Sesión Activa:</span>
                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      ABIERTO
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Calendar className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">
                      Iniciado: 08/07/2026 14:47:34
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button 
                  onClick={() => { triggerTactileFeedback(); setShowAddMovementModal(true); }}
                  className="bg-[#ff6b00] hover:bg-orange-600 text-white font-black text-[9px] px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-[0_2px_10px_rgba(255,107,0,0.3)] cursor-pointer border-none uppercase font-sans"
                >
                  <Plus className="w-3.5 h-3.5" /> Movimiento
                </button>
                <button 
                  onClick={() => {
                    triggerTactileFeedback();
                    alert("Exportando reporte de arqueos de caja a Excel...");
                  }}
                  className="bg-transparent hover:bg-gray-800 text-gray-300 border border-gray-800 font-black text-[9px] px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer uppercase font-sans"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Exportar Excel
                </button>
                <button 
                  onClick={() => triggerTactileFeedback()}
                  className="bg-transparent hover:bg-gray-800 text-gray-300 border border-gray-800 font-black text-[9px] px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer uppercase font-sans"
                >
                  <Calendar className="w-3.5 h-3.5 text-orange-500" /> Filtrar por Fecha
                </button>
              </div>
            </div>

            {/* Main Grid Content - Sidebar + Table Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              
              {/* LEFT COLUMN: Arqueo History (ColSpan 3) */}
              <div className="lg:col-span-3 space-y-4">
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-[#0b0d14] border-gray-800/60' : 'bg-gray-50 border-gray-200'
                }`}>
                  
                  {/* Title and search header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-sm font-black text-white uppercase tracking-wider">
                        Historial de Sesiones de Arqueo
                      </h2>
                      <p className="text-[10px] text-[#5e6675] font-semibold tracking-wide mt-1">
                        Auditoría completa de movimientos de caja registrados en el sistema.
                      </p>
                    </div>
                    
                    {/* Search Input */}
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                      <input 
                        type="text" 
                        placeholder="Buscar arqueo por Nº, fecha, estado..." 
                        value={arqueosSearch}
                        onChange={(e) => setArqueosSearch(e.target.value)}
                        className={`w-full border border-gray-850/60 rounded-xl pl-9 pr-3 py-2 text-[9px] font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all ${
                          isDarkMode ? 'bg-[#0c0e15] text-white placeholder-gray-500' : 'bg-white text-gray-800 placeholder-gray-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* High Fidelity Table Container */}
                  <div className="overflow-x-auto border border-gray-800/60 rounded-xl">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-[#ff6b00] text-white text-[8px] font-black tracking-widest uppercase">
                          <th className="p-3 text-center w-12 rounded-tl-xl">Nº</th>
                          <th className="p-3">FECHAS SESIÓN</th>
                          <th className="p-3 text-right">INICIO</th>
                          <th className="p-3 text-right">EGRESOS</th>
                          <th className="p-3 text-center">INGRESOS DESGLOSADOS</th>
                          <th className="p-3 text-right">PROPINAS</th>
                          <th className="p-3 text-right">TOTAL CAJA</th>
                          <th className="p-3 text-right">TOTAL BRUTO</th>
                          <th className="p-3 text-center rounded-tr-xl w-16">ACCIONES</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850/60">
                        {filteredArqueos.map((arq) => {
                          const isEnCurso = arq.status === 'EN CURSO';
                          return (
                            <tr 
                              key={arq.id} 
                              className={`text-[9.5px] transition-colors ${
                                isDarkMode 
                                  ? 'hover:bg-[#121422] text-gray-300' 
                                  : 'hover:bg-gray-100 text-gray-800'
                              } ${isEnCurso ? 'bg-orange-500/5' : ''}`}
                            >
                              {/* ID */}
                              <td className="p-3 font-black text-center text-white">{arq.id}</td>
                              
                              {/* FECHAS SESION */}
                              <td className="p-3 space-y-1">
                                <div className="font-bold flex items-center gap-1">
                                  <span className="text-gray-500">Ini:</span> 
                                  <span className="font-mono text-gray-100">{arq.start}</span>
                                </div>
                                {arq.end ? (
                                  <div className="font-bold flex items-center gap-1 text-gray-400">
                                    <span className="text-gray-500">Fin:</span> 
                                    <span className="font-mono">{arq.end}</span>
                                  </div>
                                ) : (
                                  <span className="inline-block bg-emerald-500/15 text-emerald-400 text-[6.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    ● EN CURSO
                                  </span>
                                )}
                              </td>
                              
                              {/* INICIO */}
                              <td className="p-3 text-right font-mono font-black text-white">
                                S/. {arq.initialAmt.toFixed(2)}
                              </td>
                              
                              {/* EGRESOS */}
                              <td className="p-3 text-right font-mono font-black text-white">
                                S/. {arq.expenses.toFixed(2)}
                              </td>
                              
                              {/* INGRESOS DESGLOSADOS BOX (Matching image exactly) */}
                              <td className="p-3">
                                <div className="bg-[#0e1019] border border-gray-850/80 p-2 rounded-xl grid grid-cols-2 gap-x-3 gap-y-1.5 max-w-[280px] mx-auto">
                                  <div className="flex items-center justify-between text-[8px] font-bold">
                                    <span className="text-gray-500 uppercase">Efectivo:</span>
                                    <span className="font-mono text-white font-extrabold">{arq.cash.toFixed(2)}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[8px] font-bold">
                                    <span className="text-gray-500 uppercase">Dig:</span>
                                    <span className="bg-[#1e2a4a] text-blue-400 font-mono font-black px-1.5 py-0.5 rounded flex items-center gap-1 select-none">
                                      <Eye className="w-2.5 h-2.5" />
                                      {arq.digital.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[8px] font-bold">
                                    <span className="text-gray-500 uppercase">Tarj:</span>
                                    <span className="bg-[#4d2d18] text-orange-400 font-mono font-black px-1.5 py-0.5 rounded flex items-center gap-1 select-none">
                                      <Eye className="w-2.5 h-2.5" />
                                      {arq.card.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[8px] font-bold">
                                    <span className="text-gray-500 uppercase">Manual:</span>
                                    <span className="font-mono text-white font-extrabold">{arq.manual.toFixed(2)}</span>
                                  </div>
                                </div>
                              </td>
                              
                              {/* PROPINAS */}
                              <td className="p-3 text-right font-mono font-black text-white">
                                S/. {arq.tips.toFixed(2)}
                              </td>
                              
                              {/* TOTAL CAJA */}
                              <td className="p-3 text-right font-mono font-black text-white">
                                S/. {arq.totalCaja.toFixed(2)}
                              </td>
                              
                              {/* TOTAL BRUTO */}
                              <td className="p-3 text-right font-mono font-black text-[#ff6b00]">
                                S/. {arq.totalGross.toFixed(2)}
                              </td>
                              
                              {/* ACCIONES */}
                              <td className="p-3 text-center">
                                <button 
                                  onClick={() => {
                                    triggerTactileFeedback();
                                    alert(`Opciones de Arqueo Nº ${arq.id}: Enviar por Email, Reimprimir Cierre, Editar Transacciones.`);
                                  }}
                                  className="w-7 h-7 rounded-full bg-[#181a26] hover:bg-gray-800 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination footer block */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-3 border-t border-gray-850/60">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">
                      Total de Arqueos: {customArqueos.length}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => triggerTactileFeedback()}
                        className="bg-[#10121d] hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white font-bold text-[9px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-3 h-3" /> Anterior
                      </button>
                      <span className="text-[10px] text-gray-300 font-mono font-bold px-3 py-1 bg-[#10121d] border border-gray-800 rounded-lg">
                        Página 1 de 10
                      </span>
                      <button 
                        onClick={() => triggerTactileFeedback()}
                        className="bg-[#10121d] hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white font-bold text-[9px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                      >
                        Siguiente <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                </div>

                {/* Bottom row: Four summary widgets (recreated exactly from the screenshot) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  
                  {/* Widget 1: TOTAL EN CAJA */}
                  <div className={`p-4 rounded-2xl border flex flex-col justify-between h-28 ${
                    isDarkMode ? 'bg-[#0b0d14] border-gray-800/60' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div>
                      <span className="text-[8px] font-black text-gray-500 tracking-wider uppercase block">TOTAL EN CAJA</span>
                      <span className="text-lg font-black font-mono text-white block mt-2">S/. {totalInCaja.toFixed(2)}</span>
                    </div>
                    <span className="text-[8px] font-bold text-gray-500 tracking-wide uppercase mt-1">Saldo en efectivo disponible</span>
                  </div>

                  {/* Widget 2: TOTAL BRUTO */}
                  <div className={`p-4 rounded-2xl border flex flex-col justify-between h-28 ${
                    isDarkMode ? 'bg-[#0b0d14] border-gray-800/60' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div>
                      <span className="text-[8px] font-black text-gray-500 tracking-wider uppercase block">TOTAL BRUTO</span>
                      <span className="text-lg font-black font-mono text-white block mt-2">S/. {totalGross.toFixed(2)}</span>
                    </div>
                    <span className="text-[8px] font-bold text-gray-500 tracking-wide uppercase mt-1">Suma total de cobros</span>
                  </div>

                  {/* Widget 3: FLUJO DIGITAL */}
                  <div className={`p-4 rounded-2xl border flex flex-col justify-between h-28 ${
                    isDarkMode ? 'bg-[#0b0d14] border-gray-800/60' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div>
                      <span className="text-[8px] font-black text-gray-500 tracking-wider uppercase block">FLUJO DIGITAL</span>
                      <span className="text-lg font-black font-mono text-white block mt-2">S/. {digitalFlow.toFixed(2)}</span>
                    </div>
                    <span className="text-[8px] font-bold text-gray-500 tracking-wide uppercase mt-1">Yape + Plin acumulado</span>
                  </div>

                  {/* Widget 4: FLUJO TARJETA */}
                  <div className={`p-4 rounded-2xl border flex flex-col justify-between h-28 ${
                    isDarkMode ? 'bg-[#0b0d14] border-gray-800/60' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div>
                      <span className="text-[8px] font-black text-gray-500 tracking-wider uppercase block">FLUJO TARJETA</span>
                      <span className="text-lg font-black font-mono text-white block mt-2">S/. {cardFlow.toFixed(2)}</span>
                    </div>
                    <span className="text-[8px] font-bold text-gray-500 tracking-wide uppercase mt-1">Tarjetas POS registradas</span>
                  </div>

                </div>

              </div>

              {/* RIGHT COLUMN: Cuentas Abiertas Sidebar (ColSpan 1) */}
              <div className={`p-4 rounded-2xl border flex flex-col h-full transition-all ${
                isDarkMode ? 'bg-[#0b0d14] border-gray-800/60' : 'bg-gray-50 border-gray-200'
              }`}>
                
                {/* Heading */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-white tracking-wider uppercase">CUENTAS ABIERTAS</span>
                  </div>
                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-[7.5px] px-2 py-0.5 rounded-md">
                    {customCuentasAbiertas.length} activa(s)
                  </span>
                </div>
                <p className="text-[9px] text-[#5e6675] font-semibold tracking-wide mb-4">
                  Control de mesas en salón activo
                </p>

                {/* Por cobrar en salon card */}
                <div className="bg-[#121422] border border-gray-850/60 p-3.5 rounded-xl mb-4 space-y-1">
                  <span className="text-[8px] font-black text-gray-400 tracking-wider uppercase">Por cobrar en salón:</span>
                  <div className="text-base font-mono font-black text-white">S/. {totalCuentasAbiertas.toFixed(2)}</div>
                  <p className="text-[8.5px] text-[#5e6675] font-semibold tracking-wide leading-normal">
                    Capital flotante pendiente de facturar en salón.
                  </p>
                </div>

                {/* Scrollable list of accounts */}
                <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                  {customCuentasAbiertas.length === 0 ? (
                    <div className="text-center py-6">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-40" />
                      <p className="text-[10px] text-gray-400 font-bold uppercase">¡Todo Facturado!</p>
                      <p className="text-[8px] text-gray-500 mt-1 uppercase">No hay cuentas pendientes</p>
                    </div>
                  ) : (
                    customCuentasAbiertas.map((ca) => (
                      <div 
                        key={ca.id} 
                        className="bg-[#0e1019] border border-gray-850/60 p-3 rounded-xl space-y-2.5 hover:border-gray-750 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-white uppercase">{ca.table}</span>
                          <span className="text-[10.5px] font-mono font-black text-emerald-400">S/. {ca.total.toFixed(2)}</span>
                        </div>
                        
                        {/* Plates details */}
                        <div className="space-y-1 text-[9.5px] font-semibold text-gray-400 border-t border-gray-850/30 pt-2">
                          {ca.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span>{item.qty}x {item.name}</span>
                              <span className="font-mono text-[8.5px] text-gray-500">S/. {item.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Interactive action buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          
                          {/* Delete Account button */}
                          <button 
                            onClick={() => {
                              triggerTactileFeedback();
                              if (confirm(`¿Eliminar comanda de ${ca.table}?`)) {
                                setCustomCuentasAbiertas(prev => prev.filter(item => item.id !== ca.id));
                              }
                            }}
                            className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                            title="Eliminar Comanda"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Cerrar e Imprimir payment simulator */}
                          <button 
                            onClick={() => {
                              triggerTactileFeedback();
                              // Ask user how they want to pay to simulate the real split!
                              const choice = prompt(`Cobrar ${ca.table} por S/. ${ca.total.toFixed(2)}:\nEscribe 'E' para Efectivo, 'T' para Tarjeta, 'D' para Digital (Yape/Plin):`, 'E');
                              if (!choice) return;
                              
                              const val = choice.toUpperCase();
                              let paymentMethod = 'Efectivo';
                              
                              setCustomArqueos(prev => {
                                return prev.map(a => {
                                  if (a.status === 'EN CURSO') {
                                    if (val === 'T') {
                                      paymentMethod = 'Tarjeta';
                                      return { ...a, card: a.card + ca.total, totalCaja: a.totalCaja, totalGross: a.totalGross + ca.total };
                                    } else if (val === 'D') {
                                      paymentMethod = 'Digital';
                                      return { ...a, digital: a.digital + ca.total, totalCaja: a.totalCaja, totalGross: a.totalGross + ca.total };
                                    } else {
                                      // default is cash (E)
                                      return { ...a, cash: a.cash + ca.total, totalCaja: a.totalCaja + ca.total, totalGross: a.totalGross + ca.total };
                                    }
                                  }
                                  return a;
                                });
                              });

                              setCustomCuentasAbiertas(prev => prev.filter(item => item.id !== ca.id));
                              alert(`¡Pago procesado exitosamente!\n\nMesa: ${ca.table}\nMonto: S/. ${ca.total.toFixed(2)}\nMétodo: ${paymentMethod}\n\nLa sesión de arqueo en curso ha sido actualizada.`);
                            }}
                            className="flex-1 bg-[#ff6b00] hover:bg-orange-600 text-white font-black text-[9px] py-2 rounded-xl flex items-center justify-center gap-1.5 uppercase transition-all shadow-[0_2px_6px_rgba(255,107,0,0.25)] border-none cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" /> Cerrar e Imprimir
                          </button>

                        </div>

                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>

            {/* Simulated Add Movement Modal Dialog */}
            {showAddMovementModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                <div className="bg-[#0b0d14] border border-gray-800 rounded-2xl w-full max-w-sm p-4 space-y-4 shadow-[0_0_50px_rgba(255,107,0,0.15)] text-left">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                    <span className="text-[11px] font-black text-white uppercase tracking-wider">Nuevo Movimiento de Caja</span>
                    <button 
                      onClick={() => { triggerTactileFeedback(); setShowAddMovementModal(false); }}
                      className="text-gray-400 hover:text-white font-black text-xs cursor-pointer border-none bg-transparent"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Movement Type */}
                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider block">Tipo de Movimiento</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => { triggerTactileFeedback(); setMovementForm(p => ({ ...p, type: 'INGRESOS' })); }}
                          className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                            movementForm.type === 'INGRESOS'
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                              : 'border-gray-800 text-gray-500 bg-transparent'
                          }`}
                        >
                          INGRESOS
                        </button>
                        <button 
                          onClick={() => { triggerTactileFeedback(); setMovementForm(p => ({ ...p, type: 'EGRESOS' })); }}
                          className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                            movementForm.type === 'EGRESOS'
                              ? 'border-red-500 bg-red-500/10 text-red-400'
                              : 'border-gray-800 text-gray-500 bg-transparent'
                          }`}
                        >
                          EGRESOS (Caja Chica)
                        </button>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider block">Monto (S/.)</span>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={movementForm.amount}
                        onChange={(e) => setMovementForm(p => ({ ...p, amount: e.target.value }))}
                        className="w-full bg-[#10121d] border border-gray-800 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-orange-500 font-mono"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider block">Descripción / Concepto</span>
                      <input 
                        type="text" 
                        placeholder="Ej. Compra de limones, Pago propinas..."
                        value={movementForm.description}
                        onChange={(e) => setMovementForm(p => ({ ...p, description: e.target.value }))}
                        className="w-full bg-[#10121d] border border-gray-800 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                    <button 
                      onClick={() => { triggerTactileFeedback(); setShowAddMovementModal(false); }}
                      className="flex-1 bg-[#10121d] hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white font-black text-[9px] py-2 rounded-xl transition-all cursor-pointer uppercase font-sans"
                    >
                      CANCELAR
                    </button>
                    <button 
                      onClick={() => {
                        triggerTactileFeedback();
                        const amt = parseFloat(movementForm.amount);
                        if (!amt || amt <= 0) {
                          alert("Por favor, ingresa un monto válido.");
                          return;
                        }
                        if (!movementForm.description.trim()) {
                          alert("Por favor, ingresa una descripción.");
                          return;
                        }

                        setCustomArqueos(prev => {
                          return prev.map(a => {
                            if (a.status === 'EN CURSO') {
                              if (movementForm.type === 'INGRESOS') {
                                return {
                                  ...a,
                                  cash: a.cash + amt,
                                  totalCaja: a.totalCaja + amt,
                                  totalGross: a.totalGross + amt
                                };
                              } else {
                                return {
                                  ...a,
                                  expenses: a.expenses + amt,
                                  totalCaja: a.totalCaja - amt,
                                  totalGross: a.totalGross // Expenses do not alter gross earnings
                                };
                              }
                            }
                            return a;
                          });
                        });

                        setShowAddMovementModal(false);
                        setMovementForm({ type: 'INGRESOS', amount: '', description: '' });
                        alert(`¡Movimiento registrado con éxito!\n\nTipo: ${movementForm.type}\nMonto: S/. ${amt.toFixed(2)}\nDescripción: ${movementForm.description}`);
                      }}
                      className="flex-1 bg-[#ff6b00] hover:bg-orange-600 text-white font-black text-[9px] py-2 rounded-xl transition-all shadow-[0_2px_6px_rgba(255,107,0,0.25)] border-none cursor-pointer uppercase font-sans"
                    >
                      REGISTRAR
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        );
      }

      case 'ajustes':
        const curTheme = themes[themeColor];
        return (
          <div className="p-1">
            <div className="mb-3">
              <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <Settings className={`w-4 h-4 ${curTheme.text}`} /> Ajustes del Sistema
              </h2>
              <p className="text-[8px] sm:text-[9px] text-gray-500">Personalización de temas y acentos visuales</p>
            </div>

            {/* THEME SELECTOR CARD */}
            <div className="bg-[#11131d] p-3 rounded-xl border border-gray-800 mb-3.5">
              <span className="text-[8px] font-mono font-bold text-gray-400 block uppercase mb-1.5">Tema de Color de Interfaz</span>
              <p className="text-[9px] text-gray-400 mb-2.5">Cambia el color de acción e iluminación del dock y el simulador móvil:</p>
              
              <div className="grid grid-cols-1 gap-1.5">
                {(Object.keys(themes) as Array<keyof typeof themes>).map((colorKey) => {
                  const t = themes[colorKey];
                  const isSelected = themeColor === colorKey;
                  return (
                    <button
                      key={colorKey}
                      onClick={() => { setThemeColor(colorKey); triggerTactileFeedback(); }}
                      className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
                        isSelected 
                          ? 'bg-[#181a29]/85 border-gray-700 shadow-md' 
                          : 'bg-[#0a0b11] border-gray-900/60 hover:border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ 
                            backgroundColor: t.primary,
                            boxShadow: `0 0 8px ${t.primary}` 
                          }} 
                        />
                        <span className={`text-[9.5px] font-medium ${isSelected ? 'text-white font-bold' : 'text-gray-400'}`}>
                          {t.name}
                        </span>
                      </div>
                      
                      {isSelected && (
                        <span className={`text-[8px] font-bold uppercase tracking-wider ${t.text}`}>Seleccionado</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SIMULATOR PREFERENCES CARD */}
            <div className="bg-[#11131d] p-3 rounded-xl border border-gray-800">
              <span className="text-[8px] font-mono font-bold text-gray-400 block uppercase mb-1">Simulador Ergonómico</span>
              <p className="text-[9px] text-gray-400 mb-2">Características adicionales de la comanda móvil:</p>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#07080d] border border-gray-900">
                  <span className="text-[9px] text-gray-300">Respuesta Táctil (Haptic Click)</span>
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-mono font-bold">Activo</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#07080d] border border-gray-900">
                  <span className="text-[9px] text-gray-300">Latencia de Red</span>
                  <span className="text-[8px] text-gray-400 font-mono">12ms (Óptimo)</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="py-6 text-center">
            <div className="bg-orange-500/10 text-orange-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              {renderMenuIcon(menuItems.find(m => m.id === activeView)?.icon || 'Grid', 'w-6 h-6')}
            </div>
            <h3 className="font-bold text-sm text-white capitalize">{menuItems.find(m => m.id === activeView)?.label || activeView}</h3>
            <p className="text-[10px] text-gray-400 max-w-[200px] mx-auto mt-1">
              Este módulo secundario se ha integrado perfectamente en la estructura táctil adaptativa de la Propuesta {proposal}.
            </p>
            <div className="mt-4">
              <button 
                onClick={() => { setActiveView('platos'); triggerTactileFeedback(); }}
                className="text-[10px] bg-[#1d1f30] hover:bg-[#282b42] text-orange-500 font-bold px-4 py-2 rounded-lg border border-gray-800"
              >
                Volver al Listado de Platos
              </button>
            </div>
          </div>
        );
    }
  };

  // Proposals data reference
  const currentSpec = proposalsSpec.find(p => p.id === proposal) || proposalsSpec[1];

  // List of all navigation items
  const menuItems = [
    { id: 'inicio', label: 'Inicio', icon: 'Home', category: 'principal' },
    { id: 'mesas', label: 'Mesas', icon: 'UtensilsCrossed', category: 'principal' },
    { id: 'cocina', label: 'Cocina', icon: 'ChefHat', category: 'principal' },
    { id: 'caja', label: 'Caja', icon: 'DollarSign', category: 'principal' },
    { id: 'categorias', label: 'Categorías', icon: 'Grid', category: 'principal' },
    
    { id: 'platos', label: 'Menú (Platos)', icon: 'ChefHat', category: 'logistica' },
    { id: 'insumos', label: 'Inventario (Insumos)', icon: 'Package', category: 'logistica' },
    { id: 'recetarios', label: 'Recetarios (Costeo)', icon: 'BookOpen', category: 'logistica' },
    { id: 'kardex', label: 'Kardex', icon: 'History', category: 'logistica' },
    { id: 'auditoria', label: 'Auditoría', icon: 'ShieldCheck', category: 'logistica' },
    
    { id: 'usuarios', label: 'Usuarios', icon: 'Users', category: 'otros' },
    { id: 'reportes', label: 'Reportes', icon: 'TrendingUp', category: 'otros' },
    { id: 'soporte', label: 'Atención y Soporte', icon: 'PhoneCall', category: 'otros' },
    { id: 'ajustes', label: 'Ajustes', icon: 'Settings', category: 'otros' },
  ];

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackSent(false);
      setFeedbackText('');
      setRating(null);
    }, 4000);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#08090d] text-gray-100' : 'bg-gray-50 text-gray-900'} font-sans transition-colors duration-300`}>
      {/* BRAND & DESIGN SYSTEM HEADER */}
      <header className="border-b border-[#1b1e2c] bg-[#0c0e17] px-6 py-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#ff6b00] p-2 rounded-xl shadow-[0_0_15px_rgba(255,107,0,0.4)] flex items-center justify-center border border-orange-400">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg tracking-tight text-white uppercase">BÚNKER</span>
                <span className="bg-orange-500/15 border border-orange-500/30 text-orange-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">POS Gastronómico</span>
              </div>
              <p className="text-xs text-gray-400">Navegación Móvil & Tablet • Presentación Premium UX</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#121420] p-1 rounded-xl border border-gray-800">
              <button 
                onClick={() => { setIsDarkMode(true); triggerTactileFeedback(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${isDarkMode ? 'bg-[#1b1e2c] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <Moon className="w-3.5 h-3.5 text-orange-500" /> Modo Oscuro
              </button>
              <button 
                onClick={() => { setIsDarkMode(false); triggerTactileFeedback(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${!isDarkMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <Sun className="w-3.5 h-3.5 text-orange-500" /> Modo Claro
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 lg:py-8">
        
        {/* CENTERED LAYOUT COLUMN */}
        <div className="flex flex-col items-center w-full max-w-md mx-auto">

            {/* SIMULATOR CONTROLS */}
            <div className="w-full max-w-sm mb-4 bg-[#0d0e16] p-3 rounded-xl border border-gray-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-orange-500" /> Simulador Táctil
              </span>
              
              <div className="flex gap-1.5">
                {/* Phone Mode Button */}
                <button 
                  onClick={() => { setDevice('phone'); triggerTactileFeedback(); }}
                  title="Simular Teléfono Compacto"
                  className={`p-2 rounded-lg transition-all ${device === 'phone' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                {/* Large Phone Button */}
                <button 
                  onClick={() => { setDevice('phone-large'); triggerTactileFeedback(); }}
                  title="Simular Teléfono Grande"
                  className={`p-2 rounded-lg transition-all ${device === 'phone-large' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                  <Smartphone className="w-4 h-4 scale-110" />
                </button>
                {/* Tablet Portrait Button */}
                <button 
                  onClick={() => { setDevice('tablet-portrait'); triggerTactileFeedback(); }}
                  title="Simular Tablet Vertical"
                  className={`p-2 rounded-lg transition-all ${device === 'tablet-portrait' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                  <Tablet className="w-4 h-4" />
                </button>
                {/* Tablet Landscape Button */}
                <button 
                  onClick={() => { setDevice('tablet-landscape'); triggerTactileFeedback(); }}
                  title="Simular Tablet Horizontal"
                  className={`p-2 rounded-lg transition-all ${device === 'tablet-landscape' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* REALISTIC SMARTPHONE / TABLET FRAME */}
            <div 
              className={`relative shadow-[0_25px_60px_rgba(0,0,0,0.8)] border-[10px] border-[#1d1f2e] bg-[#0c0d14] rounded-[42px] overflow-hidden transition-all duration-300 select-none ${
                device === 'phone' ? 'w-[320px] h-[640px]' : 
                device === 'phone-large' ? 'w-[360px] h-[740px]' :
                device === 'tablet-portrait' ? 'w-[480px] h-[680px]' :
                'w-[640px] h-[480px]' // tablet-landscape
              }`}
            >
              {/* Dynamic click visual indicator inside simulated device */}
              {touchCoords.visible && (
                <div 
                  className="absolute pointer-events-none rounded-full bg-orange-500/40 border border-orange-500 animate-ping z-50 shadow-[0_0_15px_rgba(255,107,0,0.5)]"
                  style={{
                    left: touchCoords.x - 20,
                    top: touchCoords.y - 20,
                    width: 40,
                    height: 40,
                  }}
                />
              )}

              {/* PHONE CAMERA NOTCH & STATUS BAR */}
              <div className="absolute top-0 inset-x-0 h-6 bg-[#08090d] text-white text-[10px] flex items-center justify-between px-6 z-40 pointer-events-none">
                <span className="font-mono font-medium">1:26</span>
                {/* Simulated Speaker Notch for Phones */}
                {(device === 'phone' || device === 'phone-large') && (
                  <div className="w-16 h-3.5 bg-black rounded-full absolute left-1/2 -translate-x-1/2 top-0 border-b border-gray-800 flex items-center justify-center">
                    <div className="w-6 h-1 bg-gray-800 rounded-full"></div>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[9px] text-gray-400">93%</span>
                  <div className="w-5 h-2.5 border border-gray-600 rounded-sm p-0.5 flex items-center">
                    <div className="bg-emerald-500 h-full w-[80%] rounded-xs"></div>
                  </div>
                </div>
              </div>

              {/* SIMULATED DEVICE CONTAINER SCREEN */}
              <div 
                id="simulated-screen"
                onClick={handleDeviceClick}
                className="w-full h-full pt-6 bg-[#08090c] flex flex-col justify-between relative overflow-hidden"
              >
                
                {/* SIMULATED CONTENT VIEWPORT */}
                {proposal === 'B' && (device === 'tablet-portrait' || device === 'tablet-landscape') ? (
                  /* TABLET HORIZONTAL RESPONSIVE LAYOUT FOR PROPUESTA B */
                  <div className="flex-1 flex flex-row relative overflow-hidden h-full select-none">
                    
                    {/* Navigation Rail (64px wide) */}
                    <div className="w-16 bg-[#0c0d14] border-r border-[#1e202f] flex flex-col justify-between items-center py-4 z-30 shrink-0 h-full">
                      {/* Top logo/icon */}
                      <div className="flex flex-col items-center gap-4">
                        <div className="bg-[#ff6b00] p-1.5 rounded-lg">
                          <Lock className="w-4 h-4 text-white" />
                        </div>
                        
                        {/* Navigation buttons */}
                        <div className="flex flex-col gap-3 mt-4">
                          {[
                            { id: 'inicio', label: 'Inicio', icon: 'Home' },
                            { id: 'mesas', label: 'Mesas', icon: 'UtensilsCrossed' },
                            { id: 'cocina', label: 'Cocina', icon: 'ChefHat' },
                            { id: 'caja', label: 'Caja', icon: 'DollarSign' },
                          ].map(item => {
                            const isSelected = activeView === item.id;
                            return (
                              <button
                                key={item.id}
                                onClick={() => { 
                                  setActiveView(item.id as ActiveView); 
                                  setIsMoreOpen(false); // Close more panel on primary tap
                                  triggerTactileFeedback(); 
                                }}
                                className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all ${
                                  isSelected 
                                    ? 'bg-[#ff6b00] text-white font-bold shadow-md shadow-orange-500/20' 
                                    : 'text-gray-400 hover:bg-[#121422] hover:text-gray-100'
                                }`}
                                style={{ minHeight: '44px', minWidth: '44px' }}
                                title={item.label}
                              >
                                {renderMenuIcon(item.icon, "w-4 h-4")}
                                <span className="text-[7px] mt-0.5 leading-none font-medium">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Bottom button: MÁS */}
                      <button
                        onClick={() => { setIsMoreOpen(!isMoreOpen); triggerTactileFeedback(); }}
                        className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all ${
                          isMoreOpen 
                            ? 'bg-orange-500/10 text-orange-500 border border-orange-500/30' 
                            : 'text-gray-400 hover:bg-[#121422] hover:text-gray-100'
                        }`}
                        style={{ minHeight: '44px', minWidth: '44px' }}
                        title="Más Opciones"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                        <span className="text-[7px] mt-0.5 leading-none font-bold">Más</span>
                      </button>
                    </div>

                    {/* Side Panel (Contextual Drawer next to Rail) */}
                    <AnimatePresence>
                      {isMoreOpen && (
                        <>
                          {/* Subtle backdrop inside the remaining viewport so we can dismiss it */}
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.3 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setIsMoreOpen(false); triggerTactileFeedback(); }}
                            className="absolute left-16 inset-y-0 right-0 bg-black/50 z-10"
                          />

                          {/* Contextual Side Panel Container */}
                          <motion.div 
                            className="w-56 bg-[#0c0d14] border-r border-[#1e202f] h-full z-20 flex flex-col justify-between shrink-0 shadow-[5px_0_15px_rgba(0,0,0,0.3)] relative"
                            initial={{ x: -224, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -224, opacity: 0 }}
                            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Header of Side Panel */}
                            <div className="p-3 border-b border-[#1e202f] flex items-center justify-between">
                              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Menú Secundario</span>
                              <button 
                                onClick={() => { setIsMoreOpen(false); triggerTactileFeedback(); }}
                                className="text-[9px] text-gray-500 hover:text-gray-300"
                              >
                                Cerrar
                              </button>
                            </div>

                            {/* Scrollable list of options in Side Panel */}
                            <div className="flex-1 overflow-y-auto bunker-scrollbar p-2 space-y-3">
                              {/* Secondary item list style */}
                              <div className="space-y-1">
                                {[
                                  { id: 'categorias', label: 'Categorías', icon: 'Grid', color: 'text-orange-400' },
                                  { id: 'usuarios', label: 'Usuarios', icon: 'Users', color: 'text-cyan-400' },
                                  { id: 'reportes', label: 'Reportes', icon: 'TrendingUp', color: 'text-emerald-400' },
                                  { id: 'soporte', label: 'Atención y Soporte', icon: 'PhoneCall', color: 'text-indigo-400' },
                                  { id: 'ajustes', label: 'Ajustes', icon: 'Settings', color: 'text-purple-400' }
                                ].map(item => {
                                  const isSelected = activeView === item.id;
                                  return (
                                    <button 
                                      key={item.id}
                                      onClick={() => { setActiveView(item.id as ActiveView); setIsMoreOpen(false); triggerTactileFeedback(); }}
                                      className={`w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-left transition-all ${
                                        isSelected 
                                          ? 'bg-orange-500/10 text-orange-400 font-bold border-l-2 border-orange-500' 
                                          : 'text-gray-400 hover:text-gray-200 hover:bg-[#121422]'
                                      }`}
                                      style={{ minHeight: '44px' }}
                                    >
                                      {renderMenuIcon(item.icon, `w-4 h-4 ${item.color}`)}
                                      <span className="text-[11px] font-medium">{item.label}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Redesigned Logística Accordion (Compact, full-width, no card-in-card) */}
                              <div className="border-t border-[#1a1c2a] pt-3">
                                <button 
                                  onClick={() => { setLogisticaInSheetExpanded(!logisticaInSheetExpanded); triggerTactileFeedback(); }}
                                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left"
                                  style={{ minHeight: '44px' }}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5 text-orange-500" />
                                    LOGÍSTICA
                                  </span>
                                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${logisticaInSheetExpanded ? 'rotate-180' : ''}`} />
                                </button>

                                {logisticaInSheetExpanded && (
                                  <div className="mt-1 divide-y divide-[#181a28]">
                                    {[
                                      { id: 'platos', label: 'Menú (Platos)', icon: 'ChefHat' },
                                      { id: 'insumos', label: 'Inventario', icon: 'Package' },
                                      { id: 'recetarios', label: 'Recetarios', icon: 'BookOpen' },
                                      { id: 'kardex', label: 'Kardex', icon: 'History' },
                                      { id: 'auditoria', label: 'Auditoría', icon: 'ShieldCheck' }
                                    ].map(logItem => {
                                      const isSelected = activeView === logItem.id;
                                      return (
                                        <button
                                          key={logItem.id}
                                          onClick={() => { 
                                            setActiveView(logItem.id as ActiveView); 
                                            setIsMoreOpen(false); 
                                            triggerTactileFeedback(); 
                                          }}
                                          className={`w-full flex items-center justify-between px-4 py-2.5 text-[10px] text-left transition-all ${
                                            isSelected 
                                              ? 'bg-orange-500/10 text-orange-400 font-bold border-l-2 border-orange-500' 
                                              : 'text-gray-400 hover:text-gray-200 hover:bg-[#121422]'
                                          }`}
                                          style={{ minHeight: '44px' }}
                                        >
                                          <div className="flex items-center gap-2">
                                            {renderMenuIcon(logItem.icon, "w-3.5 h-3.5")}
                                            <span>{logItem.label}</span>
                                          </div>
                                          <ChevronRight className="w-3 h-3 text-gray-600" />
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* User Profile Footer inside Side Panel */}
                            <div className="p-3 border-t border-[#1e202f] bg-[#090a10] flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <img src={currentUser.avatar} alt="Hector" className="w-7 h-7 rounded-full object-cover border border-orange-500" />
                                  <div className="text-left">
                                    <span className="font-bold text-[10px] text-gray-200 block leading-tight">{currentUser.name}</span>
                                    <span className="text-[8px] text-gray-400 font-mono block uppercase">{currentUser.role}</span>
                                  </div>
                                </div>

                                {/* Inline Dark Mode switch next to user info */}
                                <button 
                                  onClick={() => { setIsDarkMode(!isDarkMode); triggerTactileFeedback(); }}
                                  className="p-1.5 rounded-lg bg-[#141624] border border-[#1e202f] hover:border-gray-800 text-gray-300 transition-all flex items-center justify-center"
                                  style={{ minHeight: '32px', minWidth: '32px' }}
                                  title="Cambiar Modo Oscuro/Claro"
                                >
                                  {isDarkMode ? <Moon className="w-3.5 h-3.5 text-amber-400" /> : <Sun className="w-3.5 h-3.5 text-yellow-500" />}
                                </button>
                              </div>

                              <button 
                                onClick={() => { setIsMoreOpen(false); alert('Sesión de Hector cerrada exitosamente.'); triggerTactileFeedback(); }}
                                className="w-full flex items-center justify-center gap-1.5 text-[10px] text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/10 py-2 rounded-lg font-bold"
                                style={{ minHeight: '44px' }}
                              >
                                <LogOut className="w-3.5 h-3.5" /> Salir
                              </button>
                            </div>

                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>

                    {/* Content viewport area (on the right) */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden bunker-scrollbar pb-6 relative flex flex-col h-full bg-[#08090c]">
                      {/* VIEW HEADER */}
                      <div className="bg-[#0f111c] border-b border-[#212435] p-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="bg-orange-600 p-1 rounded-md">
                              <Lock className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="font-display font-black text-xs uppercase tracking-tight text-white">BÚNKER</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 flex items-center gap-1 bg-[#181a26] px-2 py-0.5 rounded border border-gray-800">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            Caja 01
                          </span>
                          <div className="w-6 h-6 rounded-full overflow-hidden border border-orange-500">
                            <img src={currentUser.avatar} alt="Hector" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      </div>

                      {/* SCREEN BODY */}
                      <div className="p-4 flex-1">
                        {renderActiveViewContent()}
                      </div>
                    </div>

                  </div>
                ) : (
                  /* REGULAR VIEWPORT LAYOUT FOR PHONES OR OTHER PROPOSALS */
                  <div className={`flex-1 overflow-y-auto overflow-x-hidden bunker-scrollbar relative ${proposal === 'B' ? 'pb-24' : 'pb-20'}`}>
                    
                    {/* VIEW HEADER (Compact) */}
                    <div className="bg-[#0f111c] border-b border-[#212435] p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Menu trigger button for Drawer (Propuesta A only) */}
                        {proposal === 'A' && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setIsSidebarOpen(true); 
                              triggerTactileFeedback(); 
                            }}
                            className="p-1.5 rounded-lg bg-[#181a29] text-gray-300 hover:text-white border border-gray-800"
                          >
                            <Menu className="w-4 h-4" />
                          </button>
                        )}
                        
                        {/* Brand Mini Logo */}
                        <div className="flex items-center gap-1.5">
                          <div className="bg-orange-600 p-1 rounded-md">
                            <Lock className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="font-display font-black text-xs uppercase tracking-tight text-white">BÚNKER</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 bg-[#181a26] px-2 py-0.5 rounded border border-gray-800">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          Caja 01
                        </span>
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-orange-500">
                          <img src={currentUser.avatar} alt="Hector" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    </div>

                    {/* SCREEN BODY */}
                    <div className="p-3">
                      {renderActiveViewContent()}
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* PROPUESTA A: COLLAPSIBLE DRAW SIDEBAR (SIMULATION) */}
                {/* ========================================================= */}
                {proposal === 'A' && (
                  <>
                    {/* Backdrop cover */}
                    <AnimatePresence>
                      {isSidebarOpen && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => { setIsSidebarOpen(false); triggerTactileFeedback(); }}
                          className="absolute inset-0 bg-black/75 z-40"
                        />
                      )}
                    </AnimatePresence>

                    {/* Lateral Drawer Menu */}
                    <motion.div 
                      className="absolute top-0 bottom-0 left-0 w-[240px] bg-[#0c0d15] border-r border-[#1e202f] z-50 flex flex-col justify-between shadow-[5px_0_25px_rgba(0,0,0,0.5)]"
                      initial={{ x: -240 }}
                      animate={{ x: isSidebarOpen ? 0 : -240 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                      onClick={(e) => e.stopPropagation()} // Stop click propagation to trigger ripple
                    >
                      {/* Sidebar Header with User */}
                      <div className="p-4 border-b border-[#1e202f]">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-1.5">
                            <div className="bg-[#ff6b00] p-1.5 rounded-lg">
                              <Lock className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <span className="font-display font-black text-xs text-white tracking-tight">BÚNKER</span>
                              <span className="text-[8px] text-orange-500 font-bold block leading-none">SISTEMA</span>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => { setIsSidebarOpen(false); triggerTactileFeedback(); }}
                            className="p-1 rounded bg-[#161722] text-gray-400 hover:text-white"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* User Profile Info Card inside Sidebar */}
                        <div className="bg-[#121422] p-2 rounded-xl flex items-center gap-2 border border-gray-900">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700">
                            <img src={currentUser.avatar} alt="Hector" className="w-full h-full object-cover" />
                          </div>
                          <div className="text-left">
                            <span className="font-bold text-[11px] text-gray-200 block leading-tight">{currentUser.name}</span>
                            <span className="text-[8px] text-gray-400 font-mono block uppercase">{currentUser.role}</span>
                          </div>
                        </div>
                      </div>

                      {/* Scrollable menu options inside sidebar drawer */}
                      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bunker-scrollbar">
                        
                        {/* Principal Modules */}
                        <div className="space-y-0.5">
                          {menuItems.filter(m => m.category === 'principal').map(item => {
                            const isSelected = activeView === item.id;
                            return (
                              <button
                                key={item.id}
                                onClick={() => { 
                                  setActiveView(item.id); 
                                  setIsSidebarOpen(false); 
                                  triggerTactileFeedback();
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                                  isSelected 
                                    ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/10' 
                                    : 'text-gray-400 hover:bg-[#121422] hover:text-gray-100'
                                }`}
                              >
                                {renderMenuIcon(item.icon, "w-3.5 h-3.5")}
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Collapsible Logística Group */}
                        <div className="pt-2 border-t border-[#1a1c2a]">
                          <button
                            onClick={() => { setIsLogisticaExpanded(!isLogisticaExpanded); triggerTactileFeedback(); }}
                            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[9px] font-bold text-gray-400 uppercase tracking-wider"
                          >
                            <span>LOGÍSTICA</span>
                            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isLogisticaExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          {isLogisticaExpanded && (
                            <div className="mt-1 ml-2 pl-2 border-l border-orange-500/30 space-y-0.5">
                              {menuItems.filter(m => m.category === 'logistica').map(item => {
                                const isSelected = activeView === item.id;
                                return (
                                  <button
                                    key={item.id}
                                    onClick={() => { 
                                      setActiveView(item.id); 
                                      setIsSidebarOpen(false); 
                                      triggerTactileFeedback();
                                    }}
                                    className={`w-full flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] transition-all ${
                                      isSelected 
                                        ? 'bg-orange-500/20 text-orange-400 font-bold border-l-2 border-orange-500' 
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-[#121422]'
                                    }`}
                                  >
                                    {renderMenuIcon(item.icon, "w-3 h-3")}
                                    <span>{item.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Other Modules Group */}
                        <div className="pt-2 border-t border-[#1a1c2a] space-y-0.5">
                          <span className="px-3 py-1 text-[8px] font-bold text-gray-500 uppercase tracking-widest block">Otros</span>
                          {menuItems.filter(m => m.category === 'otros').map(item => {
                            const isSelected = activeView === item.id;
                            return (
                              <button
                                key={item.id}
                                onClick={() => { 
                                  setActiveView(item.id); 
                                  setIsSidebarOpen(false); 
                                  triggerTactileFeedback();
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] transition-all ${
                                  isSelected 
                                    ? 'bg-orange-500 text-white font-bold' 
                                    : 'text-gray-400 hover:bg-[#121422] hover:text-gray-100'
                                }`}
                              >
                                {renderMenuIcon(item.icon, "w-3.5 h-3.5")}
                                <span className="truncate">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>

                      </div>

                      {/* Sidebar Footer */}
                      <div className="p-3 border-t border-[#1e202f] bg-[#090a10] space-y-1">
                        <button className="w-full flex items-center justify-between text-[9px] text-gray-400 px-2 py-1 rounded hover:bg-[#121422]">
                          <span>Modo Oscuro</span>
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                        </button>
                        <button className="w-full flex items-center gap-2 text-[9px] text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-500/10 text-left">
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}


                {/* ========================================================= */}
                {/* PROPUESTA B: BOTTOM MOBILE DOCK (SIMULATION - REQUESTED!) */}
                {/* ========================================================= */}
                {proposal === 'B' && (device === 'phone' || device === 'phone-large') && (
                  <>
                    {/* Fixed Bottom Dock Navigation Bar - REDESIGNED EXACTLY LIKE THE SCREENSHOT */}
                    <div className="absolute bottom-4 left-4 right-4 bg-[#0a0c16]/95 backdrop-blur-md border border-[#23273a] px-2 py-1 z-40 flex items-center justify-between shadow-[0_12px_40px_rgba(0,0,0,0.7)] h-[66px] rounded-2xl overflow-hidden select-none">
                      {/* Dock Button 1: Inicio */}
                      <button 
                        onClick={() => { setActiveView('inicio'); triggerTactileFeedback(); setIsMoreOpen(false); }}
                        className={`flex-1 h-full flex flex-col items-center justify-center relative transition-all duration-300 ${
                          activeView === 'inicio' ? `${activeTheme.text} font-semibold` : 'text-[#8292a1] hover:text-gray-200'
                        }`}
                        style={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        {activeView === 'inicio' && (
                          <>
                            {/* Glowing theme line at the top */}
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-9 h-[3px] rounded-full ${activeTheme.lineGlow}`} />
                            {/* Glowing light beam expanding downwards */}
                            <div className={`absolute top-0 inset-x-0 bottom-0 bg-gradient-to-b ${activeTheme.beamGradient} pointer-events-none`} style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)' }} />
                          </>
                        )}
                        <Home className="w-5 h-5 mb-1" strokeWidth={1.5} />
                        <span className="text-[10px] tracking-wide leading-none transition-colors">Inicio</span>
                      </button>

                      {/* Dock Button 2: Mesas */}
                      <button 
                        onClick={() => { setActiveView('mesas'); triggerTactileFeedback(); setIsMoreOpen(false); }}
                        className={`flex-1 h-full flex flex-col items-center justify-center relative transition-all duration-300 ${
                          activeView === 'mesas' ? `${activeTheme.text} font-semibold` : 'text-[#8292a1] hover:text-gray-200'
                        }`}
                        style={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        {activeView === 'mesas' && (
                          <>
                            {/* Glowing theme line at the top */}
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-9 h-[3px] rounded-full ${activeTheme.lineGlow}`} />
                            {/* Glowing light beam expanding downwards */}
                            <div className={`absolute top-0 inset-x-0 bottom-0 bg-gradient-to-b ${activeTheme.beamGradient} pointer-events-none`} style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)' }} />
                          </>
                        )}
                        <UtensilsCrossed className="w-5 h-5 mb-1" strokeWidth={1.5} />
                        <span className="text-[10px] tracking-wide leading-none transition-colors">Mesas</span>
                      </button>

                      {/* Dock Button 3: Cocina */}
                      <button 
                        onClick={() => { setActiveView('cocina'); triggerTactileFeedback(); setIsMoreOpen(false); }}
                        className={`flex-1 h-full flex flex-col items-center justify-center relative transition-all duration-300 ${
                          activeView === 'cocina' ? `${activeTheme.text} font-semibold` : 'text-[#8292a1] hover:text-gray-200'
                        }`}
                        style={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        {activeView === 'cocina' && (
                          <>
                            {/* Glowing theme line at the top */}
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-9 h-[3px] rounded-full ${activeTheme.lineGlow}`} />
                            {/* Glowing light beam expanding downwards */}
                            <div className={`absolute top-0 inset-x-0 bottom-0 bg-gradient-to-b ${activeTheme.beamGradient} pointer-events-none`} style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)' }} />
                          </>
                        )}
                        <ChefHat className="w-5 h-5 mb-1" strokeWidth={1.5} />
                        <span className="text-[10px] tracking-wide leading-none transition-colors">Cocina</span>
                      </button>

                      {/* Dock Button 4: Caja */}
                      <button 
                        onClick={() => { setActiveView('caja'); triggerTactileFeedback(); setIsMoreOpen(false); }}
                        className={`flex-1 h-full flex flex-col items-center justify-center relative transition-all duration-300 ${
                          activeView === 'caja' ? `${activeTheme.text} font-semibold` : 'text-[#8292a1] hover:text-gray-200'
                        }`}
                        style={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        {activeView === 'caja' && (
                          <>
                            {/* Glowing theme line at the top */}
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-9 h-[3px] rounded-full ${activeTheme.lineGlow}`} />
                            {/* Glowing light beam expanding downwards */}
                            <div className={`absolute top-0 inset-x-0 bottom-0 bg-gradient-to-b ${activeTheme.beamGradient} pointer-events-none`} style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)' }} />
                          </>
                        )}
                        <DollarSign className="w-5 h-5 mb-1" strokeWidth={1.5} />
                        <span className="text-[10px] tracking-wide leading-none transition-colors">Caja</span>
                      </button>

                      {/* Dock Button 5: "MÁS" Trigger */}
                      <button 
                        onClick={() => { setIsMoreOpen(!isMoreOpen); triggerTactileFeedback(); }}
                        className={`flex-1 h-full flex flex-col items-center justify-center relative transition-all duration-300 ${
                          isMoreOpen ? `${activeTheme.text} font-semibold` : 'text-[#8292a1] hover:text-gray-200'
                        }`}
                        style={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        {isMoreOpen && (
                          <>
                            {/* Glowing theme line at the top */}
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-9 h-[3px] rounded-full ${activeTheme.lineGlow}`} />
                            {/* Glowing light beam expanding downwards */}
                            <div className={`absolute top-0 inset-x-0 bottom-0 bg-gradient-to-b ${activeTheme.beamGradient} pointer-events-none`} style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)' }} />
                          </>
                        )}
                        <MoreHorizontal className="w-5 h-5 mb-1" strokeWidth={1.5} />
                        <span className="text-[10px] tracking-wide leading-none transition-colors">Más</span>
                      </button>
                    </div>

                    {/* PROPUESTA B: BOTTOM SHEET OVERLAY (FOR "MÁS" MENU) */}
                    <AnimatePresence>
                      {isMoreOpen && (
                        <>
                          {/* Backdrop */}
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setIsMoreOpen(false); triggerTactileFeedback(); }}
                            className="absolute inset-0 bg-black/75 z-40"
                          />

                          {/* Bottom Sheet Modal Container */}
                          <motion.div 
                            className="absolute bottom-14 inset-x-0 bg-[#0e1017] border-t border-[#23273e] rounded-t-3xl z-50 p-4 max-h-[85%] overflow-y-auto bunker-scrollbar flex flex-col justify-between shadow-[0_-10px_35px_rgba(0,0,0,0.6)]"
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                            onClick={(e) => e.stopPropagation()} // Stop click propagation inside the modal sheet
                          >
                            {/* Drag Indicator Bar */}
                            <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-3" />

                            {/* Header details inside Bottom Sheet */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-950">
                              <span className={`text-xs font-bold tracking-wider ${activeTheme.text}`}>MÓDULOS DE CONFIGURACIÓN</span>
                              <button 
                                onClick={() => { setIsMoreOpen(false); triggerTactileFeedback(); }}
                                className="text-[10px] text-gray-400 bg-[#161823] px-2.5 py-1 rounded-lg border border-gray-800"
                                style={{ minHeight: '32px' }}
                              >
                                Cerrar
                              </button>
                            </div>

                            {/* Grid of secondary items for rapid touch selection */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                              
                              {/* Secondary item: Categorías */}
                              <button 
                                onClick={() => { setActiveView('categorias'); setIsMoreOpen(false); triggerTactileFeedback(); }}
                                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                                  activeView === 'categorias' ? `${activeTheme.bgLight} ${activeTheme.borderLight} ${activeTheme.text} font-bold` : 'bg-[#141624] border-gray-900 text-gray-300 hover:border-gray-800'
                                }`}
                                style={{ minHeight: '64px' }}
                              >
                                <Grid className={`w-4.5 h-4.5 ${activeView === 'categorias' ? activeTheme.text : 'text-orange-400'}`} />
                                <span className="text-[9px] font-medium truncate w-full">Categorías</span>
                              </button>

                              {/* Secondary item: Usuarios */}
                              <button 
                                onClick={() => { setActiveView('usuarios'); setIsMoreOpen(false); triggerTactileFeedback(); }}
                                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                                  activeView === 'usuarios' ? `${activeTheme.bgLight} ${activeTheme.borderLight} ${activeTheme.text} font-bold` : 'bg-[#141624] border-gray-900 text-gray-300 hover:border-gray-800'
                                }`}
                                style={{ minHeight: '64px' }}
                              >
                                <Users className={`w-4.5 h-4.5 ${activeView === 'usuarios' ? activeTheme.text : 'text-cyan-400'}`} />
                                <span className="text-[9px] font-medium truncate w-full">Usuarios</span>
                              </button>

                              {/* Secondary item: Reportes */}
                              <button 
                                onClick={() => { setActiveView('reportes'); setIsMoreOpen(false); triggerTactileFeedback(); }}
                                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                                  activeView === 'reportes' ? `${activeTheme.bgLight} ${activeTheme.borderLight} ${activeTheme.text} font-bold` : 'bg-[#141624] border-gray-900 text-gray-300 hover:border-gray-800'
                                }`}
                                style={{ minHeight: '64px' }}
                              >
                                <TrendingUp className={`w-4.5 h-4.5 ${activeView === 'reportes' ? activeTheme.text : 'text-emerald-400'}`} />
                                <span className="text-[9px] font-medium truncate w-full">Reportes</span>
                              </button>

                              {/* Secondary item: Soporte */}
                              <button 
                                onClick={() => { setActiveView('soporte'); setIsMoreOpen(false); triggerTactileFeedback(); }}
                                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                                  activeView === 'soporte' ? `${activeTheme.bgLight} ${activeTheme.borderLight} ${activeTheme.text} font-bold` : 'bg-[#141624] border-gray-900 text-gray-300 hover:border-gray-800'
                                }`}
                                style={{ minHeight: '64px' }}
                              >
                                <PhoneCall className={`w-4.5 h-4.5 ${activeView === 'soporte' ? activeTheme.text : 'text-indigo-400'}`} />
                                <span className="text-[9px] font-medium truncate w-full">Soporte</span>
                              </button>

                              {/* Secondary item: Ajustes */}
                              <button 
                                onClick={() => { setActiveView('ajustes'); setIsMoreOpen(false); triggerTactileFeedback(); }}
                                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                                  activeView === 'ajustes' ? `${activeTheme.bgLight} ${activeTheme.borderLight} ${activeTheme.text} font-bold` : 'bg-[#141624] border-gray-900 text-gray-300 hover:border-gray-800'
                                }`}
                                style={{ minHeight: '64px' }}
                              >
                                <Settings className={`w-4.5 h-4.5 ${activeView === 'ajustes' ? activeTheme.text : 'text-purple-400'}`} />
                                <span className="text-[9px] font-medium truncate w-full">Ajustes</span>
                              </button>

                              {/* Secondary item placeholder or link */}
                              <div className="p-2.5 rounded-xl border border-dashed border-gray-950 flex flex-col items-center justify-center text-center opacity-40">
                                <span className="text-[9px] font-mono text-gray-500">POS 2026</span>
                              </div>
                            </div>

                            {/* LOGÍSTICA COMPLEMENTARY EXPANDABLE INSIDE BOTTOM SHEET (Compact accordion style, list layout) */}
                            <div className="border-t border-[#1a1c2a] pt-3 mb-4">
                              <button 
                                onClick={() => { setLogisticaInSheetExpanded(!logisticaInSheetExpanded); triggerTactileFeedback(); }}
                                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left"
                                style={{ minHeight: '44px' }}
                              >
                                <span className="flex items-center gap-1.5">
                                  <Package className={`w-4 h-4 ${activeTheme.text}`} />
                                  Logística
                                </span>
                                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${logisticaInSheetExpanded ? 'rotate-180' : ''}`} />
                              </button>

                              {logisticaInSheetExpanded && (
                                <div className="mt-1 divide-y divide-[#181a28]">
                                  {[
                                    { id: 'platos', label: 'Menú (Platos)', icon: 'ChefHat' },
                                    { id: 'insumos', label: 'Inventario', icon: 'Package' },
                                    { id: 'recetarios', label: 'Recetarios', icon: 'BookOpen' },
                                    { id: 'kardex', label: 'Kardex', icon: 'History' },
                                    { id: 'auditoria', label: 'Auditoría', icon: 'ShieldCheck' }
                                  ].map(logItem => {
                                    const isSelected = activeView === logItem.id;
                                    return (
                                      <button
                                        key={logItem.id}
                                        onClick={() => { 
                                          setActiveView(logItem.id as ActiveView); 
                                          setIsMoreOpen(false); 
                                          triggerTactileFeedback(); 
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 text-[10px] text-left transition-all ${
                                          isSelected 
                                            ? 'bg-orange-500/10 text-orange-400 font-bold border-l-2 border-orange-500' 
                                            : 'text-gray-400 hover:text-gray-200 hover:bg-[#121422]'
                                        }`}
                                        style={{ minHeight: '44px' }}
                                      >
                                        <div className="flex items-center gap-2">
                                          {renderMenuIcon(logItem.icon, "w-3.5 h-3.5")}
                                          <span>{logItem.label}</span>
                                        </div>
                                        <ChevronRight className="w-3 h-3 text-gray-600" />
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* USER PROFILE INFO FOOTER WITH INLINE MOOD TOGGLE */}
                            <div className="bg-[#121422] p-2.5 rounded-xl flex items-center justify-between border border-gray-900 mt-2">
                              <div className="flex items-center gap-2">
                                <img src={currentUser.avatar} alt="Hector" className="w-7 h-7 rounded-full object-cover border border-orange-500" />
                                <div className="text-left">
                                  <span className="font-bold text-[10px] text-gray-200 block leading-tight">{currentUser.name}</span>
                                  <span className="text-[8px] text-gray-400 font-mono block uppercase">{currentUser.role}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {/* Inline Dark Mode switch */}
                                <button 
                                  onClick={() => { setIsDarkMode(!isDarkMode); triggerTactileFeedback(); }}
                                  className="p-1.5 rounded-lg bg-[#141624] border border-[#1e202f] hover:border-gray-800 text-gray-300 transition-all flex items-center justify-center"
                                  style={{ minHeight: '32px', minWidth: '32px' }}
                                  title="Cambiar Modo Oscuro/Claro"
                                >
                                  {isDarkMode ? <Moon className="w-3.5 h-3.5 text-amber-400" /> : <Sun className="w-3.5 h-3.5 text-yellow-500" />}
                                </button>

                                <button 
                                  onClick={() => { setIsMoreOpen(false); alert('Sesión de Hector cerrada exitosamente.'); triggerTactileFeedback(); }}
                                  className="flex items-center gap-1 text-[9px] text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg font-bold"
                                  style={{ minHeight: '32px' }}
                                >
                                  <LogOut className="w-3 h-3" /> Salir
                                </button>
                              </div>
                            </div>

                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </>
                )}


                {/* ========================================================= */}
                {/* PROPUESTA C: BENTO APP LAUNCHER HUB OVERLAY (SIMULATION) */}
                {/* ========================================================= */}
                {proposal === 'C' && (
                  <>
                    {/* Compact floating launcher button in the simulator */}
                    <div className="absolute bottom-4 right-4 z-40">
                      <button 
                        onClick={() => { setIsSidebarOpen(!isSidebarOpen); triggerTactileFeedback(); }}
                        className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-[0_4px_15px_rgba(255,107,0,0.5)] flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      >
                        <Grid className={`w-5 h-5 transition-transform duration-300 ${isSidebarOpen ? 'rotate-45' : ''}`} />
                      </button>
                    </div>

                    {/* Bento Hub Screen */}
                    <AnimatePresence>
                      {isSidebarOpen && (
                        <motion.div 
                          className="absolute inset-x-0 top-6 bottom-0 bg-[#07080f]/95 z-50 p-4 overflow-y-auto bunker-scrollbar flex flex-col justify-between"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div>
                            {/* Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-gray-900 mb-4">
                              <div className="flex items-center gap-1.5">
                                <span className="bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">BÚNKER</span>
                                <h3 className="font-black text-xs text-white">BENTO NAV HUB</h3>
                              </div>
                              <button 
                                onClick={() => { setIsSidebarOpen(false); triggerTactileFeedback(); }}
                                className="text-[9px] bg-[#161823] px-2.5 py-1 rounded-lg border border-gray-800 text-gray-400"
                              >
                                Regresar
                              </button>
                            </div>

                            <p className="text-[9px] text-gray-400 mb-4">
                              Acceso radial inmediato organizado por jerarquía de velocidad de toque en planta:
                            </p>

                            {/* Bento Grid layout */}
                            <div className="grid grid-cols-12 gap-2">
                              
                              {/* Large card 1: Mesas (critical) */}
                              <button
                                onClick={() => { setActiveView('mesas'); setIsSidebarOpen(false); triggerTactileFeedback(); }}
                                className={`col-span-8 p-3 rounded-2xl border text-left flex flex-col justify-between h-20 transition-all ${
                                  activeView === 'mesas' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-[#151829] border-gray-900 text-gray-100'
                                }`}
                              >
                                <UtensilsCrossed className="w-5 h-5 text-orange-400" />
                                <div>
                                  <span className="font-black text-xs block leading-tight">MESAS</span>
                                  <span className="text-[8px] opacity-75 block">Mapa de Salón y cuentas</span>
                                </div>
                              </button>

                              {/* Large card 2: Cocina (critical) */}
                              <button
                                onClick={() => { setActiveView('cocina'); setIsSidebarOpen(false); triggerTactileFeedback(); }}
                                className={`col-span-4 p-3 rounded-2xl border text-left flex flex-col justify-between h-20 transition-all ${
                                  activeView === 'cocina' ? 'bg-[#ff6b00]/25 border-orange-500/40 text-white' : 'bg-[#151829] border-gray-900 text-gray-100'
                                }`}
                              >
                                <ChefHat className="w-5 h-5 text-amber-400" />
                                <div>
                                  <span className="font-bold text-[11px] block leading-tight">COCINA</span>
                                  <span className="text-[8px] opacity-75 block">Tickets en cola</span>
                                </div>
                              </button>

                              {/* Card 3: Caja */}
                              <button
                                onClick={() => { setActiveView('caja'); setIsSidebarOpen(false); triggerTactileFeedback(); }}
                                className={`col-span-4 p-3 rounded-xl border text-left flex flex-col justify-between h-16 transition-all ${
                                  activeView === 'caja' ? 'bg-[#ff6b00]/20 border-orange-500' : 'bg-[#10121d] border-gray-900 text-gray-100'
                                }`}
                              >
                                <DollarSign className="w-4 h-4 text-emerald-400" />
                                <span className="font-bold text-[10px] block leading-none">CAJA</span>
                              </button>

                              {/* Card 4: Menú Platos */}
                              <button
                                onClick={() => { setActiveView('platos'); setIsSidebarOpen(false); triggerTactileFeedback(); }}
                                className={`col-span-4 p-3 rounded-xl border text-left flex flex-col justify-between h-16 transition-all ${
                                  activeView === 'platos' ? 'bg-[#ff6b00]/20 border-orange-500' : 'bg-[#10121d] border-gray-900 text-gray-100'
                                }`}
                              >
                                <Package className="w-4 h-4 text-purple-400" />
                                <span className="font-bold text-[10px] block leading-none">PLATOS</span>
                              </button>

                              {/* Card 5: Reportes */}
                              <button
                                onClick={() => { setActiveView('reportes'); setIsSidebarOpen(false); triggerTactileFeedback(); }}
                                className={`col-span-4 p-3 rounded-xl border text-left flex flex-col justify-between h-16 transition-all ${
                                  activeView === 'reportes' ? 'bg-[#ff6b00]/20 border-orange-500' : 'bg-[#10121d] border-gray-900 text-gray-100'
                                }`}
                              >
                                <TrendingUp className="w-4 h-4 text-cyan-400" />
                                <span className="font-bold text-[10px] block leading-none">REPORTES</span>
                              </button>

                              {/* List of other quick modules as micro links */}
                              <div className="col-span-12 grid grid-cols-2 gap-1.5 mt-2">
                                {['inicio', 'categorias', 'insumos', 'recetarios', 'kardex', 'auditoria', 'usuarios', 'soporte', 'ajustes'].map(id => {
                                  const item = menuItems.find(m => m.id === id);
                                  return (
                                    <button
                                      key={id}
                                      onClick={() => { setActiveView(id as ActiveView); setIsSidebarOpen(false); triggerTactileFeedback(); }}
                                      className="p-1.5 bg-[#0e1017] border border-gray-900 rounded-lg text-left text-[9px] text-gray-400 hover:text-white flex items-center gap-1.5"
                                    >
                                      {item && renderMenuIcon(item.icon, "w-3 h-3 text-orange-500")}
                                      <span className="truncate">{item?.label || id}</span>
                                    </button>
                                  );
                                })}
                              </div>

                            </div>
                          </div>

                          {/* Footer profile inside Bento */}
                          <div className="bg-[#10111a] p-2 rounded-xl flex items-center justify-between border border-gray-900 mt-4">
                            <div className="flex items-center gap-1.5">
                              <img src={currentUser.avatar} alt="Hector" className="w-6 h-6 rounded-full object-cover" />
                              <div className="text-left">
                                <span className="font-bold text-[9px] text-gray-200 block leading-none">{currentUser.name}</span>
                                <span className="text-[7px] text-gray-500 block">ADMIN</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => { setIsSidebarOpen(false); triggerTactileFeedback(); }}
                              className="text-[8px] text-rose-500 font-bold uppercase"
                            >
                              Salir
                            </button>
                          </div>

                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}

              </div>
            </div>

            {/* Simulated Hand reach indicator guide */}
            <div className="w-full max-w-sm mt-3 text-center">
              <span className="text-[10px] text-gray-400 inline-flex items-center gap-1.5 bg-[#0f111a] px-3 py-1 rounded-full border border-gray-800">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>
                <span>Toca los botones del simulador para probar los flujos e interacciones reales.</span>
              </span>
              
              <div className="mt-3 flex items-center justify-center gap-4">
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showTouchIndicator}
                    onChange={(e) => setShowTouchIndicator(e.target.checked)}
                    className="accent-orange-500 rounded text-orange-500"
                  />
                  <span>Ver indicador táctil al presionar</span>
                </label>
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: COMPREHENSIVE DESIGN REVIEW & METRICS (7 Cols) */}
          <div className="hidden">
            
            {/* PROPOSAL DETAILED ANALYSIS SPEC SHEET */}
            <div className="bg-[#0e1019] rounded-2xl border border-[#1b1e2c] p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-orange-500 uppercase tracking-widest block mb-1">Estrategia UX</span>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Propuesta {currentSpec.id}: {currentSpec.title}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">{currentSpec.tagline}</p>
                </div>
                
                {currentSpec.id === 'B' && (
                  <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Recomendado
                  </span>
                )}
              </div>

              {/* Description paragraph */}
              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                {currentSpec.description}
              </p>

              {/* ERGONOMIC & USABILITY PERFORMANCE MATRIX */}
              <div className="bg-[#08090d] p-4 rounded-xl border border-[#1c1e2b] mb-6">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" /> Matriz de Eficiencia UX Táctil
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Metric 1: Reachability */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">Alcance del Pulgar (Thumb Zone)</span>
                      <span className="font-bold font-mono text-orange-400">{currentSpec.thumbReach}%</span>
                    </div>
                    <div className="w-full bg-[#181a26] h-2 rounded-full overflow-hidden">
                      <div className="bg-orange-500 h-full rounded-full" style={{ width: `${currentSpec.thumbReach}%` }}></div>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Nivel de confort al usar con una sola mano</span>
                  </div>

                  {/* Metric 2: Speed Score */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">Velocidad de Operación</span>
                      <span className="font-bold font-mono text-orange-400">{currentSpec.speedScore}%</span>
                    </div>
                    <div className="w-full bg-[#181a26] h-2 rounded-full overflow-hidden">
                      <div className="bg-orange-500 h-full rounded-full" style={{ width: `${currentSpec.speedScore}%` }}></div>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Velocidad de acceso a platillos y caja</span>
                  </div>

                  {/* Metric 3: Space Efficiency */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">Eficiencia de Espacio Útil</span>
                      <span className="font-bold font-mono text-orange-400">{currentSpec.spaceEfficiency}%</span>
                    </div>
                    <div className="w-full bg-[#181a26] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#ff6b00]/80 h-full rounded-full" style={{ width: `${currentSpec.spaceEfficiency}%` }}></div>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Porcentaje de pantalla libre para la comanda</span>
                  </div>

                  {/* Metric 4: Cognitive load */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">Facilidad Cognitiva</span>
                      <span className="font-bold font-mono text-orange-400">{currentSpec.cognitiveLoad}%</span>
                    </div>
                    <div className="w-full bg-[#181a26] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#ff6b00]/80 h-full rounded-full" style={{ width: `${currentSpec.cognitiveLoad}%` }}></div>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Sencillez mental para ubicar un módulo</span>
                  </div>
                </div>
              </div>

              {/* PROS & CONS ACCORDION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-[#121422] p-4 rounded-xl border border-gray-900">
                  <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider block mb-2">Ventajas Clave</span>
                  <ul className="space-y-1.5">
                    {currentSpec.pros.map((pro, idx) => (
                      <li key={idx} className="text-xs text-gray-300 flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-[#121422] p-4 rounded-xl border border-gray-900">
                  <span className="text-rose-400 text-xs font-bold uppercase tracking-wider block mb-2">Puntos de Atención / Desventajas</span>
                  <ul className="space-y-1.5">
                    {currentSpec.cons.map((con, idx) => (
                      <li key={idx} className="text-xs text-gray-300 flex items-start gap-1.5">
                        <span className="text-rose-400 font-bold">!</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* BEST FOR BADGE */}
              <div className="p-3.5 bg-orange-500/5 border border-orange-500/20 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-[#ff6b00] rounded-lg text-white">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider block">Contexto Óptimo de Uso:</span>
                  <span className="text-xs text-gray-200">{currentSpec.bestFor}</span>
                </div>
              </div>

            </div>

            {/* DEEP UX JUSTIFICATION FOR PROPUESTA B (THE GOLD STANDARD MOBILE DESIGN) */}
            <div className="bg-[#0e1019] rounded-2xl border border-[#1b1e2c] p-6 shadow-sm">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-orange-500" />
                Justificación de Diseño: Por qué la Propuesta B es la evolución natural de BÚNKER
              </h3>
              
              <div className="space-y-3.5 text-xs text-gray-300 leading-relaxed">
                <p>
                  Como especialistas en diseño para gastronomía de alto flujo, entendemos que un mesero en la planta de un restaurante opera 
                  el dispositivo bajo <strong>estrés, ruido y con una sola mano ocupada</strong> (sosteniendo bandejas, jarras o platos).
                </p>
                <p>
                  La <strong>Propuesta B (Bottom Dock Type Bar)</strong> revoluciona la experiencia al situar los controles críticos en la parte inferior. 
                  Esto reduce el desplazamiento vertical (scroll) un <strong className="text-orange-400">75%</strong> y elimina por completo el dolor de estirar el pulgar 
                  hasta la esquina superior izquierda del teléfono para abrir un sidebar.
                </p>

                {/* Grid illustrating Thumb Ergonomics */}
                <div className="grid grid-cols-3 gap-2 bg-[#08090c] p-3 rounded-xl border border-gray-900 text-center">
                  <div>
                    <span className="text-[8px] text-gray-500 block uppercase font-bold">Zona Superior (70-100% de la altura)</span>
                    <span className="text-rose-400 font-bold text-[10px] block mt-1">⚠️ Inalcanzable</span>
                    <span className="text-[8px] text-gray-400">Perfecto para alertas, cabecera y estado de red.</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-500 block uppercase font-bold">Zona Media (30-70% de la altura)</span>
                    <span className="text-amber-400 font-bold text-[10px] block mt-1">⚡ Alcanzable</span>
                    <span className="text-[8px] text-gray-400">Óptimo para tablas, listas de platos y búsqueda.</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-500 block uppercase font-bold">Zona Base (0-30% de la altura)</span>
                    <span className="text-emerald-400 font-bold text-[10px] block mt-1">⭐ Confort Absoluto</span>
                    <span className="text-[8px] text-gray-400">Navegación primaria activa e interactiva.</span>
                  </div>
                </div>

                <p>
                  El botón <span className="text-orange-500 font-bold">"Más"</span> actúa como un cajón de sastre ordenado: utiliza una hoja inferior (Bottom Sheet) 
                  que se desliza con transiciones nativas de <strong>Framer Motion (motion/react)</strong>. 
                  Al mantener la sección <span className="text-orange-500 font-bold">"Logística"</span> plegada o desplegable de manera limpia, 
                  se resguarda la estructura de costeo, inventario y recetas sin atosigar al usuario en su quehacer inmediato.
                </p>
              </div>
            </div>

            {/* INTERACTIVE DESIGN FEEDBACK FORM FOR OWNER */}
            <div className="bg-[#0e1019] rounded-2xl border border-[#1b1e2c] p-6 shadow-sm">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-orange-500" />
                ¿Qué opinas de esta evolución para BÚNKER? Envía tu feedback
              </h3>
              
              {feedbackSent ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-center text-xs">
                  <Check className="w-6 h-6 mx-auto mb-1 text-emerald-500 animate-bounce" />
                  <span className="block font-bold">¡Feedback Guardado Exitosamente!</span>
                  <span>Hemos transmitido tus observaciones sobre la Propuesta {proposal} al equipo de Frontend de BÚNKER.</span>
                </div>
              ) : (
                <form onSubmit={handleSendFeedback} className="space-y-3">
                  <div className="text-xs text-gray-400">
                    Selecciona tu calificación para la <strong>Propuesta {proposal}</strong>:
                  </div>

                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => { setRating(star); triggerTactileFeedback(); }}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
                          rating === star 
                            ? 'bg-orange-500 border-orange-500 text-white shadow-[0_2px_8px_rgba(255,107,0,0.3)]' 
                            : 'bg-[#121422] border-gray-900 text-gray-400 hover:border-gray-800'
                        }`}
                      >
                        {star} ★
                      </button>
                    ))}
                  </div>

                  <div>
                    <textarea
                      placeholder={`Escribe aquí sugerencias sobre la Propuesta ${proposal} (ej. 'Me encanta el Bottom Sheet pero me gustaría el botón de caja más visible'...)`}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      required
                      className="w-full h-20 bg-[#08090d] border border-gray-900 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-orange-500/10"
                  >
                    <Send className="w-3.5 h-3.5" /> Guardar Calificación de Diseño
                  </button>
                </form>
              )}
            </div>

          </div>

      </main>

      {/* FOOTER */}
      <footer className="mt-16 border-t border-[#1b1e2c] bg-[#07080d] py-8 px-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${activeTheme.bgLight} ${activeTheme.text} border ${activeTheme.borderLight}`}>
              <Lock className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-gray-300">BÚNKER POS • SISTEMA DE GESTIÓN GASTRONÓMICA</span>
          </div>
          <p>Concepto y Prototipo Interactivo Responsivo • Realizado por el Senior Product Designer</p>
        </div>
      </footer>
    </div>
  );
}
