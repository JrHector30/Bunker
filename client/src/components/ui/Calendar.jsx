import React from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components: userComponents,
  mode = "single",
  ...props
}) {

  // Tamaño ideal y uniforme para celdas y botones sin deformaciones de herencia
  const sizeClass = "h-8 w-8 flex items-center justify-center text-xs text-center p-0 m-0 box-border";
  const buttonReset = "!bg-transparent !border-none !outline-none focus:!outline-none focus:!ring-0 !p-0 !m-0 w-full h-full text-center flex items-center justify-center !rounded-lg transition-all duration-150 cursor-pointer text-gray-300 hover:!bg-gray-800/60";

  const defaultClassNames = {
    root: "rdp-isolated !bg-transparent",

    // 🛡️ ENCAPSULAMIENTO ESTRICTO: Geometría exacta de 260px x 275px con distribución elástica vertical.
    months: "relative flex flex-col bg-[#060609] border border-gray-900 p-4 rounded-xl shadow-2xl w-[260px] h-[275px] box-border select-none mx-auto",
    month: "w-full h-full flex flex-col justify-start space-y-3",

    // Encabezado del mes centrado

    caption_label: "text-xs font-semibold text-gray-100 tracking-tight text-center block capitalize w-full mt-[6px]",

    // Navegación de flechas flotantes puras sin bloques blancos gigantes
    nav: "absolute inset-x-0 top-4 flex justify-between px-3 pointer-events-none z-10 w-full bg-transparent border-none",
    button_previous: "h-7 w-7 flex items-center justify-center text-gray-500 hover:text-white rounded-lg hover:bg-gray-900 pointer-events-auto cursor-pointer transition-colors bg-transparent border-none p-0 m-0",
    button_next: "h-7 w-7 flex items-center justify-center text-gray-500 hover:text-white rounded-lg hover:bg-gray-900 pointer-events-auto cursor-pointer transition-colors bg-transparent border-none p-0 mr-[30px]",

    // 🟢 EL FIX DEL ESPACIO: Estructura del cuerpo de la grilla que distribuye uniformemente las semanas
    month_grid: "w-full flex flex-col space-y-2 flex-1 justify-center",
    table: "w-full border-collapse",

    // Cabecera de días (DO, LU, MA...) alineada simétricamente
    weekdays: "grid grid-cols-7 gap-1 text-center w-full bg-transparent border-none p-0 m-0",
    weekday: "h-8 w-8 flex items-center justify-center text-[10px] font-bold text-gray-500 uppercase tracking-wider p-0 m-0 bg-transparent border-none",

    // 🛡️ REJILLA DE DÍAS: Distribución de 7 columnas con separación vertical orgánica (gap-y)
    week: "grid grid-cols-7 gap-x-1 gap-y-2 w-full bg-transparent border-none p-0 m-0",

    // Celdas y botones transparentes de alta fidelidad
    day: `${sizeClass} bg-transparent border-none p-0 m-0`,
    day_button: buttonReset,

    // Selectores de estado v9 estables
    selected: "!bg-white !text-black font-bold !rounded-lg shadow-md",
    day_selected: "!bg-white !text-black font-bold !rounded-lg",
    today: "border border-teal-500/30 !text-teal-400 font-semibold !rounded-lg !bg-teal-500/5 relative after:absolute after:bottom-1 after:size-1 after:bg-teal-400 after:rounded-full",
    outside: "!text-gray-800 opacity-20 hover:!bg-transparent cursor-default",
    hidden: "invisible",
  };

  const defaultComponents = {
    Chevron: ({ className: iconClass, orientation, ...chevronProps }) => {
      if (orientation === "left") {
        return <ChevronLeft className="text-gray-500 hover:text-white transition-colors" size={14} strokeWidth={2.5} {...chevronProps} />;
      }
      if (orientation === "right") {
        return <ChevronRight className="text-gray-500 hover:text-white transition-colors" size={14} strokeWidth={2.5} {...chevronProps} />;
      }
      return null;
    },
  };

  return (
    <DayPicker
      mode={mode}
      locale={es}
      weekStartsOn={0}
      showOutsideDays={showOutsideDays}
      classNames={defaultClassNames}
      components={defaultComponents}
      formatters={{
        formatMonthCaption: (date) => date.toLocaleString("es-ES", { month: "long", year: "numeric" }),
        formatWeekdayName: (date) => date.toLocaleString("es-ES", { weekday: "short" }).slice(0, 2).toUpperCase(),
      }}
      className={`rdp-isolated ${className || ""}`}
      {...props}
    />
  );
}