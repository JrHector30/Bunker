import React, { useState } from 'react';
import { 
  Home, 
  Utensils, 
  ChefHat, 
  DollarSign, 
  FolderTree, 
  ClipboardList, 
  BookOpen, 
  Package, 
  FileText, 
  TrendingUp, 
  ShieldCheck, 
  Users, 
  BarChart3, 
  HelpCircle, 
  Settings, 
  Moon, 
  Sun, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  activeChef: { name: string; role: string };
}

export default function Sidebar({ isDarkMode, setIsDarkMode, activeChef }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(true);

  const menuItems = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'mesas', label: 'Mesas', icon: Utensils },
    { id: 'cocina', label: 'Cocina', icon: ChefHat, active: true },
    { id: 'caja', label: 'Caja', icon: DollarSign },
    { id: 'categorias', label: 'Categorías', icon: FolderTree },
  ];

  const logisticsItems = [
    { id: 'menu', label: 'Menú (Platos)', icon: BookOpen },
    { id: 'inventario', label: 'Inventario (Insumos)', icon: Package },
    { id: 'recetarios', label: 'Recetarios (Costeo)', icon: FileText },
    { id: 'kardex', label: 'Kardex', icon: TrendingUp },
    { id: 'auditoria', label: 'Auditoría', icon: ShieldCheck },
  ];

  const systemItems = [
    { id: 'usuarios', label: 'Usuarios', icon: Users },
    { id: 'reportes', label: 'Reportes', icon: BarChart3 },
    { id: 'soporte', label: 'Atención y Soporte', icon: HelpCircle },
    { id: 'ajustes', label: 'Ajustes', icon: Settings },
  ];

  return (
    <motion.aside
      id="sidebar-container"
      animate={{ width: isCollapsed ? '72px' : '260px' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`h-screen sticky top-0 flex flex-col justify-between shrink-0 border-r z-30 transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-[#0D1117] border-[#30363D] text-slate-300' 
          : 'bg-white border-slate-100 text-slate-600'
      }`}
    >
      {/* Top Brand Logo */}
      <div className="flex flex-col">
        <div className="p-4 flex items-center gap-3 border-b border-transparent">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/25">
            <Flame className="w-6 h-6 animate-pulse text-indigo-100" />
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col"
            >
              <span className="font-bold tracking-wider text-sm text-slate-800 dark:text-white uppercase">
                Búnker
              </span>
              <span className="text-[10px] text-indigo-500 font-semibold tracking-widest uppercase">
                SISTEMA
              </span>
            </motion.div>
          )}
        </div>
 
        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-180px)] px-2 py-4 space-y-1 scrollbar-thin">
          {/* Main Menu */}
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                item.active
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-semibold'
                  : isDarkMode
                    ? 'hover:bg-slate-900 hover:text-white'
                    : 'hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-4 h-4 shrink-0 ${item.active ? 'text-white' : 'text-slate-400'}`} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          ))}

          {/* Logistics Section */}
          <div className="pt-2">
            {!isCollapsed && (
              <button
                onClick={() => setIsLogisticsOpen(!isLogisticsOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-400 tracking-wider uppercase hover:text-slate-500 dark:hover:text-slate-300"
              >
                <span>Logística</span>
                <ChevronLeft className={`w-3 h-3 transition-transform duration-200 ${isLogisticsOpen ? '-rotate-90' : ''}`} />
              </button>
            )}

            <AnimatePresence initial={false}>
              {(isLogisticsOpen || isCollapsed) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-0.5 overflow-hidden mt-1"
                >
                  {logisticsItems.map((item) => (
                    <button
                      key={item.id}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isDarkMode
                          ? 'hover:bg-slate-900 hover:text-white'
                          : 'hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* System Section */}
          <div className="pt-2">
            {!isCollapsed && (
              <span className="block px-3 py-1.5 text-xs font-semibold text-slate-400 tracking-wider uppercase">
                Administración
              </span>
            )}
            {systemItems.map((item) => (
              <button
                key={item.id}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDarkMode
                    ? 'hover:bg-slate-900 hover:text-white'
                    : 'hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0 text-slate-400" />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Section: Dark Mode, Chef Profile, and Actions */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-900 space-y-2.5">
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isDarkMode 
              ? 'bg-slate-900 text-slate-200 hover:bg-slate-800' 
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {isDarkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              {!isCollapsed && <span>Modo Claro</span>}
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
              {!isCollapsed && <span>Modo Oscuro</span>}
            </>
          )}
        </button>

        {/* User Profile Block */}
        {!isCollapsed ? (
          <div className={`p-2.5 rounded-xl border flex items-center gap-3 ${
            isDarkMode ? 'bg-slate-900/40 border-slate-900' : 'bg-slate-50/60 border-slate-100'
          }`}>
            <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white shadow-sm shrink-0 uppercase text-sm">
              {activeChef.name.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-slate-800 dark:text-white">{activeChef.name}</p>
              <p className="text-[10px] text-slate-400 truncate uppercase font-medium">{activeChef.role}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white shadow-sm shrink-0 uppercase text-sm">
              {activeChef.name.substring(0, 2)}
            </div>
          </div>
        )}

        {/* Collapse and Logout Actions */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isDarkMode ? 'hover:bg-slate-900 hover:text-white' : 'hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 shrink-0 text-slate-400" />
            )}
            {!isCollapsed && <span>Contraer menú</span>}
          </button>

          <button
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-500 transition-colors ${
              isDarkMode ? 'hover:bg-red-950/30' : 'hover:bg-red-50'
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0 text-red-400" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
