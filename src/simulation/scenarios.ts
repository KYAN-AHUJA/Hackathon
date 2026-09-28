import { Flight, Gate, ResourceCrew, DisruptionEvent, TaskType, TurnaroundTask, ResourceType } from './types';
import { BASE_TASK_DURATIONS } from './schedulerAlgorithm';

export interface ScenarioDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  algorithmChallenge: string;
  initialTime: number; // minutes from 08:00
  flights: Flight[];
  gates: Gate[];
  crews: ResourceCrew[];
  disruptions: DisruptionEvent[];
}

function createTask(
  flightId: string,
  type: TaskType,
  name: string,
  aircraftType: string,
  startOffset: number,
  dependencies: TaskType[],
  requiredResource: { type: ResourceType; count: number }
): TurnaroundTask {
  const duration = BASE_TASK_DURATIONS[aircraftType]?.[type] || 15;
  return {
    id: `${flightId}-${type}`,
    flightId,
    type,
    name,
    durationMinutes: duration,
    scheduledStart: startOffset,
    scheduledEnd: startOffset + duration,
    actualStart: null,
    actualEnd: null,
    progress: 0,
    status: 'pending',
    dependencies,
    requiredResource,
    assignedCrewIds: [],
  };
}

export function generateStandardTasks(flightId: string, aircraftType: string, arrivalTime: number): TurnaroundTask[] {
  const d = BASE_TASK_DURATIONS[aircraftType] || BASE_TASK_DURATIONS['A321neo'];

  // Dependencies:
  // 1. deplaning: starts at arrival
  // 2. baggage_offload: starts at arrival (ramp)
  // 3. cleaning: depends on deplaning (cleaning)
  // 4. catering: depends on deplaning (catering)
  // 5. refuelling: can start after deplaning or concurrent (fuel)
  // 6. baggage_load: depends on baggage_offload (ramp)
  // 7. boarding: depends on cleaning AND refuelling (gate_agent)
  // 8. pushback: depends on boarding, baggage_load, catering (ramp)

  const t1 = createTask(flightId, 'deplaning', 'Passenger Deplaning', aircraftType, arrivalTime, [], {
    type: 'gate_agent',
    count: 1,
  });

  const t2 = createTask(flightId, 'baggage_offload', 'Baggage Offloading', aircraftType, arrivalTime, [], {
    type: 'ramp',
    count: 1,
  });

  const t3 = createTask(flightId, 'cleaning', 'Cabin Deep Sanitization', aircraftType, arrivalTime + d.deplaning, ['deplaning'], {
    type: 'cleaning',
    count: 1,
  });

  const t4 = createTask(flightId, 'catering', 'Gourmet Catering Replenish', aircraftType, arrivalTime + d.deplaning, ['deplaning'], {
    type: 'catering',
    count: 1,
  });

  const t5 = createTask(flightId, 'refuelling', 'Jet-A1 Fuel Hydrant Service', aircraftType, arrivalTime + 4, ['deplaning'], {
    type: 'fuel',
    count: 1,
  });

  const t6 = createTask(flightId, 'baggage_load', 'Outbound Cargo & Baggage', aircraftType, arrivalTime + d.baggage_offload, ['baggage_offload'], {
    type: 'ramp',
    count: 1,
  });

  const t7 = createTask(
    flightId,
    'boarding',
    'Passenger Boarding',
    aircraftType,
    arrivalTime + Math.max(d.deplaning + d.cleaning, d.refuelling),
    ['cleaning', 'refuelling'],
    { type: 'gate_agent', count: 1 }
  );

  const t8 = createTask(
    flightId,
    'pushback',
    'Tug Pushback & Engine Start',
    aircraftType,
    arrivalTime + 65,
    ['boarding', 'baggage_load', 'catering'],
    { type: 'ramp', count: 1 }
  );

  return [t1, t2, t3, t4, t5, t6, t7, t8];
}

