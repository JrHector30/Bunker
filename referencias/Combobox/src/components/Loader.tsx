import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoaderProps {
  isLoading: boolean;
  onComplete?: () => void;
  durationMs?: number; // duration of the loader before transitioning to the checkmark
}

export default function Loader({ isLoading, onComplete, durationMs = 2000 }: LoaderProps) {
  const [step, setStep] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    if (isLoading) {
      setStep('loading');
      
      const timer = setTimeout(() => {
        setStep('success');
      }, durationMs);

      return () => clearTimeout(timer);
    } else {
      setStep('idle');
    }
  }, [isLoading, durationMs]);

  // When step changes to success, trigger complete after 1200ms of showing the checkmark
  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, onComplete]);

  if (step === 'idle') return null;

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.25 }}
              className="absolute"
            >
              <div 
                className="w-10 h-10 border-4 border-t-[#3b82f6] border-slate-200 rounded-full animate-spin" 
                id="loader-spinner"
              />
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.2, 1],
                opacity: 1,
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ 
                duration: 0.5, 
                ease: "easeOut",
                times: [0, 0.6, 1]
              }}
              className="absolute w-12 h-12 rounded-full bg-[#3b82f6] flex items-center justify-center shadow-md shadow-blue-500/20"
              id="loader-success-splash"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 10 }}
              >
                <Check className="w-6 h-6 text-white stroke-[3.5]" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
