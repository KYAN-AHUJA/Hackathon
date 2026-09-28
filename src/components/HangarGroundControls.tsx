import { useRef } from 'react';
import { GroundServiceStatus, HangarCameraAngle } from './FlightCanvas';
import { Fuel, Luggage, Users, ArrowRight, RotateCcw, Video, CheckCircle2, Upload, Box } from 'lucide-react';

interface HangarGroundControlsProps {
  status: GroundServiceStatus;
  cameraAngle: HangarCameraAngle;
  customModelName?: string;
  onSelectCameraAngle: (angle: HangarCameraAngle) => void;
  onChangeStatus: (status: GroundServiceStatus) => void;
  onLaunchFlight: () => void;
  onUploadModel?: (file: File) => void;
  onResetModel?: () => void;
}

export function HangarGroundControls({
  status,
  cameraAngle,
  customModelName = '11803 Commercial Airliner (D-3262)',
  onSelectCameraAngle,
  onChangeStatus,
  onLaunchFlight,
  onUploadModel,
  onResetModel,
}: HangarGroundControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleRefuel = () => {
    onSelectCameraAngle('fuel');
    onChangeStatus({
      ...status,
      fuelPct: status.fuelPct >= 100 ? 35 : Math.min(100, status.fuelPct + 25),
    });
  };

  const toggleBaggage = () => {
    onSelectCameraAngle('baggage');
    onChangeStatus({
      ...status,
      baggagePct: status.baggagePct >= 100 ? 25 : Math.min(100, status.baggagePct + 25),
    });
  };

  const togglePassengers = () => {
    onSelectCameraAngle('passengers');
    onChangeStatus({
      ...status,
      passengerPct: status.passengerPct >= 100 ? 40 : Math.min(100, status.passengerPct + 20),
    });
  };

  const resetGroundServicing = () => {
    onChangeStatus({
      fuelPct: 100,
      baggagePct: 100,
      passengerPct: 100,
      isPushbackReady: true,
    });
  };

  const allComplete = status.fuelPct >= 100 && status.baggagePct >= 100 && status.passengerPct >= 100;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl px-4 pointer-events-auto animate-fade-in">
      <div className="bg-white/95 backdrop-blur-xl border border-black/10 rounded-3xl p-5 sm:p-6 shadow-2xl text-black">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-serif text-lg font-normal text-black tracking-wide">
                Apron Stand 01 · Airstrip Ramp Operations
              </span>
            </div>
            <p className="font-sans text-xs text-black/50 mt-0.5">
              Live 3D ground servicing: refuelling hydrant, cargo baggage loaders, and passenger airstairs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetGroundServicing}
              className="p-2 rounded-full border border-black/15 hover:bg-black/5 text-black/60 transition-colors"
              title="Reset Turnaround Services to 100%"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={onLaunchFlight}
              disabled={!allComplete}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md ${
                allComplete
                  ? 'bg-black text-white hover:bg-black/85 hover:scale-105 active:scale-95'
                  : 'bg-black/15 text-black/40 cursor-not-allowed'
              }`}
            >
              <span>Takeoff & Fly In-Air</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* 3D Model & Camera Angles View Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-black/5 text-[11px] font-sans">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="flex items-center gap-1.5 text-black/40 uppercase tracking-widest font-mono text-[10px] mr-1">
              <Video size={12} /> 3D View:
            </span>

            {(
              [
                { id: 'apron', label: 'Apron Overview' },
                { id: 'fuel', label: 'Fuel Hydrant Truck' },
                { id: 'baggage', label: 'Baggage Conveyor' },
                { id: 'passengers', label: 'Passenger Jetway' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectCameraAngle(item.id)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition-all duration-200 ${
                  cameraAngle === item.id
                    ? 'bg-black text-white font-bold shadow-xs'
                    : 'bg-black/5 text-black/70 hover:bg-black/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200/80 font-mono text-[10px]">
              <Box size={11} className="text-red-600" />
              <span className="font-semibold">{customModelName}</span>
            </div>

            {onUploadModel && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".obj,.glb,.gltf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadModel(f);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-black/15 bg-black/5 hover:bg-black/10 text-black text-[10px] font-medium transition-colors"
                  title="Import external .OBJ or .GLB file"
                >
                  <Upload size={11} />
                  <span>Import .OBJ/.GLB</span>
                </button>
                {onResetModel && customModelName !== '11803 Commercial Airliner (D-3262)' && (
                  <button
                    onClick={onResetModel}
                    className="text-[10px] text-black/50 hover:text-black underline"
                  >
                    Reset to 11803
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Real-time interactive meters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {/* 1. Fuel Servicing */}
          <div
            onClick={toggleRefuel}
            className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
              cameraAngle === 'fuel' ? 'border-[#0825c6] bg-[#0825c6]/5' : 'border-black/10 bg-black/[0.015] hover:bg-black/[0.04]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-sans mb-2">
              <span className="flex items-center gap-1.5 font-medium text-black">
                <Fuel size={14} className="text-[#0825c6]" /> Jet-A1 Hydrant
              </span>
              <span className="font-mono text-xs font-bold text-black tabular-nums flex items-center gap-1">
                {status.fuelPct >= 100 && <CheckCircle2 size={12} className="text-emerald-500" />}
                {status.fuelPct}%
              </span>
            </div>
            <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#0825c6] h-full rounded-full transition-all duration-500"
                style={{ width: `${status.fuelPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-sans text-black/50 mt-2">
              <span>{Math.round((status.fuelPct / 100) * 4800)} / 4,800 kg</span>
              <span className="text-[#0825c6] font-medium group-hover:underline">Focus 3D & Fill</span>
            </div>
          </div>

          {/* 2. Baggage Loading */}
          <div
            onClick={toggleBaggage}
            className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
              cameraAngle === 'baggage' ? 'border-[#0825c6] bg-[#0825c6]/5' : 'border-black/10 bg-black/[0.015] hover:bg-black/[0.04]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-sans mb-2">
              <span className="flex items-center gap-1.5 font-medium text-black">
                <Luggage size={14} className="text-[#0825c6]" /> Baggage Belt Loader
              </span>
              <span className="font-mono text-xs font-bold text-black tabular-nums flex items-center gap-1">
                {status.baggagePct >= 100 && <CheckCircle2 size={12} className="text-emerald-500" />}
                {status.baggagePct}%
              </span>
            </div>
            <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#0825c6] h-full rounded-full transition-all duration-500"
                style={{ width: `${status.baggagePct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-sans text-black/50 mt-2">
              <span>{Math.round((status.baggagePct / 100) * 140)} / 140 Bags</span>
              <span className="text-[#0825c6] font-medium group-hover:underline">Focus 3D & Load</span>
            </div>
          </div>

          {/* 3. Passenger Boarding */}
          <div
            onClick={togglePassengers}
            className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
              cameraAngle === 'passengers' ? 'border-[#0825c6] bg-[#0825c6]/5' : 'border-black/10 bg-black/[0.015] hover:bg-black/[0.04]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-sans mb-2">
              <span className="flex items-center gap-1.5 font-medium text-black">
                <Users size={14} className="text-[#0825c6]" /> Passenger Jetway
              </span>
              <span className="font-mono text-xs font-bold text-black tabular-nums flex items-center gap-1">
                {status.passengerPct >= 100 && <CheckCircle2 size={12} className="text-emerald-500" />}
                {status.passengerPct}%
              </span>
            </div>
            <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#0825c6] h-full rounded-full transition-all duration-500"
                style={{ width: `${status.passengerPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-sans text-black/50 mt-2">
              <span>{Math.round((status.passengerPct / 100) * 12)} / 12 Passengers</span>
              <span className="text-[#0825c6] font-medium group-hover:underline">Focus 3D & Board</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
