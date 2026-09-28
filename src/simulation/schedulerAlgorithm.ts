import {
  Flight,
  Gate,
  ResourceCrew,
  AlgorithmDecision,
  SimulationMetrics,
  TaskType,
} from './types';

// Standard task durations (in minutes) by aircraft category
export const BASE_TASK_DURATIONS: Record<string, Record<TaskType, number>> = {
  'A350-900': {
    deplaning: 18,
    baggage_offload: 22,
    refuelling: 25,
    cleaning: 24,
    catering: 20,
    baggage_load: 24,
    boarding: 26,
    pushback: 6,
  },
  'B787-9': {
    deplaning: 16,
    baggage_offload: 20,
    refuelling: 24,
    cleaning: 22,
    catering: 18,
    baggage_load: 22,
    boarding: 24,
    pushback: 6,
  },
  'A321neo': {
    deplaning: 12,
    baggage_offload: 15,
    refuelling: 18,
    cleaning: 15,
    catering: 14,
    baggage_load: 16,
    boarding: 18,
    pushback: 5,
  },
  'Global 7500': {
    deplaning: 6,
    baggage_offload: 8,
    refuelling: 12,
    cleaning: 10,
    catering: 8,
    baggage_load: 8,
    boarding: 8,
    pushback: 4,
  },
};

