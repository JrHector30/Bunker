import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Save,
  Palette,
  Wifi,
  WifiOff,
  Bell,
  Printer,
  Usb,
  Network,
  RefreshCw,
  FileCheck2,
  Eye,
  EyeOff,
  Check,
  SlidersHorizontal,
  Info,
  AlertTriangle,
  Sparkles,
  Unlink,
  RotateCcw,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useConfirmation } from '../context/ConfirmationContext';
import { enqueueTicket } from '../utils/printer';
import { getActiveRestaurant } from '../utils/tenant';
import { networkStatus, NetworkState } from '../offline/network/networkStatus';
import ToggleSwitch from '../components/ui/ToggleSwitch';

const INITIAL_PERMISSIONS = [
  {
    id: 'inicio',
    grupo: 'Atención y Venta',
    nombre: 'Inicio',
    descripcion: 'Acceso a la pantalla principal y resumen del turno',
    mozo: false,
    cocina: false,
    caja: true,
  },
  {
    id: 'mesas',
    grupo: 'Atención y Venta',
    nombre: 'Sala / Mesas',
    descripcion: 'Gestión de mesas, salón y toma de comandas',
    mozo: true,
    cocina: false,
    caja: true,
  },
  {
    id: 'cocina',
    grupo: 'Atención y Venta',
    nombre: 'Cocina (KDS)',
    descripcion: 'Vista de pedidos en preparación y tiempos',
    mozo: false,
    cocina: true,
    caja: false,
  },
  {
    id: 'caja',
    grupo: 'Atención y Venta',
    nombre: 'Caja',
    descripcion: 'Cobros, apertura y cierre de arqueo de caja',
    mozo: false,
    cocina: false,
    caja: true,
  },
  {
    id: 'logistica',
    grupo: 'Inventario y Carta',
    nombre: 'Logística',
    descripcion: 'Inventario, insumos, recetarios, kardex y auditoría',
    mozo: true,
    cocina: true,
    caja: true,
  },
  {
    id: 'categories',
    grupo: 'Inventario y Carta',
    nombre: 'Categorías',
    descripcion: 'Gestión de categorías de platos y orden en carta',
    mozo: false,
    cocina: false,
    caja: true,
  },
  {
    id: 'reportes',
    grupo: 'Administración',
    nombre: 'Reportes',
    descripcion: 'Estadísticas de ventas, mozos y rendimiento',
    mozo: false,
    cocina: false,
    caja: true,
  },
  {
    id: 'usuarios',
    grupo: 'Administración',
    nombre: 'Usuarios',
    descripcion: 'Gestión de empleados, pines y roles del local',
    mozo: false,
    cocina: false,
    caja: false,
  },
];

const THEMES = [
  {
    id: 'theme-orange',
    nombre: 'Naranja Warm',
    descripcion: 'Acento naranja vibrante con fondo oscuro premium.',
    accentHex: '#F26522',
    bgClass: 'bg-gradient-to-br from-[#1A120D] via-[#13100E] to-[#0B0D12]',
    borderActiveClass: 'border-[#F26522] ring-2 ring-[#F26522]/25',
    badgeText: 'ACTIVO',
  },
  {
    id: 'theme-green',
    nombre: 'Esmeralda',
    descripcion: 'Tono verde esmeralda para una estética equilibrada.',
    accentHex: '#10B981',
    bgClass: 'bg-gradient-to-br from-[#071D15] via-[#071410] to-[#060C0A]',
    borderActiveClass: 'border-emerald-500 ring-2 ring-emerald-500/25',
    badgeText: 'ACTIVO',
  },
  {
    id: 'theme-blue',
    nombre: 'Zafiro Azul',
    descripcion: 'Azul zafiro elegante y profesional.',
    accentHex: '#3B82F6',
    bgClass: 'bg-gradient-to-br from-[#0B162D] via-[#091122] to-[#070B14]',
    borderActiveClass: 'border-blue-500 ring-2 ring-blue-500/25',
    badgeText: 'ACTIVO',
  },
  {
    id: 'theme-red',
    nombre: 'Carmesí Red',
    descripcion: 'Rojo carmesí enérgico y moderno.',
    accentHex: '#EF4444',
    bgClass: 'bg-gradient-to-br from-[#210A0C] via-[#160809] to-[#0B0607]',
    borderActiveClass: 'border-rose-500 ring-2 ring-rose-500/25',
    badgeText: 'ACTIVO',
  },
  {
    id: 'theme-black',
    nombre: 'Minimal Dark',
    descripcion: 'Diseño monocromático limpio y de alto contraste.',
    accentHex: '#94A3B8',
    bgClass: 'bg-gradient-to-br from-[#111317] via-[#0B0D10] to-[#060709]',
    borderActiveClass: 'border-slate-400 ring-2 ring-slate-400/25',
    badgeText: 'ACTIVO',
  },
];

const INITIAL_RECOVERY_LOGS = [
  {
    id: 'rec-1',
    hora: '18:14',
    dispositivo: 'Ethernet 192.168.1.114',
    resultado: 'Reintento automático de socket TCP (en curso)',
  },
  {
    id: 'rec-2',
    hora: '14:02',
    dispositivo: 'USB 80mm Series Printer',
    resultado: 'Cola liberada correctamente (0 pendientes)',
  },
];

