import { Flight, Gate } from '../../simulation/types';
import { formatSimTime } from '../../simulation/schedulerAlgorithm';
import { X, Plane, Users, MapPin } from 'lucide-react';

interface FlightDetailModalProps {
  flight: Flight | null;
  gates: Gate[];
  onClose: () => void;
  onPromotePriority?: (flightId: string) => void;
  onDelayFlight?: (flightId: string, minutes: number) => void;
}

export function FlightDetailModal({
  flight,
  gates,
  onClose,
  onPromotePriority,
  onDelayFlight,
}: FlightDetailModalProps) {
  if (!flight) return null;

  const currentGate = gates.find((g) => g.id === flight.gateId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl text-black border border-black/10 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Flight Header */}
        <div className="flex items-start gap-4 pb-6 border-b border-black/10">
          <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shrink-0">
            <Plane size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold text-black">{flight.callsign}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-sans bg-black/5 text-black/60">
                {flight.aircraftType}
              </span>
              {flight.priority <= 2 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-red-100 text-red-800 font-bold">
                  Priority {flight.priority}
                </span>
              )}
            </div>
            <div className="text-sm font-serif text-black/60 mt-0.5">{flight.airline}</div>
            <div className="flex items-center gap-3 text-xs text-black/50 font-sans mt-2">
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {flight.origin} → {flight.destination}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Users size={12} /> {flight.passengers} Passengers
              </span>
            </div>
          </div>
        </div>

        {/* Operational Schedule Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
          <div className="p-3 rounded-xl bg-black/[0.02] border border-black/5">
            <div className="text-[10px] uppercase font-sans text-black/40">Actual Arrival</div>
            <div className="text-base font-mono font-semibold text-black mt-0.5">
              {formatSimTime(flight.actualArrival)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/[0.02] border border-black/5">
            <div className="text-[10px] uppercase font-sans text-black/40">Target Departure</div>
            <div className="text-base font-mono font-semibold text-black mt-0.5">
              {formatSimTime(flight.scheduledDeparture)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/[0.02] border border-black/5">
            <div className="text-[10px] uppercase font-sans text-black/40">Est. Departure</div>
            <div className={`text-base font-mono font-semibold mt-0.5 ${flight.delayMinutes > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
              {formatSimTime(flight.estimatedDeparture)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/[0.02] border border-black/5">
            <div className="text-[10px] uppercase font-sans text-black/40">Assigned Gate</div>
            <div className="text-base font-serif font-medium text-black mt-0.5">
              {currentGate?.name.split(' (')[0] || flight.gateId}
            </div>
          </div>
        </div>

        {/* Turnaround Tasks & Precedence DAG */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-serif text-lg text-black">
              Turnaround Work Breakdown & Precedence Graph
            </h4>
            <span className="text-[11px] font-mono text-black/50">
              {flight.tasks.filter((t) => t.status === 'completed').length} / {flight.tasks.length} Completed
            </span>
          </div>

          <div className="space-y-2.5">
            {flight.tasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl border border-black/10 bg-black/[0.015] hover:bg-black/[0.03] transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        task.status === 'completed'
                          ? 'bg-emerald-500'
                          : task.status === 'in_progress'
                          ? 'bg-blue-600 animate-pulse'
                          : task.status === 'delayed'
                          ? 'bg-amber-500'
                          : 'bg-black/20'
                      }`}
                    />
                    <span className="text-xs font-serif font-medium text-black">
                      {task.name}
                    </span>
                    <span className="text-[10px] font-mono text-black/40">
                      ({task.durationMinutes}m duration)
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${
                      task.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : task.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200 font-bold'
                        : task.status === 'delayed'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-black/5 text-black/50'
                    }`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      task.status === 'completed'
                        ? 'bg-emerald-600'
                        : task.status === 'in_progress'
                        ? 'bg-blue-600'
                        : 'bg-black/20'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-sans text-black/50">
                  <span>
                    Requires: <strong className="text-black/70 capitalize">{task.requiredResource.type} crew</strong> ({task.requiredResource.count}x)
                  </span>
                  <span>
                    Dependencies:{' '}
                    {task.dependencies.length > 0
                      ? task.dependencies.join(' + ')
                      : 'None (Immediate Start)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Testing Actions */}
        <div className="pt-6 mt-6 border-t border-black/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onDelayFlight && (
              <button
                onClick={() => onDelayFlight(flight.id, 20)}
                className="px-3.5 py-1.5 rounded-full border border-black/20 hover:bg-black/5 text-xs font-sans font-medium"
              >
                +20m Arrival Delay
              </button>
            )}
            {onPromotePriority && flight.priority > 1 && (
              <button
                onClick={() => onPromotePriority(flight.id)}
                className="px-3.5 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 text-xs font-sans font-bold"
              >
                Promote to Emergency P1
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-black text-white text-xs font-sans font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
