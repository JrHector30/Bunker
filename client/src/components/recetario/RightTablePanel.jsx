import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Search,
  PackagePlus,
  Copy
} from 'lucide-react';

export const RightTablePanel = ({
  items = [],
  warehouseCatalog = [],
  onUpdateQuantity,
  onUpdateUnitCost,
  onUpdateItemWarehouse,
  onDeleteItem,
  onAddItem,
  onDuplicateItem,
  onOpenCatalogModal,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [quickQuantity, setQuickQuantity] = useState('0.100');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Filter items in the table
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(filterQuery.toLowerCase())
  );

  // Totals calculations
  const totalCost = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  // Calculate total gross weight if applicable
  const totalKg = items
    .filter((i) => i.unit === 'kg')
    .reduce((sum, i) => sum + i.quantity, 0);
  const totalLiters = items
    .filter((i) => i.unit === 'l')
    .reduce((sum, i) => sum + i.quantity, 0);

  // Handle quick inline add
  const handleQuickAdd = () => {
    if (!selectedWarehouseId) return;
    const wh = warehouseCatalog.find((w) => w.id === selectedWarehouseId);
    if (!wh) return;

    const qty = parseFloat(quickQuantity) || 0.1;
    onAddItem(wh, qty);
    setSelectedWarehouseId('');
    setQuickQuantity('0.100');
    setIsQuickAddOpen(false);
  };

  return (
    <main className="flex-1 flex flex-col bg-white dark:bg-[#09090b] overflow-hidden transition-colors">
      {/* 1. Header Toolbar de la Tabla */}
      <div className="h-11 px-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-[#0c0d11] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
              Insumos de Receta
            </h2>
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700/50 tabular-nums">
              {items.length} items
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-800 hidden sm:block" />

          {/* Quick search input in table */}
          <div className="relative hidden sm:block w-52">
            <Search className="size-3 text-zinc-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filtrar ingredientes..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full h-7 pl-7 pr-2 bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-lg text-[11px] text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
            className="h-7 px-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/70 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="size-3 text-zinc-500 dark:text-zinc-400" />
            <span className="hidden sm:inline">Fila Rápida</span>
          </button>

          <button
            type="button"
            onClick={onOpenCatalogModal}
            className="h-7 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <PackagePlus className="size-3.5" />
            <span>Agregar Insumo</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Inline Add Bar */}
      {isQuickAddOpen && (
        <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800/80 flex flex-wrap items-center gap-2 text-xs shrink-0 animate-in fade-in duration-150">
          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-semibold">Añadir Insumo de Bodega:</span>

          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="h-7 px-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-blue-500 max-w-xs cursor-pointer"
          >
            <option value="">-- Seleccionar de almacén --</option>
            {warehouseCatalog.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.baseUnit} · S/. {w.unitCost.toFixed(2)})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <span className="text-zinc-500 text-[11px]">Cantidad:</span>
            <input
              type="number"
              step="0.005"
              min="0.001"
              value={quickQuantity}
              onChange={(e) => setQuickQuantity(e.target.value)}
              className="h-7 w-20 px-1.5 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-right font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 tabular-nums"
            />
          </div>

          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={!selectedWarehouseId}
            className="h-7 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Insertar
          </button>

          <button
            type="button"
            onClick={() => setIsQuickAddOpen(false)}
            className="h-7 px-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 text-xs font-medium cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* 3. Spreadsheet Data Grid (Alta Densidad de Filas) */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse border-spacing-0 select-text">
          {/* Table Header Sticky */}
          <thead className="sticky top-0 z-10 bg-zinc-100 dark:bg-[#0e0f14] border-b border-zinc-200 dark:border-zinc-800/90 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            <tr>
              <th className="py-2 pl-4 pr-2 w-8 text-zinc-400 dark:text-zinc-500 text-center">#</th>
              <th className="py-2 px-3 min-w-[200px] text-zinc-700 dark:text-zinc-300">
                Insumo / Materia Prima
              </th>
              <th className="py-2 px-3 w-20 text-center text-zinc-600 dark:text-zinc-400">
                Unidad
              </th>
              <th className="py-2 px-3 w-28 text-right text-zinc-600 dark:text-zinc-400">
                Costo Base (S/.)
              </th>
              <th className="py-2 px-3 w-36 text-right text-zinc-700 dark:text-zinc-300">
                Cant. a Descontar
              </th>
              <th className="py-2 px-3 w-28 text-right text-zinc-700 dark:text-zinc-300">
                Subtotal (S/.)
              </th>
              <th className="py-2 px-3 w-24 text-right text-zinc-600 dark:text-zinc-400">
                % Incidencia
              </th>
              <th className="py-2 pr-4 pl-2 w-16 text-center text-zinc-400 dark:text-zinc-500">
                Acciones
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-xs">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-500">
                  <div className="max-w-xs mx-auto space-y-2">
                    <p className="text-zinc-600 dark:text-zinc-400 text-xs font-medium">
                      No se encontraron ingredientes con ese filtro.
                    </p>
                    <button
                      type="button"
                      onClick={() => setFilterQuery('')}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                    >
                      Limpiar búsqueda
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => {
                const percentOfTotal = totalCost > 0 ? (item.subtotal / totalCost) * 100 : 0;
                const isHighCost = percentOfTotal > 30;

                return (
                  <tr
                    key={item.id}
                    className="group hover:bg-zinc-50 dark:hover:bg-[#13141a] transition-colors"
                  >
                    {/* Index */}
                    <td className="py-1.5 pl-4 pr-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                      {index + 1}
                    </td>

                    {/* Insumo Name & Category */}
                    <td className="py-1.5 px-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-200 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">
                          {item.category}
                        </span>
                      </div>
                    </td>

                    {/* Unidad de Medida (Etiqueta fija en gris) */}
                    <td className="py-1.5 px-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        {item.unit}
                      </span>
                    </td>

                    {/* Costo Unitario Base */}
                    <td className="py-1.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1 text-[11px] text-zinc-700 dark:text-zinc-300 font-medium tabular-nums">
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">S/.</span>
                        <span>{item.unitCost.toFixed(2)}</span>
                      </div>
                    </td>

                    {/* Cantidad a Descontar (Input numérico compacto) */}
                    <td className="py-1.5 px-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step={item.unit === 'und' ? '1' : '0.005'}
                          min="0"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            onUpdateQuantity(item.id, isNaN(val) ? 0 : val);
                          }}
                          className="w-20 h-7 px-1.5 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 group-hover:border-zinc-400 dark:group-hover:border-zinc-700 focus:border-blue-500 rounded text-right text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none transition-colors tabular-nums shadow-2xs"
                        />
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 w-6 text-left font-medium">
                          {item.unit}
                        </span>
                      </div>
                    </td>

                    {/* Subtotal (Calculado en tiempo real con cifras tabulares) */}
                    <td className="py-1.5 px-3 text-right">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        S/. {item.subtotal.toFixed(2)}
                      </span>
                    </td>

                    {/* % Incidencia en el Costo Total */}
                    <td className="py-1.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className={`text-[11px] tabular-nums font-semibold ${isHighCost
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-zinc-500 dark:text-zinc-400'
                            }`}
                        >
                          {percentOfTotal.toFixed(1)}%
                        </span>
                        <div className="w-8 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden hidden xl:block">
                          <div
                            className={`h-full ${isHighCost ? 'bg-amber-500' : 'bg-zinc-400 dark:bg-zinc-600'
                              }`}
                            style={{ width: `${Math.min(percentOfTotal, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Acciones (Minimalista Trash2 y duplicar) */}
                    <td className="py-1.5 pr-4 pl-2 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => onDuplicateItem(item.id)}
                          title="Duplicar ingrediente"
                          className="size-6 rounded text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Copy className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteItem(item.id)}
                          title="Eliminar insumo de la receta"
                          className="size-6 rounded text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Fila Fija de Resumen y Totales (Footer Consolidado) */}
      <div className="h-12 border-t border-zinc-200 dark:border-zinc-800/90 bg-zinc-50 dark:bg-[#0c0d12] px-4 flex items-center justify-between shrink-0 select-none transition-colors">
        {/* Left: Summary Metrics */}
        <div className="flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-300">Escandallo Balanceado</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
            Total Insumos: <strong className="text-zinc-800 dark:text-zinc-200">{items.length}</strong>
          </span>
          {totalKg > 0 && (
            <>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                Peso Sólidos: <strong className="text-zinc-800 dark:text-zinc-200">{(totalKg * 1000).toFixed(0)} g</strong>
              </span>
            </>
          )}
          {totalLiters > 0 && (
            <>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                Líquidos: <strong className="text-zinc-800 dark:text-zinc-200">{(totalLiters * 1000).toFixed(0)} ml</strong>
              </span>
            </>
          )}
        </div>

        {/* Right: Consolidated Total Cost */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-wider font-bold">
            Costo Total de Insumos:
          </span>
          <div className="px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 rounded-lg text-sm font-bold text-zinc-900 dark:text-white tracking-tight tabular-nums shadow-2xs">
            S/. {totalCost.toFixed(2)}
          </div>
        </div>
      </div>
    </main>
  );
};

export default RightTablePanel;