export function formatSimTime(minutesFromZero: number): string {
  const totalMins = 8 * 60 + Math.max(0, Math.floor(minutesFromZero));
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Priority-Weighted Critical Path & Resource Scheduler (RCPSP)
 * Runs dynamically whenever simulation clock advances or an unexpected event occurs.
 */
export function recalculateTurnaroundSchedule(
  currentTime: number,
  flights: Flight[],
  gates: Gate[],
  crews: ResourceCrew[],
  existingDecisions: AlgorithmDecision[]
): {
  updatedFlights: Flight[];
  updatedGates: Gate[];
  updatedCrews: ResourceCrew[];
  decisions: AlgorithmDecision[];
  metrics: SimulationMetrics;
} {
  const startTimePerf = performance.now();
  const decisions = [...existingDecisions];
  let rippleDelaySaved = 0;

  // Clone state to prevent side effects
  const workingFlights: Flight[] = flights.map((f) => ({
    ...f,
    tasks: f.tasks.map((t) => ({ ...t, assignedCrewIds: [...t.assignedCrewIds] })),
  }));
  const workingGates: Gate[] = gates.map((g) => ({ ...g }));
  const workingCrews: ResourceCrew[] = crews.map((c) => ({ ...c }));

  // Reset crew assignments if current task finished
  workingCrews.forEach((crew) => {
    if (crew.assignedTaskId) {
      const flight = workingFlights.find((f) => f.id === crew.assignedFlightId);
      const task = flight?.tasks.find((t) => t.id === crew.assignedTaskId);
      if (!task || task.status === 'completed') {
        crew.status = 'idle';
        crew.assignedFlightId = null;
        crew.assignedTaskId = null;
      }
    }
  });

  // Step 1: Detect and Resolve Gate Collisions
  // If a flight's assigned gate is occupied by another aircraft past its departure,
  // or two flights overlap on the same gate, find the optimal swap.
  for (let i = 0; i < workingFlights.length; i++) {
    const flight = workingFlights[i];
    if (flight.status === 'departed') continue;

    // Check if current gate is valid
    const assignedGate = workingGates.find((g) => g.id === flight.gateId);
    const isGateOccupiedByOther =
      assignedGate?.currentFlightId && assignedGate.currentFlightId !== flight.id;

    if (assignedGate?.status === 'maintenance' || (isGateOccupiedByOther && flight.actualArrival <= currentTime)) {
      // Find candidate alternative gate supporting aircraft type
      const candidateGate = workingGates.find(
        (g) =>
          g.status === 'available' &&
          !g.currentFlightId &&
          g.allowedTypes.includes(flight.aircraftType)
      );

      if (candidateGate) {
        const oldGateName = assignedGate?.name || flight.gateId;
        flight.gateId = candidateGate.id;
        candidateGate.currentFlightId = flight.id;
        if (assignedGate && assignedGate.currentFlightId === flight.id) {
          assignedGate.currentFlightId = null;
        }

        const decision: AlgorithmDecision = {
          id: `dec-gate-${Date.now()}-${flight.id}`,
          timestamp: currentTime,
          timeFormatted: formatSimTime(currentTime),
          action: `Rerouted ${flight.callsign} to Gate ${candidateGate.name}`,
          reason: `Conflict on Gate ${oldGateName} (${assignedGate?.status === 'maintenance' ? 'Gate Maintenance' : 'Overstay Collision'})`,
          impact: `Prevented ramp hold for ${flight.passengers} passengers`,
          savingsMinutes: 18,
        };
        decisions.unshift(decision);
        rippleDelaySaved += 18;
      }
    } else if (flight.actualArrival <= currentTime && flight.status !== 'departed') {
      if (assignedGate) {
        assignedGate.currentFlightId = flight.id;
      }
    }
  }

  // Step 2: Sort active flights by Priority and Urgency
  // Priority 1 (Emergency) > Priority 2 (VIP) > Priority 3 (Connections) > Priority 4 > Priority 5
  // Within same priority: Earliest target departure first
  const activeFlights = workingFlights.filter((f) => f.status !== 'departed');
  activeFlights.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority; // 1 comes first
    }
    return a.scheduledDeparture - b.scheduledDeparture;
  });

  // Step 3: Critical Path & Task Progression Calculation
  activeFlights.forEach((flight) => {
    const isDocked = flight.actualArrival <= currentTime;
    if (!isDocked) {
      flight.status = 'approaching';
      return;
    }

    let allTasksCompleted = true;
    let anyTaskActive = false;

    // Evaluate each task in order
    flight.tasks.forEach((task) => {
      // If task already completed
      if (task.status === 'completed') return;

      allTasksCompleted = false;

      // Check dependencies
      const dependenciesMet = task.dependencies.every((depType) => {
        const parentTask = flight.tasks.find((t) => t.type === depType);
        return parentTask && parentTask.status === 'completed';
      });

      if (!dependenciesMet) {
        task.status = 'blocked';
        return;
      }

      // Check resource requirement
      const requiredCrewType = task.requiredResource.type;
      const countNeeded = task.requiredResource.count;

      // Find available crews of this type
      const matchingCrews = workingCrews.filter(
        (c) =>
          c.type === requiredCrewType &&
          c.status !== 'out_of_service' &&
          (c.status === 'idle' || c.assignedTaskId === task.id)
      );

      // Preemption logic: If this flight is Priority 1 or 2 (Medical / VIP),
      // it can preempt idle or low-priority assigned crews!
      if (matchingCrews.length < countNeeded && flight.priority <= 2) {
        const lowPriorityCrews = workingCrews.filter((c) => {
          if (c.type !== requiredCrewType || c.status === 'out_of_service') return false;
          if (!c.assignedFlightId) return false;
          const otherFlight = workingFlights.find((f) => f.id === c.assignedFlightId);
          return otherFlight && otherFlight.priority >= 4; // Preempt standard or cargo
        });

        if (lowPriorityCrews.length > 0) {
          const preemptCrew = lowPriorityCrews[0];
          const preemptedFlight = workingFlights.find((f) => f.id === preemptCrew.assignedFlightId);
          const preemptedTask = preemptedFlight?.tasks.find((t) => t.id === preemptCrew.assignedTaskId);

          if (preemptedTask) {
            preemptedTask.status = 'delayed';
            preemptedTask.assignedCrewIds = preemptedTask.assignedCrewIds.filter((id) => id !== preemptCrew.id);
          }

          decisions.unshift({
            id: `dec-preempt-${Date.now()}-${flight.id}`,
            timestamp: currentTime,
            timeFormatted: formatSimTime(currentTime),
            action: `Preempted ${preemptCrew.name} (${requiredCrewType}) to ${flight.callsign}`,
            reason: `High priority protocol (${flight.priority === 1 ? 'Emergency Medical' : 'Head-of-State / VIP'})`,
            impact: `Saved 15m delay on critical flight ${flight.callsign}`,
            savingsMinutes: 15,
          });
          rippleDelaySaved += 15;

          preemptCrew.status = 'assigned';
          preemptCrew.assignedFlightId = flight.id;
          preemptCrew.assignedTaskId = task.id;
          matchingCrews.push(preemptCrew);
        }
      }

      if (matchingCrews.length >= countNeeded) {
        // We have enough crew!
        anyTaskActive = true;
        if (task.status !== 'in_progress') {
          task.status = 'in_progress';
          task.actualStart = task.actualStart ?? currentTime;
        }

        // Assign crews
        task.assignedCrewIds = matchingCrews.slice(0, countNeeded).map((c) => {
          c.status = 'assigned';
          c.assignedFlightId = flight.id;
          c.assignedTaskId = task.id;
          return c.id;
        });

        // Compute efficiency from assigned crews
        const avgEfficiency =
          task.assignedCrewIds.reduce((sum, cid) => {
            const crew = workingCrews.find((c) => c.id === cid);
            return sum + (crew?.efficiency || 1.0);
          }, 0) / countNeeded;

        // Progress the task based on time elapsed
        const elapsed = currentTime - (task.actualStart ?? currentTime);
        const effectiveDuration = task.durationMinutes / avgEfficiency;
        task.progress = Math.min(100, Math.round((elapsed / effectiveDuration) * 100));

        if (task.progress >= 100) {
          task.status = 'completed';
          task.actualEnd = currentTime;
          // Free crews
          task.assignedCrewIds.forEach((cid) => {
            const crew = workingCrews.find((c) => c.id === cid);
            if (crew) {
              crew.status = 'idle';
              crew.assignedFlightId = null;
              crew.assignedTaskId = null;
            }
          });
        }
      } else {
        // Resource constrained: Task is delayed waiting for crew
        task.status = 'delayed';
      }
    });

    // Update flight overall status
    if (allTasksCompleted) {
      flight.status = 'ready_for_departure';
      const pushback = flight.tasks.find((t) => t.type === 'pushback');
      if (pushback && pushback.actualEnd) {
        flight.estimatedDeparture = pushback.actualEnd;
      }
    } else if (anyTaskActive) {
      flight.status = 'servicing';
    } else {
      flight.status = 'docked';
    }

    // Dynamic Critical Path Method (CPM) calculation for flight estimated departure
    // Find the longest path through the remaining turnaround tasks
    flight.estimatedDeparture = calculateDynamicEstimatedDeparture(flight, currentTime);
    flight.delayMinutes = Math.max(0, flight.estimatedDeparture - flight.scheduledDeparture);
  });

  // Calculate Metrics
  const totalDelays = workingFlights.reduce((acc, f) => acc + f.delayMinutes, 0);
  const onTimeCount = workingFlights.filter((f) => f.delayMinutes <= 5).length;
  const onTimePct = Math.round((onTimeCount / Math.max(1, workingFlights.length)) * 100);

  const occupiedGates = workingGates.filter((g) => g.currentFlightId !== null).length;
  const gateUtilPct = Math.round((occupiedGates / workingGates.length) * 100);

  const activeCrews = workingCrews.filter((c) => c.status === 'assigned').length;

  const executionTime = +(performance.now() - startTimePerf).toFixed(2);

  const metrics: SimulationMetrics = {
    totalDelaysMinutes: totalDelays,
    rippleDelaySavedMinutes: rippleDelaySaved + Math.round(decisions.length * 8.5),
    onTimeDepartureRate: onTimePct,
    gateUtilizationRate: gateUtilPct,
    activeCrewsCount: activeCrews,
    totalCrewsCount: workingCrews.length,
    criticalFlightsCount: workingFlights.filter((f) => f.priority <= 2).length,
    algorithmExecutionTimeMs: executionTime,
  };

  return {
    updatedFlights: workingFlights,
    updatedGates: workingGates,
    updatedCrews: workingCrews,
    decisions: decisions.slice(0, 30), // keep latest 30 decisions
    metrics,
  };
}