export default function SettingsView() {
  const { user } = useAuth();
  const activeTenant = getActiveRestaurant();
  const tenantId = user?.restauranteId || activeTenant?.id || 1;
  const { theme, changeTheme, showAlerts, setShowAlerts } = useTheme();
  const { showToast } = useNotification();
  const { showConfirmation } = useConfirmation();

  const [activeTab, setActiveTab] = useState('operacion');

  // Operación e Interfaz
  const [netState, setNetState] = useState(networkStatus.getStatus());
  const forceOffline = netState !== NetworkState.ONLINE;
  const [soundComandas, setSoundComandas] = useState(() => {
    return localStorage.getItem('bunker_sound_comandas') !== 'false';
  });

  // Permisos
  const [permissions, setPermissions] = useState(INITIAL_PERMISSIONS);
  const [permissionsDirty, setPermissionsDirty] = useState(false);
  const [selectedRole, setSelectedRole] = useState('mozo');

  // Impresoras y Hardware
  const [station, setStation] = useState(() => {
    return localStorage.getItem('bunker_settings_selected_station') || 'Caja';
  });
  const [serverOnline, setServerOnline] = useState(true);
  const [usbWidth, setUsbWidth] = useState('80mm');
  const [usbHardware, setUsbHardware] = useState('SPRT');
  const [printerSizes, setPrinterSizes] = useState({});
  const [printerProfiles, setPrinterProfiles] = useState({});
  const [ethRepairing, setEthRepairing] = useState(false);
  const [ethLinked, setEthLinked] = useState(true);
  const [auditTicketOn, setAuditTicketOn] = useState(false);
  const [showRecoveryLogs, setShowRecoveryLogs] = useState(false);
  const [recoveryLogs, setRecoveryLogs] = useState(INITIAL_RECOVERY_LOGS);
  const [isRefreshingPrinters, setIsRefreshingPrinters] = useState(false);
  const [printers, setPrinters] = useState([]);

  // Suscripción al estado de red
  useEffect(() => {
    return networkStatus.subscribe((state) => {
      setNetState(state);
    });
  }, []);

  // Cargar Permisos reales del backend
  useEffect(() => {
    fetch('/api/permisos')
      .then((res) => {
        if (!res.ok) throw new Error('Error al consultar permisos');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPermissions((prev) =>
            prev.map((mod) => {
              const mozoPerm = data.find(
                (p) => p.rol === 'mozo' && (p.modulo === mod.id || (mod.id === 'categories' && p.modulo === 'categorias'))
              );
              const cocinaPerm = data.find(
                (p) => p.rol === 'cocina' && (p.modulo === mod.id || (mod.id === 'categories' && p.modulo === 'categorias'))
              );
              const cajaPerm = data.find(
                (p) => p.rol === 'caja' && (p.modulo === mod.id || (mod.id === 'categories' && p.modulo === 'categorias'))
              );
              return {
                ...mod,
                mozo: mozoPerm ? mozoPerm.habilitado : mod.mozo,
                cocina: cocinaPerm ? cocinaPerm.habilitado : mod.cocina,
                caja: cajaPerm ? cajaPerm.habilitado : mod.caja,
              };
            })
          );
        }
      })
      .catch((err) => {
        console.warn('Usando permisos por defecto:', err.message);
      });
  }, []);

  // Cargar Hardware e Impresoras
  const loadHardwareData = useCallback(async (selectedSt = station) => {
    try {
      const reqHeaders = { 'x-restaurante-id': String(tenantId) };
      const [serverRes, listRes, sizesRes, profilesRes, histRes, auditConfRes] = await Promise.all([
        fetch(`/api/recovery/estado-estacion?estacion=${selectedSt}&restauranteId=${tenantId}`, { headers: reqHeaders }).catch(() => null),
        fetch(`/api/impresoras?estacion=${selectedSt}&restauranteId=${tenantId}`, { headers: reqHeaders }).catch(() => null),
        fetch(`/api/impresoras/medidas?estacion=${selectedSt}&restauranteId=${tenantId}`, { headers: reqHeaders }).catch(() => null),
        fetch(`/api/impresoras/perfiles?estacion=${selectedSt}&restauranteId=${tenantId}`, { headers: reqHeaders }).catch(() => null),
        fetch(`/api/recovery/historial?estacion=${selectedSt}&restauranteId=${tenantId}`, { headers: reqHeaders }).catch(() => null),
        fetch('/api/configuracion/imprimir_ticket_auditoria_recovery').catch(() => null),
      ]);

      if (serverRes && serverRes.ok) {
        const sData = await serverRes.json();
        setServerOnline(sData.enLinea !== false);
      } else {
        setServerOnline(true);
      }

      if (listRes && listRes.ok) {
        const list = await listRes.json();
        setPrinters(list || []);
      }

      if (sizesRes && sizesRes.ok) {
        const sizesData = await sizesRes.json();
        if (sizesData && typeof sizesData === 'object') {
          setPrinterSizes(sizesData);
          const firstKey = Object.keys(sizesData)[0];
          if (firstKey && sizesData[firstKey]) setUsbWidth(sizesData[firstKey]);
        }
      }

      if (profilesRes && profilesRes.ok) {
        const profilesData = await profilesRes.json();
        if (profilesData && typeof profilesData === 'object') {
          setPrinterProfiles(profilesData);
          const firstKey = Object.keys(profilesData)[0];
          if (firstKey && profilesData[firstKey]) setUsbHardware(profilesData[firstKey]);
        }
      }

      if (histRes && histRes.ok) {
        const histData = await histRes.json();
        if (Array.isArray(histData) && histData.length > 0) {
          setRecoveryLogs(
            histData.slice(0, 5).map((h, idx) => ({
              id: h.id || `hist-${idx}`,
              hora: h.hora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              dispositivo: h.dispositivo || h.impresora || 'Ethernet Printer',
              resultado: h.resultado || h.mensaje || 'Operativo',
            }))
          );
        }
      }

      if (auditConfRes && auditConfRes.ok) {
        const auditData = await auditConfRes.json();
        setAuditTicketOn(auditData.valor === 'true');
      }
    } catch (e) {
      console.warn('Error al cargar datos de hardware:', e);
    }
  }, [station, tenantId]);

  useEffect(() => {
    loadHardwareData(station);
  }, [station, loadHardwareData]);

  // Handlers
  const handleToggleOffline = async () => {
    if (!forceOffline) {
      const confirmed = await showConfirmation({
        title: '¿Activar Modo Offline?',
        message: 'El sistema operará de manera local sin sincronizar con el servidor en tiempo real. Esta opción se recomienda únicamente ante cortes de internet o pruebas técnicas. ¿Deseas activar el modo Offline?',
        confirmText: 'Sí, activar Offline',
        cancelText: 'Cancelar',
        isDestructive: false,
      });

      if (!confirmed) return;

      networkStatus.setManualOverride(NetworkState.OFFLINE_CONFIRMED);
      setNetState(NetworkState.OFFLINE_CONFIRMED);
      showToast('Modo Offline activado de forma persistente. Operando de forma local.', 'info');
    } else {
      const confirmed = await showConfirmation({
        title: '¿Restaurar Modo Online?',
        message: 'El sistema restablecerá la conexión con el servidor en tiempo real y sincronizará los cambios pendientes. ¿Deseas volver al modo Online?',
        confirmText: 'Sí, volver a Online',
        cancelText: 'Cancelar',
        isDestructive: false,
      });

      if (!confirmed) return;

      networkStatus.setManualOverride(NetworkState.ONLINE);
      setNetState(NetworkState.ONLINE);
      showToast('Modo Online restaurado. Sincronización en tiempo real activa.', 'success');
    }
  };

  const handleToggleStockAlerts = () => {
    const next = !showAlerts;
    setShowAlerts(next);
    showToast(
      next
        ? 'Alertas laterales de stock bajo activadas.'
        : 'Alertas laterales de stock desactivadas.',
      'info'
    );
  };

  const handleToggleSoundComandas = () => {
    const next = !soundComandas;
    setSoundComandas(next);
    localStorage.setItem('bunker_sound_comandas', String(next));
    showToast(
      next ? 'Sonido de comandas activado.' : 'Sonido de comandas silenciado.',
      'info'
    );
  };

  const groupedPermissions = useMemo(() => {
    const groups = ['Atención y Venta', 'Inventario y Carta', 'Administración'];
    return groups.map((grupo) => ({
      grupo,
      items: permissions.filter((p) => p.grupo === grupo),
    }));
  }, [permissions]);

  const handleTogglePermission = (moduleId, role) => {
    setPermissions((prev) =>
      prev.map((mod) =>
        mod.id === moduleId ? { ...mod, [role]: !mod[role] } : mod
      )
    );
    setPermissionsDirty(true);
  };

  const handleSavePermissions = async () => {
    try {
      const promises = [];
      permissions.forEach((mod) => {
        ['mozo', 'cocina', 'caja'].forEach((role) => {
          promises.push(
            fetch(`/api/permisos/${role}/${mod.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ habilitado: mod[role] }),
            })
          );
          if (mod.id === 'categories') {
            promises.push(
              fetch(`/api/permisos/${role}/categorias`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ habilitado: mod[role] }),
              }).catch(() => { })
            );
          }
        });
      });

      await Promise.all(promises);
      setPermissionsDirty(false);
      showToast('Permisos por rol actualizados correctamente.', 'success');
    } catch (err) {
      showToast('Error al guardar permisos: ' + err.message, 'error');
    }
  };

  const handleSelectTheme = (themeItem) => {
    changeTheme(themeItem.id);
    showToast(`Tema "${themeItem.nombre}" aplicado.`, 'success');
  };

  const handleRefreshPrinters = async () => {
    setIsRefreshingPrinters(true);
    try {
      const scanReq = await fetch('/api/impresoras/solicitar-actualizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-restaurante-id': String(tenantId) },
        body: JSON.stringify({ estacion: station, restauranteId: tenantId }),
      }).catch(() => null);

      // Si el servidor local respondió directamente, recargar de inmediato
      if (scanReq && scanReq.ok) {
        await loadHardwareData(station);
      } else {
        // Fallback: esperar activamente a que el printer-server procese el escaneo
        for (let i = 0; i < 4; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const stRes = await fetch(`/api/impresoras/estado-solicitud?estacion=${station}`, {
            headers: { 'x-restaurante-id': String(tenantId) }
          }).catch(() => null);
          if (stRes && stRes.ok) {
            const stData = await stRes.json();
            if (!stData.solicitando) break;
          }
        }
        await loadHardwareData(station);
      }

      setEthRepairing(false);
      showToast(`Estación ${station}: escaneo completado en tiempo real.`, 'success');
    } catch (err) {
      showToast(`Error al actualizar impresoras: ${err.message}`, 'error');
    } finally {
      setIsRefreshingPrinters(false);
    }
  };

  const handleTestPrint = async () => {
    try {
      const testContent = {
        type: 'precuenta',
        total: 0,
        totalLetras: 'cero soles y 00/100 céntimos',
        items: [{ nombre: `Prueba en estación: ${station}`, precio: 0, cantidad: 1 }],
      };
      await enqueueTicket('TEST', user?.nombre || 'Administrador', testContent, station);
      showToast(`Enviando ticket de prueba a ${station} (${usbWidth}).`, 'success');
    } catch (err) {
      showToast(`Error al imprimir ticket de prueba: ${err.message}`, 'error');
    }
  };

  const handleToggleAuditTicket = async () => {
    const next = !auditTicketOn;
    try {
      await fetch('/api/configuracion/imprimir_ticket_auditoria_recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: next ? 'true' : 'false' }),
      }).catch(() => null);

      setAuditTicketOn(next);
      showToast(`Ticket de Auditoría: ${next ? 'ACTIVADO' : 'DESACTIVADO'}.`, 'info');
    } catch (e) {
      showToast('Error al configurar ticket de auditoría', 'error');
    }
  };

  const handleSaveUsbWidth = async (printerNameOrWidth, widthVal) => {
    const printerName = widthVal ? printerNameOrWidth : (printers[0]?.nombre || '80mm Series Printer');
    const width = widthVal || printerNameOrWidth;
    setPrinterSizes((prev) => ({ ...prev, [printerName]: width }));
    setUsbWidth(width);
    try {
      await fetch('/api/impresoras/medida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-restaurante-id': String(tenantId) },
        body: JSON.stringify({
          impresora: printerName,
          medida: width,
          estacion: station,
          restauranteId: tenantId,
        }),
      }).catch(() => null);
      showToast(`Ancho ${width} guardado para "${printerName}".`, 'success');
    } catch (_) { }
  };

  const handleSaveUsbProfile = async (printerNameOrProfile, profileVal) => {
    const printerName = profileVal ? printerNameOrProfile : (printers[0]?.nombre || '80mm Series Printer');
    const profile = profileVal || printerNameOrProfile;
    setPrinterProfiles((prev) => ({ ...prev, [printerName]: profile }));
    setUsbHardware(profile);
    try {
      await fetch('/api/impresoras/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-restaurante-id': String(tenantId) },
        body: JSON.stringify({
          impresora: printerName,
          perfil: profile,
          estacion: station,
          restauranteId: tenantId,
        }),
      }).catch(() => null);
      showToast(`Perfil ${profile} guardado para "${printerName}".`, 'success');
    } catch (_) { }
  };

  const tabs = [
    {
      id: 'operacion',
      label: 'Operación y Alertas',
      icon: <Wifi className="w-4 h-4" />,
    },
    {
      id: 'permisos',
      label: 'Roles y Permisos',
      icon: <Shield className="w-4 h-4" />,
      badge: permissionsDirty ? 'Sin guardar' : null,
    },
    {
      id: 'impresoras',
      label: 'Impresoras y Hardware',
      icon: <Printer className="w-4 h-4" />,
      badge: ethLinked && ethRepairing ? '1 alerta' : null,
    },
    {
      id: 'apariencia',
      label: 'Temas y Apariencia',
      icon: <Palette className="w-4 h-4" />,
    },
  ];

  const mobileTabs = [
    {
      id: 'operacion',
      label: 'Operación',
      icon: <Wifi className="w-4 h-4" />,
    },
    {
      id: 'permisos',
      label: 'Permisos',
      icon: <Shield className="w-4 h-4" />,
      badge: permissionsDirty ? '•' : null,
    },
    {
      id: 'impresoras',
      label: 'Impresoras',
      icon: <Printer className="w-4 h-4" />,
      badge: ethLinked && ethRepairing ? '1' : null,
    },
    {
      id: 'apariencia',
      label: 'Temas',
      icon: <Palette className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col gap-5 p-4 sm:p-6 max-w-7xl mx-auto w-full text-left">
      {/* ========================================================================= */}
      {/* MOBILE VIEW (md:hidden)                                                  */}
      {/* ========================================================================= */}
      <div className="block md:hidden min-h-[calc(100dvh-5rem)] flex flex-col gap-4">
        {/* Header Mobile */}
        <header className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-[#F26522] shrink-0 mt-0.5">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              Ajustes del Sistema
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configura operación, permisos, impresión y apariencia.
            </p>
          </div>
        </header>

        {/* Navegación 2x2 sin scroll horizontal en Mobile */}
        <nav aria-label="Secciones de Ajustes" className="grid grid-cols-2 gap-2">
          {mobileTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between gap-2 border transition-colors cursor-pointer ${isActive
                  ? 'border-[#F26522] bg-orange-50/80 dark:bg-orange-950/30 text-[#F26522]'
                  : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                  }`}
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  {tab.icon}
                  <span className="truncate">{tab.label}</span>
                </span>
                {tab.badge && (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold shrink-0">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* TAB 1: OPERACIÓN Y ALERTAS */}
        {activeTab === 'operacion' && (
          <div className="space-y-4">
            {/* Modo de Operación y Red */}
            <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#F26522] flex items-center justify-center shrink-0">
                  {forceOffline ? (
                    <WifiOff className="w-4 h-4" />
                  ) : (
                    <Wifi className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Modo de Operación y Red
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sincronización con servidor en la nube.
                  </p>
                </div>
              </div>

              <div
                className={`rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 text-[11.5px] font-bold ${forceOffline
                  ? 'border-amber-200 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                  : 'border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                  }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {forceOffline ? (
                    <WifiOff className="w-4 h-4 shrink-0" />
                  ) : (
                    <Wifi className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {forceOffline
                      ? 'MODO OFFLINE — Operación local sin internet'
                      : 'MODO ONLINE — Conectado en tiempo real'}
                  </span>
                </div>
                {forceOffline && (
                  <button
                    type="button"
                    onClick={handleToggleOffline}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shrink-0 transition-colors cursor-pointer border-0 shadow-xs active:scale-95"
                  >
                    Restaurar Online
                  </button>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <WifiOff className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Forzar Modo Offline
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Activa el modo offline para realizar pruebas o operar ante cortes de internet.
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={forceOffline}
                  onChange={handleToggleOffline}
                  ariaLabel="Forzar Modo Offline"
                />
              </div>

              <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 p-3 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  El sistema permanecerá de forma persistente en el modo elegido hasta que lo cambies aquí.
                </span>
              </div>
            </section>

            {/* Preferencias de Interfaz y Alertas */}
            <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#F26522] flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Preferencias de Interfaz y Alertas
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Notificaciones durante el servicio.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <Bell className="w-4 h-4 text-[#F26522] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Mostrar Alertas de Stock
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Muestra un panel lateral cuando detecta insumos agotándose.
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={showAlerts}
                  onChange={handleToggleStockAlerts}
                  ariaLabel="Mostrar Alertas de Stock"
                />
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <Sparkles className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Aviso sonoro al recibir comanda
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Emite un timbre breve en Cocina (KDS) y Caja cuando entra un pedido.
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={soundComandas}
                  onChange={handleToggleSoundComandas}
                  ariaLabel="Aviso sonoro al recibir comanda"
                />
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: ROLES Y PERMISOS */}
        {activeTab === 'permisos' && (
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3.5">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#F26522] flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Configuración de Permisos
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Elige un rol y activa los módulos permitidos.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {[
                { key: 'mozo', label: 'Mozo' },
                { key: 'cocina', label: 'Cocina' },
                { key: 'caja', label: 'Caja' },
              ].map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setSelectedRole(r.key)}
                  className={`min-h-[38px] rounded-lg text-xs font-bold transition-colors cursor-pointer ${selectedRole === r.key
                    ? 'bg-[#F26522] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                    }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {groupedPermissions.map((grp) => (
                <div key={grp.grupo} className="space-y-1.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 px-1">
                    {grp.grupo}
                  </p>
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                    {grp.items.map((mod) => {
                      const enabled = mod[selectedRole];
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => handleTogglePermission(mod.id, selectedRole)}
                          className="w-full min-h-[54px] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left bg-white dark:bg-slate-900 active:bg-slate-50 dark:active:bg-slate-800/60 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {mod.nombre}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {mod.descripcion}
                            </p>
                          </div>
                          <span
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${enabled
                              ? 'bg-[#F26522] border-[#F26522] text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                              }`}
                          >
                            {enabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSavePermissions}
              className={`w-full min-h-[42px] rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${permissionsDirty
                ? 'bg-[#F26522] active:bg-[#DC5616] text-white shadow-[0_6px_16px_-4px_rgba(242,101,34,0.45)]'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{permissionsDirty ? 'Guardar Cambios*' : 'Guardar Cambios'}</span>
            </button>

            <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <Info className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
              <span>
                <strong>Nota:</strong> El rol &quot;Admin&quot; siempre tiene acceso completo a todos los módulos.
              </span>
            </div>
          </section>
        )}

        {/* TAB 3: IMPRESORAS Y HARDWARE */}
        {activeTab === 'impresoras' && (
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-[#F26522]" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Dispositivos de Impresión
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {serverOnline ? 'En línea' : 'Verificando'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Administra impresoras USB, Ethernet y tamaño de papel por estación.
              </p>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Estación de Impresión
              </span>
              <div className="grid grid-cols-2 gap-2">
                {['Caja', 'Cocina'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStation(st);
                      localStorage.setItem('bunker_settings_selected_station', st);
                      loadHardwareData(st);
                      showToast(`Mostrando impresoras asignadas a ${st}.`, 'info');
                    }}
                    className={`min-h-[38px] rounded-xl text-xs font-bold border transition-colors cursor-pointer ${station === st
                      ? 'bg-[#F26522] border-[#F26522] text-white'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5">
                  <Usb className="w-3.5 h-3.5 text-slate-500" />
                  Impresoras USB
                </span>
                <span className="text-[11px] text-slate-400">
                  {printers.filter(p => p.transport === 'USB').length} disp.
                </span>
              </div>

              {printers.filter(p => p.transport === 'USB').length > 0 ? (
                printers.filter(p => p.transport === 'USB').map(usbP => {
                  const isOnline = usbP.ultimoEstado === 'ONLINE' && !usbP.offline;
                  return (
                    <div key={usbP.id} className={`rounded-xl bg-white dark:bg-slate-900 border p-3 space-y-3 transition-colors ${
                      isOnline ? 'border-emerald-400/80 dark:border-emerald-500/80' : 'border-rose-300 dark:border-rose-900/60'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {usbP.nombre}
                          </p>
                          <p className="text-[10px] font-semibold uppercase text-slate-400">
                            USB Windows {usbP.port ? `(${usbP.port})` : ''}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-white text-[10px] font-bold shrink-0 ${
                          isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          {isOnline ? 'CONECTADA' : 'DESCONECTADA'}
                        </span>
                      </div>

                      <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                            Ancho de impresión:
                          </span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {['80mm', '58mm', '50mm'].map((w) => {
                              const isSelected = (printerSizes[usbP.nombre] || usbP.medida || usbWidth) === w;
                              return (
                                <button
                                  key={w}
                                  type="button"
                                  onClick={() => handleSaveUsbWidth(usbP.nombre, w)}
                                  className={`min-h-[34px] rounded-lg text-[11px] font-bold border-0 transition-colors cursor-pointer ${isSelected
                                    ? 'bg-[#F26522] text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                  {w}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                            Perfil de Hardware:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['Genérico', 'SPRT', 'Epson', 'Xprinter', 'Rongta'].map((hw) => {
                              const isSelected = (printerProfiles[usbP.nombre] || usbP.perfil || usbHardware) === hw;
                              return (
                                <button
                                  key={hw}
                                  type="button"
                                  onClick={() => handleSaveUsbProfile(usbP.nombre, hw)}
                                  className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-bold border-0 transition-colors cursor-pointer ${isSelected
                                    ? 'bg-[#F26522] text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                  {hw}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    No se detectaron impresoras USB conectadas a esta estación.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-slate-500" />
                  Impresoras Ethernet
                </span>
                <span className="text-[11px] text-slate-400">
                  {ethLinked ? '1 disp.' : '0 disp.'}
                </span>
              </div>

              {ethLinked ? (
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 space-y-2.5">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      80mm Series Printer Ethernet
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                      IP: <strong className="text-slate-800 dark:text-slate-200">192.168.1.22</strong> · MAC: 28:0e:8b:a3:de:20
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEthRepairing((r) => !r);
                        showToast(
                          ethRepairing
                            ? 'Impresora Ethernet reconectada.'
                            : 'Reiniciando conexión Ethernet...',
                          'info'
                        );
                      }}
                      className={`min-h-[36px] rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer ${ethRepairing
                        ? 'bg-blue-600 text-white'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        }`}
                    >
                      {ethRepairing ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>REPARANDO...</span>
                        </>
                      ) : (
                        <span>EN LÍNEA</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEthLinked(false);
                        showToast('Impresora Ethernet desvinculada.', 'info');
                      }}
                      className="min-h-[36px] rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Unlink className="w-3 h-3" />
                      <span>Desvincular</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 p-3.5 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Sin impresora Ethernet.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEthLinked(true);
                      setEthRepairing(false);
                      showToast('Impresora Ethernet vinculada nuevamente.', 'success');
                    }}
                    className="min-h-[34px] px-3 rounded-lg bg-[#F26522] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Vincular</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowRecoveryLogs((v) => !v)}
                className="w-full min-h-[36px] flex items-center justify-between gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <span className="inline-flex items-center gap-1.5 text-left">
                  <AlertTriangle className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  Historial Auto Recovery
                </span>
                {showRecoveryLogs ? (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showRecoveryLogs && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 divide-y divide-slate-200/60 dark:divide-slate-700 text-xs">
                  {recoveryLogs.map((log) => (
                    <div key={log.id} className="p-3 space-y-0.5">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {log.dispositivo}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                        {log.hora} · {log.resultado}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleRefreshPrinters}
                  disabled={isRefreshingPrinters}
                  className="min-h-[40px] rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50/60 dark:bg-orange-950/30 text-[#F26522] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingPrinters ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestPrint}
                  className="min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Ticket Prueba</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleToggleAuditTicket}
                className={`w-full min-h-[40px] rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer ${auditTicketOn
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Ticket de Auditoría: {auditTicketOn ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </section>
        )}

        {/* TAB 4: TEMAS Y APARIENCIA */}
        {activeTab === 'apariencia' && (
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3.5">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#F26522] flex items-center justify-center shrink-0 mt-0.5">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Temas y Apariencia
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Elige la paleta de color principal del sistema.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {THEMES.map((themeItem) => {
                const isSelected = theme === themeItem.id;
                return (
                  <button
                    key={themeItem.id}
                    type="button"
                    onClick={() => handleSelectTheme(themeItem)}
                    className={`text-left rounded-2xl p-4 border-2 transition-all cursor-pointer ${themeItem.bgClass} ${isSelected ? themeItem.borderActiveClass : 'border-transparent'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10"
                        style={{ color: themeItem.accentHex }}
                      >
                        <Palette className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white tracking-wide"
                          style={{ backgroundColor: themeItem.accentHex }}
                        >
                          {themeItem.badgeText}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2.5 text-sm font-bold text-white">
                      {themeItem.nombre}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-300 leading-relaxed">
                      {themeItem.descripcion}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

      </div>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW (hidden md:flex)                                             */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-[#F26522] shrink-0 mt-0.5 shadow-xs">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-[22px] sm:text-[24px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                Ajustes del Sistema
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configuración ordenada por áreas: operación diaria, permisos, hardware de impresión y apariencia.
              </p>
            </div>
          </div>
        </header>

        {/* Pestañas de Navegación */}
        <nav
          aria-label="Secciones de Ajustes"
          className="flex items-center gap-1.5 border-b border-slate-200/80 dark:border-slate-800 pb-0.5 overflow-x-auto"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[40px] px-4 py-2 rounded-t-xl text-xs font-bold inline-flex items-center gap-2 whitespace-nowrap border-b-2 transition-colors cursor-pointer ${isActive
                  ? 'border-[#F26522] text-[#F26522] bg-orange-50/50 dark:bg-orange-950/20'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* TAB 1: OPERACIÓN Y ALERTAS */}
        {activeTab === 'operacion' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Modo de Operación y Red */}
            <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#F26522] flex items-center justify-center shrink-0">
                  {forceOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Modo de Operación y Red
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Controla la sincronización con el servidor en la nube.
                  </p>
                </div>
              </div>

              <div
                className={`rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-xs font-bold ${forceOffline
                  ? 'border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                  : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                  }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {forceOffline ? (
                    <WifiOff className="w-4 h-4 shrink-0" />
                  ) : (
                    <Wifi className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {forceOffline
                      ? 'MODO OFFLINE — Operando de forma local sin internet'
                      : 'MODO ONLINE — Conectado al servidor en tiempo real'}
                  </span>
                </div>
                {forceOffline && (
                  <button
                    type="button"
                    onClick={handleToggleOffline}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer border-0 shadow-xs active:scale-95"
                  >
                    Restaurar Modo Online
                  </button>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <WifiOff className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Forzar Modo Offline
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Activa el modo offline para realizar pruebas o operar ante cortes de internet.
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={forceOffline}
                  onChange={handleToggleOffline}
                  ariaLabel="Forzar Modo Offline"
                />
              </div>

              <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 p-3 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Nota:</strong> La auto-detección y pings automáticos están deshabilitados. El sistema permanecerá en el modo elegido hasta que lo cambies aquí.
                </span>
              </div>
            </section>

            {/* Preferencias de Interfaz y Alertas */}
            <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#F26522] flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Preferencias de Interfaz y Alertas
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Notificaciones en tiempo real durante el servicio.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Bell className="w-4 h-4 text-[#F26522] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Mostrar Alertas de Stock
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Muestra un panel lateral cuando detecta insumos agotándose.
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={showAlerts}
                    onChange={handleToggleStockAlerts}
                    ariaLabel="Mostrar Alertas de Stock"
                  />
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Sparkles className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Aviso sonoro al recibir comanda
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Emite un timbre breve en Cocina (KDS) y Caja cuando entra un pedido.
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={soundComandas}
                    onChange={handleToggleSoundComandas}
                    ariaLabel="Aviso sonoro al recibir comanda"
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: ROLES Y PERMISOS */}
        {activeTab === 'permisos' && (
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#F26522] flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Configuración de Permisos por Rol
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Módulos ordenados por área operativa. Habilita o deshabilita accesos para Mozo, Cocina y Caja.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSavePermissions}
                className={`min-h-[40px] px-4 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 border-0 ${permissionsDirty
                  ? 'bg-[#F26522] hover:bg-[#DC5616] text-white shadow-[0_6px_16px_-4px_rgba(242,101,34,0.45)]'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{permissionsDirty ? 'Guardar Cambios*' : 'Guardar Cambios'}</span>
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F26522] text-white text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Módulo</th>
                    <th className="py-3 px-4 text-center w-28">Mozo</th>
                    <th className="py-3 px-4 text-center w-28">Cocina</th>
                    <th className="py-3 px-4 text-center w-28">Caja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {groupedPermissions.map((grp) => (
                    <React.Fragment key={grp.grupo}>
                      <tr className="bg-slate-50/90 dark:bg-slate-800/60">
                        <td
                          colSpan={4}
                          className="py-1.5 px-4 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                        >
                          {grp.grupo}
                        </td>
                      </tr>
                      {grp.items.map((mod) => (
                        <tr
                          key={mod.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {mod.nombre}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {mod.descripcion}
                            </p>
                          </td>
                          {['mozo', 'cocina', 'caja'].map((role) => {
                            const checked = !!mod[role];
                            return (
                              <td key={role} className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  aria-label={`Permiso ${mod.nombre} para ${role}`}
                                  onClick={() => handleTogglePermission(mod.id, role)}
                                  className={`w-5 h-5 rounded-md border inline-flex items-center justify-center transition-colors cursor-pointer ${checked
                                    ? 'bg-[#F26522] border-[#F26522] text-white'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-[#F26522]'
                                    }`}
                                >
                                  {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <Info className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>
                <strong>Nota:</strong> El rol &quot;Admin&quot; siempre tiene acceso completo a todos los módulos del sistema.
              </span>
            </div>
          </section>
        )}

        {/* TAB 3: IMPRESORAS Y HARDWARE */}
        {activeTab === 'impresoras' && (
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#F26522] flex items-center justify-center shrink-0 mt-0.5">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Administrador de Dispositivos de Impresión
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Administra impresoras USB y Ethernet, perfiles de hardware y tamaño de papel por estación.
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Servidor Local: {serverOnline ? 'En línea' : 'Desconectado'}
              </span>
            </div>

            {/* Estación de Impresión */}
            <div>
              <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Estación de Impresión:
              </span>
              <div className="inline-flex items-center gap-1.5">
                {['Caja', 'Cocina'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStation(st);
                      localStorage.setItem('bunker_settings_selected_station', st);
                      showToast(`Mostrando impresoras asignadas a ${st}.`, 'info');
                    }}
                    className={`min-h-[34px] px-4 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${station === st
                      ? 'bg-[#F26522] border-[#F26522] text-white'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Impresoras USB */}
            <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5">
                  <Usb className="w-3.5 h-3.5 text-slate-500" />
                  Impresoras USB (Windows)
                </span>
                <span className="text-[11px] text-slate-400">
                  {printers.filter(p => p.transport === 'USB').length} dispositivo(s)
                </span>
              </div>

              {printers.filter(p => p.transport === 'USB').length > 0 ? (
                printers.filter(p => p.transport === 'USB').map(usbP => {
                  const isOnline = usbP.ultimoEstado === 'ONLINE' && !usbP.offline;
                  return (
                    <div key={usbP.id} className={`rounded-xl bg-white dark:bg-slate-900 border p-3.5 space-y-3 transition-colors ${
                      isOnline ? 'border-emerald-400/80 dark:border-emerald-500/60' : 'border-rose-300 dark:border-rose-900/60'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Printer className={`w-4 h-4 ${isOnline ? 'text-[#F26522]' : 'text-slate-400'}`} />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {usbP.nombre}
                          </span>
                          <span className="text-[10px] font-semibold uppercase text-slate-400">
                            USB {usbP.port ? `(${usbP.port})` : ''}
                          </span>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-white text-[10.5px] font-bold ${
                          isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          {isOnline ? 'CONECTADA' : 'DESCONECTADA'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                            Ancho de impresión:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['80mm', '58mm', '50mm'].map((w) => {
                              const isSelected = (printerSizes[usbP.nombre] || usbP.medida || usbWidth) === w;
                              return (
                                <button
                                  key={w}
                                  type="button"
                                  onClick={() => handleSaveUsbWidth(usbP.nombre, w)}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold border-0 cursor-pointer transition-colors ${isSelected
                                    ? 'bg-[#F26522] text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                  {w}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                            Perfil de Hardware:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['Genérico', 'SPRT', 'Epson', 'Xprinter', 'Rongta'].map((hw) => {
                              const isSelected = (printerProfiles[usbP.nombre] || usbP.perfil || usbHardware) === hw;
                              return (
                                <button
                                  key={hw}
                                  type="button"
                                  onClick={() => handleSaveUsbProfile(usbP.nombre, hw)}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold border-0 cursor-pointer transition-colors ${isSelected
                                    ? 'bg-[#F26522] text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                  {hw}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    No se detectaron impresoras USB conectadas a esta estación.
                  </p>
                </div>
              )}
            </div>

            {/* Impresoras Ethernet */}
            <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-slate-500" />
                  Impresoras Ethernet (Red Directa)
                </span>
                <span className="text-[11px] text-slate-400">
                  {ethLinked ? '1 dispositivo(s)' : '0 dispositivos'}
                </span>
              </div>

              {ethLinked ? (
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Printer className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        80mm Series Printer Ethernet (192.168.1.114)
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        ETHERNET
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-1">
                      IP: <strong>192.168.1.22</strong> | MAC:{' '}
                      <strong>28:0e:8b:a3:de:20</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEthRepairing((r) => !r);
                        showToast(
                          ethRepairing
                            ? 'Impresora Ethernet reconectada.'
                            : 'Reiniciando conexión Ethernet...',
                          'info'
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer border-0 ${ethRepairing
                        ? 'bg-blue-600 text-white'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        }`}
                    >
                      {ethRepairing ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>REPARANDO...</span>
                        </>
                      ) : (
                        <span>EN LÍNEA</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEthLinked(false);
                        showToast('Impresora Ethernet desvinculada.', 'info');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer border-0"
                    >
                      <Unlink className="w-3 h-3" />
                      <span>Desvincular</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 p-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    No hay impresoras Ethernet vinculadas.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEthLinked(true);
                      setEthRepairing(false);
                      showToast('Impresora Ethernet vinculada nuevamente.', 'success');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#F26522] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer border-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Vincular</span>
                  </button>
                </div>
              )}
            </div>

            {/* Historial de Reparaciones y Acciones */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => setShowRecoveryLogs((v) => !v)}
                className="w-full flex items-center justify-between gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 py-1 cursor-pointer bg-transparent border-0"
              >
                <span className="inline-flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-sky-500" />
                  Historial de Reparaciones (Búnker Auto Recovery)
                </span>
                {showRecoveryLogs ? (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showRecoveryLogs && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 divide-y divide-slate-200/60 dark:divide-slate-700 text-xs">
                  {recoveryLogs.map((log) => (
                    <div
                      key={log.id}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-2"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {log.dispositivo}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        {log.hora} · {log.resultado}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isRefreshingPrinters}
                    onClick={handleRefreshPrinters}
                    className="min-h-[38px] px-3.5 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/60 dark:bg-orange-950/30 text-[#F26522] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-orange-100/70 dark:hover:bg-orange-900/40 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingPrinters ? 'animate-spin' : ''}`} />
                    <span>Actualizar</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTestPrint}
                    className="min-h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Ticket de Prueba</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleToggleAuditTicket}
                  className={`min-h-[38px] px-3.5 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer ${auditTicketOn
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Ticket de Auditoría: {auditTicketOn ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: TEMAS Y APARIENCIA */}
        {activeTab === 'apariencia' && (
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#F26522] flex items-center justify-center shrink-0 mt-0.5">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Temas y Apariencia
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Elige la paleta de color del panel de barra lateral y acentos principales.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {THEMES.map((themeItem) => {
                const isSelected = theme === themeItem.id;
                return (
                  <button
                    key={themeItem.id}
                    type="button"
                    onClick={() => handleSelectTheme(themeItem)}
                    className={`text-left rounded-2xl p-4 border-2 transition-all cursor-pointer ${themeItem.bgClass} ${isSelected
                      ? themeItem.borderActiveClass
                      : 'border-transparent hover:border-white/20'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10"
                        style={{ color: themeItem.accentHex }}
                      >
                        <Palette className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white tracking-wide"
                          style={{ backgroundColor: themeItem.accentHex }}
                        >
                          {themeItem.badgeText}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-white">
                      {themeItem.nombre}
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">
                      {themeItem.descripcion}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
