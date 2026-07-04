import React from 'react';

export function Button({
  className = "",
  variant = "default",
  size = "default",
  disabled,
  children,
  ...props
}) {
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

  const variants = {
    default: "bg-gray-100 text-gray-950 hover:bg-gray-200 shadow-md",
    outline: "border border-gray-800 bg-[#0c0c0e] text-gray-200 hover:bg-gray-800 hover:text-white",
    ghost: "text-gray-400 hover:bg-gray-800 hover:text-white",
  };

  const sizes = {
    default: "h-9 px-4 py-2 text-sm",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  };

  return (
    <button
      disabled={disabled}
      className={`${baseStyle} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
