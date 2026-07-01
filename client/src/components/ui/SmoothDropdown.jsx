import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import useMeasure from "react-use-measure";
import {
  MoreVertical,
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

export default function SmoothDropdown({ id, dropUp = false, onAction }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const containerRef = useRef(null);
  const [contentRef, contentBounds] = useMeasure();

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

  const openHeight = Math.max(40, Math.ceil(contentBounds.height));

  return (
    <div
      ref={containerRef}
      className="relative h-10 w-10 not-prose select-none md:!bg-transparent"
      style={{ zIndex: isOpen ? 50 : 1 }}
    >
      <motion.div
        layout
        initial={false}
        animate={{
          width: isOpen ? 240 : 40,
          height: isOpen ? openHeight : 40,
          borderRadius: isOpen ? 14 : 12,
        }}
        transition={{
          type: "spring",
          damping: 34,
          stiffness: 380,
          mass: 0.8,
        }}
        className={`smooth-dropdown-bg absolute right-0 overflow-hidden cursor-pointer border ${dropUp ? "bottom-0 origin-bottom-right" : "top-0 origin-top-right"
          }`}
        style={{
          color: "var(--text-main)",
        }}
        onClick={() => !isOpen && setIsOpen(true)}
      >
        {/* Three dots button (MoreVertical) */}
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
          <MoreVertical className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
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
            className="p-1.5"
            style={{
              pointerEvents: isOpen ? "auto" : "none",
              willChange: "transform",
            }}
          >
            <ul className="flex flex-col gap-1 m-0 p-0 list-none">
              {menuItems.map((item, index) => {
                const IconComponent = item.icon;
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
                    className="relative flex items-center gap-3 rounded-lg text-sm cursor-pointer transition-colors duration-200 ease-out m-0 pl-3 py-2"
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
                        className="absolute left-0 top-0 bottom-0 my-auto w-[3px] h-5 rounded-full"
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
                    <IconComponent
                      className="w-[18px] h-[18px] relative z-10"
                      style={{
                        color: isHovered ? "var(--text-main)" : "var(--text-muted)",
                      }}
                    />
                    <span className="font-medium relative z-10 text-xs">
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
