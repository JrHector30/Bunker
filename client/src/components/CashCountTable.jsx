import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import { MoreVertical, FileText, X, AlertCircle, Trash, Download, Calendar as CalendarIcon, Eye, EyeOff, PlusCircle, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCache } from '../hooks/useCache';
import { useCaja } from '../context/CajaContext';
import { format } from 'date-fns';
import { DropdownRangeDatePicker } from './DropdownRangeDatePicker';
import SmoothDropdown from './ui/SmoothDropdown';

const CashCountTable = ({ onStatusChange }) => {
    const { showConfirmation } = useConfirmation();
    const { showToast } = useNotification();
    const { refreshCajaStatus } = useCaja();
    const [filterDateRange, setFilterDateRange] = useState(undefined);
    const [currentPage, setCurrentPage] = useState(1);

    // Manual Cash Movement Modal & Expandable details states
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [expandedDig, setExpandedDig] = useState({});
    const [expandedTarj, setExpandedTarj] = useState({});

    // Summary Modal States
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [summaryData, setSummaryData] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    // Paloteo States
    const [paloteoData, setPaloteoData] = useState(null);
    const [loadingPaloteo, setLoadingPaloteo] = useState(false);

    const handleOpenSummaryModal = async (targetId = null) => {
        let actualId = targetId;
        if (!actualId) {
            if (filterDateRange?.from && history?.data?.length > 0) {
                actualId = history.data[0].id;
            } else if (currentStatus) {
                actualId = currentStatus.id;
            }
        }

        if (!actualId) {
            showToast("No hay datos de arqueo disponibles.", 'error');
            return;
        }

        setLoadingSummary(true);
        setShowSummaryModal(true);
        try {
            const res = await fetch(`/api/cashier/arqueo/${actualId}`);
            if (res.ok) {
                const data = await res.json();
                setSummaryData(data);
            } else {
                showToast("Error al obtener el resumen de caja.", 'error');
                setShowSummaryModal(false);
            }
        } catch (err) {
            showToast("Error de conexión al obtener el resumen.", 'error');
            setShowSummaryModal(false);
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleOpenPaloteo = async (targetId = null) => {
        let actualId = targetId;
        if (!actualId) {
            if (filterDateRange?.from && history?.data?.length > 0) {
                actualId = history.data[0].id;
            } else if (currentStatus) {
                actualId = currentStatus.id;
            }
        }

        if (!actualId) {
            showToast("No hay datos de arqueo disponibles.", 'error');
            return;
        }

        setLoadingPaloteo(true);
        setPaloteoOpen(true);
        try {
            const res = await fetch(`/api/cashier/arqueo/${actualId}`);
            if (res.ok) {
                const data = await res.json();
                setPaloteoData(data);
            } else {
                showToast("Error al obtener los detalles del paloteo.", 'error');
                setPaloteoOpen(false);
            }
        } catch (err) {
            showToast("Error de conexión al obtener los detalles.", 'error');
            setPaloteoOpen(false);
        } finally {
            setLoadingPaloteo(false);
        }
    };

    const handleRowAction = (actionId, targetId) => {
        if (actionId === 'paloteo') {
            handleOpenPaloteo(targetId);
        } else if (actionId === 'resumen') {
            handleOpenSummaryModal(targetId);
        } else if (actionId === 'pdf') {
            generatePDF(targetId);
        }
    };

    // Modal Form States
    const [movTipo, setMovTipo] = useState('EGRESO');
    const [movMetodoPago, setMovMetodoPago] = useState('efectivo');
    const [movComprobante, setMovComprobante] = useState('recibo');
    const [movConcepto, setMovConcepto] = useState('');
    const [movObservacion, setMovObservacion] = useState('');
    const [movMonto, setMovMonto] = useState('');
    const [movError, setMovError] = useState('');
    const [isSavingMov, setIsSavingMov] = useState(false);

    const handleSaveMovement = async (e) => {
        e.preventDefault();
        setMovError('');

        const numericMonto = parseFloat(movMonto);
        if (Number.isNaN(numericMonto) || numericMonto <= 0) {
            setMovError('El monto debe ser un número positivo.');
            return;
        }

        if (!movConcepto.trim()) {
            setMovError('El concepto es obligatorio.');
            return;
        }

        // Limit validation for egresos
        if (movTipo === 'EGRESO') {
            let availableLimit = 0;
            let limitLabel = 'Caja';
            if (movMetodoPago === 'efectivo') {
                availableLimit = currentStatus?.totalCaja || 0;
                limitLabel = 'Caja';
            } else if (movMetodoPago === 'yape') {
                availableLimit = currentStatus?.ingresos?.yape || 0;
                limitLabel = 'Yape';
            } else if (movMetodoPago === 'plin') {
                availableLimit = currentStatus?.ingresos?.plin || 0;
                limitLabel = 'Plin';
            }

            if (numericMonto > availableLimit) {
                setMovError(`Monto de egreso supera el disponible en ${limitLabel} (S/. ${availableLimit.toFixed(2)})`);
                return;
            }
        }

        setIsSavingMov(true);
        try {
            const res = await fetch('/api/cashier/movimientos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: movTipo,
                    tipoComprobante: movComprobante,
                    concepto: movConcepto,
                    monto: numericMonto,
                    metodoPago: movTipo === 'EGRESO' ? movMetodoPago : 'efectivo'
                })
            });

            if (res.ok) {
                showToast('Movimiento registrado con éxito.', 'success');
                setShowMovementModal(false);
                // Reset form
                setMovConcepto('');
                setMovObservacion('');
                setMovMonto('');
                setMovMetodoPago('efectivo');
                // Refresh data
                fetchStatus();
                fetchHistory();
            } else {
                const data = await res.json();
                setMovError(data.error || 'Error al registrar el movimiento.');
            }
        } catch (err) {
            setMovError('Error de conexión con el servidor.');
        } finally {
            setIsSavingMov(false);
        }
    };

    const statusFetcher = useCallback(
        () => fetch('/api/cashier/balance').then(res => res.json()),
        []
    );
    const { data: currentStatus, mutate: fetchStatus } = useCache('cashier_balance', statusFetcher, null);

    useEffect(() => {
        if (currentStatus && onStatusChange) {
            onStatusChange(currentStatus.estado);
        }
    }, [currentStatus]);

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

    const historyKey = React.useMemo(() => {
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

    // UI State
    const [menuOpen, setMenuOpen] = useState(false);
    const [paloteoOpen, setPaloteoOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showInitialAmountModal, setShowInitialAmountModal] = useState(false);
    const [initialAmount, setInitialAmount] = useState('');
    const [formError, setFormError] = useState(null);

    const statusIntervalRef = useRef(null);
    useEffect(() => {
        statusIntervalRef.current = fetchStatus;
    });

    useEffect(() => {
        // Poll estado cada 2 segundos
        const interval = setInterval(() => {
            statusIntervalRef.current?.();
        }, 2000);

        const handleRefresh = () => {
            fetchStatus();
            fetchHistory();
        };
        window.addEventListener('refreshCashCount', handleRefresh);

        return () => {
            clearInterval(interval);
            window.removeEventListener('refreshCashCount', handleRefresh);
        };
    }, [fetchStatus, fetchHistory]);

    // Handle Shift Toggle
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
        if (Number.isNaN(initialAmount) || initialAmount === null || initialAmount === '') {
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
            })
            .catch(err => showToast(err.message, 'error'));
    };

    // Date Formatter
    const formatDate = (dateString, includeTime = true) => {
        if (!dateString) return "--:--";
        const d = new Date(dateString);
        return d.toLocaleString('es-PE', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            ...(includeTime ? { hour: '2-digit', minute: '2-digit', second: '2-digit' } : {}),
            hour12: false
        }).replace(',', '');
    };

    // GENERACIÓN DE IMAGEN DEL GRÁFICO DE TENDENCIA (CANVAS EN MEMORIA)
    const generateChartImage = (arqArray) => {
        const salesByDate = {};

        // Ordenar arqueos cronológicamente para establecer las fechas extremas del rango
        const sortedArqs = [...arqArray].sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));

        if (sortedArqs.length === 0) return null;

        // Obtener la fecha inicial y final del rango en huso horario local Perú (UTC-5)
        const getLocalDateStr = (dateStr) => {
            const d = new Date(dateStr);
            // Restamos 5 horas para normalizar a UTC-5 (Perú)
            const localDate = new Date(d.getTime() - (5 * 60 * 60 * 1000));
            return localDate.toISOString().split('T')[0];
        };

        const startDStr = getLocalDateStr(sortedArqs[0].fechaInicio);
        const endDStr = getLocalDateStr(sortedArqs[sortedArqs.length - 1].fechaInicio);

        const startD = new Date(`${startDStr}T00:00:00`);
        const endD = new Date(`${endDStr}T00:00:00`);

        // Inicializar los días intermedios con 0 para tener un flujo continuo
        let cur = new Date(startD);
        while (cur <= endD) {
            const key = cur.toISOString().split('T')[0];
            salesByDate[key] = 0;
            cur.setDate(cur.getDate() + 1);
        }

        // Acumular las ventas de cada turno en su respectivo día
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

        // Formatear los datos a una lista ordenada cronológicamente
        const chartData = Object.entries(salesByDate).map(([dateStr, amount]) => {
            const d = new Date(`${dateStr}T00:00:00`);
            const day = d.getDate();
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
            const label = `${day} ${months[d.getMonth()]}`;
            return {
                dateStr,
                label,
                amount
            };
        }).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

        // Configurar el Canvas en memoria
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');

        // Fondo blanco limpio
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const padding = { top: 60, right: 50, bottom: 60, left: 80 };
        const chartWidth = canvas.width - padding.left - padding.right;
        const chartHeight = canvas.height - padding.top - padding.bottom;

        const amounts = chartData.map(d => d.amount);
        const maxVal = Math.max(...amounts, 100) * 1.15; // 15% de holgura superior
        const minVal = 0;

        // Coordenadas calculadas
        const points = chartData.map((d, i) => {
            const x = padding.left + (chartData.length > 1 ? (i / (chartData.length - 1)) * chartWidth : chartWidth / 2);
            const y = padding.top + chartHeight - ((d.amount - minVal) / (maxVal - minVal)) * chartHeight;
            return { x, y, amount: d.amount, label: d.label };
        });

        // Dibujar rejilla horizontal del eje Y
        ctx.strokeStyle = '#f1f3f5';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#868e96';
        ctx.font = '11px Inter, system-ui, sans-serif';
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

        // Dibujar marcas y etiquetas del eje X
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#868e96';

        // Evitar solapamiento si hay demasiadas fechas
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
            // Relleno de área con Degradado Lineal (Celeste transparente)
            const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
            gradient.addColorStop(0, 'rgba(13, 110, 253, 0.35)'); // Azul semitransparente arriba
            gradient.addColorStop(1, 'rgba(13, 110, 253, 0.0)');  // Transparencia absoluta abajo

            ctx.beginPath();
            ctx.moveTo(points[0].x, padding.top + chartHeight);
            points.forEach(p => {
                ctx.lineTo(p.x, p.y);
            });
            ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();

            // Línea de tendencia principal
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            points.forEach(p => {
                ctx.lineTo(p.x, p.y);
            });
            ctx.strokeStyle = '#0d6efd'; // Azul Bunker
            ctx.lineWidth = 2.5; // Trazo fino y estilizado
            ctx.stroke();

            // Dibujar puntos de datos y destacar el pico más alto (máximo financiero)
            const maxAmount = Math.max(...amounts);
            points.forEach(p => {
                const isPeak = p.amount === maxAmount && maxAmount > 0;

                // Círculo base del punto
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.strokeStyle = '#0d6efd';
                ctx.lineWidth = 1.8;
                ctx.stroke();

                // Si es el pico de ventas, agregar el indicador estético y etiqueta
                if (isPeak) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 6.5, 0, 2 * Math.PI);
                    ctx.strokeStyle = 'rgba(13, 110, 253, 0.45)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    ctx.fillStyle = '#0d6efd';
                    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(`S/. ${p.amount.toFixed(2)}`, p.x, p.y - 12);
                }
            });
        }

        return canvas.toDataURL('image/png');
    };

    // PDF GENERATION LOGIC
    const generatePDF = async (targetId = null) => {
        setIsGenerating(true);

        try {
            let arqArray = [];

            // Si targetId es nulo y hay un rango de fechas seleccionado, consultamos por rango
            if (!targetId && filterDateRange?.from) {
                const startStr = format(filterDateRange.from, 'yyyy-MM-dd');
                const endStr = filterDateRange.to ? format(filterDateRange.to, 'yyyy-MM-dd') : startStr;
                const res = await fetch(`/api/cashier/arqueo/report/range?startDate=${startStr}&endDate=${endStr}`);
                if (!res.ok) {
                    throw new Error("Error al obtener los datos de arqueo por rango");
                }
                arqArray = await res.json();
            } else {
                // De lo contrario, cargamos un único arqueo
                let actualId = targetId;
                if (!actualId) {
                    if (currentStatus) {
                        actualId = currentStatus.id;
                    }
                }
                if (!actualId) {
                    showToast("No hay datos de arqueo disponibles para descargar.", 'error');
                    setIsGenerating(false);
                    return;
                }
                const res = await fetch(`/api/cashier/arqueo/${actualId}`);
                if (!res.ok) {
                    throw new Error("Error al obtener los datos de arqueo");
                }
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

            // PÁGINA 1: RESUMEN CONSOLIDADO (Solo si es un rango de múltiples arqueos)
            if (isRange) {
                // CABECERA CORPORATIVA
                doc.setFontSize(22);
                doc.setTextColor(13, 110, 253); // Bunker Blue
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

                // TOTALES ACUMULADOS
                const totalMontoInicial = arqArray.reduce((sum, arq) => sum + arq.montoInicial, 0);
                const totalVentas = arqArray.reduce((sum, arq) => sum + arq.totalBruto, 0);
                const totalIngresosManuales = arqArray.reduce((sum, arq) => sum + arq.movimientos.filter(m => m.tipo === 'INGRESO').reduce((s, m) => s + m.monto, 0), 0);
                const totalEgresosManuales = arqArray.reduce((sum, arq) => sum + arq.egresos, 0);
                const totalPropinas = arqArray.reduce((sum, arq) => sum + arq.totalPropinas, 0);
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

                doc.setFont("helvetica", "normal");

                // TABLA DE RESUMEN DE SESIONES
                let currentY = startY + 30;
                doc.setFontSize(12);
                doc.setTextColor(13, 110, 253);
                doc.setFont("helvetica", "bold");
                doc.text("Resumen de Sesiones de Caja", 14, currentY);

                let runningAccumulated = 0;
                const summaryRows = arqArray.map((arq) => {
                    runningAccumulated += arq.totalCaja;
                    const manualIng = arq.movimientos.filter(m => m.tipo === 'INGRESO').reduce((s, m) => s + m.monto, 0);
                    return [
                        `#${arq.id}`,
                        arq.usuario?.nombre || 'Admin',
                        formatDate(arq.fechaInicio, true),
                        arq.fechaFin ? formatDate(arq.fechaFin, true) : 'Abierto',
                        `S/. ${arq.montoInicial.toFixed(2)}`,
                        `S/. ${arq.totalBruto.toFixed(2)}`,
                        `S/. ${manualIng.toFixed(2)}`,
                        `S/. ${arq.egresos.toFixed(2)}`,
                        `S/. ${arq.totalCaja.toFixed(2)}`,
                        `S/. ${runningAccumulated.toFixed(2)}`
                    ];
                });

                autoTable(doc, {
                    startY: currentY + 5,
                    head: [['Turno', 'Usuario', 'Apertura', 'Cierre', 'M. Inicial', 'Ventas', 'Ing. Man.', 'Egr. Man.', 'Saldo Final', 'Saldo Acum.']],
                    body: summaryRows,
                    theme: 'grid',
                    headStyles: { halign: 'center', fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold', fontSize: 8 },
                    styles: { font: 'helvetica', fontSize: 7.5 },
                    columnStyles: {
                        0: { halign: 'center' },
                        2: { halign: 'center' },
                        3: { halign: 'center' },
                        4: { halign: 'right' },
                        5: { halign: 'right' },
                        6: { halign: 'right' },
                        7: { halign: 'right' },
                        8: { halign: 'right' },
                        9: { halign: 'right' }
                    }
                });

                // Avanzamos a la siguiente página para los detalles
                doc.addPage();

                // DETALLES POR SESIÓN DE CAJA (Para rango)
                let currentDetailY = 20;
                const pageHeight = doc.internal.pageSize.height;

                const checkPageSpace = (neededHeight) => {
                    if (pageHeight - currentDetailY < neededHeight) {
                        doc.addPage();
                        currentDetailY = 20;
                        return true;
                    }
                    return false;
                };

                for (let index = 0; index < arqArray.length; index++) {
                    const fullData = arqArray[index];

                    if (index > 0) {
                        doc.addPage();
                        currentDetailY = 20;
                    }

                    // SUBHEADER DE LA SESIÓN
                    doc.setFontSize(14);
                    doc.setTextColor(13, 110, 253);
                    doc.setFont("helvetica", "bold");
                    doc.text(`Sesión de Caja Turno #${fullData.id} - ${fullData.estado.toUpperCase()}`, 14, currentDetailY);
                    currentDetailY += 6;

                    doc.setFontSize(9);
                    doc.setTextColor(100);
                    doc.setFont("helvetica", "normal");
                    const openStr = formatDate(fullData.fechaInicio, true);
                    const closeStr = fullData.fechaFin ? formatDate(fullData.fechaFin, true) : 'Abierto';
                    doc.text(`Apertura: ${openStr} | Cierre: ${closeStr} | Responsable: ${fullData.usuario?.nombre || 'Administrador'}`, 14, currentDetailY);
                    currentDetailY += 10;

                    // 1. FLOW HISTORY TABLE
                    doc.setFontSize(11);
                    doc.setTextColor(40, 40, 40);
                    doc.setFont("helvetica", "bold");
                    doc.text("Historial de Flujo de Caja (Inicio)", 14, currentDetailY);

                    const flowHistoryRows = [];
                    flowHistoryRows.push([
                        formatTime(fullData.fechaInicio),
                        'Monto Inicial de Apertura',
                        '-',
                        `S/. ${fullData.montoInicial.toFixed(2)}`
                    ]);

                    const sortedMovements = [...(fullData.movimientos || [])].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                    let runningStart = fullData.montoInicial;

                    sortedMovements.forEach(m => {
                        if (m.tipo === 'INGRESO') {
                            runningStart += m.monto;
                            flowHistoryRows.push([
                                formatTime(m.fecha),
                                `Ingreso: ${m.concepto}`,
                                `+ S/. ${m.monto.toFixed(2)}`,
                                `S/. ${runningStart.toFixed(2)}`
                            ]);
                        } else if (m.tipo === 'EGRESO') {
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
                        startY: currentDetailY + 4,
                        head: [['Hora', 'Descripción', 'Afectación', 'Saldo de Inicio']],
                        body: flowHistoryRows,
                        theme: 'grid',
                        headStyles: { halign: 'center', fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
                        styles: { font: 'helvetica', fontSize: 9 },
                        columnStyles: {
                            0: { halign: 'center' },
                            2: { halign: 'center' },
                            3: { halign: 'right' }
                        },
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

                    currentDetailY = doc.lastAutoTable.finalY + 12;

                    // 2. INGRESOS TABLE
                    checkPageSpace(30);
                    doc.setFontSize(11);
                    doc.setTextColor(40, 40, 40);
                    doc.setFont("helvetica", "bold");
                    doc.text("Ingresos Registrados", 14, currentDetailY);

                    const ingresosList = [];
                    (fullData.ventas || []).forEach(v => {
                        ingresosList.push({
                            fecha: v.hora,
                            hora: formatTime(v.hora),
                            comprobante: (v.doc || 'ticket').toUpperCase(),
                            concepto: `Venta Mesa ${v.mesa}`,
                            observacion: `Pago: ${(v.metodo || 'EFECTIVO').toUpperCase()}${v.propina > 0 ? ` + Propina S/. ${v.propina.toFixed(2)}` : ''}`,
                            monto: `S/. ${(v.total || 0).toFixed(2)}`
                        });
                    });

                    (fullData.movimientos || []).filter(m => m.tipo === 'INGRESO').forEach(m => {
                        ingresosList.push({
                            fecha: m.fecha,
                            hora: formatTime(m.fecha),
                            comprobante: m.tipoComprobante.toUpperCase(),
                            concepto: m.concepto,
                            observacion: `Manual${m.observacion ? `: ${m.observacion}` : ''}`,
                            monto: `S/. ${(m.monto || 0).toFixed(2)}`
                        });
                    });

                    ingresosList.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

                    const ingresosRows = ingresosList.length > 0
                        ? ingresosList.map(i => [i.hora, i.comprobante, i.concepto, i.observacion, i.monto])
                        : [["-", "-", "Sin ingresos en este turno", "-", "-"]];

                    autoTable(doc, {
                        startY: currentDetailY + 4,
                        head: [['Hora', 'Comprobante', 'Concepto', 'Observación', 'Monto']],
                        body: ingresosRows,
                        theme: 'grid',
                        headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold', halign: 'center' },
                        styles: { font: 'helvetica', fontSize: 9 },
                        columnStyles: {
                            4: { halign: 'right' }
                        }
                    });

                    currentDetailY = doc.lastAutoTable.finalY + 12;

                    // 3. EGRESOS TABLE
                    checkPageSpace(30);
                    doc.setFontSize(11);
                    doc.setTextColor(40, 40, 40);
                    doc.setFont("helvetica", "bold");
                    doc.text("Egresos Registrados", 14, currentDetailY);

                    const egresosList = (fullData.movimientos || []).filter(m => m.tipo === 'EGRESO');
                    egresosList.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

                    const egresosRows = egresosList.length > 0
                        ? egresosList.map(e => [
                            formatTime(e.fecha),
                            e.tipoComprobante.toUpperCase(),
                            e.concepto,
                            e.observacion || '-',
                            `S/. ${(e.monto || 0).toFixed(2)}`
                        ])
                        : [["-", "-", "Sin egresos en este turno", "-", "-"]];

                    autoTable(doc, {
                        startY: currentDetailY + 4,
                        head: [['Hora', 'Comprobante', 'Concepto', 'Observación', 'Monto']],
                        body: egresosRows,
                        theme: 'grid',
                        headStyles: { halign: 'center', fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
                        styles: { font: 'helvetica', fontSize: 9 },
                        columnStyles: {
                            4: { halign: 'right' }
                        }
                    });

                    currentDetailY = doc.lastAutoTable.finalY + 12;

                    // 4. PROPINAS
                    checkPageSpace(30);
                    doc.setFontSize(11);
                    doc.setTextColor(40, 40, 40);
                    doc.setFont("helvetica", "bold");
                    doc.text("Desglose de Propinas", 14, currentDetailY);

                    if (fullData.propinasPorMozo && fullData.propinasPorMozo.length > 0) {
                        const propinasRows = fullData.propinasPorMozo.map(m => [
                            m.nombre,
                            `S/. ${(m.propinas || 0).toFixed(2)}`
                        ]);

                        autoTable(doc, {
                            startY: currentDetailY + 4,
                            head: [['Mozo', 'Total Propinas']],
                            body: propinasRows,
                            theme: 'grid',
                            headStyles: { halign: 'center', fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
                            styles: { font: 'helvetica', fontSize: 9 },
                            columnStyles: {
                                1: { halign: 'right' }
                            }
                        });

                        currentDetailY = doc.lastAutoTable.finalY + 10;
                        doc.setFontSize(10);
                        doc.setTextColor(40, 40, 40);
                        doc.setFont("helvetica", "bold");
                        doc.text(`Total Propinas Recaudadas: S/. ${(fullData.totalPropinas || 0).toFixed(2)}`, 14, currentDetailY);
                        currentDetailY += 8;
                    } else {
                        doc.setFontSize(9);
                        doc.setTextColor(100, 100, 100);
                        doc.setFont("helvetica", "normal");
                        doc.text("No se registraron propinas en este turno.", 14, currentDetailY + 6);
                        currentDetailY += 12;
                    }

                    // RESUMEN DE ESTE TURNO
                    checkPageSpace(20);
                    doc.setFontSize(10);
                    doc.setTextColor(40, 40, 40);
                    doc.setFont("helvetica", "bold");
                    doc.text(`Resumen Turno #${fullData.id}: M. Inicial: S/. ${fullData.montoInicial.toFixed(2)} | Ventas: S/. ${fullData.totalBruto.toFixed(2)} | Egresos: S/. ${fullData.egresos.toFixed(2)} | Saldo Final: S/. ${fullData.totalCaja.toFixed(2)}`, 14, currentDetailY);
                }
            } else {
                // FORMATO PERSONALIZADO PARA REPORTE INDIVIDUAL (UN SOLO ARQUEO)
                const fullData = arqArray[0];

                // CABECERA
                doc.setFontSize(22);
                doc.setTextColor(13, 110, 253); // Bunker Blue
                doc.setFont("helvetica", "bold");
                doc.text("Bunker", 14, 20);

                // Monto Inicial en la esquina superior derecha
                doc.setFontSize(11);
                doc.setTextColor(40, 40, 40);
                doc.setFont("helvetica", "bold");
                doc.text(`Monto Inicial: S/. ${fullData.montoInicial.toFixed(2)}`, 145, 20);

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
                // Fila inicial de Total en Caja con el monto inicial más las ganancias del día en efectivo
                const baseCashBalance = fullData.montoInicial + (fullData.ingresos?.efectivo || 0);
                flowHistoryRows.push([
                    formatTime(fullData.fechaInicio),
                    'Total en Caja',
                    '-',
                    `S/. ${baseCashBalance.toFixed(2)}`
                ]);

                const sortedMovements = [...(fullData.movimientos || [])].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                let runningStart = baseCashBalance;

                sortedMovements.forEach(m => {
                    if (m.tipo === 'INGRESO') {
                        runningStart += m.monto;
                        flowHistoryRows.push([
                            formatTime(m.fecha),
                            `Ingreso: ${m.concepto}`,
                            `+ S/. ${m.monto.toFixed(2)}`,
                            `S/. ${runningStart.toFixed(2)}`
                        ]);
                    } else if (m.tipo === 'EGRESO') {
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
                    styles: { font: 'helvetica', fontSize: 9 },
                    columnStyles: {
                        0: { halign: 'center' },
                        2: { halign: 'center' },
                        3: { halign: 'right' }
                    },
                    didParseCell: function (data) {
                        if (data.section === 'body' && data.column.index === 2) {
                            const textValue = data.cell.text ? data.cell.text.toString().trim() : '';
                            if (textValue.startsWith('+')) {
                                data.cell.styles.textColor = [40, 167, 69]; // Verde profesional
                            } else if (textValue.startsWith('-')) {
                                data.cell.styles.textColor = [220, 53, 69]; // Rojo profesional
                            }
                        }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 12;

                // 2. INGRESOS TABLE (Exclusivamente ventas de comandas)
                checkPageSpace(30);
                doc.setFontSize(11);
                doc.setTextColor(40, 40, 40);
                doc.setFont("helvetica", "bold");
                doc.text("Ingresos Registrados", 14, currentY);

                const totalVentasMonto = (fullData.ventas || []).reduce((sum, v) => sum + v.total, 0);

                const ingresosRows = (fullData.ventas || []).map(v => {
                    let docText = (v.doc || 'ticket');
                    if (docText.toLowerCase() === 'sin_comprobante') {
                        docText = 'Ticket';
                    } else {
                        docText = docText.toUpperCase();
                    }
                    return [
                        formatTime(v.hora),
                        docText,
                        `Venta Mesa ${v.mesa}`,
                        v.mozo || 'General',
                        `Pago: ${(v.metodo || 'EFECTIVO').toUpperCase()}${v.propina > 0 ? ` + Propina S/. ${v.propina.toFixed(2)}` : ''}`,
                        `S/. ${v.total.toFixed(2)}`
                    ];
                });

                // Fila de total sumatorio
                ingresosRows.push([
                    '', '', '', '', 'Total en Bruto:', `S/. ${totalVentasMonto.toFixed(2)}`
                ]);

                if (ingresosRows.length === 1) { // Solo fila de total
                    ingresosRows.unshift(["-", "-", "Sin ventas en este turno", "-", "-", "S/. 0.00"]);
                }

                autoTable(doc, {
                    startY: currentY + 4,
                    head: [['Hora', 'Comprobante', 'Concepto', 'Mozo', 'Observación', 'Monto']],
                    body: ingresosRows,
                    theme: 'grid',
                    headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold', halign: 'center' },
                    styles: { font: 'helvetica', fontSize: 9 },
                    columnStyles: {
                        5: { halign: 'right' }
                    },
                    didParseCell: function (data) {
                        if (data.section === 'body' && data.row.index === ingresosRows.length - 1) {
                            data.cell.styles.fontStyle = 'bold';
                            if (data.column.index === 4) {
                                data.cell.styles.halign = 'right';
                            }
                            if (data.column.index === 5) {
                                data.cell.styles.halign = 'right';
                            }
                        }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 12;

                // 3. DESGLOSE DE PROPINAS (En lugar de Egresos Registrados)
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
                    styles: { font: 'helvetica', fontSize: 9 },
                    columnStyles: {
                        1: { halign: 'right' }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 10;

                if (fullData.propinasPorMozo && fullData.propinasPorMozo.length > 0) {
                    doc.setFontSize(10);
                    doc.setTextColor(40, 40, 40);
                    doc.setFont("helvetica", "bold");
                    doc.text(`Total Propinas Recaudadas: S/. ${(fullData.totalPropinas || 0).toFixed(2)}`, 14, currentY);
                    currentY += 8;
                } else {
                    currentY += 2;
                }

                // RESUMEN DE ESTE TURNO
                checkPageSpace(20);
                doc.setFontSize(10);
                doc.setTextColor(40, 40, 40);
                doc.setFont("helvetica", "bold");
                doc.text(`Resumen Turno #${fullData.id}: M. Inicial: S/. ${fullData.montoInicial.toFixed(2)} | Ventas: S/. ${fullData.totalBruto.toFixed(2)} | Saldo Final (Caja): S/. ${fullData.totalCaja.toFixed(2)}`, 14, currentY);
            }

            // PÁGINA FINAL: GRÁFICA DE TENDENCIA DE VENTAS
            if (isRange) {
                doc.addPage();
                doc.setFontSize(22);
                doc.setTextColor(13, 110, 253); // Bunker Blue
                doc.setFont("helvetica", "bold");
                doc.text("Bunker", 14, 20);

                doc.setFontSize(14);
                doc.setTextColor(40, 40, 40);
                doc.text("Tendencia Diaria de Ventas", 14, 28);

                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.setFont("helvetica", "normal");
                doc.text(`Visualización analítica del período ${reportDate}`, 14, 35);

                const chartDataUrl = generateChartImage(arqArray);
                if (chartDataUrl) {
                    doc.addImage(chartDataUrl, 'PNG', 14, 50, 182, 91); // Manteniendo proporción 2:1 del canvas 800x400
                }
            }

            // Guardar PDF
            const dateStr = new Date().toISOString().split('T')[0];
            doc.save(isRange ? `Reporte_Consolidado_Arqueo_${dateStr}.pdf` : `Arqueo_Caja_${arqArray[0].id}_${dateStr}.pdf`);

        } catch (e) {
            console.error(e);
            showToast("Error generando PDF: " + e.message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    // Paloteo Modal
    const PaloteoModal = () => {
        if (!paloteoOpen) return null;

        if (loadingPaloteo) {
            return (
                <div className="modal-overlay" onClick={() => setPaloteoOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, textAlign: 'center', padding: '40px 20px' }}>
                        Cargando Paloteo...
                    </div>
                </div>
            );
        }

        if (!paloteoData) return null;
        const data = paloteoData;
        const productCounts = {};
        if (data.ventas) {
            data.ventas.forEach(v => {
                v.items.forEach(item => {
                    productCounts[item.descripcion] = (productCounts[item.descripcion] || 0) + item.cantidad;
                });
            });
        }

        return (
            <div className="modal-overlay" onClick={() => setPaloteoOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                    <div className="modal-header">
                        <h2>Resumen / Paloteo</h2>
                        <button className="glass-button" onClick={() => setPaloteoOpen(false)}><X size={18} /></button>
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        <table style={{ width: '100%' }}>
                            <thead>
                                <tr style={{ textAlign: 'left' }}>
                                    <th>Producto</th>
                                    <th style={{ textAlign: 'center' }}>Cantidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(productCounts).length === 0 ? (
                                    <tr><td colSpan="2" className="text-center text-muted">No hay ventas registradas</td></tr>
                                ) : (
                                    Object.entries(productCounts).map(([name, count]) => (
                                        <tr key={name} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '8px 0' }}>{name}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{count}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="glass-panel" style={{ padding: 20, marginBottom: 20, overflow: 'visible' }}>

            {/* Header: Title + Toggle Button + Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, position: 'relative', zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <h2 style={{ margin: 0 }}>Arqueo de Caja</h2>
                    {currentStatus && (
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={handleToggleShift}
                                style={{
                                    backgroundColor: currentStatus.estado === 'abierto' ? '#28a745' : '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    padding: '5px 15px',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.9em',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                }}
                            >
                                {currentStatus.estado === 'abierto' ? 'ABIERTO' : 'CLOSED'}
                            </button>

                            {/* Reset Button */}
                            {/*<button
                                onClick={async () => {
                                    if (!await showConfirmation("⚠️ ¿ESTÁS SEGURO?\n\nEsto eliminará TODO el historial de ventas y reiniciará los contadores a 1.\n\nÚsalo solo para limpiar datos de prueba.", { type: 'danger' })) return;

                                    try {
                                        const res = await fetch('/api/admin/reset-simulation', { method: 'DELETE' });
                                        if (res.ok) {
                                            showToast("Simulación reiniciada correctamente.", 'success');
                                            fetchStatus();
                                            fetchHistory();
                                        } else {
                                            const err = await res.json();
                                            showToast("Error: " + err.error, 'error');
                                        }
                                    } catch (e) {
                                        showToast("Error de conexión", 'error');
                                    }
                                }}
                                className="glass-button"
                                style={{
                                    borderColor: '#dc3545',
                                    color: '#dc3545',
                                    padding: '5px 10px'
                                }}
                                title="Limpiar Historial de Simulación"
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Trash size={14} /> Limpiar
                                </span>
                            </button>*/}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {/* MOVIMIENTO REGISTRATION BUTTON */}
                    <button
                        type="button"
                        className="glass-button primary"
                        disabled={!currentStatus || currentStatus.estado !== 'abierto'}
                        onClick={() => {
                            if (!currentStatus || currentStatus.estado !== 'abierto') {
                                showToast("Debe abrir caja antes de registrar un movimiento.", "error");
                                return;
                            }
                            setMovTipo('EGRESO');
                            setMovComprobante('recibo');
                            setMovConcepto('');
                            setMovObservacion('');
                            setMovMonto('');
                            setMovError('');
                            setShowMovementModal(true);
                        }}
                        title={currentStatus && currentStatus.estado === 'abierto' ? "Registrar Movimiento" : "Abra caja para registrar movimientos"}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            background: currentStatus && currentStatus.estado === 'abierto' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: currentStatus && currentStatus.estado === 'abierto' ? 'black' : 'var(--text-muted)',
                            fontWeight: 'bold',
                            opacity: currentStatus && currentStatus.estado === 'abierto' ? 1 : 0.5,
                            cursor: currentStatus && currentStatus.estado === 'abierto' ? 'pointer' : 'not-allowed'
                        }}
                    >
                        <PlusCircle size={16} /> Movimiento
                    </button>

                    {/* PDF DOWNLOAD BUTTON */}
                    <button
                        className="glass-button"
                        onClick={() => generatePDF(null)}
                        disabled={isGenerating}
                        title="Descargar Reporte Actual"
                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                        <Download size={18} />
                        {isGenerating ? '...' : ''}
                    </button>

                    <DropdownRangeDatePicker
                        mode="range"
                        value={filterDateRange}
                        onChange={(range) => {
                            setFilterDateRange(range);
                            setCurrentPage(1);
                        }}
                        placeholder="Filtrar por Fecha"
                    />
                    {/* Refresh auto-handled */}
                </div>
            </div>

            {/* Table: History List */}
            <div className="table-responsive" style={{ minHeight: 150 }}>
                <table style={{ width: '100%', minWidth: 900 }}>
                    <thead>
                        <tr>
                            <th>N</th>
                            <th>Fecha</th>
                            <th>Inicio</th>
                            <th>Egreso</th>
                            <th>Ingreso (Detalle)</th>
                            <th>Propinas</th>
                            <th>Total en Caja</th>
                            <th>Total en Bruto</th>
                            <th>Pendiente</th>
                            <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody style={{ opacity: historyLoading ? 0.6 : 1, transition: 'opacity 0.1s' }}>
                        {historyLoading && (!history || history.data.length === 0) ? (
                            <tr><td colSpan="10" className="text-center text-muted" style={{ padding: '20px' }}>Cargando registros de caja...</td></tr>
                        ) : !history || !history.data || history.data.length === 0 ? (
                            <tr><td colSpan="10" className="text-center text-muted" style={{ padding: '20px' }}>No se encontraron registros.</td></tr>
                        ) : (
                            history.data.map((item, index) => {
                                const digitalSum = (item.ingresos?.yape || 0) + (item.ingresos?.plin || 0);
                                const cardSum = (item.ingresos?.tarjeta || 0) + (item.ingresos?.izipay || 0) + (item.ingresos?.niubiz || 0);
                                const dimStyle = item.estado === 'cerrado' ? { opacity: 0.6 } : {};
                                return (
                                    <tr key={item.id}>
                                        <td style={dimStyle}>{item.id}</td>
                                        <td style={dimStyle}>
                                            <div style={{ fontWeight: 'bold', color: item.estado === 'abierto' ? '#28a745' : 'var(--text-main)' }}>
                                                Inicio: {formatDate(item.fechaInicio)}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.9em' }}>
                                                Cierre: {item.estado === 'cerrado' ? formatDate(item.fechaFin) : (
                                                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>EN CURSO</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={dimStyle}><span className="font-mono">S/. {(item.inicio || 0).toFixed(2)}</span></td>
                                        <td style={dimStyle}>
                                            <div>Efec: <span className="font-mono">S/. {(item.egresos || 0).toFixed(2)}</span></div>
                                        </td>
                                        <td style={dimStyle}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 10px', fontSize: '0.85em', alignItems: 'center' }}>
                                                <span>Efec: {(item.ingresos?.efectivo || 0).toFixed(2)}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span>Tarj: {cardSum.toFixed(2)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedTarj(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                                                    >
                                                        {expandedTarj[item.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span>Dig: {digitalSum.toFixed(2)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedDig(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                                                    >
                                                        {expandedDig[item.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                                <span>Man: {(item.ingresos?.manual || 0).toFixed(2)}</span>
                                            </div>
                                            {expandedDig[item.id] && (
                                                <div style={{ fontSize: '0.75em', borderTop: '1px solid var(--glass-border)', marginTop: 5, paddingTop: 5, paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 2, animation: 'fadeIn 0.2s ease' }}>
                                                    <span>Yape: <span className="font-mono">S/. {(item.ingresos?.yape || 0).toFixed(2)}</span></span>
                                                    <span>Plin: <span className="font-mono">S/. {(item.ingresos?.plin || 0).toFixed(2)}</span></span>
                                                </div>
                                            )}
                                            {expandedTarj[item.id] && (
                                                <div style={{ fontSize: '0.75em', borderTop: '1px solid var(--glass-border)', marginTop: 5, paddingTop: 5, paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 2, animation: 'fadeIn 0.2s ease' }}>
                                                    <span>Izipay: <span className="font-mono">S/. {(item.ingresos?.izipay || 0).toFixed(2)}</span></span>
                                                    <span>Niubiz: <span className="font-mono">S/. {(item.ingresos?.niubiz || 0).toFixed(2)}</span></span>
                                                    {(item.ingresos?.tarjeta || 0) > 0 && (
                                                        <span>Tarjeta (Otros): <span className="font-mono">S/. {(item.ingresos?.tarjeta || 0).toFixed(2)}</span></span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ ...dimStyle, color: 'var(--warning)', fontWeight: 'bold' }}>
                                            <span className="font-mono">S/. {(item.totalPropinas || 0).toFixed(2)}</span>
                                        </td>
                                        <td style={{ ...dimStyle, fontWeight: 'bold', color: 'var(--success)' }}><span className="font-mono">S/. {(item.totalCaja || 0).toFixed(2)}</span></td>
                                        <td style={{ ...dimStyle, fontWeight: 'bold' }}><span className="font-mono">S/. {(item.totalBruto || 0).toFixed(2)}</span></td>
                                        <td style={{ ...dimStyle, color: 'var(--warning)' }}><span className="font-mono">S/. {(item.totalPendiente || 0).toFixed(2)}</span></td>
                                        <td style={{ textAlign: 'center', overflow: 'visible', width: 80 }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                <SmoothDropdown id={item.id} dropUp={index === history.data.length - 1} onAction={(actionId) => handleRowAction(actionId, item.id)} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {(history?.meta?.totalPages || 1) > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 15 }}>
                    <button
                        className="glass-button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                        Anterior
                    </button>
                    <span style={{ alignSelf: 'center' }}>
                        Página {currentPage} de {history?.meta?.totalPages || 1}
                    </span>
                    <button
                        className="glass-button"
                        disabled={currentPage === (history?.meta?.totalPages || 1)}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, (history?.meta?.totalPages || 1)))}
                    >
                        Siguiente
                    </button>
                </div>
            )}

            <PaloteoModal />

            {/* Modal de Apertura de Caja */}
            {showInitialAmountModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h2>Apertura de Caja</h2>
                            <button className="glass-button" onClick={() => setShowInitialAmountModal(false)} style={{ padding: 5, border: 'none' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={confirmOpenShift} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            {formError && <div style={{ color: 'white', background: 'var(--danger)', padding: 10, borderRadius: 8 }}>{formError}</div>}
                            <div>
                                <label>Ingrese monto inicial en Caja (S/.)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="glass-input"
                                    value={Number.isNaN(initialAmount) ? '' : initialAmount}
                                    onChange={e => setInitialAmount(e.target.valueAsNumber)}
                                    required
                                    autoFocus
                                    style={{ fontSize: '1.5rem', textAlign: 'center', marginTop: 10 }}
                                />
                            </div>
                            <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: 10 }}>
                                <button type="submit" className="glass-button primary" style={{ width: '100%', fontSize: '1.1rem' }}>Abrir Caja</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Registro de Movimientos (Ingresos/Egresos) */}
            {showMovementModal && (
                <div className="modal-overlay" onClick={() => setShowMovementModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450, width: '90%' }}>
                        <div className="modal-header">
                            <h2 style={{ margin: 0 }}>Registrar Movimiento</h2>
                            <button className="glass-button" onClick={() => setShowMovementModal(false)} style={{ padding: 5, border: 'none' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSaveMovement} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            {movError && (
                                <div style={{ color: 'black', background: 'var(--danger)', padding: 10, borderRadius: 8, fontSize: '0.9rem' }}>
                                    {movError}
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Tipo de Movimiento</label>
                                <select
                                    className="glass-input"
                                    value={movTipo}
                                    onChange={e => {
                                        setMovTipo(e.target.value);
                                        if (e.target.value === 'INGRESO') {
                                            setMovMetodoPago('efectivo');
                                        }
                                    }}
                                    style={{ width: '100%', padding: '8px 10px' }}
                                >
                                    <option value="EGRESO">Egreso (Gasto/Salida)</option>
                                    <option value="INGRESO">Ingreso (Entrada Manual)</option>
                                </select>
                            </div>

                            {movTipo === 'EGRESO' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Método de Pago</label>
                                    <select
                                        className="glass-input"
                                        value={movMetodoPago}
                                        onChange={e => setMovMetodoPago(e.target.value)}
                                        style={{ width: '100%', padding: '8px 10px' }}
                                    >
                                        <option value="efectivo">Efectivo</option>
                                        <option value="yape">Yape</option>
                                        <option value="plin">Plin</option>
                                    </select>
                                    <div style={{
                                        marginTop: 8,
                                        padding: '8px 12px',
                                        backgroundColor: '#ffeeba',
                                        color: '#856404',
                                        border: '1px solid #ffeeba',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}>
                                        ⚠️ Límite disponible en {movMetodoPago === 'efectivo' ? 'Caja' : movMetodoPago === 'yape' ? 'Yape' : 'Plin'}: S/. {
                                            (movMetodoPago === 'efectivo'
                                                ? (currentStatus?.totalCaja || 0)
                                                : movMetodoPago === 'yape'
                                                    ? (currentStatus?.ingresos?.yape || 0)
                                                    : (currentStatus?.ingresos?.plin || 0)
                                            ).toFixed(2)
                                        }
                                    </div>
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Tipo de Comprobante</label>
                                <select
                                    className="glass-input"
                                    value={movComprobante}
                                    onChange={e => setMovComprobante(e.target.value)}
                                    style={{ width: '100%', padding: '8px 10px' }}
                                >
                                    <option value="boleta">Boleta</option>
                                    <option value="factura">Factura</option>
                                    <option value="recibo">Recibo</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Concepto</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="Ej. Compra de servilletas"
                                    value={movConcepto}
                                    onChange={e => setMovConcepto(e.target.value)}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Monto (S/.)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="glass-input"
                                    placeholder="0.00"
                                    value={movMonto}
                                    onChange={e => setMovMonto(e.target.value)}
                                    required
                                    style={{ width: '100%', fontSize: '1.2rem', fontWeight: 'bold' }}
                                />
                            </div>

                            <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: 10 }}>
                                <button
                                    type="submit"
                                    className="glass-button primary"
                                    disabled={isSavingMov}
                                    style={{ width: '100%', fontSize: '1.1rem', background: 'var(--primary)', borderColor: 'transparent', opacity: isSavingMov ? 0.7 : 1 }}
                                >
                                    {isSavingMov ? 'Registrando...' : 'Registrar Movimiento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Resumen de Caja */}
            {showSummaryModal && (
                <div className="modal-overlay" onClick={() => setShowSummaryModal(false)}>
                    <div className="modal-content print-ticket" onClick={e => e.stopPropagation()} style={{ background: 'white', color: 'black', width: 350, fontFamily: '"Courier New", monospace', padding: 20 }}>
                        {loadingSummary ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                Cargando Resumen de Caja...
                            </div>
                        ) : !summaryData ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                No se encontraron datos para el arqueo seleccionado.
                            </div>
                        ) : (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: 15, borderBottom: '1px dashed black', paddingBottom: 10 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>BUNKER</div>
                                    <div>DEMO</div>
                                    <div style={{ fontSize: '0.8rem' }}>Telf: 519123456789 / RUC: 10000000000</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: 5 }}>
                                        Fecha: {new Date().toLocaleDateString('es-PE')} {new Date().toLocaleTimeString('es-PE', { hour12: false })}
                                    </div>
                                </div>

                                <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 10 }}>RESUMEN DE CAJA</div>

                                <div style={{ fontSize: '0.9rem', marginBottom: 10 }}>
                                    <div>Inicio: {formatDate(summaryData.fechaInicio)}</div>
                                    {summaryData.fechaFin && (
                                        <div>Cierre: {formatDate(summaryData.fechaFin)}</div>
                                    )}
                                    <div>Monto Inicio: <span className="font-mono">S/. {(summaryData.montoInicial || 0).toFixed(2)}</span></div>
                                </div>

                                <div style={{ borderBottom: '1px dashed black', marginBottom: 5 }}></div>
                                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: 5 }}>VENTAS</div>
                                <div style={{ fontSize: '0.9rem', marginBottom: 5 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Efectivo:</span>
                                        <span><span className="font-mono">S/. {(summaryData.ingresos?.efectivo || 0).toFixed(2)}</span></span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Tarjeta:</span>
                                        <span><span className="font-mono">S/. {(summaryData.ingresos?.tarjeta || 0).toFixed(2)}</span></span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Yape:</span>
                                        <span><span className="font-mono">S/. {(summaryData.ingresos?.yape || 0).toFixed(2)}</span></span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Plin:</span>
                                        <span><span className="font-mono">S/. {(summaryData.ingresos?.plin || 0).toFixed(2)}</span></span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Izi:</span>
                                        <span><span className="font-mono">S/. {(summaryData.ingresos?.izipay || 0).toFixed(2)}</span></span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Niubiz:</span>
                                        <span><span className="font-mono">S/. {(summaryData.ingresos?.niubiz || 0).toFixed(2)}</span></span>
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px dashed black', paddingTop: 5, display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.05rem', marginBottom: 5 }}>
                                    <span>Total:</span>
                                    <span><span className="font-mono">S/. {((summaryData.ingresos?.efectivo || 0) +
                                        (summaryData.ingresos?.tarjeta || 0) +
                                        (summaryData.ingresos?.yape || 0) +
                                        (summaryData.ingresos?.plin || 0) +
                                        (summaryData.ingresos?.izipay || 0) +
                                        (summaryData.ingresos?.niubiz || 0)).toFixed(2)}</span></span>
                                </div>

                                <div style={{ borderBottom: '1px dashed black', marginBottom: 5 }}></div>
                                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: 5 }}>RESUMEN EFECTIVO</div>
                                <div style={{ fontSize: '0.9rem', marginBottom: 5 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Ingreso:</span>
                                        <span><span className="font-mono">S/. {((summaryData.ingresos?.efectivo || 0) + (summaryData.ingresos?.manual || 0)).toFixed(2)}</span></span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Egreso:</span>
                                        <span><span className="font-mono">S/. {(summaryData.egresos || 0).toFixed(2)}</span></span>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.8rem', borderTop: '1px dashed black', paddingTop: 10 }}>
                                    <div>RESUMEN DE CAJA</div>
                                    <div>Generado por el sistema Bunker</div>
                                    <div>Este documento no posee ningún valor fiscal!</div>
                                </div>

                                <div className="no-print" style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                                    <button className="glass-button primary cash-count-print-btn" onClick={() => window.print()}>
                                        <Printer size={16} /> Imprimir
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CashCountTable;
