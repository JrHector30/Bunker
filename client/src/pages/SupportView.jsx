import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import VoiceAI from '../components/VoiceAI';

export default function SupportView() {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [highlightHumanSupport, setHighlightHumanSupport] = useState(false);

  return (
    <motion.div
      id="support-view-container"
      key="support"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full"
    >
      {/* Telephone channels */}
      <div
        className={`rounded-[24px] p-6 flex flex-col justify-between transition-all duration-500 bg-[var(--bg-secondary)] ${highlightHumanSupport
          ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/30 scale-[1.02] shadow-lg shadow-[var(--primary)]/10'
          : 'border-[var(--glass-border)]'
          }`}
        style={{
          border: '1px solid rgb(228 228 231 / 0.5)',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[var(--text-main)] tracking-tight">Canales de Soporte Búnker</h3>
            {highlightHumanSupport && (
              <span className="text-[9px] font-extrabold text-[var(--primary)] bg-[var(--primary)]/10 border border-[var(--primary)]/20 px-2 py-0.5 rounded animate-pulse">
                DERIVANDO EN LÍNEA...
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-5">Comunícate directamente con nuestro equipo de ingenieros TI las 24 horas del día.</p>

          <div className="flex flex-col gap-4">
            <div className="p-3.5 rounded-2xl flex items-center gap-3.5 bg-[var(--primary)]/5 border border-[var(--primary)]/20">
              <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white dark:text-black">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--text-main)] block">Soporte Telefónico Exclusivo</span>
                <span className="text-[11px] text-[var(--text-muted)]">+51 1 700-5555 &bull; Anexo 102</span>
              </div>
              <a href="tel:+5117005555" className="ml-auto bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white dark:text-black text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer no-underline">Llamar</a>
            </div>

            <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--text-main)] block">Atención Urgente WhatsApp - Asesor Hector</span>
                <span className="text-[11px] text-[var(--text-muted)]">+51 924 383 883 (Respuesta &lt; 3 mins)</span>
              </div>
              <a href="https://wa.me/51924383883" target="_blank" rel="noreferrer" className="ml-auto bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer no-underline">Escribir</a>
            </div>

            <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--text-main)] block">Atención Urgente WhatsApp - Asesora Melanie</span>
                <span className="text-[11px] text-[var(--text-muted)]">+51 902 564 624 (Respuesta &lt; 3 mins)</span>
              </div>
              <a href="https://wa.me/51902564624" target="_blank" rel="noreferrer" className="ml-auto bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer no-underline">Escribir</a>
            </div>
          </div>
        </div>


      </div>

      {/* Create Support Ticket */}
      <div
        className="rounded-[24px] p-6 bg-[var(--bg-secondary)]"
        style={{
          border: '1px solid rgb(228 228 231 / 0.5)',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        }}
      >
        <h3 className="text-sm font-bold text-[var(--text-main)] tracking-tight mb-2">Crear Ticket de Incidencia Urgente</h3>
        <p className="text-xs text-[var(--text-muted)] mb-5">Si tienes problemas con la impresora térmica, comandas o cuadre de caja, repórtalo de inmediato.</p>

        <form onSubmit={(e) => {
          e.preventDefault();
          showToast("¡Ticket de Soporte enviado! Un asesor TI te llamará en breve.", "success");
          e.target.reset();
        }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Tipo de Incidencia</label>
            <select className="bg-slate-800/30 border border-zinc-200/50 p-2.5 rounded-xl text-xs text-[var(--text-main)] focus:outline-none">
              <option className="bg-[var(--bg-secondary)] text-[var(--text-main)]">Problemas con Impresora Térmica de Cocina</option>
              <option className="bg-[var(--bg-secondary)] text-[var(--text-main)]">Diferencia de Montos / Cuadre de Caja</option>
              <option className="bg-[var(--bg-secondary)] text-[var(--text-main)]">Problema de Conexión de Comandera Tablet</option>
              <option className="bg-[var(--bg-secondary)] text-[var(--text-main)]">Modificación de Precios en Menú</option>
              <option className="bg-[var(--bg-secondary)] text-[var(--text-main)]">Otro inconveniente técnico</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Mensaje Detallado</label>
            <textarea rows={3} required placeholder="Describa el inconveniente..." className="bg-[var(--primary)]/5 border border-zinc-200/50 p-2.5 rounded-xl text-xs text-[var(--text-main)] focus:outline-none" />
          </div>
          <button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white dark:text-black font-extrabold text-xs py-3 rounded-xl cursor-pointer transition-all border-none">
            Enviar Ticket IT
          </button>
        </form>
      </div>

      {/* Búnker Voice AI Support */}
      <VoiceAI
        currentUser={user || { id: 'default', nombre: 'Héctor', rol: 'admin' }}
        onShowNotification={(msg) => showToast(msg, "info")}
        onTriggerHumanSupport={() => {
          setHighlightHumanSupport(true);
          setTimeout(() => setHighlightHumanSupport(false), 8000);
        }}
      />
    </motion.div>
  );
}
