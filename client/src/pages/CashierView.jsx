import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { getActiveRestaurantName } from '../utils/tenant';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Plus, FileSpreadsheet, Eye, Printer, MoreVertical,
  Trash, Search, X, Receipt, CheckCircle, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast,
  TrendingUp, BarChart3, HelpCircle, FileText, Smartphone, CreditCard,
  SlidersHorizontal, Menu, CalendarDays, Download, AlertCircle,
  Wallet, ClipboardList, ListChecks
} from 'lucide-react';

import { useNotification } from '../context/NotificationContext';
import { useConfirmation } from '../context/ConfirmationContext';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../hooks/useCache';
import { useCaja } from '../context/CajaContext';

import { DropdownRangeDatePicker } from '../components/DropdownRangeDatePicker';
import DeleteButton from '../components/ui/DeleteButton';
import CloseButton from '../components/ui/CloseButton';
import { CustomCharts } from '../components/CustomCharts';
import { CheckoutModal } from '../components/CheckoutModal';
import { MovimientoModal } from '../components/MovimientoModal';
import { networkStatus, NetworkState, db, offlineCashService, offlineSnapshotService, resolveItemPrice } from '../offline';
import { PaloteoModal } from '../components/PaloteoModal';
import { SummaryTicketModal } from '../components/SummaryTicketModal';
import { DetailModal } from '../components/DetailModal';
import SmoothDropdown from '../components/ui/SmoothDropdown';

// Format date helper
const formatDate = (dateString, includeTime = true) => {
  if (!dateString) return "--:--";
  const d = new Date(dateString);
  return d.toLocaleString('es-PE', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', second: '2-digit' } : {}),
    hour12: false
  }).replace(',', '');
};

const cashierActions = [
  { id: "detail", label: "Auditar Detalles", icon: FileText },
  { id: "resumen", label: "Ver Ticket Resumen", icon: Printer },
  { id: "paloteo", label: "Ver Paloteo", icon: BarChart3 },
  { id: "pdf", label: "Exportar PDF", icon: Download },
];

