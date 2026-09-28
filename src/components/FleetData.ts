export interface FlightPlane {
  id: string;
  callsign: string;
  registration: string;
  model: string;
  route: string;
  origin: string;
  destination: string;
  altitude: number;
  mach: number;
  heading: number;
  headingText: string;
  eta: string;
  status: string;
  phase: string;
}

export interface GroundPlane {
  id: string;
  stand: string;
  registration: string;
  model: string;
  status: string;
  nextFlight: string;
  destination: string;
  departureTime: string;
  standType: string;
  cameraPreset: 'apron' | 'fuel' | 'baggage' | 'passengers';
}

export const PLANES_IN_FLIGHT: FlightPlane[] = [
  {
    id: 'flight-101',
    callsign: 'IP-101',
    registration: 'D-3262',
    model: '11803 Commercial Airliner',
    route: 'Paris (CDG) → Tokyo (HND)',
    origin: 'CDG',
    destination: 'HND',
    altitude: 45200,
    mach: 0.92,
    heading: 284,
    headingText: 'NW',
    eta: '04h 18m',
    status: 'Cruising Stratosphere',
    phase: 'En-Route',
  },
  {
    id: 'flight-204',
    callsign: 'IP-204',
    registration: 'D-4819',
    model: 'Imperium Long-Haul',
    route: 'New York (JFK) → London (LHR)',
    origin: 'JFK',
    destination: 'LHR',
    altitude: 38000,
    mach: 0.88,
    heading: 72,
    headingText: 'ENE',
    eta: '02h 45m',
    status: 'High Alt Cruise',
    phase: 'En-Route',
  },
  {
    id: 'flight-088',
    callsign: 'IP-088',
    registration: 'D-9021',
    model: 'Transcontinental Jet',
    route: 'Zurich (ZRH) → Dubai (DXB)',
    origin: 'ZRH',
    destination: 'DXB',
    altitude: 41000,
    mach: 0.90,
    heading: 118,
    headingText: 'ESE',
    eta: '03h 10m',
    status: 'Trans-Alpine Climb',
    phase: 'En-Route',
  },
  {
    id: 'flight-310',
    callsign: 'IP-310',
    registration: 'D-6634',
    model: 'Stratocruiser Supreme',
    route: 'Singapore (SIN) → Sydney (SYD)',
    origin: 'SIN',
    destination: 'SYD',
    altitude: 43500,
    mach: 0.91,
    heading: 142,
    headingText: 'SE',
    eta: '00h 42m',
    status: 'Oceanic Track Waypoint',
    phase: 'En-Route',
  },
];

export const PLANES_ON_AIRSTRIP: GroundPlane[] = [
  {
    id: 'ground-01',
    stand: 'Apron Stand 01 (Main)',
    registration: 'D-3262',
    model: '11803 Commercial Airliner',
    status: 'Jet A-1 Refueling & Baggage Belt Servicing',
    nextFlight: 'IP-102',
    destination: 'Geneva (GVA)',
    departureTime: 'Departs in 22 min',
    standType: 'Heavy Turnaround Stand',
    cameraPreset: 'apron',
  },
  {
    id: 'ground-02',
    stand: 'Terminal Gate 14',
    registration: 'D-1104',
    model: 'Imperium Executive 800',
    status: 'Passenger Jetway Boarding (184/184 Pax)',
    nextFlight: 'IP-305',
    destination: 'Zurich (ZRH)',
    departureTime: 'Pushback in 35 min',
    standType: 'Terminal Passenger Gate',
    cameraPreset: 'passengers',
  },
  {
    id: 'ground-03',
    stand: 'Cargo Ramp Stand 03',
    registration: 'D-5520',
    model: 'High-Lift Freighter Jet',
    status: 'Containerized Cargo Train Loading',
    nextFlight: 'IP-990',
    destination: 'Frankfurt (FRA)',
    departureTime: 'Departs in 50 min',
    standType: 'Freight Cargo Stand',
    cameraPreset: 'baggage',
  },
  {
    id: 'ground-04',
    stand: 'Hangar Bay 04',
    registration: 'D-7701',
    model: 'Imperium Supersonic',
    status: 'Avionics Certification & Turbofan Borescope',
    nextFlight: 'IP-TEST',
    destination: 'Flight Testing FL500',
    departureTime: 'Maintenance Scheduled',
    standType: 'Service & Maintenance Bay',
    cameraPreset: 'fuel',
  },
];
