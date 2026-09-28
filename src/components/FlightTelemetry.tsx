import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { FlightTelemetryData } from './FlightCanvas';
import { flightAudio } from './AudioEngine';

interface FlightTelemetryProps {
  data: FlightTelemetryData | null;
  isVioletZone: boolean;
  viewMode: 'in-air' | 'in-hangar';
  onToggleMode: (mode: 'in-air' | 'in-hangar') => void;
  scrollProgress: number;
}

export function FlightTelemetry({
  data,
  isVioletZone,
  viewMode,
  onToggleMode,
  scrollProgress,
}: FlightTelemetryProps) {
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [coordinates, setCoordinates] = useState({ lat: "45°30'12\"N", lon: "73°34'50\"W" });

  const toggleAudio = () => {
    const active = flightAudio.toggle();
    setIsAudioActive(active);
  };

  // Simulate coordinate changes with scroll
  useEffect(() => {
    const latBase = 45;
    const lonBase = 73;
    const latOffset = Math.floor(scrollProgress * 30);
    const lonOffset = Math.floor(scrollProgress * 15);
    setCoordinates({
      lat: `${latBase}°${30 + latOffset}'${12 + latOffset}"N`,
      lon: `${lonBase}°${34 + lonOffset}'${50 + lonOffset}"W`
    });
  }, [scrollProgress]);

  const textColor = isVioletZone && viewMode === 'in-air' ? 'text-white' : 'text-black';
  const subTextColor = isVioletZone && viewMode === 'in-air' ? 'text-white/60' : 'text-black/50';

  return (
    <>
      {/* EXACT ATMOS TOP HUD BAR */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 backdrop-blur-md bg-black/10 border-b border-white/10 text-white font-mono text-[10px] sm:text-[11px] uppercase tracking-widest pointer-events-none select-none">
        {/* Left Section: Live Radar & Coordinates */}
        <div className="flex items-center gap-6 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-white/40 tracking-wider">RADAR:</span>
            <span className="text-emerald-400 font-semibold">LIVE</span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-white/70">
            <span>[ {coordinates.lat} ]</span>
            <span>[ {coordinates.lon} ]</span>
          </div>
        </div>

        {/* Center Section: Editorial IMPERIUM Branding */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <span className="font-serif text-xs sm:text-sm tracking-[0.3em] uppercase text-white font-light">
            IMPERIUM
          </span>
          <span className="text-white/40 text-[9px] tracking-widest hidden sm:inline">
            // ATMOS FLIGHT DISPATCH
          </span>
        </div>

        {/* Right Section: Real-time Telemetry & Sound */}
        <div className="flex items-center gap-4 sm:gap-6 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-white/40">ALT:</span>
            <span className="text-white font-semibold">
              {viewMode === 'in-air' && data
                ? `FL${Math.floor(data.altitude / 100).toString().padStart(3, '0')}`
                : 'GND 000'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-white/40">SPD:</span>
            <span className="text-white">
              {viewMode === 'in-air' && data
                ? `M ${data.mach.toFixed(2)}`
                : 'TAXI'}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5">
            <span className="text-white/40">PITCH:</span>
            <span className="text-white">
              {data ? `${data.pitch > 0 ? '+' : ''}${data.pitch.toFixed(1)}°` : '+2.4°'}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5">
            <span className="text-white/40">HDG:</span>
            <span className="text-white">
              {data ? `${data.heading}° W` : '270° W'}
            </span>
          </div>

          {/* Interactive Sound Equalizer */}
          <button
            onClick={toggleAudio}
            title={isAudioActive ? "Mute Atmospheric Audio" : "Play Atmospheric Audio"}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/15 transition-all text-white active:scale-95"
          >
            <div className="flex items-end gap-0.5 h-3.5">
              <div
                className={`w-[1.5px] bg-white transition-all duration-150 ${isAudioActive ? 'h-2.5 animate-pulse' : 'h-1'}`}
              />
              <div
                className={`w-[1.5px] bg-white transition-all duration-150 ${isAudioActive ? 'h-3.5 animate-bounce' : 'h-1'}`}
              />
              <div
                className={`w-[1.5px] bg-white transition-all duration-150 ${isAudioActive ? 'h-2 animate-pulse' : 'h-1'}`}
              />
              <div
                className={`w-[1.5px] bg-white transition-all duration-150 ${isAudioActive ? 'h-3 animate-bounce' : 'h-1'}`}
              />
            </div>
            <span className="text-[9px] uppercase tracking-wider text-white/70 hidden sm:inline">
              {isAudioActive ? 'SOUND ON' : 'AUDIO'}
            </span>
            {isAudioActive ? <Volume2 size={13} className="text-emerald-400" /> : <VolumeX size={13} className="text-white/50" />}
          </button>
        </div>
      </header>
    </>
  );
}
