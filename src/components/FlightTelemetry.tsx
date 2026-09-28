import { useState } from 'react';
import { Volume2, VolumeX, Compass, Gauge, Plane, Warehouse } from 'lucide-react';
import { FlightTelemetryData } from './FlightCanvas';
import { flightAudio } from './AudioEngine';

interface FlightTelemetryProps {
  data: FlightTelemetryData | null;
  isVioletZone: boolean;
  viewMode: 'in-air' | 'in-hangar';
  onToggleMode: (mode: 'in-air' | 'in-hangar') => void;
}

export function FlightTelemetry({
  data,
  isVioletZone,
  viewMode,
  onToggleMode,
}: FlightTelemetryProps) {
  const [isAudioActive, setIsAudioActive] = useState(false);

  const toggleAudio = () => {
    const active = flightAudio.toggle();
    setIsAudioActive(active);
  };

  const textColor = isVioletZone && viewMode === 'in-air' ? 'text-white' : 'text-black';
  const subTextColor = isVioletZone && viewMode === 'in-air' ? 'text-white/60' : 'text-black/50';
  const pillBorder = isVioletZone && viewMode === 'in-air'
    ? 'border-white/20 bg-white/10 text-white'
    : 'border-black/15 bg-black/5 text-black';

  return (
    <>
      {/* Top Floating HUD Status Bar */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 sm:px-12 py-6 pointer-events-none transition-colors duration-500">
        <div className="flex items-center gap-4 sm:gap-8 pointer-events-auto">
          <span
            className={`font-serif text-lg sm:text-xl tracking-[0.25em] font-normal uppercase transition-colors duration-500 ${textColor}`}
          >
            IMPERIUM
          </span>
          <span className="hidden sm:inline-block w-px h-4 bg-current opacity-20" />
          <div className="hidden sm:flex items-center gap-6 font-mono text-[11px] tracking-widest uppercase">
            <span className={subTextColor}>
              {viewMode === 'in-air' ? 'FLIGHT EN-ROUTE' : 'AIRSTRIP STAND 01'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-current opacity-70 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              11803 AIRLINER · D-3262
            </span>
            <span className={subTextColor}>
              {new Date().toISOString().slice(11, 19)} UTC
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Mode Switcher Pill: In Air vs In Hangar */}
          <div
            className={`flex items-center gap-1 p-1 rounded-full border backdrop-blur-md text-[11px] font-sans uppercase tracking-wider transition-all duration-300 ${pillBorder}`}
          >
            <button
              onClick={() => onToggleMode('in-air')}
              className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full transition-all duration-300 ${
                viewMode === 'in-air'
                  ? isVioletZone
                    ? 'bg-white text-black font-bold shadow-xs'
                    : 'bg-black text-white font-bold shadow-xs'
                  : 'hover:opacity-75'
              }`}
            >
              <Plane size={12} />
              <span>In Air</span>
            </button>

            <button
              onClick={() => onToggleMode('in-hangar')}
              className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full transition-all duration-300 ${
                viewMode === 'in-hangar'
                  ? isVioletZone
                    ? 'bg-white text-black font-bold shadow-xs'
                    : 'bg-black text-white font-bold shadow-xs'
                  : 'hover:opacity-75'
              }`}
            >
              <Warehouse size={12} />
              <span>In Hangar</span>
            </button>
          </div>

          {/* Atmospheric Audio Synthesizer Toggle */}
          <button
            onClick={toggleAudio}
            title={isAudioActive ? 'Mute ambient airflow' : 'Enable ambient slipstream audio'}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md text-[11px] tracking-widest uppercase font-sans transition-all duration-300 ${pillBorder} hover:scale-105 active:scale-95`}
          >
            {isAudioActive ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span className="hidden sm:inline">
              {isAudioActive ? 'Sound On' : 'Atmosphere Sound'}
            </span>
          </button>
        </div>
      </header>

      {/* Floating Bottom Live Telemetry (Altitude, Mach, Bank Angle Indicator) */}
      <aside className="fixed bottom-6 left-6 sm:left-12 z-30 pointer-events-none transition-colors duration-500 hidden sm:block">
        <div
          className={`flex items-end gap-8 font-sans text-xs tracking-wider transition-colors duration-500 ${textColor}`}
        >
          {/* Altitude */}
          <div>
            <div
              className={`text-[10px] uppercase font-mono tracking-widest ${subTextColor} mb-0.5 flex items-center gap-1.5`}
            >
              <Gauge size={11} /> Altitude
            </div>
            <div className="text-xl sm:text-2xl font-light font-mono">
              {data ? data.altitude.toLocaleString() : '45,200'}{' '}
              <span className={`text-[11px] ${subTextColor}`}>FT</span>
            </div>
          </div>

          {/* Velocity / Mach */}
          <div>
            <div className={`text-[10px] uppercase font-mono tracking-widest ${subTextColor} mb-0.5`}>
              Airspeed
            </div>
            <div className="text-xl sm:text-2xl font-light font-mono">
              {viewMode === 'in-air' ? `MACH ${data ? data.mach.toFixed(2) : '0.92'}` : 'TAXI 0.0 KTS'}
            </div>
          </div>

          {/* Heading */}
          <div className="hidden lg:block">
            <div
              className={`text-[10px] uppercase font-mono tracking-widest ${subTextColor} mb-0.5 flex items-center gap-1.5`}
            >
              <Compass size={11} /> Heading
            </div>
            <div className="text-xl sm:text-2xl font-light font-mono">
              {data ? `${data.heading}°` : '284°'}{' '}
              <span className={`text-[11px] ${subTextColor}`}>NW</span>
            </div>
          </div>

          {/* Artificial Horizon Bank Angle Miniature */}
          <div className="hidden md:flex flex-col items-center">
            <div className={`text-[10px] uppercase font-mono tracking-widest ${subTextColor} mb-1`}>
              Pitch {data ? `${data.pitch > 0 ? '+' : ''}${data.pitch}°` : '0°'}
            </div>
            <div className="w-16 h-3 rounded-full border border-current opacity-30 relative overflow-hidden flex items-center justify-center">
              <div
                className="w-10 h-[1.5px] bg-current transition-transform duration-75"
                style={{ transform: `rotate(${data ? -data.pitch * 2 : 0}deg)` }}
              />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
