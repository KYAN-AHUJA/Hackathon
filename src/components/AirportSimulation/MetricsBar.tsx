import { SimulationMetrics } from '../../simulation/types';
import { Gauge, Clock, ShieldCheck, Users, Zap, AlertTriangle } from 'lucide-react';

interface MetricsBarProps {
  metrics: SimulationMetrics;
  disruptionsCount: number;
}

export function MetricsBar({ metrics, disruptionsCount }: MetricsBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-white/90 backdrop-blur-md border border-black/10 rounded-2xl shadow-sm text-black">
      {/* On-Time Turnaround Rate */}
      <div className="flex flex-col justify-between p-3 rounded-xl bg-black/[0.02] border border-black/5">
        <div className="flex items-center justify-between text-black/50 text-[11px] font-sans uppercase tracking-wider mb-1">
          <span>On-Time Rate</span>
          <ShieldCheck size={14} className="text-black/60" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-light font-mono tabular-nums text-black">
            {metrics.onTimeDepartureRate}%
          </span>
        </div>
        <div className="w-full bg-black/10 h-1 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-black h-full rounded-full transition-all duration-500"
            style={{ width: `${metrics.onTimeDepartureRate}%` }}
          />
        </div>
      </div>

      {/* Ripple Delay Prevented */}
      <div className="flex flex-col justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
        <div className="flex items-center justify-between text-emerald-800 text-[11px] font-sans uppercase tracking-wider mb-1">
          <span>Delay Avoided</span>
          <Zap size={14} className="text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-light font-mono tabular-nums text-emerald-900">
            +{metrics.rippleDelaySavedMinutes}
          </span>
          <span className="text-[11px] font-sans text-emerald-700">MINS</span>
        </div>
        <span className="text-[10px] text-emerald-700 font-sans tracking-tight mt-1">
          Via dynamic scheduler
        </span>
      </div>

      {/* Total Active Delays */}
      <div className="flex flex-col justify-between p-3 rounded-xl bg-black/[0.02] border border-black/5">
        <div className="flex items-center justify-between text-black/50 text-[11px] font-sans uppercase tracking-wider mb-1">
          <span>Total Delays</span>
          <Clock size={14} className="text-black/60" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-light font-mono tabular-nums ${metrics.totalDelaysMinutes > 15 ? 'text-amber-700 font-normal' : 'text-black'}`}>
            {metrics.totalDelaysMinutes}
          </span>
          <span className="text-[11px] font-sans text-black/50">MINS</span>
        </div>
        <span className="text-[10px] text-black/40 font-sans tracking-tight mt-1">
          Across all active flights
        </span>
      </div>

      {/* Gate Utilization */}
      <div className="flex flex-col justify-between p-3 rounded-xl bg-black/[0.02] border border-black/5">
        <div className="flex items-center justify-between text-black/50 text-[11px] font-sans uppercase tracking-wider mb-1">
          <span>Gate Capacity</span>
          <Gauge size={14} className="text-black/60" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-light font-mono tabular-nums text-black">
            {metrics.gateUtilizationRate}%
          </span>
          <span className="text-[11px] font-sans text-black/50">OCCUPIED</span>
        </div>
        <div className="w-full bg-black/10 h-1 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-black/80 h-full rounded-full transition-all duration-500"
            style={{ width: `${metrics.gateUtilizationRate}%` }}
          />
        </div>
      </div>

      {/* Active Staff Allocation */}
      <div className="flex flex-col justify-between p-3 rounded-xl bg-black/[0.02] border border-black/5">
        <div className="flex items-center justify-between text-black/50 text-[11px] font-sans uppercase tracking-wider mb-1">
          <span>Crew Deployed</span>
          <Users size={14} className="text-black/60" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-light font-mono tabular-nums text-black">
            {metrics.activeCrewsCount}
          </span>
          <span className="text-[11px] font-sans text-black/50">/ {metrics.totalCrewsCount} TEAMS</span>
        </div>
        <span className="text-[10px] text-black/40 font-sans tracking-tight mt-1">
          Ramp · Fuel · Cabin · Gate
        </span>
      </div>

      {/* Algorithm Latency & Disruptions */}
      <div className="flex flex-col justify-between p-3 rounded-xl bg-black/[0.02] border border-black/5">
        <div className="flex items-center justify-between text-black/50 text-[11px] font-sans uppercase tracking-wider mb-1">
          <span>Solver Engine</span>
          {disruptionsCount > 0 ? (
            <AlertTriangle size={14} className="text-amber-600 animate-pulse" />
          ) : (
            <Zap size={14} className="text-black/60" />
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-light font-mono tabular-nums text-black">
            {metrics.algorithmExecutionTimeMs}
          </span>
          <span className="text-[11px] font-sans text-black/50">MS</span>
        </div>
        <span className="text-[10px] text-black/40 font-sans tracking-tight mt-1">
          {disruptionsCount} active disruptions
        </span>
      </div>
    </div>
  );
}
