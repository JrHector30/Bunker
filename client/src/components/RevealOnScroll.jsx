import React, { useState, useEffect, useRef } from 'react';

export default function RevealOnScroll({ children, variant = "slide-up", delay = 0, duration = 1000, className = "" }) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      { threshold: 0.08 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  const variants = {
    "slide-up": {
      initial: "translate-y-8 opacity-0",
      active: "translate-y-0 opacity-100"
    },
    "slide-down": {
      initial: "-translate-y-6 opacity-0",
      active: "translate-y-0 opacity-100"
    },
    "slide-left": {
      initial: "translate-x-8 opacity-0",
      active: "translate-x-0 opacity-100"
    },
    "slide-right": {
      initial: "-translate-x-8 opacity-0",
      active: "translate-x-0 opacity-100"
    },
    "fade": {
      initial: "opacity-0",
      active: "opacity-100"
    },
    "scale": {
      initial: "scale-95 opacity-0",
      active: "scale-100 opacity-100"
    }
  };

  const currentVariant = variants[variant] || variants["slide-up"];
  const classes = isIntersecting ? currentVariant.active : currentVariant.initial;

  return (
    <div
      ref={ref}
      className={`transition-all ease-[cubic-bezier(0.16,1,0.3,1)] ${classes} ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
}
