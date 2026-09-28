import { useState } from 'react';
import { Flight, Gate, ResourceCrew, DisruptionEvent } from '../../simulation/types';
import { formatSimTime } from '../../simulation/schedulerAlgorithm';
import { Zap, Wrench, Users, ArrowUpCircle, Flame } from 'lucide-react';

interface DisruptionInjectorProps {
  flights: Flight[];
  gates: Gate[];
  crews?: ResourceCrew[];
  currentTime: number;
  onInjectDisruption: (
    disruption: DisruptionEvent,
    actionType: 'delay' | 'priority' | 'equipment' | 'crew' | 'gate',
    targetId: string,
    extraVal?: number | string
  ) => void;
}

export function DisruptionInjector({
  flights,
  gates,
  currentTime,
  onInjectDisruption,
}: DisruptionInjectorProps) {
  const [selectedFlightId, setSelectedFlightId] = useState(flights[0]?.id || '');
  const [delayAmount, setDelayAmount] = useState(30);

  const [priorityFlightId, setPriorityFlightId] = useState(flights[0]?.id || '');
  const [newPriority, setNewPriority] = useState<1 | 2>(1);

  const [brokenGateId, setBrokenGateId] = useState(gates[0]?.id || '');
  const [brokenCrewType, setBrokenCrewType] = useState<'ramp' | 'fuel' | 'cleaning'>('ramp');

  const handleApplyDelay = () => {
    const flight = flights.find((f) => f.id === selectedFlightId);
    if (!flight) return;

    const dis: DisruptionEvent = {
      id: `dis-delay-${Date.now()}`,
      timestamp: currentTime,
      timeFormatted: formatSimTime(currentTime),
      type: 'flight_delay',
      title: `${flight.callsign} Inbound Delay (+${delayAmount}m)`,
      description: `Headwinds and air-traffic congestion delayed inbound arrival by ${delayAmount} minutes.`,
      flightId: flight.id,
      resolved: false,
    };

    onInjectDisruption(dis, 'delay', flight.id, delayAmount);
  };

  const handleApplyPriority = () => {
    const flight = flights.find((f) => f.id === priorityFlightId);
    if (!flight) return;

    const dis: DisruptionEvent = {
      id: `dis-priority-${Date.now()}`,
      timestamp: currentTime,
      timeFormatted: formatSimTime(currentTime),
      type: 'priority_escalation',
      title: `${flight.callsign} Escalated to Priority ${newPriority}`,
      description:
        newPriority === 1
          ? 'Emergency medical priority protocol declared. Immediate gate and turnaround clearance mandated.'
          : 'Head-of-State diplomat escort priority assigned. Zero-delay schedule guaranteed.',
      flightId: flight.id,
      resolved: false,
    };

    onInjectDisruption(dis, 'priority', flight.id, newPriority);
  };

  const handleBreakGate = () => {
    const gate = gates.find((g) => g.id === brokenGateId);
    if (!gate) return;

    const dis: DisruptionEvent = {
      id: `dis-gate-${Date.now()}`,
      timestamp: currentTime,
      timeFormatted: formatSimTime(currentTime),
      type: 'equipment_failure',
      title: `${gate.name.split(' (')[0]} Equipment Malfunction`,
      description: 'Fuel hydrant pressure valve collapsed. Gate offline for emergency repair.',
      gateId: gate.id,
      resolved: false,
    };

    onInjectDisruption(dis, 'gate', gate.id);
  };

  const handleCrewShortage = () => {
    const dis: DisruptionEvent = {
      id: `dis-crew-${Date.now()}`,
      timestamp: currentTime,
      timeFormatted: formatSimTime(currentTime),
      type: 'crew_shortage',
      title: `Emergency Shortage: ${brokenCrewType.toUpperCase()} Ground Staff`,
      description: `Sudden lightning ground-hold halts ${brokenCrewType} dispatch. Operational capacity halved.`,
      resourceType: brokenCrewType,
      resolved: false,
    };

    onInjectDisruption(dis, 'crew', brokenCrewType);
  };

  return (
    <div className="bg-white border border-black/10 rounded-2xl shadow-sm p-6 text-black">
      <div className="flex items-center justify-between pb-4 border-b border-black/10 mb-6">
        <div>
          <h3 className="font-serif text-2xl font-normal text-black flex items-center gap-2">
            <Flame size={20} className="text-[#0825c6]" />
            Chaos & Disruption Sandbox
          </h3>
          <p className="font-sans text-xs text-black/50 mt-1">
            Test the scheduling algorithm's real-time adaptability by injecting arbitrary delays, equipment failures, staff shortages, or emergency escalations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Inbound Delay Injection */}
        <div className="p-4 rounded-xl border border-black/10 bg-black/[0.015] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/70 mb-3">
              <Zap size={14} className="text-amber-600" />
              <span>Inbound Arrival Delay</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-sans text-black/50 mb-1">Target Flight</label>
                <select
                  value={selectedFlightId}
                  onChange={(e) => setSelectedFlightId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-black/20 text-xs font-mono bg-white"
                >
                  {flights.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.callsign} ({f.aircraftType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-sans text-black/50 mb-1">Delay Duration</label>
                <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                  {[15, 30, 45].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDelayAmount(m)}
                      className={`py-1 rounded-md border text-center font-medium ${
                        delayAmount === m
                          ? 'border-black bg-black text-white'
                          : 'border-black/20 hover:border-black/40 text-black/80'
                      }`}
                    >
                      +{m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleApplyDelay}
            className="w-full mt-4 py-2 px-3 rounded-full bg-black text-white text-xs font-sans font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-xs"
          >
            Inject Flight Delay
          </button>
        </div>

        {/* 2. Priority Escalation */}
        <div className="p-4 rounded-xl border border-black/10 bg-black/[0.015] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/70 mb-3">
              <ArrowUpCircle size={14} className="text-red-600" />
              <span>Priority Preemption</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-sans text-black/50 mb-1">Target Flight</label>
                <select
                  value={priorityFlightId}
                  onChange={(e) => setPriorityFlightId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-black/20 text-xs font-mono bg-white"
                >
                  {flights.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.callsign} (Current: P{f.priority})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-sans text-black/50 mb-1">New Priority Status</label>
                <div className="grid grid-cols-2 gap-1.5 text-xs font-sans">
                  <button
                    type="button"
                    onClick={() => setNewPriority(1)}
                    className={`p-1.5 rounded-md border text-left ${
                      newPriority === 1
                        ? 'border-red-600 bg-red-50 text-red-950 font-bold'
                        : 'border-black/20 text-black/70'
                    }`}
                  >
                    <span className="block text-[10px] font-mono text-red-600">P1</span>
                    Emergency Medical
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPriority(2)}
                    className={`p-1.5 rounded-md border text-left ${
                      newPriority === 2
                        ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold'
                        : 'border-black/20 text-black/70'
                    }`}
                  >
                    <span className="block text-[10px] font-mono text-amber-600">P2</span>
                    Head-of-State VIP
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleApplyPriority}
            className="w-full mt-4 py-2 px-3 rounded-full bg-red-600 text-white text-xs font-sans font-bold uppercase tracking-wider hover:bg-red-700 active:scale-95 transition-all shadow-xs"
          >
            Escalate Priority
          </button>
        </div>

        {/* 3. Gate Equipment Failure */}
        <div className="p-4 rounded-xl border border-black/10 bg-black/[0.015] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/70 mb-3">
              <Wrench size={14} className="text-amber-700" />
              <span>Gate Equipment Failure</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-sans text-black/50 mb-1">Select Gate</label>
                <select
                  value={brokenGateId}
                  onChange={(e) => setBrokenGateId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-black/20 text-xs font-serif bg-white"
                >
                  {gates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name.split(' (')[0]} ({g.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2.5 rounded-lg bg-black/5 text-[11px] font-sans text-black/60">
                Disables subterranean fuel hydrant & forces algorithm to coordinate mobile tanker or reassign gate.
              </div>
            </div>
          </div>

          <button
            onClick={handleBreakGate}
            className="w-full mt-4 py-2 px-3 rounded-full border border-black/30 hover:bg-black/5 text-xs font-sans font-bold uppercase tracking-wider active:scale-95 transition-all"
          >
            Simulate Gate Fault
          </button>
        </div>

        {/* 4. Staff Shortage */}
        <div className="p-4 rounded-xl border border-black/10 bg-black/[0.015] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/70 mb-3">
              <Users size={14} className="text-purple-700" />
              <span>Ground Staff Deficit</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-sans text-black/50 mb-1">Affected Crew Department</label>
                <select
                  value={brokenCrewType}
                  onChange={(e) => setBrokenCrewType(e.target.value as 'ramp' | 'fuel' | 'cleaning')}
                  className="w-full px-3 py-1.5 rounded-lg border border-black/20 text-xs font-sans bg-white"
                >
                  <option value="ramp">Ramp Baggage Handlers</option>
                  <option value="fuel">Fuel Hydrant Specialists</option>
                  <option value="cleaning">Cabin Grooming Personnel</option>
                </select>
              </div>

              <div className="p-2.5 rounded-lg bg-black/5 text-[11px] font-sans text-black/60">
                Grounds 50% of available teams. Algorithm prioritizes high-connection-risk flights.
              </div>
            </div>
          </div>

          <button
            onClick={handleCrewShortage}
            className="w-full mt-4 py-2 px-3 rounded-full border border-black/30 hover:bg-black/5 text-xs font-sans font-bold uppercase tracking-wider active:scale-95 transition-all"
          >
            Trigger Staff Shortage
          </button>
        </div>
      </div>
    </div>
  );
}
