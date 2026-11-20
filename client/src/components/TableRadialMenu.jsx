import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Iconos Minimalistas (estilo shadcn.io + ReceiptTextIcon exacto)            */
/* -------------------------------------------------------------------------- */

export const PlusMinimalIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

export const EyeOpenIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const ReceiptTextIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    {...props}
  >
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 2v20l2-1l2 1l2-1l2 1l2-1l2 1l2-1l2 1V2l-2 1l-2-1l-2 1l-2-1l-2 1l-2-1l-2 1Zm10 6H8m8 4H8m5 4H8"
    />
  </svg>
);

export const TransferArrowsIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M8 3 4 7l4 4" />
    <path d="M4 7h16" />
    <path d="m16 21 4-4-4-4" />
    <path d="M20 17H4" />
  </svg>
);

export const UnlinkMinimalIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71" />
    <path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71" />
    <line x1="8" x2="8" y1="2" y2="5" />
    <line x1="2" x2="5" y1="8" y2="8" />
    <line x1="16" x2="16" y1="19" y2="22" />
    <line x1="19" x2="22" y1="16" y2="16" />
  </svg>
);

export const HandPlatterIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M12 3V2m3.4 15.4l3.2-2.8a2 2 0 1 1 2.8 2.9l-3.6 3.3c-.7.8-1.7 1.2-2.8 1.2h-4c-1.1 0-2.1-.4-2.8-1.2l-1.302-1.464A1 1 0 0 0 6.151 19H5"/><path d="M2 14h12a2 2 0 0 1 0 4h-2m-8-8h16M5 10a7 7 0 0 1 14 0"/><path d="M5 14v6a1 1 0 0 1-1 1H2"/></g>
  </svg>
);

/* -------------------------------------------------------------------------- */
/* Menú Circular en Hélice para Mesas Ocupadas                                */
/* -------------------------------------------------------------------------- */

