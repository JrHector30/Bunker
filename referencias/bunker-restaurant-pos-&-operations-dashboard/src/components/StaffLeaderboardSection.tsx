import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Zap, 
  Crown, 
  Medal, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  Flame, 
  Star, 
  ChevronRight, 
  Award,
  Sparkles,
  DollarSign,
  ChefHat,
  Coffee,
  X
} from 'lucide-react';
import { StaffMember, StaffRole } from '../types';
import { STAFF_MEMBERS } from '../data/restaurantData';

interface StaffLeaderboardSectionProps {
  staffList?: StaffMember[];
}

export const StaffLeaderboardSection: React.FC<StaffLeaderboardSectionProps> = ({
  staffList = STAFF_MEMBERS,
}) => {
  const [selectedRole, setSelectedRole] = useState<'all' | 'waiter' | 'chef'>('waiter');
  const [selectedEmployee, setSelectedEmployee] = useState<StaffMember | null>(null);

  const filteredStaff = staffList.filter(s => {
    if (selectedRole === 'all') return true;
    return s.role === selectedRole;
  }).sort((a, b) => a.rank - b.rank);

  const triggerConfetti = (e: React.MouseEvent) => {
    e.stopPropagation();
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-extrabold shadow-md shadow-amber-500/40 ring-2 ring-yellow-400">
            <Crown className="w-4 h-4 fill-slate-950" />
          </div>
        );
      case 2:
        return (
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-950 flex items-center justify-center font-extrabold shadow-md shadow-slate-300/30 ring-2 ring-slate-200">
            <Medal className="w-4 h-4" />
          </div>
        );
      case 3:
        return (
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-700 to-amber-600 text-amber-100 flex items-center justify-center font-extrabold shadow-md shadow-amber-700/30 ring-2 ring-amber-600">
            <Award className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs border border-slate-700">
            #{rank}
          </div>
        );
    }
  };

  return (
    <div id="staff-leaderboard-card" className="glass-panel rounded-2xl p-5 lg:p-6 flex flex-col h-full hover:border-white/15 transition-all">
      
      {/* Header & Role Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-lg text-white flex items-center gap-2 tracking-tight">
              <Trophy className="w-4 h-4 text-amber-400" />
              Personal del Turno & Leaderboard
            </h3>
            <span className="text-[10px] px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono-nums font-bold border border-amber-500/30 neon-glow-amber">
              En Vivo
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 font-medium">Velocidad de atención, comandas cerradas y satisfacción</p>
        </div>

        {/* Role Toggle Selector */}
        <div className="bg-black/60 p-1 rounded-xl flex space-x-1 border border-white/10">
          <button
            id="role-filter-waiter"
            onClick={() => setSelectedRole('waiter')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
              selectedRole === 'waiter'
                ? 'bg-zinc-800 text-white shadow-sm border border-white/15'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mozos ({STAFF_MEMBERS.filter(s => s.role === 'waiter').length})</span>
          </button>

          <button
            id="role-filter-chef"
            onClick={() => setSelectedRole('chef')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
              selectedRole === 'chef'
                ? 'bg-zinc-800 text-white shadow-sm border border-white/15'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>KDS Cocina ({STAFF_MEMBERS.filter(s => s.role === 'chef').length})</span>
          </button>
        </div>
      </div>

      {/* Podium Top 3 Mini-Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        {filteredStaff.slice(0, 3).map((staff) => (
          <div
            key={staff.id}
            onClick={() => setSelectedEmployee(staff)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all relative overflow-hidden group hover:scale-[1.01] ${
              staff.rank === 1
                ? 'bg-zinc-800/90 border-amber-500/40 shadow-lg shadow-amber-500/5'
                : 'bg-black/40 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            {/* Top Rank Icon */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getRankBadge(staff.rank)}
                <span className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
                  {staff.name}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-amber-400 font-mono-nums font-bold">
                <Star className="w-3 h-3 fill-amber-400" />
                <span>{staff.rating}</span>
              </div>
            </div>

            {/* Avatar & Quick Stats */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={staff.avatar} 
                  alt={staff.name} 
                  className="w-11 h-11 rounded-xl object-cover border border-zinc-700" 
                />
                {staff.rank === 1 && (
                  <button 
                    onClick={triggerConfetti} 
                    title="Celebrar top performer"
                    className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-amber-400 text-zinc-950 shadow hover:scale-110 transition-transform"
                  >
                    <Sparkles className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-0.5 font-mono-nums text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400 text-[11px]">Velocidad:</span>
                  <span className="font-bold text-emerald-400">{staff.avgSpeedMinutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 text-[11px]">Comandas:</span>
                  <span className="font-semibold text-zinc-200">{staff.completedOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 text-[11px]">{staff.role === 'waiter' ? 'Venta:' : 'Partida:'}</span>
                  <span className="font-semibold text-amber-300 truncate max-w-[80px]">
                    {staff.role === 'waiter' ? `$${staff.totalSales.toFixed(0)}` : staff.station?.split(' ')[0]}
                  </span>
                </div>
              </div>
            </div>

            {/* Badges Pill */}
            {staff.badges && staff.badges.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center gap-1 overflow-x-auto">
                {staff.badges.map(b => (
                  <span 
                    key={b.id} 
                    className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 whitespace-nowrap"
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detailed Full Staff Table List */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] pr-1">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-2 flex justify-between">
          <span>Ranking Detallado</span>
          <span>Velocidad Promedio / Meta (14 min)</span>
        </div>

        {filteredStaff.map((staff) => {
          const speedEfficiency = Math.max(10, Math.min(100, Math.round((staff.targetSpeedMinutes / staff.avgSpeedMinutes) * 75)));

          return (
            <div
              key={staff.id}
              onClick={() => setSelectedEmployee(staff)}
              className="p-3 rounded-xl bg-black/40 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              
              {/* Staff Member Info */}
              <div className="flex items-center gap-3 min-w-[200px]">
                {getRankBadge(staff.rank)}
                <img 
                  src={staff.avatar} 
                  alt={staff.name} 
                  className="w-9 h-9 rounded-lg object-cover border border-zinc-700" 
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-100 group-hover:text-amber-300 transition-colors">
                      {staff.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {staff.zone}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                    <span>{staff.role === 'waiter' ? 'Camarero' : staff.station || 'Chef'}</span>
                    <span>•</span>
                    <span className="text-amber-400 font-mono-nums font-bold">★ {staff.rating}</span>
                  </div>
                </div>
              </div>

              {/* Progress & Speed Metrics */}
              <div className="flex-1 max-w-xs space-y-1">
                <div className="flex justify-between text-xs font-mono-nums">
                  <span className="text-zinc-400 text-[11px]">Tiempo Promedio:</span>
                  <span className={`font-bold ${staff.avgSpeedMinutes <= 10 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {staff.avgSpeedMinutes} min <span className="text-zinc-500 font-normal">(&lt;{staff.targetSpeedMinutes}m)</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${
                      staff.avgSpeedMinutes <= 10 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${speedEfficiency}%` }}
                  />
                </div>
              </div>

              {/* Volume & Sales Stats */}
              <div className="flex items-center gap-4 text-xs font-mono-nums justify-between sm:justify-end">
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">Comandas</span>
                  <span className="font-bold text-zinc-200">{staff.completedOrders} cerradas</span>
                </div>

                <div className="text-right min-w-[70px]">
                  <span className="text-[10px] text-zinc-500 block">{staff.role === 'waiter' ? 'Venta Total' : 'Rendimiento'}</span>
                  <span className="font-bold text-emerald-400">
                    {staff.role === 'waiter' ? `$${staff.totalSales.toFixed(0)}` : `${staff.speedScore}%`}
                  </span>
                </div>

                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </div>

            </div>
          );
        })}
      </div>

      {/* Employee Detail Modal/Drawer */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-lg border border-zinc-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setSelectedEmployee(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <img src={selectedEmployee.avatar} alt={selectedEmployee.name} className="w-16 h-16 rounded-2xl object-cover border border-amber-500/40" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{selectedEmployee.name}</h3>
                  {getRankBadge(selectedEmployee.rank)}
                </div>
                <p className="text-xs text-zinc-400">{selectedEmployee.role === 'waiter' ? 'Mozo de Sala' : 'Cocinero de Partida'} — {selectedEmployee.zone}</p>
                <p className="text-xs text-amber-400 font-mono-nums font-semibold mt-0.5">Turno inició a las {selectedEmployee.shiftStart}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-black/50 border border-zinc-800 font-mono-nums text-center mb-4">
              <div>
                <span className="text-[10px] text-zinc-400 block">Tiempo Prom.</span>
                <span className="text-base font-bold text-emerald-400">{selectedEmployee.avgSpeedMinutes} min</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Comandas</span>
                <span className="text-base font-bold text-white">{selectedEmployee.completedOrders}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Puntuación</span>
                <span className="text-base font-bold text-amber-400">{selectedEmployee.speedScore}/100</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <span className="text-xs font-bold text-zinc-300 block">Insignias & Logros del Turno:</span>
              <div className="space-y-1.5">
                {selectedEmployee.badges.map(b => (
                  <div key={b.id} className="p-2 rounded-lg bg-black/40 border border-zinc-800 flex items-center gap-2.5 text-xs">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold text-amber-300 block">{b.label}</span>
                      <span className="text-[10px] text-zinc-400">{b.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedEmployee.recentAchievements && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                <span className="font-bold block mb-1">Hitos recientes:</span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {selectedEmployee.recentAchievements.map((ach, i) => (
                    <li key={i}>{ach}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
