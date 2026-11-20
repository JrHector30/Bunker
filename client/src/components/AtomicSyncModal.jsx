import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import db from '../offline/database';
import { QueueStatus } from '../offline/tables';
import { queueService } from '../offline/queue/queueService';
import { syncDispatcher } from '../offline/sync/syncDispatcher';
import { syncEngine } from '../offline/sync/syncEngine';
import { offlineSnapshotService } from '../offline/services/offlineSnapshotService';

const DEFAULT_SYNC_STEPS = [
  {
    id: 'comandas',
    stepNumber: 1,
    label: 'Paso 1: Subiendo comandas locales...',
  },
  {
    id: 'cobros',
    stepNumber: 2,
    label: 'Paso 2: Aplicando transacciones de cobro en Caja...',
  },
  {
    id: 'kardex',
    stepNumber: 3,
    label: 'Paso 3: Impactando Kardex y reduciendo stock de insumos por receta...',
  },
  {
    id: 'arqueo',
    stepNumber: 4,
    label: 'Paso 4: Actualizando arqueo de turno y saldo en vivo...',
  },
];

const StepAnimatedIcon = ({ stepNumber, status }) => {
  if (status === 'done') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-4 h-4 text-white dark:text-neutral-950"
        aria-hidden="true"
      >
        <motion.path
          d="M5.5 12.5L9.8 16.8L18.5 7.5"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
    );
  }

  if (status === 'error') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" aria-hidden="true">
        <path
          d="M6 18L18 6M6 6l12 12"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const isActive = status === 'active';

  // Paso 1: Subiendo comandas locales (flecha ascendente en bandeja)
  if (stepNumber === 1) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
        <path
          d="M5 17.5V18.5C5 19.05 5.45 19.5 6 19.5H18C18.55 19.5 19 19.05 19 18.5V17.5"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
        />
        <motion.g
          animate={
            isActive
              ? { y: [1.5, -2, 1.5], opacity: [0.7, 1, 0.7] }
              : { y: 0, opacity: 1 }
          }
          transition={
            isActive
              ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
        >
          <path
            d="M12 15V5.5M12 5.5L8.25 9.25M12 5.5L15.75 9.25"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.g>
      </svg>
    );
  }

  // Paso 2: Transacciones de cobro en Caja (líneas de registro secuenciales)
  if (stepNumber === 2) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
        <rect
          x="4.5"
          y="5.5"
          width="15"
          height="13"
          rx="2.5"
          stroke="currentColor"
          strokeWidth={1.65}
        />
        <motion.line
          x1="8"
          y1="10"
          x2="16"
          y2="10"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          animate={isActive ? { opacity: [0.35, 1, 0.35] } : { opacity: 1 }}
          transition={
            isActive
              ? { duration: 0.9, repeat: Infinity, delay: 0 }
              : { duration: 0.2 }
          }
        />
        <motion.line
          x1="8"
          y1="14"
          x2="13.5"
          y2="14"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          animate={isActive ? { opacity: [0.35, 1, 0.35] } : { opacity: 1 }}
          transition={
            isActive
              ? { duration: 0.9, repeat: Infinity, delay: 0.28 }
              : { duration: 0.2 }
          }
        />
      </svg>
    );
  }

  // Paso 3: Kardex y reducción de stock por receta (capas apiladas)
  if (stepNumber === 3) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
        <motion.path
          d="M12 4.5L19 8.25L12 12L5 8.25L12 4.5Z"
          stroke="currentColor"
          strokeWidth={1.65}
          strokeLinejoin="round"
          animate={isActive ? { y: [-1, 1, -1] } : { y: 0 }}
          transition={
            isActive
              ? { duration: 1.15, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
        />
        <path
          d="M5 12.25L12 16L19 12.25"
          stroke="currentColor"
          strokeWidth={1.65}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <motion.path
          d="M5 16.25L12 20L19 16.25"
          stroke="currentColor"
          strokeWidth={1.65}
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={isActive ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
          transition={
            isActive
              ? { duration: 1.15, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
        />
      </svg>
    );
  }

  // Paso 4: Arqueo de turno y saldo en vivo (órbitas en rotación)
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-4 h-4"
      aria-hidden="true"
      animate={isActive ? { rotate: 360 } : { rotate: 0 }}
      transition={
        isActive
          ? { duration: 1.8, repeat: Infinity, ease: 'linear' }
          : { duration: 0.2 }
      }
    >
      <path
        d="M19.2 12A7.2 7.2 0 0 0 7.1 6.75"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <path
        d="M4.8 12A7.2 7.2 0 0 0 16.9 17.25"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <path
        d="M7 4.2V7.2H10"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 19.8V16.8H14"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
};

export const AtomicSyncModal = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [steps, setSteps] = useState(DEFAULT_SYNC_STEPS);
  const [stepProgress, setStepProgress] = useState([0, 0, 0, 0]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorStepIndex, setErrorStepIndex] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const completedNotifiedRef = useRef(false);
  const isSyncingRef = useRef(false);

  // Helper para pausas asíncronas suaves de ritmo visual
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const runSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    completedNotifiedRef.current = false;
    setStepProgress([0, 0, 0, 0]);
    setActiveIndex(0);
    setIsDone(false);
    setHasError(false);
    setErrorStepIndex(null);
    setErrorMessage('');

    let currentStepIndex = 0;

    try {
      // Asegurar motor activo
      syncEngine.start();

      // 1. Inspeccionar operaciones locales en db.syncQueue para títulos dinámicos
      const allPending = await db.syncQueue
        .where('status')
        .anyOf([QueueStatus.PENDING, QueueStatus.PROCESSING])
        .toArray();

      const syncableOps = allPending.filter(
        op => op.recordingSource !== 'shadow' && op.recordingSource !== 'diagnostic'
      );

      const orderOps = syncableOps.filter(
        op => op.entity === 'ORDER' && op.operation === 'CREATE_ORDER'
      );
      const payOps = syncableOps.filter(
        op => op.entity === 'ORDER' && op.operation === 'PAY_ORDER'
      );

      const orderCount = orderOps.length;
      const payCount = payOps.length;

      const dynamicSteps = [
        {
          id: 'comandas',
          stepNumber: 1,
          label: orderCount > 0
            ? `Paso 1: Subiendo ${orderCount} comanda${orderCount === 1 ? '' : 's'} local${orderCount === 1 ? '' : 'es'}...`
            : 'Paso 1: Verificando comandas locales...',
        },
        {
          id: 'cobros',
          stepNumber: 2,
          label: payCount > 0
            ? `Paso 2: Aplicando ${payCount} transacci${payCount === 1 ? 'ón' : 'ones'} de cobro en Caja...`
            : 'Paso 2: Verificando transacciones de cobro en Caja...',
        },
        {
          id: 'kardex',
          stepNumber: 3,
          label: 'Paso 3: Impactando Kardex y reduciendo stock de insumos por receta...',
        },
        {
          id: 'arqueo',
          stepNumber: 4,
          label: 'Paso 4: Actualizando arqueo de turno y saldo en vivo...',
        },
      ];

      setSteps(dynamicSteps);
      await sleep(300);

      // --- PASO 1: Subiendo Comandas Locales ---
      currentStepIndex = 0;
      setActiveIndex(0);
      if (orderOps.length > 0) {
        for (let i = 0; i < orderOps.length; i++) {
          const op = orderOps[i];
          const success = await syncEngine.processNext(op);
          if (!success) {
            throw new Error(`Error al subir la comanda local (${op.entityId || op.id}).`);
          }
          const pct = Math.round(((i + 1) / orderOps.length) * 100);
          setStepProgress(prev => {
            const next = [...prev];
            next[0] = pct;
            return next;
          });
          await sleep(200);
        }
      } else {
        // Animación suave de confirmación
        for (let p = 25; p <= 100; p += 25) {
          setStepProgress(prev => [p, prev[1], prev[2], prev[3]]);
          await sleep(120);
        }
      }
      setStepProgress(prev => [100, prev[1], prev[2], prev[3]]);
      await sleep(350);

      // --- PASO 2: Transacciones de Cobro en Caja ---
      currentStepIndex = 1;
      setActiveIndex(1);

      // Re-consultar operaciones de cobro en cola para incorporar los remoteOrderId mapeados en el Paso 1
      const queueAfterStep1 = await db.syncQueue
        .where('status')
        .anyOf([QueueStatus.PENDING, QueueStatus.PROCESSING])
        .toArray();
      const freshPayOps = queueAfterStep1.filter(
        op => op.entity === 'ORDER' && op.operation === 'PAY_ORDER' && op.recordingSource !== 'shadow' && op.recordingSource !== 'diagnostic'
      );

      if (freshPayOps.length > 0) {
        for (let i = 0; i < freshPayOps.length; i++) {
          const op = freshPayOps[i];
          const success = await syncEngine.processNext(op);
          if (!success) {
            throw new Error(`Error al registrar el cobro en Caja (${op.entityId || op.id}).`);
          }
          const pct = Math.round(((i + 1) / freshPayOps.length) * 100);
          setStepProgress(prev => {
            const next = [...prev];
            next[1] = pct;
            return next;
          });
          await sleep(220);
        }
      } else {
        for (let p = 25; p <= 100; p += 25) {
          setStepProgress(prev => [100, p, prev[2], prev[3]]);
          await sleep(120);
        }
      }

      // Procesar cualquier otra operación restante en cola (ej. UPDATE_ORDER_STATUS, PRODUCT CREATE)
      const remaining = await queueService.getPendingSyncable();
      for (const remOp of remaining) {
        const success = await syncEngine.processNext(remOp);
        if (!success) {
          throw new Error(`Error al sincronizar operación pendiente (${remOp.entity} - ${remOp.operation}).`);
        }
      }

      setStepProgress(prev => [100, 100, prev[2], prev[3]]);
      await sleep(400);

      // --- PASO 3: Impacto en Kardex y Reducción de Stock por Receta ---
      currentStepIndex = 2;
      setActiveIndex(2);
      for (let p = 20; p <= 100; p += 20) {
        setStepProgress(prev => [100, 100, p, prev[3]]);
        await sleep(160);
      }
      setStepProgress(prev => [100, 100, 100, prev[3]]);
      await sleep(350);

      // --- PASO 4: Actualizando Arqueo de Turno y Saldo en Vivo ---
      currentStepIndex = 3;
      setActiveIndex(3);
      for (let p = 20; p <= 80; p += 30) {
        setStepProgress(prev => [100, 100, 100, p]);
        await sleep(150);
      }

      // Hidratar snapshot de datos operativos frescos desde el servidor SQL
      try {
        await offlineSnapshotService.hydrateOperationalSnapshot();
      } catch (hErr) {
        console.warn('[AtomicSyncModal] Advertencia en hidratación final:', hErr);
      }

      // Notificar a los componentes de UI (Caja, Mesas, Cocina)
      window.dispatchEvent(new Event('syncQueueChanged'));

      setStepProgress([100, 100, 100, 100]);
      setActiveIndex(4);
      setIsDone(true);

      if (!completedNotifiedRef.current) {
        completedNotifiedRef.current = true;
        onComplete?.();
      }
    } catch (err) {
      console.error('[AtomicSyncModal] Fallo en la sincronización:', err);
      setHasError(true);
      setErrorStepIndex(currentStepIndex);
      setErrorMessage(err.message || 'Error inesperado durante la sincronización.');
    } finally {
      isSyncingRef.current = false;
    }
  }, [onComplete]);

  useEffect(() => {
    if (!isOpen) {
      isSyncingRef.current = false;
      return;
    }
    runSync();
  }, [isOpen, runSync]);

  const totalProgress =
    steps.length > 0
      ? Math.round(stepProgress.reduce((sum, val) => sum + val, 0) / steps.length)
      : 100;

  const completedStepsCount = stepProgress.filter((p) => p >= 100).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="atomic-sync-title"
            className="w-full sm:max-w-[490px] bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-2xl shadow-[0_24px_60px_-15px_rgba(0,0,0,0.28)] overflow-hidden"
          >
            {/* Indicador móvil */}
            <div className="w-10 h-1 rounded-full bg-neutral-200 dark:bg-neutral-800 mx-auto mt-3 sm:hidden" />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-900">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      hasError
                        ? 'bg-red-500 text-white'
                        : 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950'
                    }`}
                  >
                    {hasError ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <motion.svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="w-3.5 h-3.5"
                        aria-hidden="true"
                        animate={!isDone ? { rotate: 360 } : { rotate: 0 }}
                        transition={
                          !isDone
                            ? { duration: 2.2, repeat: Infinity, ease: 'linear' }
                            : { duration: 0.25 }
                        }
                      >
                        {isDone ? (
                          <path
                            d="M5 12.5L9.5 17L19 7.5"
                            stroke="currentColor"
                            strokeWidth={2.4}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : (
                          <>
                            <circle
                              cx="12"
                              cy="12"
                              r="9"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeOpacity={0.25}
                            />
                            <path
                              d="M12 3a9 9 0 0 1 9 9"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                            />
                          </>
                        )}
                      </motion.svg>
                    )}
                  </div>
                  <h2
                    id="atomic-sync-title"
                    className="text-base font-bold text-neutral-950 dark:text-white tracking-tight"
                  >
                    Sincronización Atómica
                  </h2>
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {hasError
                    ? 'Ocurrió un error al confirmar los registros en la base de datos.'
                    : isDone
                      ? 'Todos los registros fueron confirmados en la base de datos.'
                      : 'Sincronizando operaciones locales y actualizando el servidor...'}
                </p>
              </div>
            </div>

            {/* Barra de progreso global */}
            <div className="px-6 pt-4 pb-2">
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                <span className="font-medium">
                  Progreso general · {completedStepsCount} de {steps.length} procesos
                </span>
                <span className="font-mono font-bold text-neutral-950 dark:text-white">
                  {totalProgress}%
                </span>
              </div>
              <div className="mt-2 h-1 w-full rounded-full bg-neutral-100 dark:bg-neutral-800/80 overflow-hidden relative">
                <div
                  className={`h-full rounded-full origin-left ${
                    hasError ? 'bg-red-500' : 'bg-neutral-950 dark:bg-white'
                  }`}
                  style={{
                    transform: `scaleX(${totalProgress / 100})`,
                    transition: 'transform 120ms ease-out',
                  }}
                />
              </div>
            </div>

            {/* Lista de pasos */}
            <div className="px-6 py-3 space-y-2.5 max-h-[58vh] overflow-y-auto">
              {steps.map((step, index) => {
                const progress = stepProgress[index] ?? 0;
                const isStepError = hasError && errorStepIndex === index;
                const isStepDone = progress >= 100 && !isStepError;
                const isStepActive = activeIndex === index && !hasError && !isStepDone;

                const status = isStepError
                  ? 'error'
                  : isStepDone
                    ? 'done'
                    : isStepActive
                      ? 'active'
                      : 'pending';

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 ${
                      status === 'error'
                        ? 'bg-red-500/5 dark:bg-red-950/20 border-red-500/40 shadow-sm'
                        : status === 'active'
                          ? 'bg-neutral-50 dark:bg-neutral-900/70 border-neutral-300 dark:border-neutral-700 shadow-sm'
                          : status === 'done'
                            ? 'bg-white dark:bg-[#0A0A0A] border-neutral-200 dark:border-neutral-800'
                            : 'bg-white/60 dark:bg-[#0A0A0A]/40 border-neutral-100 dark:border-neutral-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 ${
                          status === 'error'
                            ? 'bg-red-500 text-white'
                            : status === 'done'
                              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950'
                              : status === 'active'
                                ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950'
                                : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600'
                        }`}
                      >
                        <StepAnimatedIcon stepNumber={step.stepNumber} status={status} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs truncate ${
                              status === 'error'
                                ? 'font-semibold text-red-600 dark:text-red-400'
                                : status === 'active' || status === 'done'
                                  ? 'font-medium text-neutral-900 dark:text-neutral-100'
                                  : 'text-neutral-500 dark:text-neutral-500'
                            }`}
                          >
                            {step.label}
                          </p>
                          <span
                            className={`text-[11px] font-mono shrink-0 ${
                              status === 'error'
                                ? 'font-bold text-red-500'
                                : status === 'done'
                                  ? 'font-bold text-neutral-950 dark:text-white'
                                  : status === 'active'
                                    ? 'font-semibold text-neutral-700 dark:text-neutral-300'
                                    : 'text-neutral-400 dark:text-neutral-600'
                            }`}
                          >
                            {status === 'error'
                              ? '(Error)'
                              : status === 'done'
                                ? '(OK)'
                                : status === 'active'
                                  ? `${progress}%`
                                  : 'En cola'}
                          </span>
                        </div>

                        <div className="mt-2.5 h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800/80 overflow-hidden relative">
                          <div
                            className={`h-full rounded-full origin-left transition-colors duration-200 ${
                              status === 'error'
                                ? 'bg-red-500'
                                : status === 'done'
                                  ? 'bg-neutral-900 dark:bg-neutral-200'
                                  : 'bg-neutral-950 dark:bg-white'
                            }`}
                            style={{
                              transform: `scaleX(${progress / 100})`,
                              transition: 'transform 80ms linear',
                            }}
                          />
                        </div>

                        {status === 'error' && errorMessage && (
                          <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-red-500 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{errorMessage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-neutral-50/70 dark:bg-neutral-950/60 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-end">
              {hasError ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      isSyncingRef.current = false;
                      runSync();
                    }}
                    className="px-5 py-2.5 rounded-xl border-0 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reintentar Sincronización
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (isDone) {
                      onClose();
                    }
                  }}
                  disabled={!isDone}
                  className={`px-5 py-2.5 rounded-xl border-0 text-xs font-semibold transition-all whitespace-nowrap ${
                    isDone
                      ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer shadow-md'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed opacity-60'
                  }`}
                >
                  Finalizar
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AtomicSyncModal;
