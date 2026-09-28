export type AircraftType = 'A350-900' | 'B787-9' | 'A321neo' | 'Global 7500';

export type PriorityLevel = 1 | 2 | 3 | 4 | 5;
// 1 = Emergency / Medical (Highest)
// 2 = Head of State / VIP
// 3 = Tight Connection Long-Haul
// 4 = Standard Scheduled Passenger
// 5 = Repositioning / Cargo

export type FlightStatus =
  | 'approaching'
  | 'docked'
  | 'servicing'
  | 'ready_for_departure'
  | 'departed';

export type TaskType =
  | 'deplaning'
  | 'baggage_offload'
  | 'refuelling'
  | 'cleaning'
  | 'catering'
  | 'baggage_load'
  | 'boarding'
  | 'pushback';

export type ResourceType = 'ramp' | 'fuel' | 'cleaning' | 'catering' | 'gate_agent';

export interface TurnaroundTask {
  id: string;
  flightId: string;
  type: TaskType;
  name: string;
  durationMinutes: number;
  scheduledStart: number; // minutes from sim epoch (0 = 08:00)
  scheduledEnd: number;
  actualStart: number | null;
  actualEnd: number | null;
  progress: number; // 0 to 100
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'blocked';
  dependencies: TaskType[]; // Task types that must be 100% completed
  requiredResource: {
    type: ResourceType;
    count: number;
  };
  assignedCrewIds: string[];
  isCriticalPath?: boolean;
}

export interface Flight {
  id: string;
  callsign: string;
  airline: string;
  origin: string;
  destination: string;
  aircraftType: AircraftType;
  gateId: string;
  priority: PriorityLevel;
  passengers: number;
  scheduledArrival: number; // in minutes from 08:00
  actualArrival: number;
  scheduledDeparture: number;
  estimatedDeparture: number;
  status: FlightStatus;
  tasks: TurnaroundTask[];
  delayMinutes: number;
  color: string;
}

export interface Gate {
  id: string;
  name: string;
  terminal: string;
  allowedTypes: AircraftType[];
  currentFlightId: string | null;
  status: 'available' | 'occupied' | 'maintenance';
  hasFuelHydrant: boolean; // if false, requires tanker truck
}

export interface ResourceCrew {
  id: string;
  name: string;
  type: ResourceType;
  status: 'idle' | 'assigned' | 'break' | 'out_of_service';
  assignedFlightId: string | null;
  assignedTaskId: string | null;
  efficiency: number; // 1.0 = normal, 0.8 = slowed, 1.2 = fast
}

export interface DisruptionEvent {
  id: string;
  timestamp: number;
  timeFormatted: string;
  type: 'flight_delay' | 'equipment_failure' | 'crew_shortage' | 'priority_escalation' | 'gate_closure';
  title: string;
  description: string;
  flightId?: string;
  gateId?: string;
  resourceType?: ResourceType;
  resolved: boolean;
}

export interface AlgorithmDecision {
  id: string;
  timestamp: number;
  timeFormatted: string;
  action: string;
  reason: string;
  impact: string;
  savingsMinutes: number;
}

export interface SimulationMetrics {
  totalDelaysMinutes: number;
  rippleDelaySavedMinutes: number;
  onTimeDepartureRate: number; // percentage
  gateUtilizationRate: number;
  activeCrewsCount: number;
  totalCrewsCount: number;
  criticalFlightsCount: number;
  algorithmExecutionTimeMs: number;
}
