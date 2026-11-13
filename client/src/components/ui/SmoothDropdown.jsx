import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import useMeasure from "react-use-measure";
import {
  MoreVertical,
  MoreHorizontal,
  FileText,
  FolderOpen,
  Download,
} from "lucide-react";

const menuItems = [
  { id: "paloteo", label: "Resumen / Paloteo (Actual)", icon: FileText },
  { id: "resumen", label: "Resumen de Caja", icon: FolderOpen },
  { id: "pdf", label: "Exportar a PDF", icon: Download },
];

const easeOutQuint = [0.23, 1, 0.32, 1];

export default function SmoothDropdown({
  id,
  dropUp = false,
  onAction,
  items,
  compact = false,
  triggerIcon: TriggerIcon = null,
  isHighlighted = false,
  align = "right",
  openWidth = 220,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const containerRef = useRef(null);
  const [contentRef, contentBounds] = useMeasure();

  const activeItems = items || menuItems;
  const IconComponent = TriggerIcon || (compact ? MoreHorizontal : MoreVertical);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const closedSize = compact ? 26 : 40;
  const targetOpenWidth = compact ? openWidth : 240;
  const openHeight = Math.max(closedSize, Math.ceil(contentBounds.height));

  return (
    <div
      ref={containerRef}
      className={`relative not-prose select-none md:!bg-transparent ${compact ? "h-[26px] w-[26px]" : "h-10 w-10"}`}
      style={{ zIndex: isOpen ? 60 : 1 }}
    >
      <motion.div
        layout
        initial={false}
        animate={{
          width: isOpen ? targetOpenWidth : closedSize,
          height: isOpen ? openHeight : closedSize,
          borderRadius: isOpen ? 14 : (compact ? 8 : 12),
        }}
        transition={{
          type: "spring",
          damping: 34,
          stiffness: 380,
          mass: 0.8,
        }}
        className={`smooth-dropdown-bg absolute ${align === "left" ? "left-0 origin-top-left" : "right-0 origin-top-right"} overflow-hidden cursor-pointer border ${
          dropUp ? "bottom-0 origin-bottom-right" : "top-0"
        } ${isHighlighted && !isOpen ? "!bg-white/20 !border-white/25 !text-white hover:!bg-white/30" : ""}`}
        style={{
          color: isHighlighted && !isOpen ? "#ffffff" : "var(--text-main)",
        }}
        onClick={() => !isOpen && setIsOpen(true)}
      >
        {/* Three dots button */}
        <motion.div
          initial={false}
          animate={{
            opacity: isOpen ? 0 : 1,
            scale: isOpen ? 0.8 : 1,
          }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            pointerEvents: isOpen ? "none" : "auto",
            willChange: "transform",
          }}
        >
          <IconComponent
            className={compact ? "w-3.5 h-3.5" : "w-5 h-5"}
            style={{ color: isHighlighted ? "#ffffff" : "var(--text-muted)" }}
          />
        </motion.div>

        {/* Menu Content - visible when open */}
        <div ref={contentRef}>
          <motion.div
            layout
            initial={false}
            animate={{
              opacity: isOpen ? 1 : 0,
            }}
            transition={{
              duration: 0.6,
              delay: isOpen ? 0.08 : 0,
            }}
            className={compact ? "p-1" : "p-1.5"}
            style={{
              pointerEvents: isOpen ? "auto" : "none",
              willChange: "transform",
            }}
          >
            <ul className="flex flex-col gap-0.5 m-0 p-0 list-none">
              {activeItems.map((item, index) => {
                const ItemIcon = item.icon;
                const isHovered = hoveredItem === item.id;
                const itemDelay = isOpen ? 0.06 + index * 0.02 : 0;

                return (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{
                      opacity: isOpen ? 1 : 0,
                      x: isOpen ? 0 : 8,
                    }}
                    transition={{
                      delay: itemDelay,
                      duration: 0.15,
                      ease: easeOutQuint,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      if (onAction) {
                        onAction(item.id);
                      }
                    }}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`relative flex items-center gap-2.5 rounded-lg cursor-pointer transition-colors duration-200 ease-out m-0 ${
                      compact ? "text-xs pl-2.5 py-1.5" : "text-sm pl-3 py-2"
                    }`}
                    style={{
                      color: isHovered ? "var(--text-main)" : "var(--text-muted)",
                      listStyleType: "none",
                    }}
                  >
                    {/* Hover indicator background */}
                    {isHovered && (
                      <motion.div
                        layoutId={`activeIndicator-${id}`}
                        className="absolute inset-0 rounded-lg"
                        style={{
                          background: "var(--dropdown-hover-bg, rgba(255, 255, 255, 0.06))",
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 700,
                          damping: 40,
                          mass: 0.6,
                        }}
                      />
                    )}
                    {/* Left bar indicator */}
                    {isHovered && (
                      <motion.div
                        layoutId={`leftBar-${id}`}
                        className={`absolute left-0 top-0 bottom-0 my-auto rounded-full ${
                          compact ? "w-[2.5px] h-4" : "w-[3px] h-5"
                        }`}
                        style={{
                          background: "var(--primary, #ffffff)",
                        }}
                        transition={{
                          type: "spring",
                          damping: 30,
                          stiffness: 520,
                          mass: 0.8,
                        }}
                      />
                    )}
                    {ItemIcon && (
                      <ItemIcon
                        className={`shrink-0 relative z-10 transition-colors duration-200 ${
                          compact ? "w-3.5 h-3.5" : "w-4 h-4"
                        }`}
                        style={{
                          color: isHovered ? "var(--primary, #ffffff)" : "var(--text-muted)",
                        }}
                      />
                    )}
                    <span className="relative z-10 font-medium whitespace-nowrap truncate">
                      {item.label}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
