import { useState, useEffect, FormEvent } from 'react';
import { 
  Terminal, 
  Bug, 
  Sparkles, 
  BookOpen, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Settings2, 
  Info,
  Calendar,
  AlertTriangle,
  FileText,
  MousePointerClick
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CategorizedCombobox from './components/CategorizedCombobox';
import Loader from './components/Loader';
import { ComboboxItem, ActivityLog, ItemCategory } from './types';

// Initial items exactly corresponding to the image + extra mock data
const INITIAL_ITEMS: ComboboxItem[] = [
  {
    id: 'bug-1',
    name: 'Bug Report',
    category: 'Bugs',
    description: 'Report of a visual glitch in the navigation sidebar layout on tablet devices.',
    createdDate: '2026-07-06',
    priority: 'High',
    status: 'Open'
  },
  {
    id: 'feature-1',
    name: 'Feature Request',
    category: 'Features',
    description: 'Request to support exporting analytics reports in CSV format.',
    createdDate: '2026-07-05',
    priority: 'Medium',
    status: 'In Progress'
  },
  {
    id: 'doc-1',
    name: 'Documentation',
    category: 'Docs',
    description: 'Comprehensive setup guide and API reference for developer onboarding.',
    createdDate: '2026-07-04',
    priority: 'Low',
    status: 'Resolved'
  },
  {
    id: 'bug-2',
    name: 'Critical Bug',
    category: 'Bugs',
    description: 'NullPointerException occurring during payment processing at checkout.',
    createdDate: '2026-07-06',
    priority: 'Urgent',
    status: 'Open'
  },
  {
    id: 'feature-2',
    name: 'New Feature',
    category: 'Features',
    description: 'Implementation of custom drag-and-drop kanban boards for issue tracking.',
    createdDate: '2026-07-03',
    priority: 'High',
    status: 'In Progress'
  },
  {
    id: 'bug-3',
    name: 'Memory Leak on Chat Window',
    category: 'Bugs',
    description: 'Unmounted message handlers causing rapid heap allocation in long-running tabs.',
    createdDate: '2026-07-01',
    priority: 'Medium',
    status: 'Open'
  },
  {
    id: 'feature-3',
    name: 'Dark Mode Preference Toggle',
    category: 'Features',
    description: 'Adding secure local storage preference to persist screen contrast themes.',
    createdDate: '2026-07-02',
    priority: 'Low',
    status: 'Closed'
  },
  {
    id: 'doc-2',
    name: 'API Authentication Reference',
    category: 'Docs',
    description: 'Step-by-step tutorial outlining secure bearer token headers and token lifetimes.',
    createdDate: '2026-06-30',
    priority: 'Medium',
    status: 'Resolved'
  }
];

export default function App() {
  const [items, setItems] = useState<ComboboxItem[]>(INITIAL_ITEMS);
  const [selectedItem, setSelectedItem] = useState<ComboboxItem | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [closeOnSelect, setCloseOnSelect] = useState(true);
  const [showCheckerboard, setShowCheckerboard] = useState(true);
  
  // Loading Simulation States
  const [isLoaderActive, setIsLoaderActive] = useState(false);
  const [pendingSelectionItem, setPendingSelectionItem] = useState<ComboboxItem | null>(null);
  const [isSimulateLoadingEnabled, setIsSimulateLoadingEnabled] = useState(true);

  // New item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ItemCategory>('Features');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemPriority, setNewItemPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');

  // Push log function
  const addLog = (type: ActivityLog['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    setLogs((prev) => [
      { id: Math.random().toString(36).substring(7), timestamp, type, message },
      ...prev
    ]);
  };

  // Log on initial render
  useEffect(() => {
    addLog('info', 'Aplicación iniciada. Combobox cargado con los datos de la imagen.');
  }, []);

  // Sync selected item in case it gets deleted
  useEffect(() => {
    if (selectedItem && !items.find((i) => i.id === selectedItem.id)) {
      setSelectedItem(null);
    }
  }, [items, selectedItem]);

  // Handle adding new custom option
  const handleAddNewItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const item: ComboboxItem = {
      id: `${newItemCategory.toLowerCase()}-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory,
      description: newItemDescription.trim() || 'No description provided.',
      createdDate: new Date().toISOString().split('T')[0],
      priority: newItemPriority,
      status: 'Open'
    };

    setItems((prev) => [item, ...prev]);
    addLog('add', `Añadida opción "${item.name}" bajo categoría "${item.category}"`);
    
    // Reset form
    setNewItemName('');
    setNewItemDescription('');
    setNewItemPriority('Medium');
  };

  // Reset to initial mockup state
  const handleReset = () => {
    setItems(INITIAL_ITEMS);
    setSelectedItem(null);
    setLogs([]);
    addLog('reset', 'Restablecidas las opciones originales del combobox.');
  };

  // Delete selected item
  const handleDeleteItem = (id: string, name: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    addLog('delete', `Eliminada opción "${name}"`);
  };

  // Handle selected item request with optional loading animation
  const handleSelectRequest = (item: ComboboxItem | null) => {
    if (item === null) {
      setSelectedItem(null);
      addLog('select', 'Selección de ítem limpiada.');
      return;
    }

    if (isSimulateLoadingEnabled) {
      setPendingSelectionItem(item);
      setIsLoaderActive(true);
      addLog('info', `Validando y cargando selección para "${item.name}"...`);
    } else {
      setSelectedItem(item);
      addLog('select', `Seleccionado con éxito: "${item.name}"`);
    }
  };

  const handleLoaderComplete = () => {
    setIsLoaderActive(false);
    if (pendingSelectionItem) {
      setSelectedItem(pendingSelectionItem);
      addLog('select', `¡Éxito! Selección confirmada: "${pendingSelectionItem.name}"`);
      setPendingSelectionItem(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Upper Navigation Bar */}
      <header className="border-b border-slate-200/70 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-md shrink-0">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Categorized Combobox
                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                  Clean Minimalism
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Componente interactivo con agrupación por categorías y lógica de selección única
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              id="reset-state-button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.75 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restablecer Valores
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Interactive Preview Canvas */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden flex flex-col h-full min-h-[460px]">
            {/* Tab header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Interactive Canvas
                </span>
              </div>
              
              {/* Canvas controls */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="checkerboard-toggle"
                    type="checkbox"
                    checked={showCheckerboard}
                    onChange={(e) => setShowCheckerboard(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-600">Fondo Reticulado</span>
                </label>
              </div>
            </div>

            {/* Canvas Area */}
            <div 
              id="canvas-viewport"
              className={`flex-1 flex flex-col items-center justify-start p-12 transition-all relative ${
                showCheckerboard 
                  ? 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] bg-slate-50/40' 
                  : 'bg-white'
              }`}
            >
              {/* Centered Loader overlay */}
              <AnimatePresence>
                {isLoaderActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-50/70 backdrop-blur-xs z-30 flex flex-col items-center justify-center gap-4"
                  >
                    <div className="bg-white border border-slate-200/80 shadow-xl rounded-2xl p-8 flex flex-col items-center gap-4 text-center max-w-xs">
                      <Loader 
                        isLoading={isLoaderActive} 
                        onComplete={handleLoaderComplete} 
                        durationMs={2000}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Validando Selección
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Procesando cambios en el servidor...
                        </p>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Informative Floating Banner */}
              <div className="absolute top-4 left-4 right-4 bg-indigo-50/90 border border-indigo-100/80 backdrop-blur-xs p-3.5 rounded-lg flex gap-2.5 items-start text-xs text-indigo-900 shadow-xs max-w-md">
                <Info className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  Haga clic en el menú <strong className="text-indigo-950">"Select item..."</strong> a continuación. Es un combobox de <strong className="text-indigo-950">categoría única</strong>: puede cambiar la categoría y la búsqueda mantendrá la correcta navegación.
                </div>
              </div>

              {/* Centered Combobox Component Wrapper */}
              <div className="my-auto py-16 w-full flex flex-col items-center">
                <CategorizedCombobox
                  items={items}
                  selectedItem={selectedItem}
                  onSelect={handleSelectRequest}
                  onLog={addLog}
                  closeOnSelect={closeOnSelect}
                />
              </div>

              {/* Background watermark reflecting professional craft */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[9px] font-mono font-semibold text-slate-400 select-none">
                <span>SINGLE-SELECTION ENGINE</span>
                <span>CLEAN MINIMALISM THEME</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Configuration & Details */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Section 1: Selected Item Detail */}
          <AnimatePresence mode="wait">
            {selectedItem ? (
              <motion.div
                id="selected-item-card"
                key={selectedItem.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`border rounded-xl p-5 shadow-xs transition-all ${
                  selectedItem.category === 'Bugs' 
                    ? 'bg-red-50/40 border-red-100 text-red-950' 
                    : selectedItem.category === 'Features'
                    ? 'bg-indigo-50/30 border-indigo-100 text-indigo-950'
                    : 'bg-emerald-50/40 border-emerald-100 text-emerald-950'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md border ${
                    selectedItem.category === 'Bugs' 
                      ? 'bg-red-100/80 border-red-200 text-red-800' 
                      : selectedItem.category === 'Features'
                      ? 'bg-indigo-100 border-indigo-200 text-indigo-800'
                      : 'bg-emerald-100/80 border-emerald-200 text-emerald-800'
                  }`}>
                    {selectedItem.category}
                  </span>
                  
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{selectedItem.createdDate}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold tracking-tight text-slate-900 mb-1.5">
                  {selectedItem.name}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {selectedItem.description}
                </p>

                {/* Additional parameters mimicking an actual issues tracker */}
                <div className="grid grid-cols-2 gap-3 pt-3.5 border-t border-slate-200/60 text-xs">
                  <div>
                    <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      PRIORIDAD
                    </span>
                    <span className={`inline-flex items-center gap-1 font-semibold ${
                      selectedItem.priority === 'Urgent' ? 'text-red-600' :
                      selectedItem.priority === 'High' ? 'text-orange-600' :
                      selectedItem.priority === 'Medium' ? 'text-amber-600' : 'text-slate-500'
                    }`}>
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      {selectedItem.priority}
                    </span>
                  </div>
                  
                  <div>
                    <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      ESTADO ACTUAL
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                      {selectedItem.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 flex justify-end">
                  <button
                    id="delete-item-button"
                    onClick={() => handleDeleteItem(selectedItem.id, selectedItem.name)}
                    className="flex items-center gap-1.5 px-2.5 py-1.25 text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Eliminar Opción
                  </button>
                </div>
              </motion.div>
            ) : (
              <div 
                id="no-selection-placeholder"
                className="border border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center bg-white min-h-[170px] shadow-sm"
              >
                <div className="p-3 bg-slate-50 rounded-full text-slate-400 mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Ninguna opción seleccionada</h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  Interactúe con el combobox de arriba para seleccionar un ítem de la lista y ver su información detallada.
                </p>
              </div>
            )}
          </AnimatePresence>

          {/* Section 2: Component Settings */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5 select-none">
              <Settings2 className="w-3.5 h-3.5" />
              Configuraciones del Componente
            </h3>
            
            <div className="flex flex-col gap-4">
              <label className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-800">Cerrar al Seleccionar</span>
                  <span className="text-[10px] text-slate-400">Oculta el desplegable una vez elegido el elemento</span>
                </div>
                <input
                  id="close-on-select-toggle"
                  type="checkbox"
                  checked={closeOnSelect}
                  onChange={(e) => setCloseOnSelect(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              <hr className="border-slate-100" />

              <label className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-800">Simulación con Loader</span>
                  <span className="text-[10px] text-slate-400">Prueba la animación de carga y splash al seleccionar</span>
                </div>
                <input
                  id="simulate-loading-toggle"
                  type="checkbox"
                  checked={isSimulateLoadingEnabled}
                  onChange={(e) => setIsSimulateLoadingEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  setIsLoaderActive(true);
                  addLog('info', 'Iniciando demostración manual de animación de carga y splash...');
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                Probar Splash Loader
              </button>
            </div>
          </div>

          {/* Section 3: Add New Option (Dynamically Feed Data) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5 select-none">
              <Plus className="w-3.5 h-3.5" />
              Agregar Nueva Opción
            </h3>

            <form onSubmit={handleAddNewItem} className="flex flex-col gap-3">
              <div>
                <label htmlFor="new-item-name" className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nombre del Ítem
                </label>
                <input
                  id="new-item-name"
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Ej: Hotfix Safari UI"
                  className="w-full px-3 py-1.75 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-lg outline-hidden transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Categoría
                  </label>
                  <select
                    id="new-item-category"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as ItemCategory)}
                    className="w-full px-2 py-1.75 bg-slate-50 text-xs text-slate-900 border border-slate-200 focus:border-indigo-500 rounded-lg outline-hidden transition-all cursor-pointer"
                  >
                    <option value="Bugs">🐛 Bugs</option>
                    <option value="Features">✨ Features</option>
                    <option value="Docs">📚 Docs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Prioridad
                  </label>
                  <select
                    id="new-item-priority"
                    value={newItemPriority}
                    onChange={(e) => setNewItemPriority(e.target.value as any)}
                    className="w-full px-2 py-1.75 bg-slate-50 text-xs text-slate-900 border border-slate-200 focus:border-indigo-500 rounded-lg outline-hidden transition-all cursor-pointer"
                  >
                    <option value="Low">Baja</option>
                    <option value="Medium">Media</option>
                    <option value="High">Alta</option>
                    <option value="Urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="new-item-desc" className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  id="new-item-desc"
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Detalles sobre este ítem..."
                  rows={2}
                  className="w-full px-3 py-1.75 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-lg outline-hidden transition-all resize-none"
                />
              </div>

              <button
                id="add-item-submit"
                type="submit"
                disabled={!newItemName.trim()}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm mt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir al Listado
              </button>
            </form>
          </div>

          {/* Section 4: Event Logging Terminal */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[200px]">
            <div className="flex items-center justify-between mb-2.5 select-none">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Registro de Actividad
              </h3>
              {logs.length > 0 && (
                <button
                  id="clear-logs-button"
                  onClick={() => setLogs([])}
                  className="text-[10px] font-semibold text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  Limpiar logs
                </button>
              )}
            </div>

            <div id="logs-container" className="flex-1 overflow-y-auto bg-slate-950 rounded-lg p-3 font-mono text-[9px] text-slate-300 flex flex-col gap-1.5">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-slate-500 select-none shrink-0">[{log.timestamp}]</span>
                    <span className={`font-bold shrink-0 uppercase tracking-wider ${
                      log.type === 'select' ? 'text-indigo-400' :
                      log.type === 'filter' ? 'text-amber-400' :
                      log.type === 'search' ? 'text-purple-400' :
                      log.type === 'add' ? 'text-emerald-400' :
                      log.type === 'delete' ? 'text-red-400' : 'text-slate-400'
                    }`}>
                      {log.type}:
                    </span>
                    <span className="text-slate-200">{log.message}</span>
                  </div>
                ))
              ) : (
                <div className="my-auto text-center text-slate-500 italic">
                  No hay actividad registrada
                </div>
              )}
            </div>
          </div>

        </section>
      </main>

      {/* Aesthetic footer */}
      <footer className="border-t border-slate-200/60 bg-white py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            &copy; 2026 Categorized Combobox. Diseñado con precisión y cariño.
          </div>
          <div className="flex gap-4">
            <span>React 19</span>
            <span>Tailwind v4</span>
            <span>Motion</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
