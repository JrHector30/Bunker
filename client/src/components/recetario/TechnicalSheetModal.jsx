import React from 'react';
import { X, Printer } from 'lucide-react';
import logoMinimalista from '../../assets/logo_minimalist.png';

export const TechnicalSheetModal = ({
  isOpen,
  onClose,
  recipe,
}) => {
  if (!isOpen || !recipe) return null;

  const totalCost = (recipe.items || []).reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const costPerPortion = recipe.portions > 0 ? totalCost / recipe.portions : totalCost;
  const grossMargin = (recipe.pvp || 0) - costPerPortion;
  const foodCostPercent = (recipe.pvp || 0) > 0 ? (costPerPortion / recipe.pvp) * 100 : 0;
  const marginPercent = (recipe.pvp || 0) > 0 ? (grossMargin / recipe.pvp) * 100 : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white dark:bg-[#0f1015] border border-zinc-200 dark:border-zinc-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-[#13141a]">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded bg-zinc-900 dark:bg-zinc-800 text-white flex items-center justify-center p-1">
              <img src={logoMinimalista} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Búnker · Ficha Técnica & Escandallo Oficial de Producción
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="h-7 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-transparent rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="size-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="size-7 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Printable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white dark:bg-[#09090b] text-zinc-800 dark:text-zinc-200 print:text-black print:bg-white">
          {/* Header Card */}
          <div className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl bg-zinc-50 dark:bg-[#111218] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-bold">CÓDIGO: {recipe.code}</span>
                <span>·</span>
                <span>CATEGORÍA: {recipe.category}</span>
              </div>
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white mt-1">{recipe.name}</h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-lg">{recipe.notes}</p>
            </div>

            <div className="text-right border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 pt-2 md:pt-0 md:pl-4">
              <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 block">
                Precio de Venta al Público (PVP)
              </span>
              <span className="text-2xl font-extrabold text-zinc-900 dark:text-white tabular-nums">
                S/. {(recipe.pvp || 0).toFixed(2)}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                Rendimiento: {recipe.portions} {recipe.portions === 1 ? 'porción' : 'porciones'}
              </span>
            </div>
          </div>

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121318]">
              <span className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400 font-bold">Costo Total</span>
              <p className="text-base font-extrabold text-zinc-900 dark:text-white mt-0.5 tabular-nums">
                S/. {totalCost.toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121318]">
              <span className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400 font-bold">Costo x Porción</span>
              <p className="text-base font-extrabold text-zinc-900 dark:text-white mt-0.5 tabular-nums">
                S/. {costPerPortion.toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121318]">
              <span className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400 font-bold">Margen Bruto</span>
              <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                S/. {grossMargin.toFixed(2)} ({marginPercent.toFixed(1)}%)
              </p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121318]">
              <span className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400 font-bold">Food Cost %</span>
              <p className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums">
                {foodCostPercent.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Table Breakdown */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-100 dark:bg-zinc-900/80 text-[10px] uppercase text-zinc-600 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Insumo</th>
                  <th className="py-2 px-3 text-center">Unidad</th>
                  <th className="py-2 px-3 text-right">Cantidad Descuento</th>
                  <th className="py-2 px-3 text-right">Costo Unitario</th>
                  <th className="py-2 px-3 text-right">Subtotal</th>
                  <th className="py-2 px-3 text-right">% Costo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {(recipe.items || []).map((item, idx) => {
                  const pct = totalCost > 0 ? (item.subtotal / totalCost) * 100 : 0;
                  return (
                    <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                      <td className="py-1.5 px-3 text-zinc-400 dark:text-zinc-500 tabular-nums">{idx + 1}</td>
                      <td className="py-1.5 px-3 font-semibold text-zinc-900 dark:text-zinc-200">
                        {item.name}
                      </td>
                      <td className="py-1.5 px-3 text-center text-zinc-500 dark:text-zinc-400">{item.unit}</td>
                      <td className="py-1.5 px-3 text-right text-zinc-800 dark:text-zinc-200 tabular-nums">{item.quantity}</td>
                      <td className="py-1.5 px-3 text-right text-zinc-600 dark:text-zinc-400 tabular-nums">
                        S/. {(item.unitCost || 0).toFixed(2)}
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-zinc-900 dark:text-white tabular-nums">
                        S/. {(item.subtotal || 0).toFixed(2)}
                      </td>
                      <td className="py-1.5 px-3 text-right text-zinc-500 dark:text-zinc-400 tabular-nums">{pct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-zinc-100 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-900 dark:text-white">
                <tr>
                  <td colSpan={5} className="py-2 px-3 text-right uppercase">
                    Costo Total Directo de Receta:
                  </td>
                  <td className="py-2 px-3 text-right text-blue-600 dark:text-blue-400 tabular-nums">
                    S/. {totalCost.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800/60">
            <span>Sistema: Búnker POS/ERP Gastronómico</span>
            <span>Responsable: {recipe.author} · Última revisión: {recipe.lastUpdated}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicalSheetModal;
