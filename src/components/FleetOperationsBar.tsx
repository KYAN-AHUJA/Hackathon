import React from 'react';
import { Plane, Warehouse, ChevronDown, ChevronUp, Radio, Compass, Gauge, Clock, ShieldCheck, Video } from 'lucide-react';
import { PLANES_IN_FLIGHT, PLANES_ON_AIRSTRIP, FlightPlane, GroundPlane } from './FleetData';
import { InAirCameraAngle, HangarCameraAngle } from './FlightCanvas';

interface FleetOperationsBarProps {
  viewMode: 'in-air' | 'in-hangar';
  selectedFlightId: string;
  selectedGroundId: string;
  inAirCameraAngle: InAirCameraAngle;
  isVioletZone: boolean;
  onSelectFlight: (flight: FlightPlane) => void;
  onSelectGround: (ground: GroundPlane) => void;
  onSwitchMode: (mode: 'in-air' | 'in-hangar') => void;
  onSelectInAirAngle: (angle: InAirCameraAngle) => void;
  onSelectHangarAngle: (angle: HangarCameraAngle) => void;
}

export function FleetOperationsBar({
  viewMode,
  selectedFlightId,
  selectedGroundId,
  inAirCameraAngle,
  isVioletZone,
  onSelectFlight,
  onSelectGround,
  onSwitchMode,
  onSelectInAirAngle,
}: FleetOperationsBarProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const activeFlight = PLANES_IN_FLIGHT.find((f) => f.id === selectedFlightId) || PLANES_IN_FLIGHT[0];
  const activeGround = PLANES_ON_AIRSTRIP.find((g) => g.id === selectedGroundId) || PLANES_ON_AIRSTRIP[0];

  const isLightText = isVioletZone && viewMode === 'in-air';
  const barBg = isLightText
    ? 'bg-black/35 backdrop-blur-xl border-white/20 text-white shadow-2xl'
    : 'bg-white/90 backdrop-blur-xl border-black/10 text-black shadow-xl';

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl px-4 pointer-events-none transition-all duration-300">
      <div className={`pointer-events-auto rounded-2xl border p-2.5 transition-all duration-300 ${barBg}`}>
        {/* Top Control Header: Clear separation between Planes In Flight & Planes On Airstrip */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Main Dual Category Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/10 dark:bg-white/10 font-sans text-xs">
            <button
              onClick={() => onSwitchMode('in-air')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'in-air'
                  ? 'bg-white text-black shadow-md font-bold'
                  : 'text-current opacity-70 hover:opacity-100'
              }`}
            >
              <Plane size={13} className={viewMode === 'in-air' ? 'text-blue-600' : ''} />
              <span>Planes in Flight</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  viewMode === 'in-air' ? 'bg-blue-100 text-blue-700' : 'bg-black/10 text-current'
                }`}
              >
                {PLANES_IN_FLIGHT.length}
              </span>
            </button>

            <button
              onClick={() => onSwitchMode('in-hangar')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'in-hangar'
                  ? 'bg-white text-black shadow-md font-bold'
                  : 'text-current opacity-70 hover:opacity-100'
              }`}
            >
              <Warehouse size={13} className={viewMode === 'in-hangar' ? 'text-amber-600' : ''} />
              <span>Planes on Airstrip</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  viewMode === 'in-hangar' ? 'bg-amber-100 text-amber-700' : 'bg-black/10 text-current'
                }`}
              >
                {PLANES_ON_AIRSTRIP.length}
              </span>
            </button>
          </div>

          {/* Active Aircraft Telemetry Pill & Front View Indicator */}
          <div className="flex items-center gap-2">
            {viewMode === 'in-air' ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-[11px] font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold">{activeFlight.callsign}</span>
                <span className="opacity-60">({activeFlight.registration})</span>
                <span className="hidden sm:inline opacity-60">·</span>
                <span className="hidden sm:inline font-sans">{activeFlight.route}</span>
                <span className="hidden md:inline px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px]">
                  FRONT VIEW
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-[11px] font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-bold">{activeGround.stand}</span>
                <span className="opacity-60">({activeGround.registration})</span>
                <span className="hidden sm:inline opacity-60">·</span>
                <span className="hidden sm:inline font-sans">{activeGround.departureTime}</span>
              </div>
            )}

            {/* Expand / Collapse Roster Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-current opacity-70 hover:opacity-100 text-[11px] font-sans transition-all"
              title="Toggle full fleet roster"
            >
              <span>{isExpanded ? 'Hide Fleet' : 'Select Plane'}</span>
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* FRONT CAMERA ANGLE CONTROLS (IN-AIR FLIGHT MODE) */}
        {viewMode === 'in-air' && (
          <div className="flex items-center gap-2 pt-2.5 mt-2 border-t border-current/10 text-[11px] font-sans">
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider opacity-60 mr-1">
              <Video size={11} /> Front Camera:
            </span>
            {[
              { id: 'front-hero', label: 'Front Hero (3/4)' },
              { id: 'front-headon', label: 'Head-On Cockpit' },
              { id: 'front-low', label: 'Front Low (Thrust)' },
              { id: 'front-high', label: 'Top-Down Wings' },
            ].map((cam) => (
              <button
                key={cam.id}
                onClick={() => onSelectInAirAngle(cam.id as InAirCameraAngle)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                  inAirCameraAngle === cam.id
                    ? isLightText
                      ? 'bg-white text-black font-bold shadow-xs'
                      : 'bg-black text-white font-bold shadow-xs'
                    : 'bg-current/10 hover:bg-current/20'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>
        )}

        {/* EXPANDABLE FLEET ROSTER DRAWER */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-current/10 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
            {/* COLUMN 1: PLANES IN FLIGHT */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                viewMode === 'in-air' ? 'border-blue-500/50 bg-blue-500/10' : 'border-current/10 bg-current/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-sans font-bold text-xs uppercase tracking-wider">
                  <Plane size={13} className="text-blue-500" />
                  <span>Planes In Flight ({PLANES_IN_FLIGHT.length})</span>
                </div>
                {viewMode === 'in-air' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500 text-white font-bold">
                    ACTIVE 3D
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {PLANES_IN_FLIGHT.map((plane) => {
                  const isSelected = viewMode === 'in-air' && plane.id === activeFlight.id;
                  return (
                    <button
                      key={plane.id}
                      onClick={() => {
                        onSwitchMode('in-air');
                        onSelectFlight(plane);
                        setIsExpanded(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg transition-all border ${
                        isSelected
                          ? 'border-blue-500 bg-white text-black shadow-md'
                          : 'border-current/10 hover:border-current/30 hover:bg-current/10 text-current'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <Radio size={11} className={isSelected ? 'text-blue-600' : 'opacity-50'} />
                          <span>{plane.callsign}</span>
                          <span className="font-mono text-[10px] opacity-70">[{plane.registration}]</span>
                        </div>
                        <span className="font-mono text-[10px] text-blue-600 font-bold">{plane.status}</span>
                      </div>

                      <div className="text-[11px] opacity-80 mt-1 font-sans">{plane.route}</div>

                      <div className="flex items-center gap-3 text-[10px] font-mono opacity-70 mt-1.5">
                        <span className="flex items-center gap-0.5">
                          <Gauge size={10} /> {plane.altitude.toLocaleString()} FT
                        </span>
                        <span>{plane.mach} MACH</span>
                        <span className="flex items-center gap-0.5">
                          <Compass size={10} /> {plane.heading}° {plane.headingText}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Clock size={10} /> ETA {plane.eta}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 2: PLANES ON AIRSTRIP (GROUND STANDS & HANGAR) */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                viewMode === 'in-hangar' ? 'border-amber-500/50 bg-amber-500/10' : 'border-current/10 bg-current/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-sans font-bold text-xs uppercase tracking-wider">
                  <Warehouse size={13} className="text-amber-500" />
                  <span>Planes On Airstrip ({PLANES_ON_AIRSTRIP.length})</span>
                </div>
                {viewMode === 'in-hangar' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold">
                    ACTIVE 3D
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {PLANES_ON_AIRSTRIP.map((plane) => {
                  const isSelected = viewMode === 'in-hangar' && plane.id === activeGround.id;
                  return (
                    <button
                      key={plane.id}
                      onClick={() => {
                        onSwitchMode('in-hangar');
                        onSelectGround(plane);
                        setIsExpanded(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg transition-all border ${
                        isSelected
                          ? 'border-amber-500 bg-white text-black shadow-md'
                          : 'border-current/10 hover:border-current/30 hover:bg-current/10 text-current'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={11} className={isSelected ? 'text-amber-600' : 'opacity-50'} />
                          <span>{plane.stand}</span>
                          <span className="font-mono text-[10px] opacity-70">[{plane.registration}]</span>
                        </div>
                        <span className="font-mono text-[10px] text-amber-600 font-bold">{plane.departureTime}</span>
                      </div>

                      <div className="text-[11px] opacity-80 mt-1 font-sans">{plane.status}</div>

                      <div className="flex items-center justify-between text-[10px] font-mono opacity-70 mt-1.5">
                        <span>Next: {plane.nextFlight} → {plane.destination}</span>
                        <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 uppercase text-[9px]">
                          {plane.standType}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