const CashierView = () => {
  const { showToast } = useNotification();
  const { showConfirmation } = useConfirmation();
  const { user } = useAuth();
  const { refreshCajaStatus } = useCaja();
  const navigate = useNavigate();

  // Range Date Filter State
  const [filterDateRange, setFilterDateRange] = useState(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Panels Toggles
  const [isMovModalOpen, setIsMovModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedCheckoutOrder, setSelectedCheckoutOrder] = useState(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailArqueoId, setSelectedDetailArqueoId] = useState(null);

  const [isPaloteoModalOpen, setIsPaloteoModalOpen] = useState(false);
  const [selectedPaloteoArqueoId, setSelectedPaloteoArqueoId] = useState(null);

  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [selectedSummaryArqueoId, setSelectedSummaryArqueoId] = useState(null);

  const [showInitialAmountModal, setShowInitialAmountModal] = useState(false);
  const [initialAmount, setInitialAmount] = useState('');
  const [formError, setFormError] = useState(null);

  // Dropdowns
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [expandedDig, setExpandedDig] = useState({});
  const [expandedTarj, setExpandedTarj] = useState({});

  // Layout sidebar states
  const [isSidebarDocked, setIsSidebarDocked] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openMenuNumero, setOpenMenuNumero] = useState(null);

  // Close card action menu on outside click
  useEffect(() => {
    const handleCloseMenu = () => setOpenMenuNumero(null);
    if (openMenuNumero !== null) {
      window.addEventListener('click', handleCloseMenu);
      return () => window.removeEventListener('click', handleCloseMenu);
    }
  }, [openMenuNumero]);

  // Selected row for charts (fallback to active or first arqueo)
  const [selectedArqueoId, setSelectedArqueoId] = useState(null);

  // PDF Generation loading
  const [isGenerating, setIsGenerating] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  // Window resize to dock accounts panel automatically
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarDocked(false);
      } else {
        setIsSidebarDocked(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // trigger on mount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadOpenAccountsLocal = useCallback(async () => {
    try {
      const localOrders = await db.orders
        .filter(o => o.status !== 'cerrada' && o.status !== 'anulada')
        .toArray();
      const [localOrderItems, localProducts, localTables] = await Promise.all([
        db.orderItems.toArray(),
        db.products.toArray(),
        db.table('tables').toArray()
      ]);

      const productMap = new Map();
      localProducts.forEach(p => {
        if (p.id != null) productMap.set(String(p.id), p);
        if (p.remoteId != null) productMap.set(String(p.remoteId), p);
      });

      // tableMap con clave String para evitar NaN al hacer Number(UUID)
      const tableMap = new Map(localTables.map(t => [String(t.id), t]));

      const orderItemMap = new Map();
      localOrderItems.forEach(item => {
        // Soportar ambos nombres de campo para la relación con la comanda
        const parentId = String(item.comandaId || item.orderId || '');
        if (!parentId) return;
        if (!orderItemMap.has(parentId)) orderItemMap.set(parentId, []);

        const productKey = String(item.platoId || item.productId || '');
        const product = productMap.get(productKey);

        // Resolver precio defensivamente: precio ?? precioVenta del item, luego del producto
        const unitPrice = item.precio != null ? Number(item.precio)
          : item.precioVenta != null ? Number(item.precioVenta)
            : product?.precio != null ? Number(product.precio)
              : product?.precioVenta != null ? Number(product.precioVenta)
                : 0;

        orderItemMap.get(parentId).push({
          ...item,
          _unitPrice: unitPrice,
          plato: product
            ? { ...product, precio: unitPrice }
            : { id: productKey, nombre: 'Plato sin datos', precio: unitPrice }
        });
      });

      // Filtrar órdenes activas usando ambos campos de estado
      const activeOrders = localOrders.filter(o => {
        const est = (o.estado || o.status || '').toLowerCase();
        return est !== 'cerrada' && est !== 'anulada';
      });

      return activeOrders.map(order => {
        const details = orderItemMap.get(String(order.id)) || [];

        // Resolver mesaId: mesaId ?? tableId, normalizar a String
        const resolvedTableId = order.mesaId != null ? String(order.mesaId)
          : order.tableId != null ? String(order.tableId)
            : null;
        const mesa = resolvedTableId ? tableMap.get(resolvedTableId) : null;

        // Número visible: numero ?? name (nunca Number(uuid))
        const mesaNumero = mesa
          ? (mesa.numero ?? mesa.name ?? resolvedTableId)
          : (resolvedTableId ?? '?');

        return {
          ...order,
          detalles: details,
          mesa: { id: resolvedTableId, numero: mesaNumero }
        };
      });
    } catch (err) {
      console.error('[CashierView] Error al cargar open accounts offline:', err);
      return [];
    }
  }, []);

  // API Call: Fetch open accounts
  const openAccountsFetcher = useCallback(async () => {
    if (networkStatus.isOffline()) {
      setConnectionError(false);
      return loadOpenAccountsLocal();
    }

    try {
      const res = await fetch(`/api/cashier/open-accounts?_t=${Date.now()}`);
      if (!res.ok) throw new Error('Error al conectar con el servidor');
      const data = await res.json();
      setConnectionError(false);
      return data;
    } catch (err) {
      console.error('[CashierView] openAccountsFetcher falló:', err);
      setConnectionError(true);
      throw err; // Re-lanzar para conservar los últimos datos válidos en useCache
    }
  }, [loadOpenAccountsLocal]);

  const { data: openTables, mutate: fetchTables } = useCache('openTables', openAccountsFetcher, []);

  const loadBalanceLocal = useCallback(async () => {
    try {
      return await offlineCashService.getBalance();
    } catch (err) {
      console.error('[CashierView] Error al cargar balance local offline:', err);
      return null;
    }
  }, []);

  // API Call: Fetch current cashier status balance
  const statusFetcher = useCallback(async () => {
    if (networkStatus.isOffline()) {
      setConnectionError(false);
      return loadBalanceLocal();
    }

    try {
      const res = await fetch(`/api/cashier/balance?_t=${Date.now()}`);
      if (!res.ok) throw new Error('Error al conectar con el servidor');
      const data = await res.json();
      setConnectionError(false);
      return data;
    } catch (err) {
      console.error('[CashierView] statusFetcher falló:', err);
      setConnectionError(true);
      throw err; // Re-lanzar para conservar los últimos datos válidos en useCache
    }
  }, [loadBalanceLocal]);

  const { data: currentStatus, mutate: fetchStatus } = useCache('cashier_balance', statusFetcher, null);

  const shiftStatus = currentStatus?.estado || 'cerrado';

  const loadHistoryLocal = useCallback(async () => {
    try {
      const localArqueos = await db.arqueos.toArray();
      localArqueos.sort((a, b) => b.id - a.id);

      let filtered = localArqueos;
      if (filterDateRange?.from) {
        const start = new Date(filterDateRange.from);
        start.setHours(0, 0, 0, 0);
        const end = filterDateRange.to ? new Date(filterDateRange.to) : new Date(filterDateRange.from);
        end.setHours(23, 59, 59, 999);
        filtered = localArqueos.filter(arq => {
          const date = new Date(arq.fechaInicio);
          return date >= start && date <= end;
        });
      }

      if (searchQuery) {
        filtered = filtered.filter(arq => {
          const matchDate = (dateStr) => {
            if (!dateStr) return false;
            return formatDate(dateStr).toLowerCase().includes(searchQuery.toLowerCase());
          };

          const userName = arq.usuarioId === user?.id ? user.nombre : 'Hector';

          return arq.id.toString().includes(searchQuery) ||
            matchDate(arq.fechaInicio) ||
            matchDate(arq.fechaFin) ||
            arq.estado.toLowerCase().includes(searchQuery.toLowerCase()) ||
            userName.toLowerCase().includes(searchQuery.toLowerCase());
        });
      }

      const totalCount = filtered.length;

      const [allOrders, allOrderItems, allProducts, allMovements] = await Promise.all([
        db.orders.toArray(),
        db.orderItems.toArray(),
        db.products.toArray(),
        db.movimientosCaja.toArray()
      ]);

      const productMap = new Map(allProducts.map(p => [p.id, p]));
      const itemMap = new Map();
      allOrderItems.forEach(item => {
        const parentId = String(item.comandaId || item.orderId || '');
        if (parentId) {
          if (!itemMap.has(parentId)) itemMap.set(parentId, []);
          itemMap.get(parentId).push(item);
        }
      });

      const parsePaymentMethod = (metodoPago) => {
        const m = (metodoPago || 'efectivo').toLowerCase();
        if (m.includes('izipay') || m.includes('izi')) return 'izipay';
        if (m.includes('niubiz')) return 'niubiz';
        if (m.includes('plin')) return 'plin';
        if (m.includes('yape')) return 'yape';
        if (m.includes('tarjeta')) return 'tarjeta';
        return 'efectivo';
      };

      const data = filtered.map(arq => {
        const startDate = new Date(arq.fechaInicio);
        const endDate = arq.estado === 'abierto' ? new Date() : new Date(arq.fechaFin || arq.fechaInicio);
        const movements = allMovements.filter(m => m.arqueoId === arq.id);

        const manualIngresos = movements.filter(m => m.tipo === 'INGRESO' && (m.metodoPago === 'efectivo' || !m.metodoPago)).reduce((sum, m) => sum + Number(m.monto), 0);
        const manualEgresos = movements.filter(m => m.tipo === 'EGRESO' && (m.metodoPago === 'efectivo' || !m.metodoPago)).reduce((sum, m) => sum + Number(m.monto), 0);

        const manualIngresosYape = movements.filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'yape').reduce((sum, m) => sum + Number(m.monto), 0);
        const manualEgresosYape = movements.filter(m => m.tipo === 'EGRESO' && m.metodoPago === 'yape').reduce((sum, m) => sum + Number(m.monto), 0);

        const manualIngresosPlin = movements.filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'plin').reduce((sum, m) => sum + Number(m.monto), 0);
        const manualEgresosPlin = movements.filter(m => m.tipo === 'EGRESO' && m.metodoPago === 'plin').reduce((sum, m) => sum + Number(m.monto), 0);

        const inicio = Number(arq.montoInicial || 0);
        const egresos = movements.filter(m => m.tipo === 'EGRESO').reduce((sum, m) => sum + Number(m.monto), 0);

        let totalBruto = 0;
        let totalPropinas = 0;
        let incomeDetails = {
          efectivo: 0,
          tarjeta: 0,
          yape: 0,
          izipay: 0,
          plin: 0,
          niubiz: 0,
          manual: manualIngresos
        };

        const closedOrders = allOrders.filter(order => {
          const isClosed = order.estado === 'cerrada' || order.status === 'cerrada';
          if (!isClosed) return false;
          const orderDate = new Date(order.fechaCierre || order.fecha);
          return orderDate >= startDate && orderDate <= endDate;
        });

        let sessionHasError = false;
        closedOrders.forEach(order => {
          const items = itemMap.get(order.id) || [];
          let orderSubtotal = 0;
          let orderHasError = false;

          items.forEach(item => {
            const plato = productMap.get(item.platoId);
            const resolvedPrice = resolveItemPrice(item, plato);
            if (resolvedPrice !== null) {
              orderSubtotal += (Number(item.cantidad) * resolvedPrice);
            } else {
              orderHasError = true;
              sessionHasError = true;
              console.error(`[INTEGRITY ERROR] Precio no disponible para item id: ${item.id} en arqueo local: ${arq.id}`);
            }
          });

          if (!orderHasError) {
            totalBruto += orderSubtotal;
            const cat = parsePaymentMethod(order.metodoPago);
            if (incomeDetails[cat] !== undefined) {
              incomeDetails[cat] += orderSubtotal;
            } else {
              incomeDetails.efectivo += orderSubtotal;
            }
          }
          totalPropinas += Number(order.propina || 0);
        });

        incomeDetails.yape = Math.max(0, incomeDetails.yape + manualIngresosYape - manualEgresosYape);
        incomeDetails.plin = Math.max(0, incomeDetails.plin + manualIngresosPlin - manualEgresosPlin);

        let totalPendiente = 0;
        if (arq.estado === 'abierto') {
          const pendingOrders = allOrders.filter(order => {
            const isClosed = order.estado === 'cerrada' || order.status === 'cerrada';
            const isCancelled = order.estado === 'anulada' || order.status === 'anulada';
            return !isClosed && !isCancelled;
          });
          pendingOrders.forEach(order => {
            const items = itemMap.get(order.id) || [];
            items.forEach(item => {
              const plato = productMap.get(item.platoId);
              const resolvedPrice = resolveItemPrice(item, plato);
              if (resolvedPrice !== null) {
                totalPendiente += (Number(item.cantidad) * resolvedPrice);
              } else {
                console.error(`[INTEGRITY ERROR] Precio no disponible para item pendiente id: ${item.id}`);
              }
            });
          });
        }

        return {
          id: arq.id,
          fechaInicio: arq.fechaInicio,
          fechaFin: arq.fechaFin,
          estado: arq.estado,
          inicio,
          egresos,
          ingresos: incomeDetails,
          totalCaja: inicio + manualIngresos + incomeDetails.efectivo - manualEgresos,
          totalBruto: sessionHasError ? null : totalBruto,
          totalPropinas,
          usuario: { nombre: arq.usuarioId === user?.id ? user.nombre : 'Hector' }
        };
      });

      return {
        data,
        meta: {
          total: totalCount,
          page: currentPage,
          totalPages
        }
      };
    } catch (err) {
      console.error('[CashierView] Error local en loadHistoryLocal:', err);
      return { data: [], meta: { total: 0, page: 1, totalPages: 1 } };
    }
  }, [currentPage, filterDateRange, searchQuery, user]);

  const abortControllerRef = useRef(null);

  // API Call: Fetch complete historical dataset once for instant client-side pagination
  const historyFetcher = useCallback(async () => {
    if (networkStatus.isOffline()) {
      setConnectionError(false);
      return loadHistoryLocal();
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let url = `/api/cashier/history?limit=100&_t=${Date.now()}`;
    if (filterDateRange?.from) {
      const startStr = format(filterDateRange.from, 'yyyy-MM-dd');
      if (filterDateRange.to) {
        const endStr = format(filterDateRange.to, 'yyyy-MM-dd');
        url += `&startDate=${startStr}&endDate=${endStr}`;
      } else {
        url += `&startDate=${startStr}&endDate=${startStr}`;
      }
    }

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error('Error al conectar con el servidor');
      const data = await res.json();
      setConnectionError(false);
      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        // No devolver objeto vacío si la petición fue abortada por una más reciente;
        // relanzamos el error para que useCache mantenga los datos existentes sin vaciar la tabla.
        throw err;
      }
      console.error('[CashierView] historyFetcher falló:', err);
      setConnectionError(true);
      throw err;
    }
  }, [filterDateRange, loadHistoryLocal]);

  const historyKey = useMemo(() => {
    if (!filterDateRange?.from) return 'cashier_history_dataset';
    const startStr = format(filterDateRange.from, 'yyyy-MM-dd');
    const endStr = filterDateRange.to ? format(filterDateRange.to, 'yyyy-MM-dd') : '';
    return `cashier_history_${startStr}_${endStr}`;
  }, [filterDateRange]);

  const { data: history, loading: historyLoading, mutate: fetchHistory } = useCache(
    historyKey,
    historyFetcher,
    { data: [], meta: { page: 1, totalPages: 1 } }
  );

  // Mantener referencia estable a los últimos datos válidos para evitar que la tabla parpadee o quede vacía durante refetches
  const lastValidHistoryRef = useRef(history?.data?.length > 0 ? history.data : []);
  if (history?.data?.length > 0) {
    lastValidHistoryRef.current = history.data;
  }

  // Sync selected arqueo ID cuando cambian los datos cargados o la clave
  useEffect(() => {
    if (history?.data?.length > 0) {
      const exists = history.data.some(arq => arq.id === selectedArqueoId);
      if (!exists) {
        setSelectedArqueoId(history.data[0].id);
      }
    } else if (currentStatus?.id && !selectedArqueoId) {
      setSelectedArqueoId(currentStatus.id);
    }
  }, [history, currentStatus, selectedArqueoId]);

  const activeKpiData = useMemo(() => {
    if (selectedArqueoId && history?.data?.length > 0) {
      const found = history.data.find(a => a.id === selectedArqueoId);
      if (found) return found;
    }
    return currentStatus || history?.data?.[0] || null;
  }, [selectedArqueoId, history, currentStatus]);

  // Modal Close Callbacks (Stabilized)
  const handleClosePaloteoModal = useCallback(() => {
    setIsPaloteoModalOpen(false);
    setSelectedPaloteoArqueoId(null);
  }, []);

  const handleCloseSummaryModal = useCallback(() => {
    setIsSummaryModalOpen(false);
    setSelectedSummaryArqueoId(null);
  }, []);

  const handleCloseCheckoutModal = useCallback(() => {
    setIsCheckoutModalOpen(false);
    setSelectedCheckoutOrder(null);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedDetailArqueoId(null);
  }, []);

  // Synchronizers and Polling
  const statusRef = useRef(fetchStatus);
  const tablesRef = useRef(fetchTables);
  const historyRef = useRef(fetchHistory);
  useEffect(() => {
    statusRef.current = fetchStatus;
    tablesRef.current = fetchTables;
    historyRef.current = fetchHistory;
  });

  const currentPageRef = useRef(currentPage);
  const searchQueryRef = useRef(searchQuery);
  const filterDateRangeRef = useRef(filterDateRange);
  useEffect(() => {
    currentPageRef.current = currentPage;
    searchQueryRef.current = searchQuery;
    filterDateRangeRef.current = filterDateRange;
  }, [currentPage, searchQuery, filterDateRange]);

  useEffect(() => {
    // Actualización ligera cuando mozos o cocina modifican mesas en el salón
    const handleTablesRefresh = () => {
      statusRef.current?.();
      tablesRef.current?.();
    };

    // Actualización cuando se realiza un cobro o movimiento de caja explícito
    const handleCashRefresh = () => {
      statusRef.current?.();
      tablesRef.current?.();
      // Solo refrescar historial si estamos en la página inicial sin búsqueda para no desestabilizar la navegación
      if (currentPageRef.current === 1 && !searchQueryRef.current && !filterDateRangeRef.current?.from) {
        historyRef.current?.();
      }
    };

    let cashRefreshTimeout = null;
    const debouncedCashRefresh = () => {
      if (cashRefreshTimeout) clearTimeout(cashRefreshTimeout);
      cashRefreshTimeout = setTimeout(() => {
        handleCashRefresh();
      }, 120);
    };

    fetchTables(); // immediate query
    fetchStatus();

    const interval = setInterval(() => {
      if (currentPageRef.current === 1) {
        statusRef.current?.();
        tablesRef.current?.();
      }
    }, 10000);

    window.addEventListener('refreshCashCount', debouncedCashRefresh);
    window.addEventListener('refreshTables', handleTablesRefresh);

    let channel = null;
    try {
      channel = new BroadcastChannel('bunker');
      channel.onmessage = (event) => {
        if (event.data === 'refreshCashCount') {
          debouncedCashRefresh();
        } else if (event.data === 'refreshTables') {
          handleTablesRefresh();
        }
      };
    } catch (e) {
      console.error(e);
    }

    return () => {
      clearInterval(interval);
      if (cashRefreshTimeout) clearTimeout(cashRefreshTimeout);
      window.removeEventListener('refreshCashCount', debouncedCashRefresh);
      window.removeEventListener('refreshTables', handleTablesRefresh);
      if (channel) {
        channel.close();
      }
    };
  }, []);

  const hasPricingError = useMemo(() => {
    const tableError = openTables?.some(cuenta =>
      cuenta.detalles?.some(d => resolveItemPrice(d) === null)
    );
    const statusError = currentStatus?.ventas?.some(v =>
      v.items?.some(i => i.precio === null)
    );
    return !!(tableError || statusError);
  }, [openTables, currentStatus]);

  // Active shift toggle logic
  const handleToggleShift = async () => {
    if (!currentStatus) return;

    if (currentStatus.estado === 'abierto') {
      if (hasPricingError) {
        showToast("No se puede cerrar caja: Hay inconsistencias de precios en las comandas.", "error");
        return;
      }
      if (!await showConfirmation("¿Estás seguro de cerrar caja? Asegúrate de que no haya cuentas pendientes.", { type: 'danger' })) return;
      executeToggle(0);
    } else {
      setInitialAmount('');
      setFormError(null);
      setShowInitialAmountModal(true);
    }
  };

  const confirmOpenShift = async (e) => {
    e.preventDefault();
    if (Number.isNaN(initialAmount) || initialAmount === null || initialAmount === '' || parseFloat(initialAmount) < 0) {
      setFormError("Monto inicial no válido.");
      return;
    }
    executeToggle(Number(initialAmount));
  };

  const executeToggle = (montoInicial) => {
    const accion = currentStatus?.estado === 'abierto' ? 'close' : 'open';

    if (networkStatus.isOffline()) {
      offlineCashService.toggleCashSession({
        usuarioId: user.id,
        montoInicial: accion === 'open' ? montoInicial : 0,
        montoFinal: accion === 'close' ? 0 : 0, // En local asumimos cero al toggle, se calcula
        accion
      })
        .then(async () => {
          fetchStatus();
          setCurrentPage(1);
          setShowInitialAmountModal(false);
          if (refreshCajaStatus) await refreshCajaStatus();
          showToast("Estado de caja cambiado localmente (Modo Offline).", "success");
        })
        .catch(err => showToast(err.message, 'error'));
      return;
    }

    fetch('/api/cashier/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ montoInicial, usuarioId: user?.id })
    })
      .then(async res => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Error al cambiar estado");
        return body;
      })
      .then(async () => {
        // Hidratar snapshot de fondo para incorporar el cambio de sesión (omitiendo productos)
        offlineSnapshotService.hydrateOperationalSnapshot({ skipProducts: true }).catch(() => { });

        fetchStatus();
        setCurrentPage(1);
        fetchHistory();
        setShowInitialAmountModal(false);
        await refreshCajaStatus();
        showToast("Estado de caja cambiado correctamente.", "success");
      })
      .catch(err => showToast(err.message, 'error'));
  };

  // Manual movements submit handler
  const handleAddMovimiento = (payload) => {
    if (networkStatus.isOffline()) {
      if (!currentStatus?.id) {
        showToast('No hay una sesión de caja activa para registrar movimientos.', 'error');
        return;
      }
      offlineCashService.createMovement({
        arqueoId: currentStatus.id,
        tipo: payload.tipo,
        monto: payload.monto,
        concepto: payload.concepto,
        metodoPago: payload.metodoPago || 'efectivo',
        observacion: payload.observacion || ''
      })
        .then(() => {
          showToast('Movimiento registrado con éxito localmente (Modo Offline).', 'success');
          fetchStatus();
          window.dispatchEvent(new Event('refreshCashCount'));
        })
        .catch(err => showToast(err.message, 'error'));
      return;
    }

    fetch('/api/cashier/movimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        if (res.ok) {
          showToast('Movimiento registrado con éxito.', 'success');
          // Hidratar snapshot de fondo para incorporar el movimiento de caja (omitiendo productos)
          offlineSnapshotService.hydrateOperationalSnapshot({ skipProducts: true }).catch(() => { });

          fetchStatus();
          fetchHistory();
          window.dispatchEvent(new Event('refreshCashCount'));
        } else {
          const err = await res.json();
          showToast(err.error || 'Error al guardar el movimiento.', 'error');
        }
      })
      .catch(() => showToast('Error de red al guardar movimiento.', 'error'));
  };

  // Open Checkout Modal
  const handleOpenCheckout = (comanda) => {
    if (shiftStatus !== 'abierto') {
      showToast("Debe ABRIR CAJA antes de cobrar.", 'error');
      return;
    }
    const hijasNumeros = comanda.mesa?.mesasHijas?.length > 0
      ? ' - ' + comanda.mesa.mesasHijas.map(h => h.numero).join(' - ')
      : '';
    const tableNumero = `${comanda.mesa?.numero || ''}${hijasNumeros}`;
    setSelectedCheckoutOrder({ ...comanda, tableNumero });
    setIsCheckoutModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsCheckoutModalOpen(false);
    fetchTables();
    window.dispatchEvent(new Event('refreshCashCount'));
  };

  // Row actions mapper
  const handleRowAction = (actionId, target) => {
    setActiveDropdownId(null);
    setOpenMenuNumero(null);
    const targetId = (typeof target === 'object' && target !== null) ? target.id : target;
    if (actionId === 'paloteo') {
      setSelectedPaloteoArqueoId(targetId);
      setIsPaloteoModalOpen(true);
    } else if (actionId === 'resumen' || actionId === 'ticket') {
      setSelectedSummaryArqueoId(targetId);
      setIsSummaryModalOpen(true);
    } else if (actionId === 'pdf') {
      generatePDF(targetId);
    } else if (actionId === 'detail' || actionId === 'auditar') {
      setSelectedDetailArqueoId(targetId);
      setIsDetailModalOpen(true);
    }
  };

  // Removed formatDate helper from here (moved to top of file)

  // SEARCH AND FILTER HISTORY (Instant Client-side Search Across Complete Dataset)
  const filteredHistory = useMemo(() => {
    const data = (history?.data && history.data.length > 0) ? history.data : (lastValidHistoryRef.current || []);
    if (!searchQuery) return data;
    return data.filter(arq =>
      arq.id.toString().includes(searchQuery) ||
      (arq.usuario?.nombre || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatDate(arq.fechaInicio).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (arq.fechaFin && formatDate(arq.fechaFin).toLowerCase().includes(searchQuery.toLowerCase())) ||
      arq.estado.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [history, searchQuery]);

  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE));

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredHistory.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredHistory, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // EXCEL HISTORY DOWNLOAD
  const handleExportExcel = () => {
    const wsData = [
      ['N° Arqueo', 'Fecha Inicio', 'Fecha Cierre', 'Estado', 'Monto Inicial (S/.)', 'Egresos Caja (S/.)', 'Ingreso Efectivo (S/.)', 'Ingreso Yape (S/.)', 'Ingreso Plin (S/.)', 'Ingreso Tarjeta (S/.)', 'Ingreso Izipay (S/.)', 'Ingreso Niubiz (S/.)', 'Ingreso Manual (S/.)', 'Propinas (S/.)', 'Total Caja (S/.)', 'Total Bruto (S/.)', 'Pendiente (S/.)'],
      ...(history?.data || []).map(a => [
        a.numeroSesion != null ? a.numeroSesion : a.id,
        formatDate(a.fechaInicio),
        a.estado === 'cerrado' ? formatDate(a.fechaFin) : 'EN CURSO',
        a.estado.toUpperCase(),
        a.montoInicial || a.inicio || 0,
        a.egresos || 0,
        a.ingresos?.efectivo || 0,
        a.ingresos?.yape || 0,
        a.ingresos?.plin || 0,
        a.ingresos?.tarjeta || 0,
        a.ingresos?.izipay || 0,
        a.ingresos?.niubiz || 0,
        a.ingresos?.manual || 0,
        a.totalPropinas || a.propinas || 0,
        a.totalCaja || 0,
        a.totalBruto || 0,
        a.totalPendiente || a.pendiente || 0
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial de Arqueos");
    XLSX.writeFile(wb, `historial_arqueos_caja_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Historial descargado en formato Excel.', 'success');
  };

  // CANVAS TREND CHART FOR PDF REPORT
  const generateChartImage = (arqArray) => {
    const salesByDate = {};
    const sortedArqs = [...arqArray].sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));

    if (sortedArqs.length === 0) return null;

    const getLocalDateStr = (dateStr) => {
      const d = new Date(dateStr);
      const localDate = new Date(d.getTime() - (5 * 60 * 60 * 1000));
      return localDate.toISOString().split('T')[0];
    };

    const startDStr = getLocalDateStr(sortedArqs[0].fechaInicio);
    const endDStr = getLocalDateStr(sortedArqs[sortedArqs.length - 1].fechaInicio);

    const startD = new Date(`${startDStr}T00:00:00`);
    const endD = new Date(`${endDStr}T00:00:00`);

    let cur = new Date(startD);
    while (cur <= endD) {
      const key = cur.toISOString().split('T')[0];
      salesByDate[key] = 0;
      cur.setDate(cur.getDate() + 1);
    }

    sortedArqs.forEach(arq => {
      (arq.ventas || []).forEach(v => {
        const dKey = getLocalDateStr(v.hora);
        if (salesByDate[dKey] !== undefined) {
          salesByDate[dKey] += v.total;
        } else {
          salesByDate[dKey] = v.total;
        }
      });
    });

    const chartData = Object.entries(salesByDate).map(([dateStr, amount]) => {
      const d = new Date(`${dateStr}T00:00:00`);
      const day = d.getDate();
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
      const label = `${day} ${months[d.getMonth()]}`;
      return { dateStr, label, amount };
    }).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padding = { top: 60, right: 50, bottom: 60, left: 80 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;

    const amounts = chartData.map(d => d.amount);
    const maxVal = Math.max(...amounts, 100) * 1.15;
    const minVal = 0;

    const points = chartData.map((d, i) => {
      const x = padding.left + (chartData.length > 1 ? (i / (chartData.length - 1)) * chartWidth : chartWidth / 2);
      const y = padding.top + chartHeight - ((d.amount - minVal) / (maxVal - minVal)) * chartHeight;
      return { x, y, amount: d.amount, label: d.label };
    });

    ctx.strokeStyle = '#f1f3f5';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#868e96';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const val = minVal + (i / yTicks) * (maxVal - minVal);
      const y = padding.top + chartHeight - (i / yTicks) * chartHeight;

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(canvas.width - padding.right, y);
      ctx.stroke();

      ctx.fillText(`S/. ${val.toFixed(2)}`, padding.left - 12, y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#868e96';

    const labelStep = Math.max(1, Math.ceil(chartData.length / 10));
    points.forEach((p, i) => {
      if (i % labelStep === 0) {
        ctx.fillText(p.label, p.x, padding.top + chartHeight + 10);
        ctx.strokeStyle = '#dee2e6';
        ctx.beginPath();
        ctx.moveTo(p.x, padding.top + chartHeight);
        ctx.lineTo(p.x, padding.top + chartHeight + 5);
        ctx.stroke();
      }
    });

    if (points.length > 0) {
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)'); // Green aesthetic matching primary
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartHeight);
      points.forEach(p => {
        ctx.lineTo(p.x, p.y);
      });
      ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach(p => {
        ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      const maxAmount = Math.max(...amounts);
      points.forEach(p => {
        const isPeak = p.amount === maxAmount && maxAmount > 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        if (isPeak) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6.5, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`S/. ${p.amount.toFixed(2)}`, p.x, p.y - 12);
        }
      });
    }

    return canvas.toDataURL('image/png');
  };

  // PDF DOWNLOAD GENERATOR
  const generatePDF = async (targetId = null) => {
    setIsGenerating(true);
    try {
      let arqArray = [];

      if (!targetId && filterDateRange?.from) {
        const startStr = format(filterDateRange.from, 'yyyy-MM-dd');
        const endStr = filterDateRange.to ? format(filterDateRange.to, 'yyyy-MM-dd') : startStr;
        const res = await fetch(`/api/cashier/arqueo/report/range?startDate=${startStr}&endDate=${endStr}`);
        if (!res.ok) throw new Error("Error al obtener los datos de arqueo por rango");
        arqArray = await res.json();
      } else {
        let actualId = targetId || currentStatus?.id;
        if (!actualId) {
          showToast("No hay datos de arqueo disponibles para descargar.", 'error');
          setIsGenerating(false);
          return;
        }
        const res = await fetch(`/api/cashier/arqueo/${actualId}`);
        if (!res.ok) throw new Error("Error al obtener los datos de arqueo");
        const fullData = await res.json();
        arqArray = [fullData];
      }

      if (arqArray.length === 0) {
        showToast("No se encontraron registros de arqueo en el período seleccionado.", 'warning');
        setIsGenerating(false);
        return;
      }

      const doc = new jsPDF();
      doc.setFont("helvetica");

      const isRange = arqArray.length > 1;
      const reportDate = filterDateRange?.from
        ? (filterDateRange.to
          ? `${format(filterDateRange.from, 'dd-MM-yyyy')} a ${format(filterDateRange.to, 'dd-MM-yyyy')}`
          : format(filterDateRange.from, 'dd-MM-yyyy'))
        : formatDate(new Date().toISOString(), false);

      const formatTime = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
      };

      if (isRange) {
        // Consolidated range PDF
        doc.setFontSize(22);
        doc.setTextColor(16, 185, 129); // Green brand color
        doc.setFont("helvetica", "bold");
        doc.text(getActiveRestaurantName(), 14, 20);

        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text("Reporte Consolidado: Arqueos de Caja", 14, 28);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        doc.text(`Período Seleccionado: ${reportDate}`, 14, 35);
        doc.text(`Cantidad de Turnos: ${arqArray.length}`, 14, 40);

        const totalVentas = arqArray.reduce((sum, arq) => sum + arq.totalBruto, 0);
        const totalIngresosManuales = arqArray.reduce((sum, arq) => sum + (arq.movimientos || []).filter(m => m.tipo === 'INGRESO').reduce((s, m) => s + m.monto, 0), 0);
        const totalEgresosManuales = arqArray.reduce((sum, arq) => sum + (arq.egresos || 0), 0);
        const totalCajaConsolidado = arqArray.reduce((sum, arq) => sum + arq.totalCaja, 0);

        let startY = 48;
        doc.setFillColor(248, 249, 250);
        doc.setDrawColor(220, 220, 220);
        doc.rect(14, startY, 180, 22, 'FD');

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("Total Ventas", 18, startY + 8);
        doc.text("Ingresos Manuales", 62, startY + 8);
        doc.text("Egresos Manuales", 108, startY + 8);
        doc.text("Saldo Final Acumulado", 152, startY + 8);

        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "bold");
        doc.text(`S/. ${totalVentas.toFixed(2)}`, 18, startY + 16);
        doc.text(`S/. ${totalIngresosManuales.toFixed(2)}`, 62, startY + 16);
        doc.text(`S/. ${totalEgresosManuales.toFixed(2)}`, 108, startY + 16);
        doc.text(`S/. ${totalCajaConsolidado.toFixed(2)}`, 152, startY + 16);

        let currentY = startY + 30;
        doc.setFontSize(12);
        doc.setTextColor(16, 185, 129);
        doc.text("Resumen de Sesiones de Caja", 14, currentY);

        let runningAccumulated = 0;
        const summaryRows = arqArray.map((arq) => {
          runningAccumulated += arq.totalCaja;
          const manualIng = (arq.movimientos || []).filter(m => m.tipo === 'INGRESO').reduce((s, m) => s + m.monto, 0);
          return [
            `#${arq.numeroSesion || arq.id}`,
            arq.usuario?.nombre || 'Admin',
            formatDate(arq.fechaInicio, true),
            arq.fechaFin ? formatDate(arq.fechaFin, true) : 'Abierto',
            `S/. ${(arq.montoInicial || arq.inicio || 0).toFixed(2)}`,
            `S/. ${(arq.totalBruto || 0).toFixed(2)}`,
            `S/. ${manualIng.toFixed(2)}`,
            `S/. ${(arq.egresos || 0).toFixed(2)}`,
            `S/. ${(arq.totalCaja || 0).toFixed(2)}`,
            `S/. ${runningAccumulated.toFixed(2)}`
          ];
        });

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Turno', 'Usuario', 'Apertura', 'Cierre', 'M. Inicial', 'Ventas', 'Ing. Man.', 'Egr. Man.', 'Saldo Final', 'Saldo Acum.']],
          body: summaryRows,
          theme: 'grid',
          headStyles: { halign: 'center', fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold', fontSize: 8 },
          styles: { fontSize: 7.5 },
          columnStyles: {
            0: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' },
            4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' },
            7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' }
          }
        });

        // Add trend chart to consolited PDF
        doc.addPage();
        doc.setFontSize(22);
        doc.setTextColor(16, 185, 129);
        doc.setFont("helvetica", "bold");
        doc.text(getActiveRestaurantName(), 14, 20);
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text("Tendencia Diaria de Ventas", 14, 28);
        doc.setFontSize(10);
        doc.text(`Visualización analítica del período ${reportDate}`, 14, 35);

        const chartDataUrl = generateChartImage(arqArray);
        if (chartDataUrl) {
          doc.addImage(chartDataUrl, 'PNG', 14, 50, 182, 91);
        }
      } else {
        // Individual session PDF
        const fullData = arqArray[0];
        doc.setFontSize(22);
        doc.setTextColor(16, 185, 129);
        doc.setFont("helvetica", "bold");
        doc.text(getActiveRestaurantName(), 14, 20);

        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text(`Monto Inicial: S/. ${(fullData.montoInicial || fullData.inicio || 0).toFixed(2)}`, 145, 20);

        doc.setFontSize(14);
        doc.text("Reporte: Arqueo de Caja", 14, 28);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        doc.text(`Fecha del Turno: ${reportDate}`, 14, 35);
        doc.text(`Turno ID: #${fullData.numeroSesion || fullData.id} - Estado: ${fullData.estado.toUpperCase()}`, 14, 40);
        doc.text(`Usuario: ${fullData.usuario?.nombre || 'Administrador'}`, 14, 45);

        let currentY = 52;
        const pageHeight = doc.internal.pageSize.height;

        const checkPageSpace = (neededHeight) => {
          if (pageHeight - currentY < neededHeight) {
            doc.addPage();
            currentY = 20;
            return true;
          }
          return false;
        };

        // 1. FLOW HISTORY TABLE
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "bold");
        doc.text("Historial de Flujo de Caja (Inicio)", 14, currentY);

        const flowHistoryRows = [];
        const baseCashBalance = (fullData.montoInicial || fullData.inicio || 0) + (fullData.ingresos?.efectivo || 0);
        flowHistoryRows.push([
          formatTime(fullData.fechaInicio),
          'Total en Caja (Inicial + Efectivo Salón)',
          '-',
          `S/. ${baseCashBalance.toFixed(2)}`
        ]);

        const sortedMovements = [...(fullData.movimientos || [])].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        let runningStart = baseCashBalance;

        sortedMovements.forEach(m => {
          if (m.type === 'INGRESO' || m.tipo === 'INGRESO') {
            runningStart += m.monto;
            flowHistoryRows.push([
              formatTime(m.fecha),
              `Ingreso: ${m.concepto}`,
              `+ S/. ${m.monto.toFixed(2)}`,
              `S/. ${runningStart.toFixed(2)}`
            ]);
          } else {
            runningStart -= m.monto;
            flowHistoryRows.push([
              formatTime(m.fecha),
              `Egreso: ${m.concepto}`,
              `- S/. ${m.monto.toFixed(2)}`,
              `S/. ${runningStart.toFixed(2)}`
            ]);
          }
        });

        autoTable(doc, {
          startY: currentY + 4,
          head: [['Hora', 'Descripción', 'Afectación', 'Total en Caja']],
          body: flowHistoryRows,
          theme: 'grid',
          headStyles: { halign: 'center', fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
          styles: { fontSize: 9 },
          columnStyles: { 0: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'right' } },
          didParseCell: function (data) {
            if (data.section === 'body' && data.column.index === 2) {
              const textValue = data.cell.text ? data.cell.text.toString().trim() : '';
              if (textValue.startsWith('+')) {
                data.cell.styles.textColor = [40, 167, 69];
              } else if (textValue.startsWith('-')) {
                data.cell.styles.textColor = [220, 53, 69];
              }
            }
          }
        });

        currentY = doc.lastAutoTable.finalY + 12;

        // 2. INGRESOS TABLE (Ventas)
        checkPageSpace(35);
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "bold");
        doc.text("Ingresos Registrados", 14, currentY);

        const totalVentasMonto = (fullData.ventas || []).reduce((sum, v) => sum + v.total, 0);
        const ingresosRows = (fullData.ventas || []).map(v => {
          let docText = v.doc || 'ticket';
          docText = docText.toLowerCase() === 'sin_comprobante' ? 'Ticket' : docText.toUpperCase();
          return [
            formatTime(v.hora),
            docText,
            `Venta Mesa ${v.mesa}`,
            v.mozo || 'General',
            `Pago: ${(v.metodo || 'EFECTIVO').toUpperCase()}${v.propina > 0 ? ` + Propina S/. ${v.propina.toFixed(2)}` : ''}`,
            `S/. ${v.total.toFixed(2)}`
          ];
        });
        ingresosRows.push(['', '', '', '', 'Total en Bruto:', `S/. ${totalVentasMonto.toFixed(2)}`]);

        if (ingresosRows.length === 1) {
          ingresosRows.unshift(["-", "-", "Sin ventas en este turno", "-", "-", "S/. 0.00"]);
        }

        autoTable(doc, {
          startY: currentY + 4,
          head: [['Hora', 'Comprobante', 'Concepto', 'Mozo', 'Observación', 'Monto']],
          body: ingresosRows,
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold', halign: 'center' },
          styles: { fontSize: 9 },
          columnStyles: { 5: { halign: 'right' } },
          didParseCell: function (data) {
            if (data.section === 'body' && data.row.index === ingresosRows.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              if (data.column.index === 4 || data.column.index === 5) {
                data.cell.styles.halign = 'right';
              }
            }
          }
        });

        currentY = doc.lastAutoTable.finalY + 12;

        // 3. DESGLOSE DE PROPINAS
        checkPageSpace(30);
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "bold");
        doc.text("Desglose de Propinas", 14, currentY);

        const propinasRows = (fullData.propinasPorMozo || []).map(m => [
          m.nombre,
          `S/. ${(m.propinas || 0).toFixed(2)}`
        ]);
        if (propinasRows.length === 0) {
          propinasRows.push(["-", "No se registraron propinas en este turno."]);
        }

        autoTable(doc, {
          startY: currentY + 4,
          head: [['Mozo', 'Total Propinas']],
          body: propinasRows,
          theme: 'grid',
          headStyles: { halign: 'center', fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
          styles: { fontSize: 9 },
          columnStyles: { 1: { halign: 'right' } }
        });

        currentY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Total Propinas Recaudadas: S/. ${(fullData.totalPropinas || fullData.propinas || 0).toFixed(2)}`, 14, currentY);
        currentY += 10;

        doc.text(`Resumen Turno #${fullData.numeroSesion || fullData.id}: M. Inicial: S/. ${(fullData.montoInicial || fullData.inicio || 0).toFixed(2)} | Ventas: S/. ${fullData.totalBruto.toFixed(2)} | Saldo Final (Caja): S/. ${fullData.totalCaja.toFixed(2)}`, 14, currentY);
      }

      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(isRange ? `Reporte_Consolidado_Arqueo_${dateStr}.pdf` : `Arqueo_Caja_${arqArray[0].id}_${dateStr}.pdf`);
      showToast('Reporte PDF descargado con éxito.', 'success');
    } catch (e) {
      console.error(e);
      showToast("Error generando PDF: " + e.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Derive sums of open tables
  const totalSaloonPending = useMemo(() => {
    return openTables.reduce((acc, table) => {
      const comandaTotal = table.detalles?.reduce((sum, d) => sum + (d.cantidad * d.plato.precio), 0) || 0;
      return acc + comandaTotal;
    }, 0);
  }, [openTables]);

  const activeArqueoObjectForMovement = useMemo(() => {
    if (currentStatus) return currentStatus;
    // fallback default
    return {
      id: 1,
      totalCaja: 0,
      ingresos: { efectivo: 0, yape: 0, plin: 0, tarjeta: 0, izipay: 0, niubiz: 0, manual: 0 }
    };
  }, [currentStatus]);

  return (
    <div className="flex flex-col font-sans antialiased text-[var(--text-main)] w-full">
      {/* Banner de error de conexión en modo Online */}
      {connectionError && !networkStatus.isOffline() && (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2 animate-fade-in no-print shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-200"></span>
          </span>
          <span>Sin conexión con el servidor. Reintentando de forma automática... Se muestran los últimos datos válidos cargados.</span>
        </div>
      )}

      {/* Top Main Toolbar */}
      <div className="flex-1 flex flex-col xl:flex-row gap-5 items-start overflow-hidden w-full">

        {/* Core Workspace Panel */}
        <div className="flex-1 min-w-0 w-full overflow-y-auto px-1 py-1 md:px-3 space-y-4 bg-[var(--bg-primary)]">

          {/* Header toolbar */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[var(--glass-border)]">
            <div>
              <h1 className="text-[22px] sm:text-[24px] font-bold text-slate-900 dark:text-white tracking-tight">
                Arqueo de Caja
              </h1>
              {/* Sesión Activa */}
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-xs font-semibold text-[var(--text-muted)]">Sesión Activa:</span>
                {shiftStatus === 'abierto' ? (
                  <button
                    onClick={handleToggleShift}
                    title="Presione para cerrar caja"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ABIERTO
                  </button>
                ) : (
                  <button
                    onClick={handleToggleShift}
                    title="Presione para abrir caja"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    CERRADO
                  </button>
                )}

                {shiftStatus === 'abierto' && hasPricingError && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/30 font-bold animate-pulse">
                    <AlertCircle className="w-3 h-3" />
                    <span>Precios no disp.</span>
                  </span>
                )}

                {shiftStatus === 'abierto' && currentStatus && (
                  <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 ml-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Iniciado: {formatDate(currentStatus.fechaInicio)}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Botón compacto solo móvil/tablet (< xl) que abre Bottom Sheet */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="xl:hidden min-h-[42px] w-full sm:w-auto px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-sm active:scale-95 cursor-pointer transition-all"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>Cuentas Abiertas ({openTables.length})</span>
              </span>
              <span className="text-xs font-bold tabular-nums text-emerald-600">S/. {totalSaloonPending.toFixed(2)}</span>
            </button>
          </header>

          {/* Arqueos sessions table list */}
          <div className="glass-panel overflow-hidden" style={{ boxShadow: 'var(--panel-shadow, 0 8px 32px 0 rgba(0, 0, 0, 0.37)), -6px 0 25px -5px rgba(0, 0, 0, 0.3)' }}>
            <div className="px-4 py-3.5 bg-transparent flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <div>
                <h2 className="text-base font-bold text-[var(--text-main)] font-sans">Historial de Sesiones de Arqueo</h2>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5 font-sans">Auditoría completa de movimientos de caja registrados en el sistema.</p>
              </div>

              {/* Actions Ribbon */}
              <div className="flex flex-wrap items-center gap-2 relative z-10">
                <button
                  onClick={() => {
                    if (shiftStatus !== 'abierto') {
                      showToast("Debe abrir caja antes de registrar un movimiento.", "error");
                      return;
                    }
                    setIsMovModalOpen(true);
                  }}
                  disabled={shiftStatus !== 'abierto'}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#F26522] hover:bg-[#EA580C] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm active:scale-95 transition-all font-sans"
                >
                  <Plus className="w-3.5 h-3.5 text-white group-hover:rotate-90 transition-transform" />
                  <span>Movimiento</span>
                </button>

                <button
                  onClick={handleExportExcel}
                  title="Descargar historial de caja en formato Excel"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm active:scale-95 transition-all font-sans"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Exportar Excel</span>
                </button>

                <DropdownRangeDatePicker
                  mode="range"
                  value={filterDateRange}
                  onChange={(range) => {
                    setFilterDateRange(range);
                    setCurrentPage(1);
                  }}
                  placeholder="Filtrar por Fecha"
                  triggerClassName="!w-[170px] [&_button]:h-9 [&_button]:rounded-full [&_button]:text-xs [&_button]:px-3 [&_svg]:h-3.5 [&_svg]:w-3.5"
                />
              </div>
            </div>
            {/* Custom Responsive Table - Desktop (hidden lg:block) */}
            <div className="hidden lg:block -translate-y-10 overflow-x-auto relative z-10">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-widest" style={{ background: 'var(--primary)', color: '#ffffff', borderBottom: '1px solid var(--table-row-border)' }}>
                    <th className="py-2.5 px-4 !text-center w-12">N°</th>
                    <th className="py-2.5 px-4 !text-center w-48">Fechas Sesión</th>
                    <th className="py-2.5 px-4 !text-center">Inicio</th>
                    <th className="py-2.5 px-4 !text-center">Egresos</th>
                    <th className="py-2.5 px-4 !text-center w-60">Ingresos Desglosados</th>
                    <th className="py-2.5 px-4 !text-center">Propinas</th>
                    <th className="py-2.5 px-4 !text-center font-semibold">Total Caja</th>
                    <th className="py-2.5 px-4 !text-center">Total Bruto</th>
                    <th className="py-2.5 px-4 !text-center w-16">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {connectionError ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center font-medium">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="text-rose-500 font-semibold font-sans">Error al conectar con el servidor para la página {currentPage}.</span>
                          <button
                            onClick={() => { setConnectionError(false); fetchHistory(); }}
                            className="px-4 py-2 rounded-full bg-[var(--primary)] text-white text-xs font-bold cursor-pointer hover:opacity-90 transition-all font-sans shadow-sm active:scale-95"
                          >
                            Reintentar carga
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : historyLoading && (!history?.data || history.data.length === 0) && (!lastValidHistoryRef.current || lastValidHistoryRef.current.length === 0) ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-sm text-[var(--text-muted)] font-medium">
                        Cargando sesiones de caja... (Página {currentPage})
                      </td>
                    </tr>
                  ) : (!history?.data || history.data.length === 0) && (!lastValidHistoryRef.current || lastValidHistoryRef.current.length === 0) ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-sm text-[var(--text-muted)] font-medium">
                        No se encontraron registros de arqueo.
                      </td>
                    </tr>
                  ) : (
                    paginatedHistory.map((arq) => {
                      const isSelected = arq.id === selectedArqueoId;
                      const isActiveSession = arq.estado === 'abierto';

                      const digitalSum = (arq.ingresos?.yape || 0) + (arq.ingresos?.plin || 0);
                      const cardSum = (arq.ingresos?.tarjeta || 0) + (arq.ingresos?.izipay || 0) + (arq.ingresos?.niubiz || 0);

                      return (
                        <tr
                          key={arq.id}
                          onClick={() => setSelectedArqueoId(arq.id)}
                          className="transition-colors cursor-pointer group hover:bg-[var(--item-hover)]"
                          style={{
                            borderBottom: '1px solid var(--table-row-border)',
                            background: isSelected ? 'var(--item-hover)' : 'transparent',
                            boxShadow: isSelected ? 'inset 3px 0 0 var(--primary)' : 'none'
                          }}
                        >
                          {/* Number */}
                          <td className="py-3 px-4 text-center font-bold font-sans text-[var(--text-main)] text-[13.5px]">
                            {arq.numeroSesion || arq.id}
                          </td>

                          {/* Dates */}
                          <td className="py-3 px-4 space-y-1 text-[13px]">
                            <div className="flex items-center gap-1 text-[var(--text-muted)] font-sans ">
                              <span className="text-[13px] font-bold">Ini:</span>
                              <span>{formatDate(arq.fechaInicio)}</span>
                            </div>
                            {isActiveSession ? (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans">
                                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                                  EN CURSO
                                </span>
                                <span className="text-[11px] font-semibold text-emerald-600 font-sans ml-1">
                                  Resp: {arq.usuario?.nombre || 'Hector'}
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-[var(--text-muted)] font-sans text-[12px]">
                                  <span className="text-[10px] font-medium">Fin:</span>
                                  <span>{formatDate(arq.fechaFin)}</span>
                                </div>
                                <div className="text-[11px] font-medium text-[var(--text-muted)] font-sans ml-1">
                                  Resp: {arq.usuario?.nombre || 'Hector'}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Inicio */}
                          <td className="py-3 px-4 text-right font-sans text-[var(--text-main)] text-[13.5px] font-semibold !text-center">
                            S/. {(arq.montoInicial || arq.inicio || 0).toFixed(2)}
                          </td>

                          {/* Egreso */}
                          <td className="py-3 px-4 text-right font-sans text-rose-600 dark:text-rose-455 font-bold text-[13.5px] !text-center">
                            S/. {(arq.egresos || 0).toFixed(2)}
                          </td>

                          {/* Ingreso Detalle Breakdown */}
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="grid grid-cols-2 gap-1 max-w-[250px] mx-auto text-[11px] font-mono">
                              <div className="flex items-center justify-between px-1.5 py-0.5 rounded-sm bg-[var(--input-bg)] border border-[var(--glass-border)] font-sans">
                                <span className="text-[var(--text-muted)]">Efectivo:</span>
                                <span className="font-bold text-[var(--text-main)]">{(arq.ingresos?.efectivo || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between px-1.5 py-0.5 rounded-sm bg-blue-500/10 border border-blue-500/20 group/eye font-sans">
                                <span className="flex items-center gap-0.5 text-[var(--text-muted)]">
                                  Dig:
                                  <button
                                    onClick={() => setExpandedDig(prev => ({ ...prev, [arq.id]: !prev[arq.id] }))}
                                    className="text-blue-450 hover:text-blue-600 cursor-pointer animate-pulse"
                                  >
                                    <Eye className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                                <span className="font-bold text-blue-700 dark:text-blue-400">{digitalSum.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between px-1.5 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/20 font-sans">
                                <span className="flex items-center gap-0.5 text-[var(--text-muted)]">
                                  Tarj:
                                  <button
                                    onClick={() => setExpandedTarj(prev => ({ ...prev, [arq.id]: !prev[arq.id] }))}
                                    className="text-amber-455 hover:text-amber-600 cursor-pointer animate-pulse"
                                  >
                                    <Eye className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                                <span className="font-bold text-amber-700 dark:text-amber-400">{cardSum.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between px-1.5 py-0.5 rounded-sm bg-[var(--input-bg)] border border-[var(--glass-border)] font-sans">
                                <span className="text-[var(--text-muted)]">Manual:</span>
                                <span className="font-bold text-[var(--text-main)]">{(arq.ingresos?.manual || 0).toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Expanded wallets details overlay */}
                            {expandedDig[arq.id] && (
                              <div className="text-[12px] p-2 rounded mt-1 max-w-[250px] mx-auto space-y-0.5 font-sans animate-fade-in bg-[var(--bg-surface)] border border-[var(--glass-border)] text-[var(--text-main)] shadow-md">
                                <div className="flex justify-between"><span>Yape:</span><span>S/. {(arq.ingresos?.yape || 0).toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>Plin:</span><span>S/. {(arq.ingresos?.plin || 0).toFixed(2)}</span></div>
                              </div>
                            )}

                            {/* Expanded cards POS details overlay */}
                            {expandedTarj[arq.id] && (
                              <div className="text-[12px] p-2 rounded mt-1 max-w-[250px] mx-auto space-y-0.5 font-sans animate-fade-in bg-[var(--bg-surface)] border border-[var(--glass-border)] text-[var(--text-main)] shadow-md">
                                <div className="flex justify-between"><span>Izipay:</span><span>S/. {(arq.ingresos?.izipay || 0).toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>Niubiz:</span><span>S/. {(arq.ingresos?.niubiz || 0).toFixed(2)}</span></div>
                                {(arq.ingresos?.tarjeta || 0) > 0 && (
                                  <div className="flex justify-between"><span>Otros:</span><span>S/. {(arq.ingresos?.tarjeta || 0).toFixed(2)}</span></div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Propinas */}
                          <td className="py-3 px-4 text-right font-sans text-amber-600 dark:text-amber-450 font-semibold text-[14.5px] !text-center">
                            S/. {(arq.totalPropinas || arq.propinas || 0).toFixed(2)}
                          </td>

                          {/* Total Caja */}
                          <td className="py-4 px-4 text-[14.5px] font-bold font-sans text-[var(--text-main)] !text-center">
                            S/. {(arq.totalCaja || 0).toFixed(2)}
                          </td>

                          {/* Total Bruto */}
                          <td className="py-3 px-4 text-right font-sans font-bold text-[var(--text-main)] text-[14.5px] !text-center">
                            S/. {(arq.totalBruto || 0).toFixed(2)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center items-center h-10">
                              <SmoothDropdown
                                id={arq.id}
                                dropUp={paginatedHistory.indexOf(arq) >= paginatedHistory.length - 2}
                                items={cashierActions}
                                onAction={(actionId) => handleRowAction(actionId, arq.id)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Celular / Tablet Cards (lg:hidden) */}
            <div className="lg:hidden px-3 pb-4 space-y-3">
              {connectionError ? (
                <div className="py-8 text-center">
                  <span className="text-rose-500 font-semibold text-xs block mb-2 font-sans">Error al conectar con el servidor.</span>
                  <button
                    onClick={() => { setConnectionError(false); fetchHistory(); }}
                    className="px-4 py-2 rounded-full bg-[var(--primary)] text-white text-xs font-bold shadow-sm active:scale-95 transition-all font-sans cursor-pointer"
                  >
                    Reintentar carga
                  </button>
                </div>
              ) : historyLoading && (!history?.data || history.data.length === 0) && (!lastValidHistoryRef.current || lastValidHistoryRef.current.length === 0) ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)] font-medium font-sans">
                  Cargando sesiones de caja... (Página {currentPage})
                </div>
              ) : (!history?.data || history.data.length === 0) && (!lastValidHistoryRef.current || lastValidHistoryRef.current.length === 0) ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)] font-medium font-sans">
                  No se encontraron registros de arqueo.
                </div>
              ) : (
                paginatedHistory.map((s) => {
                  const digitalSum = (s.ingresos?.yape || 0) + (s.ingresos?.plin || 0);
                  const cardSum = (s.ingresos?.tarjeta || 0) + (s.ingresos?.izipay || 0) + (s.ingresos?.niubiz || 0);
                  const sNumero = s.numeroSesion || s.id;
                  const sResponsable = s.usuario?.nombre || 'Hector';
                  const sFechaInicio = formatDate(s.fechaInicio);
                  const sFechaFin = s.fechaFin ? formatDate(s.fechaFin) : null;
                  const sTotalBruto = s.totalBruto || 0;
                  const sInicio = s.montoInicial || s.inicio || 0;
                  const sEgresos = s.egresos || 0;
                  const sTotalCaja = s.totalCaja || 0;
                  const sEfectivo = s.ingresos?.efectivo || 0;
                  const sPropinas = s.totalPropinas || s.propinas || 0;
                  const isSelected = s.id === selectedArqueoId;

                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedArqueoId(s.id)}
                      className={`rounded-2xl border transition-all p-3.5 space-y-3 cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--item-hover)] border-[var(--primary)] shadow-md'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-xs font-bold tabular-nums">
                            Arqueo #{sNumero}
                          </span>
                          <span className="ml-2 text-xs font-semibold text-slate-800 dark:text-slate-200">{sResponsable}</span>
                          <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
                            {sFechaInicio} → {sFechaFin ?? 'En curso'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase text-slate-400">Bruto</p>
                            <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">S/. {sTotalBruto.toFixed(2)}</p>
                          </div>
                          {/* Botón de Acción (⋮) + Menú desplegable de 4 opciones */}
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuNumero((prev) => (prev === s.id ? null : s.id));
                              }}
                              aria-label={`Acciones de Arqueo ${sNumero}`}
                              className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer active:scale-95 transition-all shadow-xs"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuNumero === s.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-10 z-30 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-[0_12px_30px_-6px_rgba(15,23,42,0.18)] p-1.5 text-left animate-in fade-in zoom-in-95 duration-100"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuNumero(null);
                                    handleRowAction('detail', s.id);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Auditar Detalles</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuNumero(null);
                                    handleRowAction('resumen', s.id);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-[#F26522]" />
                                  <span>Ver Ticket Resumen</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuNumero(null);
                                    handleRowAction('paloteo', s.id);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <ListChecks className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Ver Paloteo</span>
                                </button>

                                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuNumero(null);
                                    handleRowAction('pdf', s.id);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Exportar PDF</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-[11px] tabular-nums">
                        <div><span className="text-slate-400 block">Inicio</span><strong className="text-slate-700 dark:text-slate-200">S/. {sInicio.toFixed(2)}</strong></div>
                        <div><span className="text-slate-400 block">Egresos</span><strong className="text-rose-600">S/. {sEgresos.toFixed(2)}</strong></div>
                        <div className="text-right"><span className="text-slate-400 block">Total Caja</span><strong className="text-slate-800 dark:text-slate-100">S/. {sTotalCaja.toFixed(2)}</strong></div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px] tabular-nums">
                        <div className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Efectivo:</span>
                          <strong className="text-slate-800 dark:text-slate-100">{sEfectivo.toFixed(2)}</strong>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/30 flex justify-between">
                          <span className="text-blue-600 dark:text-blue-400">Digital:</span>
                          <strong className="text-blue-700 dark:text-blue-300">{digitalSum.toFixed(2)}</strong>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/30 flex justify-between">
                          <span className="text-amber-600 dark:text-amber-400">Tarjeta:</span>
                          <strong className="text-amber-700 dark:text-amber-300">{cardSum.toFixed(2)}</strong>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Propinas:</span>
                          <strong className="text-amber-600 dark:text-amber-400">{sPropinas.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="p-3 bg-transparent relative flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)] font-sans animate-fade-in" style={{ borderTop: '1px solid var(--table-row-border)' }}>
                <span className="font-medium">Total de Arqueos: {filteredHistory.length}</span>
                <div className="sm:absolute sm:left-1/2 sm:-translate-x-1/2 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    title="Ir al inicio"
                    aria-label="Primera página"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-sm"
                  >
                    <ChevronFirst className="w-4 h-4 text-[var(--text-main)]" />
                  </button>
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    title="Página anterior"
                    aria-label="Página anterior"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4 text-[var(--text-main)]" />
                  </button>
                  <span className="font-semibold text-[var(--text-main)] px-2 select-none whitespace-nowrap text-xs">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    title="Página siguiente"
                    aria-label="Página siguiente"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-sm"
                  >
                    <ChevronRight className="w-4 h-4 text-[var(--text-main)]" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Ir al final"
                    aria-label="Última página"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-sm"
                  >
                    <ChevronLast className="w-4 h-4 text-[var(--text-main)]" />
                  </button>
                </div>
                <div className="hidden sm:block sm:w-28" />
              </div>
            )}
          </div>

          {/* KPI Analytics Cards */}
          {activeKpiData && (
            <div className="space-y-2 font-sans">
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Métricas de Arqueo N° {activeKpiData.numeroSesion != null ? activeKpiData.numeroSesion : activeKpiData.id} {activeKpiData.id === currentStatus?.id ? '(Turno Actual)' : '(Seleccionado)'}
                </span>
                {activeKpiData.id !== currentStatus?.id && currentStatus?.id && (
                  <button
                    onClick={() => setSelectedArqueoId(currentStatus.id)}
                    className="text-[11px] text-[var(--primary)] hover:underline cursor-pointer font-medium"
                  >
                    Ver Turno Actual (N° {currentStatus.numeroSesion != null ? currentStatus.numeroSesion : currentStatus.id})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 cashier-kpi-grid">
                <div className="glass-panel p-3.5 flex flex-col justify-between shadow-xs">
                  <div>
                    <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest font-sans">Total en Caja</p>
                    <h2 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-450 mt-1 font-sans">
                      S/. {(activeKpiData.totalCaja || 0).toFixed(2)}
                    </h2>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-2 font-sans">Saldo en efectivo disponible</p>
                </div>

                <div className="glass-panel p-3.5 flex flex-col justify-between shadow-xs">
                  <div>
                    <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest font-sans">Total Bruto</p>
                    <h2 className="text-2xl font-extrabold text-[var(--text-main)] mt-1 font-sans">
                      S/. {(activeKpiData.totalBruto || 0).toFixed(2)}
                    </h2>
                  </div>
                  <div className="flex gap-1 mt-2">
                    <div className="h-1 bg-emerald-400 rounded-full" style={{ width: `${Math.max(10, ((activeKpiData.ingresos?.efectivo || 0) / (activeKpiData.totalBruto || 1)) * 100)}%` }} title="Efectivo"></div>
                    <div className="h-1 bg-blue-400 rounded-full" style={{ width: `${Math.max(10, (((activeKpiData.ingresos?.yape || 0) + (activeKpiData.ingresos?.plin || 0)) / (activeKpiData.totalBruto || 1)) * 100)}%` }} title="Digital"></div>
                    <div className="h-1 bg-amber-400 rounded-full" style={{ width: `${Math.max(10, (((activeKpiData.ingresos?.tarjeta || 0) + (activeKpiData.ingresos?.izipay || 0) + (activeKpiData.ingresos?.niubiz || 0)) / (activeKpiData.totalBruto || 1)) * 100)}%` }} title="Tarjeta"></div>
                  </div>
                </div>

                <div className="glass-panel p-3.5 flex flex-col justify-between shadow-xs">
                  <div>
                    <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest font-sans">Flujo Digital</p>
                    <h2 className="text-2xl font-extrabold text-blue-500 dark:text-blue-405 mt-1 font-sans">
                      S/. {((activeKpiData.ingresos?.yape || 0) + (activeKpiData.ingresos?.plin || 0)).toFixed(2)}
                    </h2>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-2 font-sans">Yape + Plin acumulado</p>
                </div>

                <div className="glass-panel p-3.5 flex flex-col justify-between shadow-xs">
                  <div>
                    <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest font-sans">Flujo Tarjeta</p>
                    <h2 className="text-2xl font-extrabold text-amber-500 dark:text-amber-450 mt-1 font-sans">
                      S/. {((activeKpiData.ingresos?.tarjeta || 0) + (activeKpiData.ingresos?.izipay || 0) + (activeKpiData.ingresos?.niubiz || 0)).toFixed(2)}
                    </h2>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-2 font-sans">Tarjetas POS registradas</p>
                </div>
              </div>
            </div>
          )}
          {/* Interactive Trend & Payment Distribution Charts */}
          {history?.data?.length > 0 && (
            <CustomCharts
              arqueos={history.data}
              selectedArqueoId={selectedArqueoId || (currentStatus?.id || history.data[0].id)}
              onSelectArqueo={(id) => setSelectedArqueoId(id)}
            />
          )}
        </div>

        {/* --- DOCKED SIDEBAR DRAWERS (Cuentas Abiertas - Desktop xl+) --- */}
        {isSidebarDocked && (
          <aside className="hidden xl:flex flex-col w-[290px] shrink-0 select-none font-sans sticky top-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
            <div className="space-y-3 flex-1 flex flex-col min-h-0">

              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <Receipt className="w-4 h-4 text-emerald-500 animate-bounce" />
                    Cuentas Abiertas
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-sans">Control de mesas en salón activo</p>
                </div>
                <span className="font-sans text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  {openTables.length} activa(s)
                </span>
              </div>

              {/* Total floating pending */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span className="font-semibold">Por cobrar en salón:</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                    S/. {totalSaloonPending.toFixed(2)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-sans">
                  Capital flotante pendiente de facturar en salón.
                </div>
              </div>

              {/* Table list container (scrollable) */}
              {openTables.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 space-y-2 font-sans">
                  <CheckCircle className="w-8 h-8 text-slate-400 opacity-60 mx-auto" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">¡Todo facturado!</p>
                  <p className="text-[10px] px-4 font-sans">No hay cuentas pendientes en salón en este momento.</p>
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {openTables.map((cuenta) => {
                    let comandaHasError = false;
                    const comandaTotal = cuenta.detalles?.reduce((sum, d) => {
                      const price = resolveItemPrice(d);
                      if (price === null) {
                        comandaHasError = true;
                        console.error(`[INTEGRITY ERROR] Precio no disponible para el detalle id ${d.id}`);
                        return sum;
                      }
                      return sum + (d.cantidad * price);
                    }, 0) || 0;

                    return (
                      <div
                        key={cuenta.id}
                        className="p-3.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between group hover:border-[var(--primary)] transition-all duration-300 shadow-xs"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                            Mesa {cuenta.mesa?.numero || ''}
                          </span>
                          <span className="font-sans text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30 tabular-nums">
                            {comandaHasError ? 'Precio no disponible' : `S/. ${comandaTotal.toFixed(2)}`}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 font-sans">
                          {cuenta.detalles?.map((prod, pIdx) => {
                            const price = resolveItemPrice(prod);
                            return (
                              <div key={pIdx} className="flex justify-between text-[12px] font-medium text-slate-600 dark:text-slate-400">
                                <span className="truncate max-w-[150px]">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 mr-1">{prod.cantidad}x</span>
                                  {prod.plato?.nombre || 'Plato sin datos'}
                                </span>
                                <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                                  {price !== null ? `S/. ${(prod.cantidad * price).toFixed(2)}` : 'N/D'}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-2 mt-4 font-sans">
                          <DeleteButton
                            onClick={async () => {
                              const motivo = await showConfirmation("Motivo de Anulación", {
                                message: "Por favor, detalle la razón por la cual se está cancelando la comanda total:",
                                inputType: "text",
                                type: "danger"
                              });
                              if (motivo === null || motivo.trim() === '') return;

                              try {
                                const res = await fetch(`/api/orders/${cuenta.id}/cancel`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ motivo, usuarioResponsable: "Caja/Admin", usuarioId: user.id })
                                });
                                if (res.ok) {
                                  showToast("Pedido anulado y mesa liberada.", 'success');
                                  fetchTables();
                                } else {
                                  const err = await res.json();
                                  showToast("Error: " + err.error, 'error');
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            title="Anular Pedido Total"
                            className="scale-75 -my-2 -mx-1"
                          />
                          <button
                            onClick={() => handleOpenCheckout(cuenta)}
                            className="flex-1 min-h-[38px] py-2 px-3 text-xs font-bold rounded-full bg-[#F26522] hover:bg-[#EA580C] text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Cerrar e Imprimir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* --- Mobile Bottom Sheet for Cuentas Abiertas (< xl) --- */}
      {
        isSidebarOpen && (
          <div className="fixed inset-0 z-50 xl:hidden flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-[2px] no-print" onClick={() => setIsSidebarOpen(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans animate-in slide-in-from-bottom duration-200"
            >
              {/* Barra de arrastre solo móvil */}
              <div className="sm:hidden -mt-1 pb-2 flex justify-center">
                <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
              </div>

              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    Cuentas Abiertas
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Control de mesas activas en salón</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                    {openTables.length} activas
                  </span>
                  <CloseButton onClick={() => setIsSidebarOpen(false)} className="scale-90" />
                </div>
              </div>

              {/* Total floating pending */}
              <div className="p-3 my-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span className="font-semibold">Por cobrar en salón:</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                    S/. {totalSaloonPending.toFixed(2)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Mesas activas pendientes de facturación.
                </div>
              </div>

              {/* Table List container */}
              {openTables.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 space-y-2">
                  <CheckCircle className="w-8 h-8 text-slate-400 opacity-60 mx-auto" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">¡Todo facturado!</p>
                  <p className="text-[10px] px-4">No hay cuentas pendientes en salón.</p>
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {openTables.map((cuenta) => {
                    let comandaHasError = false;
                    const comandaTotal = cuenta.detalles?.reduce((sum, d) => {
                      const price = resolveItemPrice(d);
                      if (price === null) {
                        comandaHasError = true;
                        console.error(`[INTEGRITY ERROR] Precio no disponible para el detalle id ${d.id}`);
                        return sum;
                      }
                      return sum + (d.cantidad * price);
                    }, 0) || 0;

                    return (
                      <div
                        key={cuenta.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shadow-xs hover:border-[var(--primary)] transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            Mesa {cuenta.mesa?.numero || ''}
                          </span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/20 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30 tabular-nums">
                            {comandaHasError ? 'Precio no disponible' : `S/. ${comandaTotal.toFixed(2)}`}
                          </span>
                        </div>

                        <div className="mt-2.5 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[12px]">
                          {cuenta.detalles?.map((prod, pIdx) => {
                            const price = resolveItemPrice(prod);
                            return (
                              <div key={pIdx} className="flex justify-between text-slate-600 dark:text-slate-400">
                                <span className="truncate max-w-[200px]">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 mr-1.5">{prod.cantidad}x</span>
                                  {prod.plato?.nombre || 'Plato sin datos'}
                                </span>
                                <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
                                  {price !== null ? `S/. ${(prod.cantidad * price).toFixed(2)}` : 'N/D'}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-2 mt-3 pt-2">
                          <DeleteButton
                            onClick={async () => {
                              const motivo = await showConfirmation("Motivo de Anulación", {
                                message: "Por favor, detalle la razón por la cual se está cancelando la comanda total:",
                                inputType: "text",
                                type: "danger"
                              });
                              if (motivo === null || motivo.trim() === '') return;

                              try {
                                const res = await fetch(`/api/orders/${cuenta.id}/cancel`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ motivo, usuarioResponsable: "Caja/Admin", usuarioId: user.id })
                                });
                                if (res.ok) {
                                  showToast("Pedido anulado y mesa liberada.", 'success');
                                  fetchTables();
                                  setIsSidebarOpen(false);
                                } else {
                                  const err = await res.json();
                                  showToast("Error: " + err.error, 'error');
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            title="Anular Pedido Total"
                            className="scale-75 -my-2 -mx-1"
                          />
                          <button
                            onClick={() => {
                              handleOpenCheckout(cuenta);
                              setIsSidebarOpen(false);
                            }}
                            className="flex-1 min-h-[40px] py-2 px-4 text-xs font-bold rounded-full bg-[#F26522] hover:bg-[#EA580C] text-white flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Cerrar e Imprimir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* Botón Flotante Cuentas Abiertas (< xl) */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Abrir Cuentas Abiertas para cobrar mesas"
        className="xl:hidden fixed bottom-5 right-5 z-40 min-h-[48px] px-4 py-2.5 rounded-full bg-[#F26522] hover:bg-[#DC5616] active:scale-[0.97] text-white shadow-[0_12px_28px_-4px_rgba(242,101,34,0.55)] flex items-center gap-2 transition-all cursor-pointer no-print"
      >
        <Wallet className="w-4 h-4 shrink-0" />
        <span className="text-xs font-bold tracking-wide whitespace-nowrap">
          Cuentas Abiertas
        </span>
        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-white/20 text-white text-[11px] font-bold inline-flex items-center justify-center tabular-nums">
          {openTables.length}
        </span>
      </button>
      {/* --- INLINE MODALS --- */}

      {/* Modal de Apertura de Caja */}
      {
        showInitialAmountModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto no-print">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowInitialAmountModal(false)} />
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <div className="glass-panel relative transform overflow-hidden text-left shadow-xl transition-all w-full max-w-sm font-sans" style={{ background: 'var(--bg-surface)' }}>
                <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <h3 className="text-base font-bold text-[var(--text-main)] font-sans">Apertura de Caja</h3>
                  <CloseButton onClick={() => setShowInitialAmountModal(false)} className="scale-90" />
                </div>
                <form onSubmit={confirmOpenShift} className="p-6 space-y-4">
                  {formError && (
                    <div className="bg-rose-500 text-white p-3 rounded-lg text-xs font-semibold font-sans">
                      {formError}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 font-sans">
                      Ingrese monto inicial en Caja (S/.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={initialAmount}
                      onChange={e => {
                        setInitialAmount(e.target.value);
                        setFormError(null);
                      }}
                      required
                      autoFocus
                      className="glass-input block w-full py-3 text-center text-xl font-bold font-sans text-[var(--text-main)] bg-[var(--input-bg)]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="glass-button primary w-full py-3 px-4 text-sm font-semibold transition-colors shadow-xs cursor-pointer font-sans"
                  >
                    Abrir Caja Registradora
                  </button>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {/* Register Manual Movement Modal */}
      <MovimientoModal
        isOpen={isMovModalOpen}
        onClose={() => setIsMovModalOpen(false)}
        onAddMovimiento={handleAddMovimiento}
        activeArqueo={activeArqueoObjectForMovement}
      />

      {/* Table Checkout Payment Modal */}
      {
        selectedCheckoutOrder && (
          <CheckoutModal
            isOpen={isCheckoutModalOpen}
            onClose={handleCloseCheckoutModal}
            order={selectedCheckoutOrder}
            onSuccess={handlePaymentSuccess}
          />
        )
      }

      {/* Paloteo aggregations modal */}
      <PaloteoModal
        isOpen={isPaloteoModalOpen}
        onClose={handleClosePaloteoModal}
        arqueoId={selectedPaloteoArqueoId}
      />

      {/* Summary ticket monospace receipt modal */}
      <SummaryTicketModal
        isOpen={isSummaryModalOpen}
        onClose={handleCloseSummaryModal}
        arqueoId={selectedSummaryArqueoId}
      />

      {/* Detailed session auditor modal */}
      <DetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        arqueoId={selectedDetailArqueoId}
      />
    </div >
  );
};

export default CashierView;