export const INITIAL_GATES: Gate[] = [
  {
    id: 'gate-a1',
    name: 'Gate A1 (Heavy Widebody)',
    terminal: 'Terminal 1 · Transatlantic Pier',
    allowedTypes: ['A350-900', 'B787-9', 'A321neo'],
    currentFlightId: null,
    status: 'available',
    hasFuelHydrant: true,
  },
  {
    id: 'gate-a2',
    name: 'Gate A2 (Heavy Widebody)',
    terminal: 'Terminal 1 · Transatlantic Pier',
    allowedTypes: ['A350-900', 'B787-9', 'A321neo'],
    currentFlightId: null,
    status: 'available',
    hasFuelHydrant: true,
  },
  {
    id: 'gate-b1',
    name: 'Gate B1 (Dual Pier)',
    terminal: 'Terminal 2 · European Corridors',
    allowedTypes: ['A350-900', 'B787-9', 'A321neo', 'Global 7500'],
    currentFlightId: null,
    status: 'available',
    hasFuelHydrant: true,
  },
  {
    id: 'gate-b2',
    name: 'Gate B2 (Regional Flex)',
    terminal: 'Terminal 2 · European Corridors',
    allowedTypes: ['A321neo', 'Global 7500'],
    currentFlightId: null,
    status: 'available',
    hasFuelHydrant: false, // Requires tanker truck
  },
  {
    id: 'gate-c1',
    name: 'Gate C1 (VIP Private Apron)',
    terminal: 'Private Executive Jet Center',
    allowedTypes: ['Global 7500', 'A321neo'],
    currentFlightId: null,
    status: 'available',
    hasFuelHydrant: true,
  },
];

