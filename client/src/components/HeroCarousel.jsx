import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const IMAGES = [
  '/uploads/home/img1.png',
  '/uploads/home/img2.png',
  '/uploads/home/img3.png',
  '/uploads/home/img4.png',
  '/uploads/home/img5.png',
  '/uploads/home/img6.png',
];

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const total = IMAGES.length;

  const next = useCallback(() => {
    if (total <= 1) return;
    setIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    if (total <= 1) return;
    setIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next, total]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: '1200 / 775' }}>
      {/* Track deslizante: todas las imágenes en fila */}
      <div
        className="absolute inset-0 flex transition-transform duration-1000 ease-in-out"
        style={{
          width: `${total * 100}%`,
          transform: `translateX(-${index * (100 / total)}%)`,
        }}
      >
        {IMAGES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`Vista previa ${i + 1}`}
            className="h-full object-cover flex-shrink-0"
            style={{ width: `${100 / total}%` }}
          />
        ))}
      </div>

      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label="Anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label="Siguiente"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${i === index ? 'w-6 bg-teal-400' : 'w-1.5 bg-white/30 hover:bg-white/50'}`}
              aria-label={`Ir a imagen ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}