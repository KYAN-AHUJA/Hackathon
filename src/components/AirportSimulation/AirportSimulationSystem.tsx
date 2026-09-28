import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Flight,
  Gate,
  ResourceCrew,
  DisruptionEvent,
  AlgorithmDecision,
  SimulationMetrics,
} from '../../simulation/types';
import { SCENARIOS } from '../../simulation/scenarios';
import {
  recalculateTurnaroundSchedule,
  formatSimTime,
} from '../../simulation/schedulerAlgorithm';
import { SimulationControls } from './SimulationControls';
import { MetricsBar } from './MetricsBar';
import { TurnaroundGantt } from './TurnaroundGantt';
import { ApronVisualizer } from './ApronVisualizer';
import { DisruptionInjector } from './DisruptionInjector';
import { AlgorithmExplainPanel } from './AlgorithmExplainPanel';
import { FlightDetailModal } from './FlightDetailModal';
import { Calendar, LayoutGrid, Flame, Cpu } from 'lucide-react';

export function AirportSimulationSystem() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>('scenario-nominal');
  const [currentTime, setCurrentTime] = useState<number>(5);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(2);

  // Core Simulation State
  const [flights, setFlights] = useState<Flight[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [crews, setCrews] = useState<ResourceCrew[]>([]);
  const [disruptions, setDisruptions] = useState<DisruptionEvent[]>([]);
  const [decisions, setDecisions] = useState<AlgorithmDecision[]>([]);
  const [metrics, setMetrics] = useState<SimulationMetrics>({
    totalDelaysMinutes: 0,
    rippleDelaySavedMinutes: 0,
    onTimeDepartureRate: 100,
    gateUtilizationRate: 0,
    activeCrewsCount: 0,
    totalCrewsCount: 12,
    criticalFlightsCount: 0,
    algorithmExecutionTimeMs: 1.2,
  });

  const [activeTab, setActiveTab] = useState<'timeline' | 'apron' | 'sandbox' | 'algorithm'>('timeline');
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);

  // Initialize scenario
  const loadScenario = useCallback((scenarioId: string) => {
    const scenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0];
    setActiveScenarioId(scenario.id);
    setCurrentTime(scenario.initialTime);
    setIsRunning(false);

    // Initial scheduling run
    const result = recalculateTurnaroundSchedule(
      scenario.initialTime,
      scenario.flights,
      scenario.gates,
      scenario.crews,
      []
    );

    setFlights(result.updatedFlights);
    setGates(result.updatedGates);
    setCrews(result.updatedCrews);
    setDisruptions(scenario.disruptions);
    setDecisions(result.decisions);
    setMetrics(result.metrics);
  }, []);

  useEffect(() => {
    loadScenario('scenario-nominal');
  }, [loadScenario]);

  // State Refs for robust simulation tick access
  const flightsRef = useRef(flights);
  flightsRef.current = flights;
  const gatesRef = useRef(gates);
  gatesRef.current = gates;
  const crewsRef = useRef(crews);
  crewsRef.current = crews;
  const decisionsRef = useRef(decisions);
  decisionsRef.current = decisions;
  const selectedFlightRef = useRef(selectedFlight);
  selectedFlightRef.current = selectedFlight;

  // Simulation Tick Loop
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.max(100, Math.round(1000 / speed));

    timerRef.current = window.setInterval(() => {
      setCurrentTime((prevTime) => {
        const nextTime = prevTime + 1;

        // Run scheduler at new time with current state
        const result = recalculateTurnaroundSchedule(
          nextTime,
          flightsRef.current,
          gatesRef.current,
          crewsRef.current,
          decisionsRef.current
        );

        setFlights(result.updatedFlights);
        setGates(result.updatedGates);
        setCrews(result.updatedCrews);
        setDecisions(result.decisions);
        setMetrics(result.metrics);

        // Also update selected flight if modal is open
        if (selectedFlightRef.current) {
          const updatedSel = result.updatedFlights.find((f) => f.id === selectedFlightRef.current?.id);
          if (updatedSel) setSelectedFlight(updatedSel);
        }

        return nextTime;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, speed]);

  // Trigger manual step
  const handleStepForward = (mins: number) => {
    const nextTime = currentTime + mins;
    setCurrentTime(nextTime);

    const result = recalculateTurnaroundSchedule(
      nextTime,
      flights,
      gates,
      crews,
      decisions
    );

    setFlights(result.updatedFlights);
    setGates(result.updatedGates);
    setCrews(result.updatedCrews);
    setDecisions(result.decisions);
    setMetrics(result.metrics);

    if (selectedFlight) {
      const updatedSel = result.updatedFlights.find((f) => f.id === selectedFlight.id);
      if (updatedSel) setSelectedFlight(updatedSel);
    }
  };

  // Disruption Handlers
  const handleInjectDisruption = (
    disruption: DisruptionEvent,
    actionType: 'delay' | 'priority' | 'equipment' | 'crew' | 'gate',
    targetId: string,
    extraVal?: number | string
  ) => {
    const updatedFlights = [...flights];
    const updatedGates = [...gates];
    let updatedCrews = [...crews];

    if (actionType === 'delay') {
      const flightIndex = updatedFlights.findIndex((f) => f.id === targetId);
      if (flightIndex >= 0) {
        const f = updatedFlights[flightIndex];
        const addedDelay = extraVal || 30;
        f.actualArrival += addedDelay;
        f.scheduledDeparture += addedDelay;
        // Shift task starts
        f.tasks = f.tasks.map((t) => ({
          ...t,
          scheduledStart: t.scheduledStart + addedDelay,
          scheduledEnd: t.scheduledEnd + addedDelay,
          actualStart: t.actualStart !== null ? t.actualStart + addedDelay : null,
        }));
      }
    } else if (actionType === 'priority') {
      const flightIndex = updatedFlights.findIndex((f) => f.id === targetId);
      if (flightIndex >= 0) {
        updatedFlights[flightIndex].priority = extraVal || 1;
      }
    } else if (actionType === 'gate') {
      const gateIndex = updatedGates.findIndex((g) => g.id === targetId);
      if (gateIndex >= 0) {
        updatedGates[gateIndex].status = 'maintenance';
        updatedGates[gateIndex].hasFuelHydrant = false;
      }
    } else if (actionType === 'crew') {
      updatedCrews = updatedCrews.map((c) => {
        if (c.type === targetId) {
          return { ...c, status: 'out_of_service' as const };
        }
        return c;
      });
    }

    // Re-run optimization solver immediately
    const result = recalculateTurnaroundSchedule(
      currentTime,
      updatedFlights,
      updatedGates,
      updatedCrews,
      decisions
    );

    setFlights(result.updatedFlights);
    setGates(result.updatedGates);
    setCrews(result.updatedCrews);
    setDecisions(result.decisions);
    setMetrics(result.metrics);
    setDisruptions([disruption, ...disruptions]);

    // Switch to timeline or algorithm view so user witnesses the immediate adaptation!
    setActiveTab('timeline');
  };

  const handlePromotePriority = (flightId: string) => {
    handleInjectDisruption(
      {
        id: `dis-quick-${Date.now()}`,
        timestamp: currentTime,
        timeFormatted: formatSimTime(currentTime),
        type: 'priority_escalation',
        title: `Priority 1 Escalation`,
        description: 'Flight escalated to Emergency Medical / Head of State priority status.',
        flightId,
        resolved: false,
      },
      'priority',
      flightId,
      1
    );
  };

  const handleDelayFlight = (flightId: string, minutes: number) => {
    handleInjectDisruption(
      {
        id: `dis-quick-delay-${Date.now()}`,
        timestamp: currentTime,
        timeFormatted: formatSimTime(currentTime),
        type: 'flight_delay',
        title: `Inbound Delay (+${minutes}m)`,
        description: `Flight held in holding pattern, delayed by ${minutes} minutes.`,
        flightId,
        resolved: false,
      },
      'delay',
      flightId,
      minutes
    );
  };

  return (
    <section className="relative z-20 bg-[#fafafa] py-20 px-4 sm:px-8 lg:px-12 min-h-screen text-black" id="simulation-system">
      <div className="max-w-7xl mx-auto">
        {/* Section Header with ATMOS Design Language */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="font-serif text-[11px] uppercase tracking-[0.28em] text-black/40 mb-3">
            Atmos Autonomous Turnaround Coordinator · Engine v3.4
          </p>
          <h2 className="font-serif text-3xl sm:text-5xl lg:text-[52px] font-normal tracking-tight text-black mb-5 leading-[1.12]">
            Airport Turnaround Operations & Dynamic Dispatch
          </h2>
          <p className="font-sans text-base sm:text-lg text-black/60 font-normal leading-relaxed">
            Multi-agent resource scheduling coordinating passenger boarding, baggage ramp handling,
            cabin sanitization, Jet-A1 refuelling, and tug pushbacks under gate and crew constraints.
          </p>
        </div>

        {/* Global Simulation Controls (Play, Step, Speed, Scenario, Clock) */}
        <div className="mb-6">
          <SimulationControls
            currentTime={currentTime}
            isRunning={isRunning}
            speed={speed}
            activeScenarioId={activeScenarioId}
            onTogglePlay={() => setIsRunning(!isRunning)}
            onStepForward={handleStepForward}
            onSpeedChange={setSpeed}
            onSelectScenario={loadScenario}
            onReset={() => loadScenario(activeScenarioId)}
          />
        </div>

        {/* Live Key Metrics & Telemetry Bar */}
        <div className="mb-8">
          <MetricsBar metrics={metrics} disruptionsCount={disruptions.length} />
        </div>

        {/* Navigation Tabs with Wavebird Smooth Switching */}
        <div className="flex items-center justify-between border-b border-black/15 pb-3 mb-6 overflow-x-auto">
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-sans font-medium">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-2 py-2 px-4 rounded-full transition-all duration-200 ${
                activeTab === 'timeline'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-black/60 hover:text-black hover:bg-black/5'
              }`}
            >
              <Calendar size={15} />
              <span>Gantt Schedule & Precedence</span>
            </button>

            <button
              onClick={() => setActiveTab('apron')}
              className={`flex items-center gap-2 py-2 px-4 rounded-full transition-all duration-200 ${
                activeTab === 'apron'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-black/60 hover:text-black hover:bg-black/5'
              }`}
            >
              <LayoutGrid size={15} />
              <span>Apron & Ramp Ground Equipment</span>
            </button>

            <button
              onClick={() => setActiveTab('sandbox')}
              className={`flex items-center gap-2 py-2 px-4 rounded-full transition-all duration-200 ${
                activeTab === 'sandbox'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-black/60 hover:text-black hover:bg-black/5'
              }`}
            >
              <Flame size={15} />
              <span>Chaos Sandbox ({disruptions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('algorithm')}
              className={`flex items-center gap-2 py-2 px-4 rounded-full transition-all duration-200 ${
                activeTab === 'algorithm'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-black/60 hover:text-black hover:bg-black/5'
              }`}
            >
              <Cpu size={15} />
              <span>Optimization Algorithm & Decisions</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-black/40 hidden md:block">
            {flights.length} Flights · {gates.length} Gates · {crews.length} Crews Active
          </div>
        </div>

        {/* Tab Viewport Content */}
        <div className="transition-all duration-300">
          {activeTab === 'timeline' && (
            <TurnaroundGantt
              flights={flights}
              gates={gates}
              currentTime={currentTime}
              onSelectFlight={(flight) => setSelectedFlight(flight)}
              selectedFlightId={selectedFlight?.id}
            />
          )}

          {activeTab === 'apron' && (
            <ApronVisualizer
              gates={gates}
              flights={flights}
              currentTime={currentTime}
              onSelectFlight={(flight) => setSelectedFlight(flight)}
              selectedFlightId={selectedFlight?.id}
            />
          )}

          {activeTab === 'sandbox' && (
            <div className="space-y-6">
              <DisruptionInjector
                flights={flights}
                gates={gates}
                crews={crews}
                currentTime={currentTime}
                onInjectDisruption={handleInjectDisruption}
              />
              <ApronVisualizer
                gates={gates}
                flights={flights}
                currentTime={currentTime}
                onSelectFlight={(flight) => setSelectedFlight(flight)}
                selectedFlightId={selectedFlight?.id}
              />
            </div>
          )}

          {activeTab === 'algorithm' && (
            <div className="space-y-6">
              <AlgorithmExplainPanel decisions={decisions} metrics={metrics} />
              <TurnaroundGantt
                flights={flights}
                gates={gates}
                currentTime={currentTime}
                onSelectFlight={(flight) => setSelectedFlight(flight)}
                selectedFlightId={selectedFlight?.id}
              />
            </div>
          )}
        </div>

        {/* Flight Deep-Dive Inspection Modal */}
        {selectedFlight && (
          <FlightDetailModal
            flight={selectedFlight}
            gates={gates}
            onClose={() => setSelectedFlight(null)}
            onPromotePriority={handlePromotePriority}
            onDelayFlight={handleDelayFlight}
          />
        )}
      </div>
    </section>
  );
}
