import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  const navigate = useNavigate();

  return (
    <button 
      onClick={() => navigate('/')}
      className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-300 active:scale-95 text-sm h-10 w-28 bg-[#1e1e24]/40 border border-white/10 text-white backdrop-blur-md cursor-pointer hover:border-teal-500/40 hover:shadow-[0_0_15px_rgba(20,184,166,0.15)]"
    >
      {/* Texto que se desplaza y desvanece en Hover */}
      <span className="translate-x-3 transition-all duration-300 group-hover:opacity-0 group-hover:translate-x-6">
        Volver
      </span>
      
      {/* Contenedor de la Flecha que se expande del 30% al 100% de ancho */}
      <i className="absolute inset-y-0 left-0 z-10 grid w-9 place-items-center bg-teal-500/10 border-r border-white/5 transition-all duration-300 group-hover:w-full group-hover:bg-teal-500/20 group-hover:border-transparent">
        <ArrowLeft
          className="text-teal-400 opacity-80 transition-transform duration-300 group-hover:-translate-x-1"
          size={16}
          strokeWidth={2.5}
        />
      </i>
    </button>
  );
}
