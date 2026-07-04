import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  ArrowLeft, Plus, FileSpreadsheet, Eye, Printer, MoreVertical,
  Trash, Search, X, Receipt, CheckCircle, ChevronLeft, ChevronRight,
  TrendingUp, BarChart3, HelpCircle, FileText, Smartphone, CreditCard,
  SlidersHorizontal, Menu, CalendarDays, Download
} from 'lucide-react';

import { useNotification } from '../context/NotificationContext';
import { useConfirmation } from '../context/ConfirmationContext';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../hooks/useCache';
import { useCaja } from '../context/CajaContext';

import { DropdownRangeDatePicker } from '../components/DropdownRangeDatePicker';
import { CustomCharts } from '../components/CustomCharts';
import { CheckoutModal } from '../components/CheckoutModal';
import { MovimientoModal } from '../components/MovimientoModal';
import { PaloteoModal } from '../components/PaloteoModal';
import { SummaryTicketModal } from '../components/SummaryTicketModal';
import { DetailModal } from '../components/DetailModal';
import SmoothDropdown from '../components/ui/SmoothDropdown';

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

  // Selected row for charts (fallback to active or first arqueo)
  const [selectedArqueoId, setSelectedArqueoId] = useState(null);

  // PDF Generation loading
  const [isGenerating, setIsGenerating] = useState(false);

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

  // API Call: Fetch open accounts
  const openAccountsFetcher = useCallback(() => fetch('/api/cashier/open-accounts').then(res => res.json()), []);
  const { data: openTables, mutate: fetchTables } = useCache('openTables', openAccountsFetcher, []);

  // API Call: Fetch current cashier status balance
  const statusFetcher = useCallback(() => fetch('/api/cashier/balance').then(res => res.json()), []);
  const { data: currentStatus, mutate: fetchStatus } = useCache('cashier_balance', statusFetcher, null);

  const shiftStatus = currentStatus?.estado || 'cerrado';

  // API Call: Fetch historical sessions list
  const historyFetcher = useCallback(() => {
    let url = `/api/cashier/history?page=${currentPage}&limit=5`;
    if (filterDateRange?.from) {
      const startStr = format(filterDateRange.from, 'yyyy-MM-dd');
      if (filterDateRange.to) {
        const endStr = format(filterDateRange.to, 'yyyy-MM-dd');
        url += `&startDate=${startStr}&endDate=${endStr}`;
      } else {
        url += `&startDate=${startStr}&endDate=${startStr}`;
      }
    }
    return fetch(url).then(res => res.json());
  }, [currentPage, filterDateRange]);

  const historyKey = useMemo(() => {
    if (!filterDateRange?.from) return `cashier_history_${currentPage}_none`;
    const startStr = format(filterDateRange.from, 'yyyy-MM-dd');
    const endStr = filterDateRange.to ? format(filterDateRange.to, 'yyyy-MM-dd') : '';
    return `cashier_history_${currentPage}_${startStr}_${endStr}`;
  }, [currentPage, filterDateRange]);

  const { data: history, loading: historyLoading, mutate: fetchHistory } = useCache(
    historyKey,
    historyFetcher,
    { data: [], meta: { page: 1, totalPages: 1 } }
  );

  // Sync default selected arqueo for charts
  useEffect(() => {
    if (currentStatus?.id && !selectedArqueoId) {
      setSelectedArqueoId(currentStatus.id);
    } else if (history?.data?.length > 0 && !selectedArqueoId) {
      setSelectedArqueoId(history.data[0].id);
    }
  }, [currentStatus, history, selectedArqueoId]);

  // Synchronizers and Polling
  const statusRef = useRef(fetchStatus);
  const tablesRef = useRef(fetchTables);
  useEffect(() => {
    statusRef.current = fetchStatus;
    tablesRef.current = fetchTables;
  });

  useEffect(() => {
    const handleRefresh = () => {
      statusRef.current?.();
      tablesRef.current?.();
      fetchHistory();
    };

    fetchTables(); // immediate query
    fetchStatus();

    const interval = setInterval(() => {
      statusRef.current?.();
      tablesRef.current?.();
    }, 2000);

    window.addEventListener('refreshCashCount', handleRefresh);
    window.addEventListener('refreshTables', handleRefresh);

    let channel = null;
    try {
      channel = new BroadcastChannel('bunker');
      channel.onmessage = (event) => {
        if (event.data === 'refreshCashCount' || event.data === 'refreshTables') {
          handleRefresh();
        }
      };
    } catch (e) {
      console.error(e);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshCashCount', handleRefresh);
      window.removeEventListener('refreshTables', handleRefresh);
      if (channel) {
        channel.close();
      }
    };
  }, [fetchHistory]);

  // Active shift toggle logic
  const handleToggleShift = async () => {
    if (!currentStatus) return;

    if (currentStatus.estado === 'abierto') {
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
    fetch('/api/cashier/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ montoInicial })
    })
      .then(async res => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Error al cambiar estado");
        return body;
      })
      .then(async () => {
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
    fetch('/api/cashier/movimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        if (res.ok) {
          showToast('Movimiento registrado con éxito.', 'success');
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
  const handleRowAction = (actionId, targetId) => {
    setActiveDropdownId(null);
    if (actionId === 'paloteo') {
      setSelectedPaloteoArqueoId(targetId);
      setIsPaloteoModalOpen(true);
    } else if (actionId === 'resumen') {
      setSelectedSummaryArqueoId(targetId);
      setIsSummaryModalOpen(true);
    } else if (actionId === 'pdf') {
      generatePDF(targetId);
    } else if (actionId === 'detail') {
      setSelectedDetailArqueoId(targetId);
      setIsDetailModalOpen(true);
    }
  };

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

  // SEARCH AND FILTER HISTORY
  const filteredHistory = useMemo(() => {
    const data = history?.data || [];
    if (!searchQuery) return data;
    return data.filter(arq =>
      arq.id.toString().includes(searchQuery) ||
      (arq.usuario?.nombre || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatDate(arq.fechaInicio).toLowerCase().includes(searchQuery.toLowerCase()) ||
      arq.estado.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [history, searchQuery]);

  const totalPages = history?.meta?.totalPages || 1;

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
        a.id,
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
        doc.text("Bunker", 14, 20);

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
            `#${arq.id}`,
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
        doc.text("Bunker", 14, 20);
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
        doc.text("Bunker", 14, 20);

        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text(`Monto Inicial: S/. ${(fullData.montoInicial || fullData.inicio || 0).toFixed(2)}`, 145, 20);

        doc.setFontSize(14);
        doc.text("Reporte: Arqueo de Caja", 14, 28);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        doc.text(`Fecha del Turno: ${reportDate}`, 14, 35);
        doc.text(`Turno ID: #${fullData.id} - Estado: ${fullData.estado.toUpperCase()}`, 14, 40);
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

        doc.text(`Resumen Turno #${fullData.id}: M. Inicial: S/. ${(fullData.montoInicial || fullData.inicio || 0).toFixed(2)} | Ventas: S/. ${fullData.totalBruto.toFixed(2)} | Saldo Final (Caja): S/. {fullData.totalCaja.toFixed(2)}`, 14, currentY);
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

      {/* Top Main Toolbar */}
      <div className="flex-1 flex overflow-hidden">

        {/* Core Workspace Panel */}
        <div className="flex-grow overflow-y-auto px-1 py-3 md:px-3 w-full space-y-3 bg-[#f8fafc]">

          {/* Header toolbar */}
          <div className="flex flex-col md:flex-row mr-10 md:items-center justify-between gap-3 pb-.5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <div className="flex items-center gap-3">

              <div>
                <h1 className="text-xl font-black tracking-tight text-[var(--text-main)] font-sans">Arqueo de Caja</h1>
              </div>
            </div>

            {/* Actions Ribbon */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  if (shiftStatus !== 'abierto') {
                    showToast("Debe abrir caja antes de registrar un movimiento.", "error");
                    return;
                  }
                  setIsMovModalOpen(true);
                }}
                disabled={shiftStatus !== 'abierto'}
                className="glass-button primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group font-sans h-8"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-450 group-hover:rotate-90 transition-transform" />
                <span>Movimiento</span>
              </button>

              <button
                onClick={handleExportExcel}
                title="Descargar historial de caja en formato Excel"
                className="glass-button flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer font-sans h-8"
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
                triggerClassName="!w-[170px] [&_button]:h-8 [&_button]:text-xs [&_button]:px-2.5 [&_svg]:h-3.5 [&_svg]:w-3.5"
              />

              {/* Sidebar toggle button (Mobile) */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden relative inline-flex items-center justify-center p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-main)] shadow-xs cursor-pointer h-8 w-8"
              >
                <Menu className="w-4 h-4" />
                {openTables.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-black">
                    {openTables.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active Shift Banner Button */}
          <div className="glass-panel py-2 px-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-muted)]">Sesión Activa:</span>


              {shiftStatus === 'abierto' ? (
                <button
                  onClick={handleToggleShift}
                  title="Presione para cerrar caja"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[14px] font-bold font-sans text-xl bg-emerald-50 text-emerald-700 border border-emerald-200 transition-all cursor-pointer shadow-xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  ABIERTO
                </button>
              ) : (
                <button
                  onClick={handleToggleShift}
                  title="Presione para abrir caja"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[14px] font-bold font-sans text-xl bg-rose-50 text-rose-700 border border-rose-200 transition-all cursor-pointer shadow-xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  CERRADO
                </button>
              )}
            </div>

            {shiftStatus === 'abierto' && currentStatus && (
              <div className="flex items-center gap-1 text-[13px] text-[var(--text-muted)] font-sans">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Iniciado: {formatDate(currentStatus.fechaInicio)}</span>
              </div>
            )}
          </div>

          {/* Arqueos sessions table list */}
          <div className="glass-panel overflow-hidden">
            <div className="p-3 bg-transparent flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ borderBottom: '1px solid var(--glass-border)', height: '57px', transition: 'none' }} data-selected="true" data-label-id="0">
              <div>
                <h2 className="text-base font-bold text-[var(--text-main)] font-sans">Historial de Sesiones de Arqueo</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 font-sans">Auditoría completa de movimientos de caja registrados en el sistema.</p>
              </div>

              {/* Search bar */}
              <div className="relative w-full sm:w-64 font-sans" >
                <Search className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Buscar arqueo por N°, fecha, estado..."

                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-52 font-sans bg-white text-slate-700 border border-slate-200 pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-hidden focus:border-slate-800 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 my-auto text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer bg-transparent border-none"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            {/* Custom Responsive Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-widest" style={{ background: 'var(--table-header-bg)', color: 'var(--text-muted)', borderBottom: '1px solid var(--table-row-border)' }}>
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
                  {historyLoading && (!history?.data || history.data.length === 0) ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-sm text-[var(--text-muted)] font-medium">
                        Cargando sesiones de caja...
                      </td>
                    </tr>
                  ) : !history?.data || history.data.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-sm text-[var(--text-muted)] font-medium">
                        No se encontraron registros de arqueo.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((arq) => {
                      const isSelected = arq.id === selectedArqueoId;
                      const isActiveSession = arq.estado === 'abierto';

                      const digitalSum = (arq.ingresos?.yape || 0) + (arq.ingresos?.plin || 0);
                      const cardSum = (arq.ingresos?.tarjeta || 0) + (arq.ingresos?.izipay || 0) + (arq.ingresos?.niubiz || 0);

                      return (
                        <tr
                          key={arq.id}
                          onClick={() => setSelectedArqueoId(arq.id)}
                          className="transition-colors cursor-pointer group hover:bg-slate-50/60 "
                          style={{
                            borderBottom: '1px solid var(--table-row-border)',
                            background: isSelected ? 'var(--item-hover)' : 'transparent'
                          }}
                        >
                          {/* Number */}
                          <td className="py-3 px-4 text-center font-bold font-sans text-[var(--text-main)] text-[13.5px]">
                            {arq.id}
                          </td>

                          {/* Dates */}
                          <td className="py-3 px-4 space-y-1 text-[13px]">
                            <div className="flex items-center gap-1 text-[var(--text-muted)] font-sans ">
                              <span className="text-[13px] font-bold">Ini:</span>
                              <span>{formatDate(arq.fechaInicio)}</span>
                            </div>
                            {isActiveSession ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans">
                                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                                EN CURSO
                              </span>
                            ) : (
                              <div className="flex items-center gap-1 text-[var(--text-muted)] font-sans text-[12px]">
                                <span className="text-[10px] font-medium">Fin:</span>
                                <span>{formatDate(arq.fechaFin)}</span>
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
                          <td className="py-4 px-4 text-[14.5px] font-bold font-sans text-slate-700 !text-center">
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
                                dropUp={filteredHistory.indexOf(arq) >= filteredHistory.length - 2}
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

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="p-3 bg-transparent flex items-center justify-between text-xs text-[var(--text-muted)] font-sans animate-fade-in" style={{ borderTop: '1px solid var(--table-row-border)' }}>
                <span className="font-medium">Total de Arqueos: {history?.meta?.totalItems || filteredHistory.length}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="glass-button flex items-center gap-1 py-1.5 px-3 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Anterior</span>
                  </button>
                  <span className="font-semibold text-[var(--text-main)]">Página {currentPage} de {totalPages}</span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="glass-button flex items-center gap-1 py-1.5 px-3 disabled:opacity-40 cursor-pointer"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* KPI Analytics Cards */}
          {currentStatus && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-sans">
              <div className="glass-panel p-3.5 flex flex-col justify-between shadow-xs">
                <div>
                  <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest font-sans">Total en Caja</p>
                  <h2 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-450 mt-1 font-sans">
                    S/. {(currentStatus.totalCaja || 0).toFixed(2)}
                  </h2>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-2 font-sans">Saldo en efectivo disponible</p>
              </div>

              <div className="glass-panel p-3.5 flex flex-col justify-between shadow-xs">
                <div>
                  <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest font-sans">Total Bruto</p>
                  <h2 className="text-2xl font-extrabold text-[var(--text-main)] mt-1 font-sans">
                    S/. {(currentStatus.totalBruto || 0).toFixed(2)}
                  </h2>
                </div>
                <div className="flex gap-1 mt-2">
                  <div className="h-1 bg-emerald-400 rounded-full" style={{ width: `${Math.max(10, ((currentStatus.ingresos?.efectivo || 0) / (currentStatus.totalBruto || 1)) * 100)}%` }} title="Efectivo"></div>
                  <div className="h-1 bg-blue-400 rounded-full" style={{ width: `${Math.max(10, (((currentStatus.ingresos?.yape || 0) + (currentStatus.ingresos?.plin || 0)) / (currentStatus.totalBruto || 1)) * 100)}%` }} title="Digital"></div>
                  <div className="h-1 bg-amber-400 rounded-full" style={{ width: `${Math.max(10, (((currentStatus.ingresos?.tarjeta || 0) + (currentStatus.ingresos?.izipay || 0) + (currentStatus.ingresos?.niubiz || 0)) / (currentStatus.totalBruto || 1)) * 100)}%` }} title="Tarjeta"></div>
                </div>
              </div>

              <div className="glass-panel p-3.5 flex flex-col justify-between shadow-xs">
                <div>
                  <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest font-sans">Flujo Digital</p>
                  <h2 className="text-2xl font-extrabold text-blue-500 dark:text-blue-405 mt-1 font-sans">
                    S/. {((currentStatus.ingresos?.yape || 0) + (currentStatus.ingresos?.plin || 0)).toFixed(2)}
                  </h2>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-2 font-sans">Yape + Plin acumulado</p>
              </div>

              <div className="glass-panel p-3.5 flex flex-col justify-between shadow-xs">
                <div>
                  <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest font-sans">Flujo Tarjeta</p>
                  <h2 className="text-2xl font-extrabold text-amber-500 dark:text-amber-450 mt-1 font-sans">
                    S/. {((currentStatus.ingresos?.tarjeta || 0) + (currentStatus.ingresos?.izipay || 0) + (currentStatus.ingresos?.niubiz || 0)).toFixed(2)}
                  </h2>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-2 font-sans">Tarjetas POS registradas</p>
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

        {/* --- DOCKED SIDEBAR DRAWERS (Cuentas Abiertas) --- */}
        {isSidebarDocked && (
          <aside className="hidden lg:flex flex-col w-80 p-3 shrink-0 select-none font-sans" style={{ borderLeft: '1px solid var(--glass-border)', background: 'var(--bg-secondary)' }}>
            <div className="space-y-3 flex-1 flex flex-col min-h-0">

              {/* Header */}
              <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest flex items-center gap-1.5 font-sans">
                    <Receipt className="w-4 h-4 text-emerald-500 animate-bounce" />
                    Cuentas Abiertas
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-sans">Control de mesas en salón activo</p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 font-sans text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                  {openTables.length} activa(s)
                </span>
              </div>

              {/* Total floating pending (MOVED TO TOP) */}
              {/* Total floating pending (MOVED TO TOP) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-0">
                <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                  <span className="font-semibold">Por cobrar en salón:</span>
                  <span className="font-sans font-bold text-sm text-[var(--text-main)]">
                    S/. {totalSaloonPending.toFixed(2)}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] leading-normal font-sans">
                  Capital flotante pendiente de facturar en salón.
                </div>
              </div>

              {/* Table list container (scrollable) */}
              {openTables.length === 0 ? (
                <div className="text-center py-12 text-xs text-[var(--text-muted)] border border-dashed border-[var(--glass-border)] rounded-xl bg-[var(--bg-secondary)]/50 space-y-2 font-sans">
                  <CheckCircle className="w-8 h-8 text-[var(--text-muted)] opacity-60 mx-auto" />
                  <p className="font-semibold text-[var(--text-main)]">¡Todo facturado!</p>
                  <p className="text-[10px] px-4 font-sans">No hay cuentas pendientes en salón en este momento.</p>
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {openTables.map((cuenta) => {
                    const comandaTotal = cuenta.detalles?.reduce((sum, d) => sum + (d.cantidad * d.plato.precio), 0) || 0;

                    return (
                      <div
                        key={cuenta.id}
                        className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between group"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-bold text-[var(--text-main)] font-sans">
                            Mesa {cuenta.mesa?.numero || ''}
                          </span>
                          <span className="font-sans text-sm font-bold text-emerald-600 bg-emerald-50/50 px-2 py-0.5 rounded border border-emerald-100">
                            S/. {comandaTotal.toFixed(2)}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1.5 pt-2.5 font-sans" style={{ borderTop: '1px solid var(--table-row-border)' }}>
                          {cuenta.detalles?.map((prod, pIdx) => (
                            <div key={pIdx} className="flex justify-between text-[12.5px] font-medium text-[var(--text-muted)]">
                              <span className="truncate max-w-[170px]">
                                <span className="font-mono font-semibold text-[var(--text-muted)] mr-1">{prod.cantidad}x</span>
                                {prod.plato?.nombre}
                              </span>
                              <span className="font-sans">S/. {(prod.cantidad * prod.plato?.precio).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 mt-4 font-sans">
                          <button
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
                            className="glass-button p-2 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenCheckout(cuenta)}
                            className="glass-button primary flex-1 py-2 px-3 text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Receipt className="w-3.5 h-3.5 text-emerald-450" />
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

      {/* --- Mobile floating toggle-overlay Sidebar --- */}
      {
        isSidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden no-print">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsSidebarOpen(false)} />
            <aside className="fixed right-0 top-0 bottom-0 w-80 p-6 flex flex-col justify-between shadow-2xl z-50" style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--glass-border)' }}>
              <div className="space-y-4 flex-1 flex flex-col min-h-0">

                {/* Header */}
                <div className="flex justify-between items-center pb-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest flex items-center gap-1.5 font-sans">
                      <Receipt className="w-4 h-4 text-emerald-500 animate-bounce" />
                      Cuentas Abiertas
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)] font-sans">Control de mesas en salón activo</p>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Total floating pending (MOVED TO TOP) */}
                <div className="glass-panel p-3">
                  <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                    <span className="font-semibold">Por cobrar en salón:</span>
                    <span className="font-mono font-bold text-sm text-[var(--text-main)]">
                      S/. {totalSaloonPending.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] leading-normal font-sans">
                    Mesas activas pendientes de facturación.
                  </div>
                </div>

                {/* Table List container */}
                {openTables.length === 0 ? (
                  <div className="text-center py-12 text-xs text-[var(--text-muted)] border border-dashed border-[var(--glass-border)] rounded-xl bg-[var(--bg-secondary)]/50 space-y-2 font-sans">
                    <CheckCircle className="w-8 h-8 text-[var(--text-muted)] opacity-60 mx-auto" />
                    <p className="font-semibold text-[var(--text-main)]">¡Todo facturado!</p>
                    <p className="text-[10px] px-4 font-sans">No hay cuentas pendientes en salón.</p>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto pr-1 font-sans">
                    {openTables.map((cuenta) => {
                      const comandaTotal = cuenta.detalles?.reduce((sum, d) => sum + (d.cantidad * d.plato.precio), 0) || 0;

                      return (
                        <div
                          key={cuenta.id}
                          className="glass-panel p-4 flex flex-col justify-between group hover:border-[var(--primary)] transition-all duration-300 shadow-xs"
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-bold text-[var(--text-main)] font-sans">
                              Mesa {cuenta.mesa?.numero || ''}
                            </span>
                            <span className="font-mono text-sm font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/10 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/20">
                              S/. {comandaTotal.toFixed(2)}
                            </span>
                          </div>

                          <div className="mt-3 space-y-1.5 pt-2.5 font-sans" style={{ borderTop: '1px solid var(--table-row-border)' }}>
                            {cuenta.detalles?.map((prod, pIdx) => (
                              <div key={pIdx} className="flex justify-between text-[12.5px] font-medium text-[var(--text-muted)]">
                                <span className="truncate max-w-[170px]">
                                  <span className="font-mono font-semibold text-[var(--text-muted)] mr-1">{prod.cantidad}x</span>
                                  {prod.plato?.nombre}
                                </span>
                                <span className="font-mono">S/. {(prod.cantidad * prod.plato?.precio).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-2 mt-4 font-sans">
                            <button
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
                              className="glass-button p-2 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                handleOpenCheckout(cuenta);
                                setIsSidebarOpen(false);
                              }}
                              className="glass-button primary flex-1 py-2 px-3 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5 text-emerald-450" />
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
          </div>
        )
      }

      {/* Floating Toggle trigger for open accounts on screens without the sidebar docked */}
      {
        !isSidebarDocked && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="glass-button primary fixed bottom-6 right-6 z-30 p-4 rounded-full shadow-2xl transition-all cursor-pointer flex items-center gap-2 no-print"
          >
            <Receipt className="w-5 h-5 text-emerald-450" />
            <span className="text-xs font-bold font-sans">Cuentas Abiertas</span>
            <span className="bg-emerald-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {openTables.length}
            </span>
          </button>
        )
      }
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
                  <button onClick={() => setShowInitialAmountModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
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
            onClose={() => {
              setIsCheckoutModalOpen(false);
              setSelectedCheckoutOrder(null);
            }}
            order={selectedCheckoutOrder}
            onSuccess={handlePaymentSuccess}
          />
        )
      }

      {/* Paloteo aggregations modal */}
      <PaloteoModal
        isOpen={isPaloteoModalOpen}
        onClose={() => {
          setIsPaloteoModalOpen(false);
          setSelectedPaloteoArqueoId(null);
        }}
        arqueoId={selectedPaloteoArqueoId}
      />

      {/* Summary ticket monospace receipt modal */}
      <SummaryTicketModal
        isOpen={isSummaryModalOpen}
        onClose={() => {
          setIsSummaryModalOpen(false);
          setSelectedSummaryArqueoId(null);
        }}
        arqueoId={selectedSummaryArqueoId}
      />

      {/* Detailed session auditor modal */}
      <DetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDetailArqueoId(null);
        }}
        arqueoId={selectedDetailArqueoId}
      />
    </div >
  );
};

export default CashierView;