export const INITIAL_CREWS: ResourceCrew[] = [
  // Ramp crews
  { id: 'ramp-1', name: 'Ramp Team Alpha', type: 'ramp', status: 'idle', assignedFlightId: null, assignedTaskId: null, efficiency: 1.0 },
  { id: 'ramp-2', name: 'Ramp Team Bravo', type: 'ramp', status: 'idle', assignedFlightId: null, assignedTaskId: null, efficiency: 1.1 },
  { id: 'ramp-3', name: 'Ramp Team Charlie', type: 'ramp', status: 'idle', assignedFlightId: null, assignedTaskId: null, efficiency: 1.0 },
  // Fuel crews
  { id: 'fuel-1', name: 'Hydrant Specialist 01', type: 'fuel', status: 'idle', assignedFlightId: null, assignedTaskId: null, efficiency: 1.0 },
  { id: 'fuel-2', name: 'Mobile Tanker Unit Beta', type: 'fuel', status: 'idle', assignedFlightId: null, assignedTaskId: null, efficiency: 0.95 },
  // Cleaning teams
  { id: 'clean-1', name: 'Cabin Sanitization 1', type: 'cleaning', status: 'idle', assignedFlightId: null, assignedTaskId: null, efficiency: 1.05 },
  { id: 'clean-2', name: 'Cabin Sanitization 2', type: 'cleaning', status: 'idle', assignedFlightId: null, assignedTaskId: null, efficiency: 1.0 },
  // Catering
  { id: 'cat-1', name: 'SkyChef Logistics Alpha', type: 'catering', status: 'idle', assignedFlightId: null, assignedTaskId: null, efficiency: 1.0 },
  { id: 'cat-2', name: 'SkyChef Logistics Bravo', type: 'catering', status: 'idle', assignedFlightId: null, assignedTaskId: null, efficiency: 1.0 },
  // Gate agents
  { id: 'gate-1', name: 'Boarding Crew A', type: 'gate_agent', status: 'idle', assignedFlightId: null, assignedTaskId: null, efficiency: 1.1 },
  { id: 'gate-2', name: 'Boarding Crew B', type: 'gate_agent', status: 'idle', assignedFlightId: null, assignedTaskId: null, efficiency: 1.0 },
  { id: 'gate-3', name: 'Boarding Crew C', type: 'gate_agent', status: 'idle', assignedFlightId: null, assignedTaskId: null, efficiency: 1.0 },
];

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'scenario-nominal',
    name: '01. Nominal Morning Wave',
    tagline: 'Standard Peak Capacity Coordination',
    description:
      'Synchronized morning operations with 5 commercial & executive flights. Demonstrates baseline Critical Path Method scheduling and resource balancing without unexpected friction.',
    algorithmChallenge:
      'Optimal resource allocation across overlapping widebody and narrowbody turnarounds to maintain 100% on-time departures.',
    initialTime: 5,
    gates: JSON.parse(JSON.stringify(INITIAL_GATES)),
    crews: JSON.parse(JSON.stringify(INITIAL_CREWS)),
    flights: [
      {
        id: 'fl-101',
        callsign: 'ATM-101',
        airline: 'Atmos Airways',
        origin: 'London Heathrow (LHR)',
        destination: 'Reykjavik (KEF)',
        aircraftType: 'A350-900',
        gateId: 'gate-a1',
        priority: 3,
        passengers: 284,
        scheduledArrival: 10,
        actualArrival: 10,
        scheduledDeparture: 90,
        estimatedDeparture: 90,
        status: 'approaching',
        tasks: generateStandardTasks('fl-101', 'A350-900', 10),
        delayMinutes: 0,
        color: '#0825c6',
      },
      {
        id: 'fl-202',
        callsign: 'ATM-202',
        airline: 'Atmos Airways',
        origin: 'Tokyo Haneda (HND)',
        destination: 'Zurich (ZRH)',
        aircraftType: 'B787-9',
        gateId: 'gate-a2',
        priority: 4,
        passengers: 242,
        scheduledArrival: 15,
        actualArrival: 15,
        scheduledDeparture: 85,
        estimatedDeparture: 85,
        status: 'approaching',
        tasks: generateStandardTasks('fl-202', 'B787-9', 15),
        delayMinutes: 0,
        color: '#4a4bd0',
      },
      {
        id: 'fl-303',
        callsign: 'ATM-303',
        airline: 'Atmos Regional',
        origin: 'Frankfurt (FRA)',
        destination: 'Paris Le Bourget (LBG)',
        aircraftType: 'A321neo',
        gateId: 'gate-b1',
        priority: 4,
        passengers: 178,
        scheduledArrival: 20,
        actualArrival: 20,
        scheduledDeparture: 75,
        estimatedDeparture: 75,
        status: 'approaching',
        tasks: generateStandardTasks('fl-303', 'A321neo', 20),
        delayMinutes: 0,
        color: '#6b6ce0',
      },
      {
        id: 'fl-vip1',
        callsign: 'IMP-01',
        airline: 'Imperium Executive',
        origin: 'Geneva (GVA)',
        destination: 'New York (TEB)',
        aircraftType: 'Global 7500',
        gateId: 'gate-c1',
        priority: 2,
        passengers: 12,
        scheduledArrival: 25,
        actualArrival: 25,
        scheduledDeparture: 65,
        estimatedDeparture: 65,
        status: 'approaching',
        tasks: generateStandardTasks('fl-vip1', 'Global 7500', 25),
        delayMinutes: 0,
        color: '#1e1e24',
      },
      {
        id: 'fl-404',
        callsign: 'ATM-404',
        airline: 'Atmos Regional',
        origin: 'Amsterdam (AMS)',
        destination: 'Milan (MXP)',
        aircraftType: 'A321neo',
        gateId: 'gate-b2',
        priority: 4,
        passengers: 164,
        scheduledArrival: 30,
        actualArrival: 30,
        scheduledDeparture: 88,
        estimatedDeparture: 88,
        status: 'approaching',
        tasks: generateStandardTasks('fl-404', 'A321neo', 30),
        delayMinutes: 0,
        color: '#2563eb',
      },
    ],
    disruptions: [],
  },

  {
    id: 'scenario-fuel-failure',
    name: '02. Hydrant Pump Failure at Gate A1',
    tagline: 'Critical Equipment Breakdown & Tanker Dispatch',
    description:
      'The underground Jet-A1 fuel hydrant pit at Gate A1 encounters pressure valve failure while servicing widebody ATM-101. The algorithm dynamically dispatches Mobile Tanker Unit Beta from Gate B2, reprioritizes task sequencing, and shifts boarding to prevent a 45-minute departure delay.',
    algorithmChallenge:
      'Dynamically re-route tanker trucks, compress cleaning buffer, and shift boarding dependencies without violating airport fire-safety regulations.',
    initialTime: 22,
    gates: [
      {
        ...INITIAL_GATES[0],
        hasFuelHydrant: false,
        status: 'maintenance',
      },
      ...INITIAL_GATES.slice(1),
    ],
    crews: [
      { ...INITIAL_CREWS[3], status: 'out_of_service' }, // Hydrant specialist 1 unavailable
      ...INITIAL_CREWS.filter((_, i) => i !== 3),
    ],
    flights: [
      {
        id: 'fl-101',
        callsign: 'ATM-101',
        airline: 'Atmos Airways',
        origin: 'London Heathrow (LHR)',
        destination: 'Reykjavik (KEF)',
        aircraftType: 'A350-900',
        gateId: 'gate-a1',
        priority: 3,
        passengers: 284,
        scheduledArrival: 10,
        actualArrival: 10,
        scheduledDeparture: 90,
        estimatedDeparture: 98,
        status: 'servicing',
        tasks: generateStandardTasks('fl-101', 'A350-900', 10),
        delayMinutes: 8,
        color: '#0825c6',
      },
      {
        id: 'fl-202',
        callsign: 'ATM-202',
        airline: 'Atmos Airways',
        origin: 'Tokyo Haneda (HND)',
        destination: 'Zurich (ZRH)',
        aircraftType: 'B787-9',
        gateId: 'gate-a2',
        priority: 4,
        passengers: 242,
        scheduledArrival: 15,
        actualArrival: 15,
        scheduledDeparture: 85,
        estimatedDeparture: 85,
        status: 'servicing',
        tasks: generateStandardTasks('fl-202', 'B787-9', 15),
        delayMinutes: 0,
        color: '#4a4bd0',
      },
      {
        id: 'fl-303',
        callsign: 'ATM-303',
        airline: 'Atmos Regional',
        origin: 'Frankfurt (FRA)',
        destination: 'Paris Le Bourget (LBG)',
        aircraftType: 'A321neo',
        gateId: 'gate-b1',
        priority: 4,
        passengers: 178,
        scheduledArrival: 20,
        actualArrival: 20,
        scheduledDeparture: 75,
        estimatedDeparture: 75,
        status: 'servicing',
        tasks: generateStandardTasks('fl-303', 'A321neo', 20),
        delayMinutes: 0,
        color: '#6b6ce0',
      },
    ],
    disruptions: [
      {
        id: 'dis-fuel-1',
        timestamp: 20,
        timeFormatted: '08:20',
        type: 'equipment_failure',
        title: 'Fuel Hydrant Pump Jam at Gate A1',
        description: 'Subterranean fuel line telemetry reports pressure drop to 0 bar. Hydrant 01 locked out.',
        gateId: 'gate-a1',
        resourceType: 'fuel',
        resolved: false,
      },
    ],
  },

  {
    id: 'scenario-emergency-divert',
    name: '03. Priority 1 Emergency Medical Inbound',
    tagline: 'Life-Critical Divert & Resource Preemption',
    description:
      'Flight ATM-990 declares medical emergency with critical donor organ onboard and requests immediate gate docking. Gate B1 is currently occupied by commercial flight ATM-303. The scheduler executes rapid gate eviction to Gate C1 and preempts all ramp/ground teams to clear ATM-990 in record time.',
    algorithmChallenge:
      'Preempt resources from commercial flights, coordinate tow tugs to swap gates, and minimize collateral ripple delay across non-emergency flights.',
    initialTime: 28,
    gates: JSON.parse(JSON.stringify(INITIAL_GATES)),
    crews: JSON.parse(JSON.stringify(INITIAL_CREWS)),
    flights: [
      {
        id: 'fl-990',
        callsign: 'ATM-990 (MEDEVAC)',
        airline: 'Aeromedical Urgent',
        origin: 'Munich (MUC)',
        destination: 'Emergency Landing',
        aircraftType: 'Global 7500',
        gateId: 'gate-b1',
        priority: 1, // Emergency
        passengers: 4,
        scheduledArrival: 30,
        actualArrival: 30,
        scheduledDeparture: 60,
        estimatedDeparture: 60,
        status: 'approaching',
        tasks: generateStandardTasks('fl-990', 'Global 7500', 30),
        delayMinutes: 0,
        color: '#dc2626',
      },
      {
        id: 'fl-303',
        callsign: 'ATM-303',
        airline: 'Atmos Regional',
        origin: 'Frankfurt (FRA)',
        destination: 'Paris Le Bourget (LBG)',
        aircraftType: 'A321neo',
        gateId: 'gate-b1',
        priority: 4,
        passengers: 178,
        scheduledArrival: 18,
        actualArrival: 18,
        scheduledDeparture: 75,
        estimatedDeparture: 83,
        status: 'docked',
        tasks: generateStandardTasks('fl-303', 'A321neo', 18),
        delayMinutes: 8,
        color: '#6b6ce0',
      },
      {
        id: 'fl-101',
        callsign: 'ATM-101',
        airline: 'Atmos Airways',
        origin: 'London Heathrow (LHR)',
        destination: 'Reykjavik (KEF)',
        aircraftType: 'A350-900',
        gateId: 'gate-a1',
        priority: 3,
        passengers: 284,
        scheduledArrival: 10,
        actualArrival: 10,
        scheduledDeparture: 90,
        estimatedDeparture: 90,
        status: 'servicing',
        tasks: generateStandardTasks('fl-101', 'A350-900', 10),
        delayMinutes: 0,
        color: '#0825c6',
      },
    ],
    disruptions: [
      {
        id: 'dis-med-1',
        timestamp: 26,
        timeFormatted: '08:26',
        type: 'priority_escalation',
        title: 'MAYDAY MEDICAL DIVERT: Flight ATM-990',
        description: 'Cardiac transplant donor payload onboard. Assigned highest Priority 1 status. Gate B1 requested.',
        flightId: 'fl-990',
        resolved: false,
      },
    ],
  },

  {
    id: 'scenario-crew-shortage',
    name: '04. Severe Ramp Crew Shortage (Storm Warning)',
    tagline: '50% Baggage Handling Capacity Deficit',
    description:
      'Severe weather conditions halt transport shuttles, leaving only 1 out of 3 ramp baggage teams operational. The scheduler calculates connection probabilities for 600+ passengers, prioritizing long-haul connectors ATM-101 and ATM-202 while staggering regional baggage offloads.',
    algorithmChallenge:
      'Resource-Constrained Project Scheduling (RCPSP) under severe capacity deficit, minimizing total passenger-delay minutes.',
    initialTime: 16,
    gates: JSON.parse(JSON.stringify(INITIAL_GATES)),
    crews: [
      INITIAL_CREWS[0], // Only Ramp Team Alpha available
      { ...INITIAL_CREWS[1], status: 'out_of_service' },
      { ...INITIAL_CREWS[2], status: 'out_of_service' },
      ...INITIAL_CREWS.slice(3),
    ],
    flights: [
      {
        id: 'fl-101',
        callsign: 'ATM-101',
        airline: 'Atmos Airways',
        origin: 'London Heathrow (LHR)',
        destination: 'Reykjavik (KEF)',
        aircraftType: 'A350-900',
        gateId: 'gate-a1',
        priority: 3, // High transit connection risk
        passengers: 284,
        scheduledArrival: 10,
        actualArrival: 10,
        scheduledDeparture: 90,
        estimatedDeparture: 95,
        status: 'servicing',
        tasks: generateStandardTasks('fl-101', 'A350-900', 10),
        delayMinutes: 5,
        color: '#0825c6',
      },
      {
        id: 'fl-202',
        callsign: 'ATM-202',
        airline: 'Atmos Airways',
        origin: 'Tokyo Haneda (HND)',
        destination: 'Zurich (ZRH)',
        aircraftType: 'B787-9',
        gateId: 'gate-a2',
        priority: 3,
        passengers: 242,
        scheduledArrival: 15,
        actualArrival: 15,
        scheduledDeparture: 85,
        estimatedDeparture: 92,
        status: 'servicing',
        tasks: generateStandardTasks('fl-202', 'B787-9', 15),
        delayMinutes: 7,
        color: '#4a4bd0',
      },
      {
        id: 'fl-303',
        callsign: 'ATM-303',
        airline: 'Atmos Regional',
        origin: 'Frankfurt (FRA)',
        destination: 'Paris Le Bourget (LBG)',
        aircraftType: 'A321neo',
        gateId: 'gate-b1',
        priority: 5, // Lower priority regional
        passengers: 178,
        scheduledArrival: 18,
        actualArrival: 18,
        scheduledDeparture: 75,
        estimatedDeparture: 88,
        status: 'docked',
        tasks: generateStandardTasks('fl-303', 'A321neo', 18),
        delayMinutes: 13,
        color: '#6b6ce0',
      },
    ],
    disruptions: [
      {
        id: 'dis-crew-1',
        timestamp: 12,
        timeFormatted: '08:12',
        type: 'crew_shortage',
        title: 'Winter Storm Ramp Ground-Hold',
        description: 'Ramp Teams Bravo and Charlie grounded due to lightning alert on Taxiway Yankee.',
        resourceType: 'ramp',
        resolved: false,
      },
    ],
  },

  {
    id: 'scenario-cascading-delay',
    name: '05. Cascading Widebody Convergence',
    tagline: '3 Heavy Aircraft Competing for 2 Gates',
    description:
      'Transatlantic jetstream variations cause 3 widebody aircraft (ATM-101, ATM-108, ATM-202) to land simultaneously 35 minutes off schedule. Both Heavy Gates A1 and A2 are overwhelmed. The algorithm re-qualifies Gate B1 as a dual-jetbridge heavy stand and compresses turnarounds.',
    algorithmChallenge:
      'Gate allocation optimization with aircraft-type sizing constraints, dynamic turnaround compression, and ripple delay isolation.',
    initialTime: 32,
    gates: JSON.parse(JSON.stringify(INITIAL_GATES)),
    crews: JSON.parse(JSON.stringify(INITIAL_CREWS)),
    flights: [
      {
        id: 'fl-101',
        callsign: 'ATM-101',
        airline: 'Atmos Airways',
        origin: 'London Heathrow (LHR)',
        destination: 'Reykjavik (KEF)',
        aircraftType: 'A350-900',
        gateId: 'gate-a1',
        priority: 3,
        passengers: 284,
        scheduledArrival: 10,
        actualArrival: 30, // 20m late
        scheduledDeparture: 90,
        estimatedDeparture: 105,
        status: 'docked',
        tasks: generateStandardTasks('fl-101', 'A350-900', 30),
        delayMinutes: 15,
        color: '#0825c6',
      },
      {
        id: 'fl-108',
        callsign: 'ATM-108',
        airline: 'Atmos Transatlantic',
        origin: 'New York JFK (JFK)',
        destination: 'Geneva (GVA)',
        aircraftType: 'A350-900',
        gateId: 'gate-a1', // Contention with ATM-101!
        priority: 3,
        passengers: 295,
        scheduledArrival: 32,
        actualArrival: 32,
        scheduledDeparture: 110,
        estimatedDeparture: 112,
        status: 'approaching',
        tasks: generateStandardTasks('fl-108', 'A350-900', 32),
        delayMinutes: 2,
        color: '#8b5cf6',
      },
      {
        id: 'fl-202',
        callsign: 'ATM-202',
        airline: 'Atmos Airways',
        origin: 'Tokyo Haneda (HND)',
        destination: 'Zurich (ZRH)',
        aircraftType: 'B787-9',
        gateId: 'gate-a2',
        priority: 4,
        passengers: 242,
        scheduledArrival: 15,
        actualArrival: 28, // 13m late
        scheduledDeparture: 85,
        estimatedDeparture: 96,
        status: 'servicing',
        tasks: generateStandardTasks('fl-202', 'B787-9', 28),
        delayMinutes: 11,
        color: '#4a4bd0',
      },
      {
        id: 'fl-303',
        callsign: 'ATM-303',
        airline: 'Atmos Regional',
        origin: 'Frankfurt (FRA)',
        destination: 'Paris Le Bourget (LBG)',
        aircraftType: 'A321neo',
        gateId: 'gate-b1',
        priority: 4,
        passengers: 178,
        scheduledArrival: 20,
        actualArrival: 20,
        scheduledDeparture: 75,
        estimatedDeparture: 75,
        status: 'servicing',
        tasks: generateStandardTasks('fl-303', 'A321neo', 20),
        delayMinutes: 0,
        color: '#6b6ce0',
      },
    ],
    disruptions: [
      {
        id: 'dis-cascade-1',
        timestamp: 30,
        timeFormatted: '08:30',
        type: 'flight_delay',
        title: 'Dual Transatlantic Inbound Cluster',
        description: 'ATM-101 and ATM-108 arrive simultaneously competing for single Heavy Gate A1.',
        flightId: 'fl-108',
        resolved: false,
      },
    ],
  },
];
