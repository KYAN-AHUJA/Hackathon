import { useState } from 'react';
import { Flight, Gate, TurnaroundTask, TaskType } from '../../simulation/types';
import { formatSimTime } from '../../simulation/schedulerAlgorithm';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface TurnaroundGanttProps {
  flights: Flight[];
  gates: Gate[];
  currentTime: number;
  onSelectFlight: (flight: Flight) => void;
  selectedFlightId?: string;
}

const TASK_COLORS: Record<TaskType, { bg: string; border: string; text: string }> = {
  deplaning: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-900' },
  baggage_offload: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-900' },
  cleaning: { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-900' },
  catering: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-900' },
  refuelling: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-900' },
  baggage_load: { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-900' },
  boarding: { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-900' },
  pushback: { bg: 'bg-slate-200', border: 'border-slate-500', text: 'text-slate-900' },
};

export function TurnaroundGantt({
  flights,
  gates,
  currentTime,
  onSelectFlight,
  selectedFlightId,
}: TurnaroundGanttProps) {
  const [expandedFlightIds, setExpandedFlightIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (flightId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFlightIds((prev) => ({ ...prev, [flightId]: !prev[flightId] }));
  };

  // Timeline scale: 0 to 140 minutes (08:00 to 10:20)
  const totalTimelineMinutes = 140;
  const timeMarkers = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135];

  const getPositionPct = (minute: number) => {
    return Math.max(0, Math.min(100, (minute / totalTimelineMinutes) * 100));
  };

  const getWidthPct = (start: number, end: number) => {
    const duration = Math.max(2, end - start);
    return Math.min(100 - getPositionPct(start), (duration / totalTimelineMinutes) * 100);
  };

  return (
    <div className="bg-white border border-black/10 rounded-2xl shadow-sm p-6 overflow-hidden text-black">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-black/10">
        <div>
          <h3 className="font-serif text-2xl font-normal text-black">
            Turnaround Timeline & Precedence Schedule
          </h3>
          <p className="font-sans text-xs text-black/50 mt-1">
            Gantt chart mapping gate allocations, task dependencies, and dynamic critical paths. Click any flight to expand operation breakdown.
          </p>
        </div>

        {/* Task Color Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-sans">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-900">
            Deplane
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-900">
            Clean
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-900">
            Fuel
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900">
            Baggage
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900">
            Board
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-900">
            Pushback
          </span>
        </div>
      </div>

      {/* Main Gantt Canvas */}
      <div className="mt-6 overflow-x-auto select-none">
        <div className="min-w-[850px] relative">
          {/* Time Axis Header */}
          <div className="grid grid-cols-[220px_1fr] border-b border-black/15 pb-2 text-[11px] font-mono text-black/50">
            <div className="uppercase tracking-wider">Gate / Assigned Flight</div>
            <div className="relative h-6">
              {timeMarkers.map((m) => (
                <div
                  key={m}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${getPositionPct(m)}%` }}
                >
                  <span className="tabular-nums font-semibold">{formatSimTime(m)}</span>
                  <div className="w-px h-1.5 bg-black/30 mt-1" />
                </div>
              ))}
            </div>
          </div>

          {/* Red Needle for Current Simulation Time */}
          <div
            className="absolute top-8 bottom-0 w-[2px] bg-red-600 z-30 pointer-events-none transition-all duration-300"
            style={{ left: `calc(220px + (100% - 220px) * ${getPositionPct(currentTime) / 100})` }}
          >
            <div className="absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 rounded bg-red-600 text-white font-mono text-[9px] font-bold shadow-xs whitespace-nowrap">
              LIVE {formatSimTime(currentTime)}
            </div>
          </div>

          {/* Gate Rows */}
          <div className="divide-y divide-black/10">
            {gates.map((gate) => {
              const gateFlights = flights.filter((f) => f.gateId === gate.id);

              return (
                <div key={gate.id} className="py-3">
                  {/* Gate Row Header & Primary Flight Bars */}
                  <div className="grid grid-cols-[220px_1fr] items-center min-h-[52px]">
                    {/* Gate Label */}
                    <div className="pr-4">
                      <div className="font-serif text-sm font-medium text-black flex items-center justify-between">
                        <span>{gate.name.split(' (')[0]}</span>
                        {gate.status === 'maintenance' && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-mono">
                            OFFLINE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-black/40 font-sans truncate">
                        {gate.terminal.split(' · ')[1] || gate.terminal}
                      </div>
                    </div>

                    {/* Timeline Canvas for this Gate */}
                    <div className="relative h-12 bg-black/[0.015] rounded-xl border border-black/5 overflow-hidden">
                      {/* Vertical grid lines */}
                      {timeMarkers.map((m) => (
                        <div
                          key={m}
                          className="absolute top-0 bottom-0 w-px border-r border-dashed border-black/10 pointer-events-none"
                          style={{ left: `${getPositionPct(m)}%` }}
                        />
                      ))}

                      {/* Flight Blocks stationed at this gate */}
                      {gateFlights.map((flight) => {
                        const startPct = getPositionPct(flight.actualArrival);
                        const widthPct = getWidthPct(flight.actualArrival, flight.estimatedDeparture);
                        const isExpanded = !!expandedFlightIds[flight.id];
                        const isSelected = selectedFlightId === flight.id;
                        const isDelayed = flight.delayMinutes > 0;

                        return (
                          <div
                            key={flight.id}
                            onClick={() => onSelectFlight(flight)}
                            className={`absolute top-1.5 bottom-1.5 rounded-lg px-2.5 flex items-center justify-between cursor-pointer transition-all duration-200 border ${
                              isSelected
                                ? 'ring-2 ring-black shadow-md'
                                : 'hover:scale-[1.01] hover:shadow-xs'
                            } ${
                              flight.priority === 1
                                ? 'bg-red-50 border-red-500 text-red-950'
                                : flight.priority === 2
                                ? 'bg-amber-50 border-amber-600 text-amber-950'
                                : isDelayed
                                ? 'bg-amber-50/80 border-amber-400 text-amber-900'
                                : 'bg-white border-black/20 text-black'
                            }`}
                            style={{
                              left: `${startPct}%`,
                              width: `${widthPct}%`,
                              minWidth: '110px',
                            }}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <button
                                onClick={(e) => toggleExpand(flight.id, e)}
                                className="p-0.5 rounded hover:bg-black/10 text-black/60"
                                title="Expand turnaround sub-tasks"
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                              <span className="font-mono text-xs font-bold truncate">
                                {flight.callsign}
                              </span>
                              <span className="text-[10px] text-black/50 font-sans hidden sm:inline">
                                ({flight.aircraftType})
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono">
                              {flight.priority <= 2 && (
                                <span className="font-bold text-red-700">
                                  P{flight.priority}
                                </span>
                              )}
                              {isDelayed && (
                                <span className="text-amber-800 font-semibold flex items-center gap-0.5">
                                  <AlertCircle size={10} /> +{flight.delayMinutes}m
                                </span>
                              )}
                              {flight.status === 'ready_for_departure' && (
                                <CheckCircle2 size={12} className="text-emerald-600" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sub-Task Expansion View (if flight expanded) */}
                  {gateFlights.map((flight) => {
                    if (!expandedFlightIds[flight.id]) return null;

                    return (
                      <div
                        key={`sub-${flight.id}`}
                        className="mt-2 ml-4 pl-4 border-l-2 border-black/15 space-y-1.5 bg-black/[0.01] p-3 rounded-xl"
                      >
                        <div className="text-[11px] font-sans font-semibold text-black/70 mb-2 flex items-center justify-between">
                          <span>
                            {flight.callsign} — Operational Task Dependencies (Critical Path Breakdown)
                          </span>
                          <span className="font-mono text-[10px] text-black/50">
                            Sched Dep: {formatSimTime(flight.scheduledDeparture)} · Est Dep:{' '}
                            {formatSimTime(flight.estimatedDeparture)}
                          </span>
                        </div>

                        {flight.tasks.map((task: TurnaroundTask) => {
                          const taskStart = task.actualStart ?? task.scheduledStart;
                          const taskEnd = task.actualEnd ?? (taskStart + task.durationMinutes);
                          const taskStartPct = getPositionPct(taskStart);
                          const taskWidthPct = getWidthPct(taskStart, taskEnd);
                          const colors = TASK_COLORS[task.type];

                          return (
                            <div
                              key={task.id}
                              className="grid grid-cols-[200px_1fr] items-center text-xs"
                            >
                              <div className="truncate pr-2 flex items-center gap-1.5">
                                <span
                                  className={`inline-block w-2 h-2 rounded-full ${
                                    task.status === 'completed'
                                      ? 'bg-emerald-500'
                                      : task.status === 'in_progress'
                                      ? 'bg-blue-600 animate-pulse'
                                      : task.status === 'delayed'
                                      ? 'bg-amber-500'
                                      : 'bg-black/20'
                                  }`}
                                />
                                <span className="text-[11px] font-sans text-black/80 truncate">
                                  {task.name}
                                </span>
                              </div>

                              <div className="relative h-6 bg-black/[0.02] rounded-md border border-black/5">
                                <div
                                  className={`absolute top-0.5 bottom-0.5 rounded border px-2 flex items-center justify-between ${colors.bg} ${colors.border} ${colors.text} text-[10px] font-mono`}
                                  style={{
                                    left: `${taskStartPct}%`,
                                    width: `${taskWidthPct}%`,
                                    minWidth: '55px',
                                  }}
                                  title={`${task.name}: ${task.progress}% (${task.status})`}
                                >
                                  <span className="truncate text-[9px] font-semibold">
                                    {task.durationMinutes}m
                                  </span>
                                  {task.status === 'in_progress' && (
                                    <span className="text-[9px] font-bold animate-pulse">
                                      {task.progress}%
                                    </span>
                                  )}
                                  {task.status === 'completed' && (
                                    <CheckCircle2 size={10} className="text-emerald-700" />
                                  )}
                                  {task.status === 'delayed' && (
                                    <Clock size={10} className="text-amber-700" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
