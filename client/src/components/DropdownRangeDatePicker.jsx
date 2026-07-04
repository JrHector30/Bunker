import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "./ui/Calendar";
import { Button } from "./ui/Button";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/Popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/Select";
import { Calendar as CalendarIcon } from "lucide-react";
import { CloseButton } from "./ui/CloseButton";

export function DropdownRangeDatePicker({
  mode = "range", // "range" | "single"
  value,
  onChange,
  placeholder = "Filtrar por Fecha",
  triggerClassName = "",
}) {
  const today = new Date();

  // We keep a temporary selection locally until the user clicks "Apply"
  const [tempSelected, setTempSelected] = React.useState(value);
  const [month, setMonth] = React.useState(today.getMonth());
  const [year, setYear] = React.useState(today.getFullYear());
  const [open, setOpen] = React.useState(false);

  // Sync internal state when prop value changes
  React.useEffect(() => {
    setTempSelected(value);

    // Set display month/year based on value if provided
    if (mode === "range" && value?.from) {
      setMonth(value.from.getMonth());
      setYear(value.from.getFullYear());
    } else if (mode === "single" && value) {
      const d = new Date(value);
      setMonth(d.getMonth());
      setYear(d.getFullYear());
    }
  }, [value, mode]);
  // =========================================================
  // 🟢 EFECTO 2 NUEVO: Rompe el rango largo al cambiar de página
  // =========================================================
  React.useEffect(() => {
    setTempSelected(undefined);
  }, [month, year]);
  const displayMonth = new Date(year, month, 1);

  // Formatting helper
  const formatDateValue = (val) => {
    if (!val) return null;
    return format(val, "dd-MM-yyyy", { locale: es });
  };

  const formattedValue = React.useMemo(() => {
    if (mode === "range") {
      const range = value;
      return range?.from
        ? range.to
          ? `${formatDateValue(range.from)} a ${formatDateValue(range.to)}`
          : formatDateValue(range.from)
        : placeholder;
    } else {
      const dateVal = value;
      return dateVal ? formatDateValue(dateVal) : placeholder;
    }
  }, [value, mode, placeholder]);

  const handleApply = () => {
    onChange(tempSelected);
    setOpen(false);
  };

  const handleClear = () => {
    setTempSelected(undefined);
    onChange(undefined);
    setOpen(false);
  };

  const handleTriggerClear = (e) => {
    e.stopPropagation(); // Prevent opening/closing the popover
    handleClear();
  };

  // Helper to check if anything is selected
  const hasValue = mode === "range"
    ? (!!value?.from)
    : (!!value);

  const isApplyDisabled = mode === "range"
    ? !tempSelected?.from
    : !tempSelected;

  return (
    // Contenedor principal relativo de 280px que ahora sí abraza y cuadra a la perfección a la X
    <div className={`relative inline-flex items-center w-[280px] ${triggerClassName}`}>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            // Mantener el padding derecho pr-10 para que el texto de las fechas no se meta debajo de la X
            className="w-full justify-start text-left font-normal pr-10 font-sans"
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-teal-400" />
            <span className="truncate overflow-hidden text-gray-200 font-sans">{formattedValue}</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-4" align="end">
          <div className="space-y-4">
            {/* Dropdowns - Year on the Left, Month on the Right */}
            <div className="flex gap-2 mb-2">
              <Select
                value={year.toString()}
                onValueChange={(val) => setYear(Number(val))}
              >
                <SelectTrigger className="font-sans w-[120px]">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 40 }, (_, i) => today.getFullYear() - 20 + i).map(
                    (y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>

              <Select
                value={month.toString()}
                onValueChange={(val) => setMonth(Number(val))}
              >
                <SelectTrigger className="font-sans w-[140px]">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {format(new Date(2000, i, 1), "MMMM", { locale: es })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Calendar */}
            <Calendar
              mode={mode}
              selected={tempSelected}
              onSelect={setTempSelected}
              month={displayMonth}
              onMonthChange={(date) => {
                setMonth(date.getMonth());
                setYear(date.getFullYear());
              }}
              className="font-sans rounded-lg border border-gray-800 bg-[#060609]"
            />

            {/* Footer */}
            <div className="flex justify-between items-center pt-2 select-none">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClear}
                disabled={mode === "range" ? !tempSelected?.from : !tempSelected}
                className="font-sans !bg-transparent !border-none text-white hover:text-gray-500 font-medium transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none p-0 h-auto"
              >
                Limpiar
              </Button>

              <Button
                size="sm"
                onClick={handleApply}
                disabled={isApplyDisabled}
                className="font-sans !bg-white !text-black hover:!bg-neutral-200 font-semibold px-4 h-8 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none border-none"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* 🎯 LA JUGADA MAESTRA: El CloseButton se renderiza AQUÍ. */}
      {/* Al estar fuera de las etiquetas de Popover, se amarra al div general y el clic es 100% interactivo */}
      {hasValue && (
        <CloseButton
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation(); // Detiene el trigger para que Radix no abra el calendario al hacer clic en borrar
            handleTriggerClear(e);
          }}
          // Se posiciona de forma absoluta milimétricamente flotando en la esquina derecha del input
          className="absolute right-[33px] top-0.1px z-30"
        />
      )}
    </div>
  );
}