export default function TableRadialMenu({
  table,          // Mesa ocupada seleccionada (con .id, .numero, .mergedWith, .pedidos)
  anchor,         // { x, y } centro del botón de la mesa clicada
  onClose,        // () => setRadialAnchor(null)
  onSelectAction, // (action: 'agregar' | 'pedidos' | 'precuenta' | 'trasladar' | 'separar') => void
  radius = 104,   // 104 en Web PC | 90 en Mobile
}) {
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    if (!table) {
      setHoveredId(null);
      return;
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [table, onClose]);

  // Evita que las opciones se salgan de la pantalla en bordes o celulares
  const safeCenter = useMemo(() => {
    if (!anchor || typeof window === 'undefined') {
      return { x: 200, y: 240 };
    }
    const padX = radius + 56;
    const padY = radius + 60;
    const x = Math.min(
      Math.max(anchor.x, padX),
      Math.max(padX, window.innerWidth - padX)
    );
    const y = Math.min(
      Math.max(anchor.y, padY),
      Math.max(padY, window.innerHeight - padY)
    );
    return { x, y };
  }, [anchor, radius]);

  // Si la mesa es padre de mesas unidas: oculta Trasladar y muestra Separar (solo si pedidos === 0)
  const isMergedParent = Boolean(
    (table?.mergedWith && table.mergedWith.length > 0) ||
    (table?.mesasHijas && table.mesasHijas.length > 0)
  );
  const hasOrders = Boolean(
    (table && table.pedidos && table.pedidos.length > 0) ||
    (table && table.comandas && table.comandas.some(c => c.detalles && c.detalles.length > 0))
  );

  const radialItems = [
    {
      id: 'agregar',
      label: 'Agregar',
      x: 0,
      y: -radius,
      icon: <PlusMinimalIcon className="w-[19px] h-[19px]" />,
    },
    {
      id: 'pedidos',
      label: 'Pedidos',
      x: radius,
      y: 0,
      icon: <EyeOpenIcon className="w-[19px] h-[19px]" />,
    },
    {
      id: 'precuenta',
      label: 'Pre-cuenta',
      x: 0,
      y: radius,
      icon: <ReceiptTextIcon className="w-[19px] h-[19px]" />,
    },
    isMergedParent
      ? {
          id: 'separar',
          label: 'Separar',
          x: -radius,
          y: 0,
          icon: <UnlinkMinimalIcon className="w-[19px] h-[19px]" />,
          disabled: hasOrders,
          disabledTitle: hasOrders
            ? 'No se puede separar porque ya se tomó un pedido'
            : 'Separar mesas unidas',
        }
      : {
          id: 'trasladar',
          label: 'Trasladar',
          x: -radius,
          y: 0,
          icon: <TransferArrowsIcon className="w-[19px] h-[19px]" />,
        },
  ];

  return (
    <AnimatePresence>
      {table && anchor && (
        <motion.div
          key={`radial-menu-${table.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.18 } }}
          exit={{ opacity: 0, transition: { duration: 0.22, delay: 0.24 } }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-white/20 dark:bg-neutral-950/30 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label={`Opciones de Mesa ${table.numero}`}
        >
          <div
            style={{
              position: 'fixed',
              left: `${safeCenter.x}px`,
              top: `${safeCenter.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-none"
          >
            {/* Órbita giratoria en hélice: abre (-115° -> 0°) y cierra hacia dentro (0° -> -135°) */}
            <motion.div
              initial={{ rotate: -115 }}
              animate={{
                rotate: 0,
                transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
              }}
              exit={{
                rotate: -135,
                transition: { duration: 0.38, ease: [0.4, 0, 0.2, 1] },
              }}
              className="absolute left-0 top-0 pointer-events-none"
            >
              {radialItems.map((item, idx) => {
                const isHovered = hoveredId === item.id;
                const reverseIdx = radialItems.length - 1 - idx;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ x: 0, y: 0, scale: 0.25, opacity: 0 }}
                    animate={{
                      x: item.x,
                      y: item.y,
                      scale: 1,
                      opacity: 1,
                      transition: {
                        type: 'spring',
                        stiffness: 340,
                        damping: 25,
                        delay: idx * 0.035,
                      },
                    }}
                    exit={{
                      x: 0,
                      y: 0,
                      scale: 0.2,
                      opacity: 0,
                      transition: {
                        duration: 0.32,
                        ease: [0.4, 0, 0.2, 1],
                        delay: reverseIdx * 0.03,
                      },
                    }}
                    className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                  >
                    {/* Contra-rotación exacta para mantener icono y texto siempre horizontales */}
                    <motion.div
                      initial={{ rotate: 115 }}
                      animate={{
                        rotate: 0,
                        transition: {
                          duration: 0.42,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      }}
                      exit={{
                        rotate: 135,
                        transition: {
                          duration: 0.38,
                          ease: [0.4, 0, 0.2, 1],
                        },
                      }}
                      className="relative flex flex-col items-center"
                    >
                      <motion.button
                        type="button"
                        onClick={() => onSelectAction(item.id)}
                        onMouseEnter={() => setHoveredId(item.id)}
                        onMouseLeave={() =>
                          setHoveredId((cur) => (cur === item.id ? null : cur))
                        }
                        onFocus={() => setHoveredId(item.id)}
                        onBlur={() =>
                          setHoveredId((cur) => (cur === item.id ? null : cur))
                        }
                        animate={{
                          scale: isHovered && !item.disabled ? 1.18 : 1,
                        }}
                        whileTap={{ scale: item.disabled ? 1 : 0.96 }}
                        transition={{
                          type: 'spring',
                          stiffness: 420,
                          damping: 24,
                        }}
                        title={item.disabledTitle}
                        aria-label={item.label}
                        aria-disabled={item.disabled}
                        className={`border-0 w-[54px] h-[54px] rounded-full shadow-[0_4px_14px_rgba(15,23,42,0.10)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.45)] flex items-center justify-center transition-colors ${
                          item.disabled
                            ? 'bg-neutral-200/80 dark:bg-neutral-800/60 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                            : 'bg-[#F4F4F5] dark:bg-neutral-800 hover:bg-white dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 cursor-pointer'
                        }`}
                      >
                        {item.icon}
                      </motion.button>

                      {/* Título en texto plano debajo del botón, sin badge ni fondo */}
                      <span
                        className={`pointer-events-none absolute top-[60px] text-[12px] tracking-tight [text-shadow:0_1px_6px_rgba(255,255,255,0.95)] dark:[text-shadow:0_1px_6px_rgba(0,0,0,0.9)] whitespace-nowrap transition-all duration-150 ${
                          item.disabled
                            ? 'text-neutral-400 dark:text-neutral-500 font-medium opacity-75'
                            : isHovered
                              ? 'text-neutral-900 dark:text-neutral-100 font-semibold translate-y-1.5 opacity-100'
                              : 'text-neutral-900 dark:text-neutral-100 font-medium translate-y-0 opacity-90'
                        }`}
                      >
                        {item.label}
                      </span>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Botón central negro con X (permanece arriba absorbiendo las opciones al cerrar) */}
            <motion.button
              type="button"
              initial={{ scale: 0.55, rotate: -90, opacity: 0 }}
              animate={{
                scale: 1,
                rotate: 0,
                opacity: 1,
                transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
              }}
              exit={{
                scale: 0.45,
                rotate: -90,
                opacity: 0,
                transition: {
                  duration: 0.22,
                  delay: 0.2,
                  ease: [0.4, 0, 0.2, 1],
                },
              }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={onClose}
              aria-label={`Cerrar menú de Mesa ${table.numero}`}
              className="border-0 pointer-events-auto absolute left-0 top-0 z-10 -translate-x-1/2 -translate-y-1/2 w-[52px] h-[52px] rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center cursor-pointer shadow-md"
            >
              <X className="w-[18px] h-[18px] stroke-[2]" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
