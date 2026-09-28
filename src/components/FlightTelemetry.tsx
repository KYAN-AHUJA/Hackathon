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
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md border-b border-white/10 text-white font-mono text-[11px] uppercase tracking-widest pointer-events-none">
        {/* Left Section: Live Coordinates */}
        <div className="flex items-center gap-8 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="text-white/40">LAT:</span>
            <span className="text-white">{coordinates.lat}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/40">LON:</span>
            <span className="text-white">{coordinates.lon}</span>
          </div>
        </div>

        {/* Center Section: Editorial Branding */}
        <div className="font-serif text-sm tracking-[0.2em] uppercase text-white">
          IMERIUM // FLIGHT EXPERIENCE
        </div>

        {/* Right Section: Real-time Telemetry */}
        <div className="flex items-center gap-6 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="text-white/40">ALT:</span>
            <span className="text-white">
              {viewMode === 'in-air' && data
                ? `FL${Math.floor(data.altitude / 100)}`
                : 'GND'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/40">SPD:</span>
            <span className="text-white">
              {viewMode === 'in-air' && data
                ? `M ${data.mach.toFixed(2)}`
                : 'TAXI'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/40">PITCH:</span>
            <span className="text-white">
              {data ? `${data.pitch > 0 ? '+' : ''}${data.pitch.toFixed(1)}°` : '0.0°'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/40">HDG:</span>
            <span className="text-white">
              {data ? `${data.heading}° W` : '270° W'}
            </span>
          </div>

          {/* Interactive Sound Equalizer */}
          <button
            onClick={toggleAudio}
            className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition-all"
          >
            <div className="flex items-end gap-0.5 h-4">
              <div
                className={`w-0.5 bg-white transition-all duration-150 ${isAudioActive ? 'h-3' : 'h-1'}`}
                style={{ animation: isAudioActive ? 'bounce 0.5s ease-in-out infinite' : 'none' }}
              />
              <div
                className={`w-0.5 bg-white transition-all duration-150 ${isAudioActive ? 'h-4' : 'h-1'}`}
                style={{ animation: isAudioActive ? 'bounce 0.7s ease-in-out infinite' : 'none' }}
              />
              <div
                className={`w-0.5 bg-white transition-all duration-150 ${isAudioActive ? 'h-2' : 'h-1'}`}
                style={{ animation: isAudioActive ? 'bounce 0.6s ease-in-out infinite' : 'none' }}
              />
              <div
                className={`w-0.5 bg-white transition-all duration-150 ${isAudioActive ? 'h-3.5' : 'h-1'}`}
                style={{ animation: isAudioActive ? 'bounce 0.8s ease-in-out infinite' : 'none' }}
              />
            </div>
            {isAudioActive ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>
      </header>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.5); }
        }
      `}</style>
    </>
  );
}
