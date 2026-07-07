import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useKitchen } from './KitchenContext';

const KITCHEN_FACTS = [
  "La sal debe añadirse durante toda la cocción, no solo al final.",
  "Los ingredientes a temperatura ambiente se mezclan más fácilmente que los fríos.",
  "Los cuchillos afilados son más seguros que los desafilados para cortes precisos.",
  "Dejar reposar la carne después de cocinar redistribuye los jugos para un mejor sabor.",
  "El aceite de oliva de alta calidad debe añadirse después de cocinar, no durante.",
  "Las sartenes de hierro fundido requieren curado para desarrollar superficies antiadherentes.",
  "Ingredientes ácidos como el limón realzan instantáneamente los platos pesados y ricos.",
  "Sellar la carne crea sabor a través del proceso de la reacción de Maillard.",
  "Las hierbas frescas deben añadirse al final de la cocción.",
  "Probar la comida constantemente durante la preparación asegura el sazonado adecuado.",
  "Las proteínas se desnaturalizan a 140 °F (60 °C), cambiando su textura de forma permanente durante la cocción.",
  "La mantequilla contiene un 80% de grasa, lo que transporta mejor los sabores que los aceites.",
  "El bicarbonato de sodio necesita ácido para activar sus propiedades leudantes.",
  "El gluten se desarrolla cuando se mezclan harina y agua.",
  "Los huevos emulsionan las mezclas, uniendo ingredientes a base de aceite y agua.",
  "El azúcar se carameliza a 320 °F (160 °C), generando de forma natural sabores dulces y complejos.",
  "La sal realza la dulzura en los postres cuando se usa con moderación.",
  "Los almidones espesan las salsas al absorber líquido durante el calentamiento.",
  "El alcohol se evapora a 173 °F (78 °C), dejando sabores concentrados.",
  "Dorar las verduras desarrolla azúcares naturales a través de la caramelización.",
  "El \"mise en place\" francés significa preparar todos los ingredientes antes de cocinar.",
  "El agua para la pasta italiana debe saber a mar.",
  "Los chefs japoneses usan “kombu” para una profundidad natural de umami.",
  "La cocina tailandesa equilibra lo dulce, ácido, salado y picante.",
  "Las especias indias florecen en aceite caliente para liberar sus aceites esenciales.",
  "La cocina mexicana utiliza chiles secos para capas complejas de picante.",
  "La cocina china con wok requiere temperaturas extremadamente altas.",
  "La cocina de Oriente Medio a menudo combina elementos dulces y salados.",
  "La paella española desarrolla el “socarrat”, la capa crujiente del fondo.",
  "La fermentación coreana crea profundidad en el kimchi y otros platos.",
  "La cocción al vacío mantiene temperaturas precisas para un punto de cocción perfecto.",
  "Ahumar alimentos añade profundidad sin enmascarar los sabores naturales.",
  "La fermentación conserva los alimentos mientras desarrolla perfiles de sabor complejos.",
  "Deshidratar concentra los sabores y crea texturas uniques.",
  "La olla a presión reduce el tiempo de preparación a la vez que retiene los nutrientes.",
  "Las batidoras de inmersión crean sopas y salsas sedosas.",
  "Las mandolinas aseguran un grosor uniforme de las verduras para una cocción pareja.",
  "Las básculas digitales proporcionan precisión para resultados de horneado consistentes.",
  "Los termómetros de lectura instantánea evitan cocinar de más proteínas caras.",
  "Los procesadores de alimentos reducen significativamente el tiempo de preparación para cocineros ocupados.",
  "Los productos de temporada saben mejor y cuestan menos.",
  "Las verduras congeladas retienen mejor los nutrientes que las frescas viejas.",
  "La carne de res alimentada con pasto contiene naturalmente más ácidos grasos Omega-3.",
  "El abastecimiento local reduce la huella de carbono y apoya a los agricultores de la comunidad.",
  "Los ingredientes orgánicos evitan pesticidas sintéticos y fertilizantes químicos.",
  "El desperdicio de alimentos puede convertirse en caldos y consomés sabrosos.",
  "Las cáscaras de vegetales contienen nutrientes y fibra concentrados.",
  "El almacenamiento adecuado prolonga la frescura de los ingredientes significativamente más tiempo.",
  "El compostaje devuelve nutrientes al suelo para futuros cultivos.",
  "Las proteínas vegetales reducen el impacto ambiental en comparación con la carne."
];

/**
 * CuriousFactsSlider component.
 * Displays randomized kitchen tips/facts with a smooth crossfade transition every 6 seconds.
 * Includes manual navigation buttons that reset the timer.
 */
export default function CuriousFactsSlider() {
  const { isDarkMode, triggerFirstInteraction } = useKitchen();
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      handleNext();
    }, 6000); // Auto-cycle every 6 seconds
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % KITCHEN_FACTS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + KITCHEN_FACTS.length) % KITCHEN_FACTS.length);
  };

  const onNextClick = () => {
    triggerFirstInteraction();
    handleNext();
  };

  const onPrevClick = () => {
    triggerFirstInteraction();
    handlePrev();
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentIndex]); // Restarts interval when index changes (manual click reset)

  const cardBg = isDarkMode 
    ? 'bg-[#161B22] border-[#30363D] text-slate-300' 
    : 'bg-white border-gray-200 text-gray-700 shadow-sm';

  const buttonBg = isDarkMode
    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-[var(--primary)] hover:border-[var(--primary)]/30'
    : 'bg-slate-50 border-gray-200 text-gray-500 hover:text-[var(--primary)] hover:border-[var(--primary)]/30 shadow-sm';

  return (
    <div className={`p-4 rounded-3xl border select-none transition-colors duration-300 flex items-center justify-between gap-4 mt-2 shrink-0 ${cardBg}`}>
      {/* Left Manual Button */}
      <button
        onClick={onPrevClick}
        title="Dato anterior"
        className={`p-2 rounded-2xl border hover:scale-105 active:scale-95 transition-all cursor-pointer ${buttonBg}`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Centered Fact / Quote */}
      <div className="flex-1 text-center py-1 px-4 overflow-hidden relative min-h-[36px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="text-xs md:text-sm italic font-semibold text-gray-650 dark:text-slate-350 leading-snug tracking-tight text-center"
          >
            "{KITCHEN_FACTS[currentIndex]}"
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Right Manual Button */}
      <button
        onClick={onNextClick}
        title="Siguiente dato"
        className={`p-2 rounded-2xl border hover:scale-105 active:scale-95 transition-all cursor-pointer ${buttonBg}`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
