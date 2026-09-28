import { Flight, Gate } from '../../simulation/types';
import { Plane, Fuel, Luggage, Sparkles, Utensils, CheckCircle, AlertTriangle, UserCheck } from 'lucide-react';

interface ApronVisualizerProps {
  gates: Gate[];
  flights: Flight[];
  currentTime?: number;
  onSelectFlight: (flight: Flight) => void;
  selectedFlightId?: string;
}

export function ApronVisualizer({
  gates,
  flights,
  onSelectFlight,
  selectedFlightId,
}: ApronVisualizerProps) {
  return (
    <div className="bg-[#10141f] border border-black/20 rounded-2xl shadow-lg p-6 text-white overflow-hidden relative">
      {/* Tarmac Background Grid / Apron Markings */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="font-serif text-xl sm:text-2xl font-normal text-white">
              Apron Command & Ramp Ground Servicing
            </h3>
          </div>
          <p className="font-sans text-xs text-white/50 mt-1">
            Real-time ramp monitoring of ground support equipment (GSE), refuelling lines, baggage carts, and passenger boarding jetways.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-sans text-white/70">
          <span className="flex items-center gap-1">
            <Fuel size={12} className="text-red-400" /> Fuel Hydrant
          </span>
          <span className="flex items-center gap-1">
            <Luggage size={12} className="text-amber-400" /> Baggage Ramp
          </span>
          <span className="flex items-center gap-1">
            <Sparkles size={12} className="text-teal-400" /> Cabin Care
          </span>
          <span className="flex items-center gap-1">
            <Utensils size={12} className="text-purple-400" /> Catering
          </span>
        </div>
      </div>

      {/* Apron Terminal Gate Bays Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-6 relative z-10">
        {gates.map((gate) => {
          const flight = flights.find((f) => f.gateId === gate.id && f.status !== 'departed');
          const isSelected = flight && selectedFlightId === flight.id;

          // Compute overall turnaround progress
          const totalProgress = flight
            ? Math.round(
                flight.tasks.reduce((sum, t) => sum + t.progress, 0) / flight.tasks.length
              )
            : 0;

          // Check active tasks
          const activeTasks = flight
            ? flight.tasks.filter((t) => t.status === 'in_progress').map((t) => t.type)
            : [];

          const hasFueling = activeTasks.includes('refuelling');
          const hasBaggage = activeTasks.includes('baggage_load') || activeTasks.includes('baggage_offload');
          const hasCleaning = activeTasks.includes('cleaning');
          const hasCatering = activeTasks.includes('catering');
          const hasBoarding = activeTasks.includes('boarding');

          return (
            <div
              key={gate.id}
              onClick={() => flight && onSelectFlight(flight)}
              className={`relative rounded-2xl border p-4 transition-all duration-300 ${
                gate.status === 'maintenance'
                  ? 'border-red-500/40 bg-red-950/20'
                  : flight
                  ? isSelected
                    ? 'border-white bg-white/10 shadow-xl ring-2 ring-white/30'
                    : 'border-white/15 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.07] cursor-pointer'
                  : 'border-white/10 bg-white/[0.01]'
              }`}
            >
              {/* Gate Signboard */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <span className="font-mono text-xs font-bold text-white tracking-wider">
                    {gate.name.split(' (')[0]}
                  </span>
                  <div className="text-[10px] text-white/40 font-sans truncate">
                    {gate.allowedTypes.join(' · ')}
                  </div>
                </div>

                {gate.status === 'maintenance' ? (
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-mono border border-red-500/40">
                    MAINT
                  </span>
                ) : flight ? (
                  <div className="flex items-center gap-1.5">
                    {flight.priority <= 2 && (
                      <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono text-[9px] font-bold">
                        P{flight.priority}
                      </span>
                    )}
                    <span className="font-mono text-xs font-light text-emerald-400">
                      {totalProgress}%
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-white/30">EMPTY</span>
                )}
              </div>

              {/* Bay Stand & Aircraft Visualization */}
              <div className="my-5 flex flex-col items-center justify-center min-h-[160px] relative">
                {/* Yellow Tarmac Centerline */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/40 border-dashed" />
                <div className="absolute top-2 w-16 h-0.5 bg-yellow-400/50" />

                {flight ? (
                  <div className="flex flex-col items-center relative z-10 animate-fade-in">
                    {/* Aircraft Silhouette with Rotation / Presence */}
                    <div className="relative flex items-center justify-center mb-2">
                      {/* Turnaround Circular Progress Ring */}
                      <svg className="w-24 h-24 -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="42"
                          className="stroke-white/10 fill-none"
                          strokeWidth="3"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="42"
                          className="stroke-white fill-none transition-all duration-500"
                          strokeWidth="3"
                          strokeDasharray={264}
                          strokeDashoffset={264 - (264 * totalProgress) / 100}
                          strokeLinecap="round"
                        />
                      </svg>

                      {/* Center Aircraft Icon */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Plane
                          size={32}
                          className={`transition-all duration-300 ${
                            flight.priority === 1
                              ? 'text-red-400'
                              : isSelected
                              ? 'text-white scale-110'
                              : 'text-white/80'
                          }`}
                        />
                        <span className="font-mono text-[10px] font-bold text-white mt-1">
                          {flight.callsign}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-sans text-white/60 font-medium">
                      {flight.aircraftType}
                    </span>
                    <span className="text-[10px] font-sans text-white/40">
                      {flight.origin.split(' (')[0]} → {flight.destination.split(' (')[0]}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/20 py-8">
                    <Plane size={24} className="opacity-20 mb-1" />
                    <span className="font-sans text-[11px]">Stand Clear</span>
                  </div>
                )}
              </div>

              {/* Live Ground Equipment Indicator Badges */}
              {flight && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="grid grid-cols-5 gap-1 text-center">
                    <div
                      className={`p-1.5 rounded-lg border text-[9px] flex flex-col items-center transition-all ${
                        hasFueling
                          ? 'border-red-400 bg-red-500/20 text-red-200 animate-pulse'
                          : 'border-white/10 bg-white/5 text-white/40'
                      }`}
                      title="Refuelling"
                    >
                      <Fuel size={11} className="mb-0.5" />
                      <span>Fuel</span>
                    </div>

                    <div
                      className={`p-1.5 rounded-lg border text-[9px] flex flex-col items-center transition-all ${
                        hasBaggage
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200 animate-pulse'
                          : 'border-white/10 bg-white/5 text-white/40'
                      }`}
                      title="Baggage Ramp Handling"
                    >
                      <Luggage size={11} className="mb-0.5" />
                      <span>Cargo</span>
                    </div>

                    <div
                      className={`p-1.5 rounded-lg border text-[9px] flex flex-col items-center transition-all ${
                        hasCleaning
                          ? 'border-teal-400 bg-teal-500/20 text-teal-200 animate-pulse'
                          : 'border-white/10 bg-white/5 text-white/40'
                      }`}
                      title="Cabin Cleaning"
                    >
                      <Sparkles size={11} className="mb-0.5" />
                      <span>Cabin</span>
                    </div>

                    <div
                      className={`p-1.5 rounded-lg border text-[9px] flex flex-col items-center transition-all ${
                        hasCatering
                          ? 'border-purple-400 bg-purple-500/20 text-purple-200 animate-pulse'
                          : 'border-white/10 bg-white/5 text-white/40'
                      }`}
                      title="Catering"
                    >
                      <Utensils size={11} className="mb-0.5" />
                      <span>Galley</span>
                    </div>

                    <div
                      className={`p-1.5 rounded-lg border text-[9px] flex flex-col items-center transition-all ${
                        hasBoarding
                          ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200 animate-pulse'
                          : 'border-white/10 bg-white/5 text-white/40'
                      }`}
                      title="Jetway Boarding"
                    >
                      <UserCheck size={11} className="mb-0.5" />
                      <span>Jetway</span>
                    </div>
                  </div>

                  {/* Flight Status Banner */}
                  <div className="flex items-center justify-between text-[11px] font-sans pt-1">
                    <span className="text-white/50">Status</span>
                    {flight.status === 'ready_for_departure' ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle size={12} /> Ready Dep
                      </span>
                    ) : flight.delayMinutes > 0 ? (
                      <span className="text-amber-400 font-medium flex items-center gap-1">
                        <AlertTriangle size={12} /> +{flight.delayMinutes}m delay
                      </span>
                    ) : (
                      <span className="text-white/80 font-medium">On Schedule</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
