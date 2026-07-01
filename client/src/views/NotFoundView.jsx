import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotFoundView() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoHome = () => {
    if (user) {
      navigate('/home');
    } else {
      navigate('/');
    }
  };

  return (
    <section className="bg-[#f2f5f7] min-h-screen flex items-center justify-center font-sans" style={{ backgroundColor: '#ffffffff' }}>
      <div className="container mx-auto px-6">
        <div className="flex justify-center">
          <div className="w-full sm:w-10/12 md:w-8/12 text-center">

            <div
              className="bg-[url('https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif')] h-[250px] sm:h-[350px] md:h-[400px] bg-center bg-no-repeat bg-contain opacity-95"
              aria-hidden="true"
            >
              <h1 className="text-center text-6xl sm:text-7xl md:text-8xl font-extrabold pt-6 sm:pt-8 tracking-tight drop-shadow-[0_5px_15px_rgba(0,0,0,0.1)]" style={{ color: '#111827' }}>
                404
              </h1>
            </div>

            <div className="mt-6 relative z-10">
              <h3 className="text-2xl sm:text-3xl font-bold mb-4 tracking-tight" style={{ color: '#111827' }}>
                Parece que estás perdido
              </h3>
              <p className="mb-8 max-w-md mx-auto text-sm sm:text-base leading-relaxed" style={{ color: '#4b5563' }}>
                La página o ambiente que estás buscando no se encuentra disponible en el salón de Bunker.
              </p>

              <button
                onClick={handleGoHome}
                className="my-5 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 focus:outline-none active:scale-95 text-base h-12 px-8 cursor-pointer bg-gradient-to-r from-teal-400 to-teal-600 text-white hover:shadow-[0_0_25px_rgba(20,184,166,0.4)] border border-teal-400/20"
              >
                Ir a la Página Principal <ArrowRight className="ml-1" size={16} />
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