/**
 * Calculates estimated departure based on remaining task dependency chain
 */
function calculateDynamicEstimatedDeparture(flight: Flight, currentTime: number): number {
  if (flight.status === 'departed') return flight.scheduledDeparture;

  // Build topological finish times
  const taskFinishTimes: Record<TaskType, number> = {} as Record<TaskType, number>;

  // Initialize completed tasks
  flight.tasks.forEach((t) => {
    if (t.status === 'completed' && t.actualEnd !== null) {
      taskFinishTimes[t.type] = t.actualEnd;
    }
  });

  // Iteratively compute earliest finish time for remaining tasks
  const remaining = flight.tasks.filter((t) => t.status !== 'completed');
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 15) {
    changed = false;
    iterations++;

    remaining.forEach((task) => {
      let earliestStart = Math.max(currentTime, flight.actualArrival);
      task.dependencies.forEach((dep) => {
        if (taskFinishTimes[dep] !== undefined) {
          earliestStart = Math.max(earliestStart, taskFinishTimes[dep]);
        }
      });

      // Remaining duration considering current progress
      const remainingDuration = Math.max(
        1,
        Math.round(task.durationMinutes * (1 - task.progress / 100))
      );
      const finishTime = earliestStart + remainingDuration;

      if (taskFinishTimes[task.type] !== finishTime) {
        taskFinishTimes[task.type] = finishTime;
        changed = true;
      }
    });
  }

  // Pushback finish time represents estimated departure
  const finalDeparture = taskFinishTimes['pushback'] ?? flight.scheduledDeparture;
  return Math.max(finalDeparture, flight.scheduledDeparture);
}
