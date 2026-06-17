"use client";

import * as React from "react";
import { X } from "lucide-react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function CloseButton({
  children,
  className,
  disabled,
  isDisabled,
  onClick,
  onPress,
  onFocus,
  onBlur,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
  onKeyDown,
  onKeyUp,
  variant = "default",
  type = "button",
  ...props
}) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [isFocusVisible, setIsFocusVisible] = React.useState(false);
  const isUnavailable = Boolean(disabled || isDisabled);

  const renderProps = {
    isHovered,
    isPressed,
    isFocused,
    isFocusVisible,
    isDisabled: isUnavailable,
  };

  return (
    <button
      aria-label={props["aria-label"] ?? "Close"}
      aria-disabled={isUnavailable || undefined}
      className={cn(
        // 🎯 CONTROL DE COORDENADAS: Mantenemos tamaño simétrico pero alteramos la posición horizontal
        "relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md p-0.5 !pointer-events-auto z-30",
        "select-none cursor-pointer",

        // Reseteo absoluto y obligatorio de la caja gris/blanca que ves en pantalla
        "!bg-transparent !border-none !border-0 !shadow-none !outline-none",

        // Control de color minimalista de la cruz: Gris sutil por defecto, rojo elegante al pasar el mouse
        "!text-zinc-400 hover:!text-red-400 hover:!bg-zinc-800/50",

        "transition-all duration-150 ease-out",
        "disabled:pointer-events-none disabled:opacity-50",
        isPressed && "scale-90",
        className,
      )}
      data-focus-visible={isFocusVisible || undefined}
      data-hovered={isHovered || undefined}
      data-pressed={isPressed || undefined}
      disabled={isUnavailable}
      type={type}
      onBlur={(event) => {
        setIsFocused(false);
        setIsFocusVisible(false);
        onBlur?.(event);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onPress?.();
      }}
      onFocus={(event) => {
        setIsFocused(true);
        setIsFocusVisible(true);
        onFocus?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") setIsPressed(true);
        onKeyDown?.(event);
      }}
      onKeyUp={(event) => {
        if (event.key === " " || event.key === "Enter") setIsPressed(false);
        onKeyUp?.(event);
      }}
      onPointerDown={(event) => {
        setIsPressed(true);
        onPointerDown?.(event);
      }}
      onPointerEnter={(event) => {
        setIsHovered(true);
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        setIsHovered(false);
        setIsPressed(false);
        onPointerLeave?.(event);
      }}
      onPointerUp={(event) => {
        setIsPressed(false);
        onPointerUp?.(event);
      }}
      {...props}
    >
      {typeof children === "function" ? children(renderProps) : (children ?? <X className="h-3.5 w-3.5 stroke-[2.5]" />)}
    </button>
  );
}

export { CloseButton };
