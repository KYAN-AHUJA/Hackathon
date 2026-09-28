import { Play, Pause, SkipForward, RotateCcw, FastForward, Activity } from 'lucide-react';
import { formatSimTime } from '../../simulation/schedulerAlgorithm';
import { SCENARIOS } from '../../simulation/scenarios';

interface SimulationControlsProps {
  currentTime: number;
  isRunning: boolean;
  speed: number;
  activeScenarioId: string;
  onTogglePlay: () => void;
  onStepForward: (mins: number) => void;
  onSpeedChange: (speed: number) => void;
  onSelectScenario: (scenarioId: string) => void;
  onReset: () => void;
}

export function SimulationControls({
  currentTime,
  isRunning,
  speed,
  activeScenarioId,
  onTogglePlay,
  onStepForward,
  onSpeedChange,
  onSelectScenario,
  onReset,
}: SimulationControlsProps) {
  const currentScenario = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-5 bg-white border border-black/10 rounded-2xl shadow-sm text-black">
      {/* Scenario Selector & Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 text-black/50 text-[11px] font-sans uppercase tracking-widest">
          <Activity size={12} className="text-[#0825c6]" />
          <span>Active Test Scenario</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeScenarioId}
            onChange={(e) => onSelectScenario(e.target.value)}
            className="px-3.5 py-1.5 rounded-full border border-black/20 bg-black/[0.02] text-sm font-serif font-medium text-black focus:outline-none focus:border-black cursor-pointer hover:bg-black/[0.04] transition-colors"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-black/60 font-sans truncate hidden sm:inline">
            — {currentScenario.tagline}
          </span>
        </div>
      </div>

      {/* Center: Play/Pause, Step, Reset, Speed Controls */}
      <div className="flex items-center gap-3 justify-center sm:justify-start">
        {/* Play/Pause Button */}
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm ${
            isRunning
              ? 'bg-black text-white hover:bg-black/80'
              : 'bg-[#0825c6] text-white hover:bg-[#071fa6] hover:scale-105 active:scale-95'
          }`}
          title={isRunning ? 'Pause simulation' : 'Start real-time simulation'}
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} className="fill-current" />}
          <span>{isRunning ? 'Pause' : 'Simulate'}</span>
        </button>

        {/* Step Forward +1 min */}
        <button
          onClick={() => onStepForward(1)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-black/15 bg-black/[0.02] text-xs font-sans text-black hover:bg-black/[0.06] active:scale-95 transition-all"
          title="Advance simulation by 1 minute"
        >
          <SkipForward size={14} />
          <span className="hidden sm:inline">+1m</span>
        </button>

        {/* Step Forward +5 mins */}
        <button
          onClick={() => onStepForward(5)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-black/15 bg-black/[0.02] text-xs font-sans text-black hover:bg-black/[0.06] active:scale-95 transition-all"
          title="Advance simulation by 5 minutes"
        >
          <FastForward size={14} />
          <span className="hidden sm:inline">+5m</span>
        </button>

        {/* Speed multiplier selector */}
        <div className="flex items-center border border-black/15 rounded-full p-0.5 bg-black/[0.02] text-xs font-mono">
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                speed === s
                  ? 'bg-black text-white shadow-xs'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Reset button */}
        <button
          onClick={onReset}
          className="p-2 rounded-full border border-black/15 hover:bg-black/5 text-black/60 hover:text-black transition-colors"
          title="Reset scenario to initial timestamp"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Right: Sim Epoch Clock */}
      <div className="flex items-center justify-between sm:justify-end gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-black/10">
        <div className="text-right">
          <div className="text-[10px] font-sans uppercase tracking-widest text-black/40">
            Operations Clock
          </div>
          <div className="text-2xl font-mono font-light tracking-wider tabular-nums text-black flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            {formatSimTime(currentTime)} <span className="text-xs text-black/40">UTC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
