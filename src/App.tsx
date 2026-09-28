import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Plane, Warehouse, ArrowUpRight, ArrowLeft, X, Layers, Compass, Wind } from 'lucide-react';
import {
  FlightCanvas,
  FlightTelemetryData,
  GroundServiceStatus,
  HangarCameraAngle,
} from './components/FlightCanvas';
import { FlightTelemetry } from './components/FlightTelemetry';
import { HangarGroundControls } from './components/HangarGroundControls';
import { RouteManifest } from './components/RouteManifest';
import { flightAudio } from './components/AudioEngine';
import { AirportSimulationSystem } from './components/AirportSimulation/AirportSimulationSystem';
import { parseModelFile } from './components/CustomModelManager';

export default function App() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const [telemetry, setTelemetry] = useState<FlightTelemetryData | null>(null);

  // Modal / Drawer state for Network Routes Manifest
  const [isRouteManifestOpen, setIsRouteManifestOpen] = useState(false);

  // 3D Model state: Default is 11803 Commercial Airliner (D-3262)
  const [customModel, setCustomModel] = useState<THREE.Group | null>(null);
  const [customModelName, setCustomModelName] = useState<string>('11803 Commercial Airliner (D-3262)');

  // Separate page state: 'in-air' vs 'in-hangar'
  const [activePage, setActivePage] = useState<'in-air' | 'in-hangar'>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#hangar') {
      return 'in-hangar';
    }
    return 'in-air';
  });

  const [hangarCameraAngle, setHangarCameraAngle] = useState<HangarCameraAngle>('apron');

  const [groundStatus, setGroundStatus] = useState<GroundServiceStatus>({
    fuelPct: 100,
    baggagePct: 100,
    passengerPct: 100,
    isPushbackReady: true,
  });

  // Smooth virtual flight trajectory refs (ATMOS-style: page does NOT scroll down)
  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
  const velocityRef = useRef(0);

  const handleUploadModel = async (file: File) => {
    try {
      const group = await parseModelFile(file);
      setCustomModel(group);
      setCustomModelName(file.name);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleResetModel = () => {
    setCustomModel(null);
    setCustomModelName('11803 Commercial Airliner (D-3262)');
  };

  // Sync page changes with browser hash and reset progress
  const navigateToPage = (page: 'in-air' | 'in-hangar') => {
    setActivePage(page);
    window.location.hash = page === 'in-hangar' ? '#hangar' : '#air';
    if (page === 'in-air') {
      targetProgressRef.current = 0;
      currentProgressRef.current = 0;
      setScrollProgress(0);
      setScrollVelocity(0);
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#hangar') {
        setActivePage('in-hangar');
      } else {
        setActivePage('in-air');
        targetProgressRef.current = 0;
        currentProgressRef.current = 0;
        setScrollProgress(0);
        setScrollVelocity(0);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Programmatic flight jump function for buttons & altitude scrubber
  const jumpToProgress = (target: number) => {
    targetProgressRef.current = Math.min(1, Math.max(0, target));
  };

  // =========================================================================
  // ATMOS VIRTUAL FLIGHT SCROLL ENGINE (NO PAGE DOWN SCROLLING)
  // Instead of the window scrolling vertically, wheel / touch / keys smoothly
  // navigate the 3D aircraft and camera INTO the clouds and background!
  // =========================================================================
  useEffect(() => {
    if (activePage !== 'in-air') {
      document.body.style.overflow = 'auto';
      return;
    }

    // Lock document scroll so page does not scroll down
    document.body.style.overflow = 'hidden';

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Normalize wheel delta across mice and trackpads
      const delta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120);
      const scrollSpeed = 0.00075;
      targetProgressRef.current = Math.min(
        1,
        Math.max(0, targetProgressRef.current + delta * scrollSpeed)
      );
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartY - currentY;
      touchStartY = currentY;
      const touchSpeed = 0.0022;
      targetProgressRef.current = Math.min(
        1,
        Math.max(0, targetProgressRef.current + deltaY * touchSpeed)
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        targetProgressRef.current = Math.min(1, targetProgressRef.current + 0.12);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        targetProgressRef.current = Math.max(0, targetProgressRef.current - 0.12);
      } else if (e.key === 'Home') {
        e.preventDefault();
        targetProgressRef.current = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        targetProgressRef.current = 1;
      } else if (e.key === 'Escape') {
        setIsRouteManifestOpen(false);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    let rafId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const prev = currentProgressRef.current;
      const target = targetProgressRef.current;

      // Silky smooth asymptotic lerp glide
      const lerpSpeed = 5.2;
      currentProgressRef.current += (target - currentProgressRef.current) * Math.min(1, dt * lerpSpeed);

      // Realtime velocity calculation
      const instantVel = (currentProgressRef.current - prev) / (dt || 0.016);
      velocityRef.current = THREE.MathUtils.lerp(velocityRef.current, instantVel, 0.22);

      setScrollProgress(currentProgressRef.current);
      setScrollVelocity(velocityRef.current);

      // ATMOS acoustic audio responsiveness
      flightAudio.updateSpeed(Math.min(Math.abs(velocityRef.current) * 0.35, 1));

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [activePage]);

  const isVioletZone = scrollProgress < 0.38;

  // Chapter Opacity and Visibility helpers for floating overlays
  // Hero (0.0 to 0.22)
  const heroOpacity = Math.max(0, 1 - scrollProgress * 4.6);
  // Chapter I (0.22 to 0.48)
  const ch1Opacity =
    scrollProgress < 0.18
      ? 0
      : scrollProgress < 0.26
      ? (scrollProgress - 0.18) / 0.08
      : scrollProgress < 0.42
      ? 1
      : scrollProgress < 0.50
      ? Math.max(0, 1 - (scrollProgress - 0.42) / 0.08)
      : 0;
  // Chapter II (0.48 to 0.74)
  const ch2Opacity =
    scrollProgress < 0.46
      ? 0
      : scrollProgress < 0.54
      ? (scrollProgress - 0.46) / 0.08
      : scrollProgress < 0.66
      ? 1
      : scrollProgress < 0.74
      ? Math.max(0, 1 - (scrollProgress - 0.66) / 0.08)
      : 0;
  // Chapter III (0.72 to 1.0)
  const ch3Opacity =
    scrollProgress < 0.70
      ? 0
      : scrollProgress < 0.78
      ? (scrollProgress - 0.70) / 0.08
      : 1;

  return (
    <main className="relative w-full min-h-screen bg-white selection:bg-black selection:text-white">
      {/* 3D WebGL Flight Scene (In-Air Stratosphere vs In-Hangar Apron) */}
      <FlightCanvas
        scrollProgress={scrollProgress}
        scrollVelocity={scrollVelocity}
        viewMode={activePage}
        hangarCameraAngle={hangarCameraAngle}
        groundStatus={groundStatus}
        customModelGroup={customModel}
        onTelemetryUpdate={setTelemetry}
      />

      {/* Atmospheric Luminous Violet Background (Stratosphere FL450) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700 atmos-grain"
        style={{
          background: 'linear-gradient(180deg, #1b3fed 0%, #3a5df5 45%, #607ef8 78%, #859efa 100%)',
          opacity: activePage === 'in-air' ? Math.max(0, 1 - scrollProgress * 2.3) : 0.02,
        }}
        aria-hidden="true"
      />

      {/* Brilliant White Cloud Void Background (Transitions after 40% scroll into clouds) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-white"
        style={{
          opacity:
            activePage === 'in-air'
              ? Math.min(1, Math.max(0, (scrollProgress - 0.38) * 2.4))
              : 0.98,
        }}
        aria-hidden="true"
      />

      {/* ATMOS Viewport 4-Corner Crosshair Reticles */}
      {activePage === 'in-air' && (
        <div className="fixed inset-0 pointer-events-none z-30 font-mono text-[9px] text-white/40 uppercase tracking-widest select-none">
          <div className="absolute top-20 left-8 flex items-center gap-1.5 animate-reticle">
            <span className="text-white/60">+</span>
            <span>45°30'12"N</span>
          </div>
          <div className="absolute top-20 right-8 flex items-center gap-1.5 animate-reticle">
            <span className="text-white/60">+</span>
            <span>73°34'50"W</span>
          </div>
          <div className="absolute bottom-8 left-8 flex items-center gap-1.5 animate-reticle">
            <span className="text-white/60">+</span>
            <span>ELEVATION: {scrollProgress < 0.4 ? 'FL450' : scrollProgress < 0.7 ? 'FL250' : 'FL080'}</span>
          </div>
          <div className="absolute bottom-8 right-8 flex items-center gap-1.5 animate-reticle">
            <span className="text-white/60">+</span>
            <span>SPEED: MACH 0.94</span>
          </div>
        </div>
      )}

      {/* Global Top HUD Header & Telemetry */}
      <FlightTelemetry
        data={telemetry}
        isVioletZone={isVioletZone}
        viewMode={activePage}
        onToggleMode={navigateToPage}
        scrollProgress={scrollProgress}
      />

      {/* Vertical Altitude Scrubber - Right Edge Navigation */}
      {activePage === 'in-air' && (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-end gap-3 pointer-events-auto select-none">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-5 text-[9px] font-mono text-white/50 uppercase tracking-wider text-right">
              <button
                onClick={() => jumpToProgress(0.0)}
                className={`transition-colors hover:text-white ${scrollProgress < 0.24 ? 'text-white font-bold' : ''}`}
              >
                FL450 · STRATOSPHERE
              </button>
              <button
                onClick={() => jumpToProgress(0.35)}
                className={`transition-colors hover:text-white ${scrollProgress >= 0.24 && scrollProgress < 0.50 ? 'text-white font-bold' : ''}`}
              >
                FL250 · TROPOSPHERE
              </button>
              <button
                onClick={() => jumpToProgress(0.70)}
                className={`transition-colors hover:text-white ${scrollProgress >= 0.50 && scrollProgress < 0.74 ? 'text-white font-bold' : ''}`}
              >
                FL100 · APPROACH
              </button>
              <button
                onClick={() => navigateToPage('in-hangar')}
                className={`transition-colors hover:text-white ${scrollProgress >= 0.74 ? 'text-white font-bold' : ''}`}
              >
                GND · APRON DOCK
              </button>
            </div>

            <div className="w-[1.5px] h-48 bg-white/20 relative rounded-full">
              {/* Active glowing indicator tick */}
              <div
                className="absolute left-1/2 -translate-x-1/2 w-3.5 h-1 bg-white rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(255,255,255,0.9)]"
                style={{ top: `${Math.min(100, Math.max(0, scrollProgress * 100))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 1: IN-AIR FLIGHT JOURNEY (ATMOS.LEEROY.CA FLIGHT ANIMATION)          */}
      {/* The landing page does NOT scroll down. Instead, scrolling moves INTO the  */}
      {/* clouds and background while editorial narrative chapters float over WebGL */}
      {/* ========================================================================= */}
      {activePage === 'in-air' && (
        <div className="fixed inset-0 h-screen w-screen overflow-hidden select-none z-20 pointer-events-none">
          {/* LAYER 0: HERO (FL450 STRATOSPHERE HORIZON) */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center transition-all duration-300"
            style={{
              opacity: heroOpacity,
              transform: `translateY(-${scrollProgress * 60}px) scale(${1 - scrollProgress * 0.1})`,
              pointerEvents: heroOpacity > 0.05 ? 'auto' : 'none',
              visibility: heroOpacity > 0.005 ? 'visible' : 'hidden',
            }}
          >
            <div className="max-w-4xl mx-auto flex flex-col items-center">
              <p className="font-serif text-[11px] sm:text-xs uppercase tracking-[0.4em] text-white/70 mb-4">
                MOVE WITH THE ATMOSPHERE
              </p>

              {/* Main Title - High-fashion ultra-wide tracked serif */}
              <h1 className="font-serif text-white font-light text-[clamp(54px,9vw,110px)] tracking-[0.25em] uppercase leading-none mb-10 drop-shadow-lg">
                IMPERIUM
              </h1>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => navigateToPage('in-hangar')}
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-white text-black font-sans font-bold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                >
                  <Warehouse size={15} />
                  <span>Enter 3D Apron Operations</span>
                  <ArrowUpRight size={15} />
                </button>

                <button
                  onClick={() => jumpToProgress(0.35)}
                  className="px-8 py-4 rounded-full border border-white/30 text-white font-sans font-medium text-xs uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all backdrop-blur-sm"
                >
                  Flight Experience
                </button>

                <button
                  onClick={() => setIsRouteManifestOpen(true)}
                  className="px-7 py-4 rounded-full border border-white/20 text-white/80 font-sans font-medium text-xs uppercase tracking-wider hover:bg-white/10 hover:text-white active:scale-95 transition-all backdrop-blur-sm"
                >
                  Network Routes
                </button>
              </div>
            </div>

            {/* Bottom Scroll Indicator - Prompts scrolling into clouds */}
            <div
              onClick={() => jumpToProgress(0.35)}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 cursor-pointer text-white/50 hover:text-white transition-colors duration-300 select-none pointer-events-auto"
            >
              <span className="font-serif text-[10px] uppercase tracking-[0.3em]">
                SCROLL TO DIVE INTO CLOUDS
              </span>
              <div className="w-7 h-12 border border-white/30 rounded-full relative overflow-hidden backdrop-blur-sm flex justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full mt-2 animate-scroll-pill shadow-[0_0_8px_white]" />
              </div>
            </div>
          </div>

          {/* LAYER 1: CHAPTER I · THE ASCENT (FL350 - FL250 TROPOSPHERE) */}
          <div
            className="absolute inset-0 flex items-center justify-center px-6 sm:px-12 pointer-events-none transition-all duration-300"
            style={{
              opacity: ch1Opacity,
              transform: `translateY(${(0.35 - scrollProgress) * 40}px)`,
              pointerEvents: ch1Opacity > 0.1 ? 'auto' : 'none',
              visibility: ch1Opacity > 0.01 ? 'visible' : 'hidden',
            }}
          >
            <div className="max-w-4xl mx-auto w-full">
              <div className="p-8 sm:p-14 rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 text-white shadow-2xl">
                <div className="flex items-center gap-2 mb-6">
                  <Wind size={15} className="text-white/60" />
                  <p className="font-serif text-xs uppercase tracking-[0.25em] text-white/60">
                    Chapter I · The Ascent
                  </p>
                </div>
                <h2 className="font-serif text-3xl sm:text-5xl lg:text-[54px] font-normal leading-[1.12] tracking-tight mb-8">
                  Above weather systems.
                  <br />
                  Where silence becomes tangible.
                </h2>
                <p className="font-sans text-lg sm:text-2xl text-white/80 font-normal leading-relaxed max-w-2xl mb-12">
                  At 45,000 feet, turbulence ceases. The air density thins to a whisper,
                  allowing our custom aerodynamic profile to glide along the jet stream
                  with undisturbed grace. Scroll forward to penetrate the cloud deck below.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pt-8 border-t border-white/20 font-mono text-xs sm:text-sm">
                  <div>
                    <span className="block text-white/50 uppercase text-[10px] tracking-widest mb-1">
                      Stratosphere Ceiling
                    </span>
                    <span className="text-xl sm:text-2xl font-light text-white">49,000 FT</span>
                  </div>
                  <div>
                    <span className="block text-white/50 uppercase text-[10px] tracking-widest mb-1">
                      Speed Profile
                    </span>
                    <span className="text-xl sm:text-2xl font-light text-white">MACH 0.94</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="block text-white/50 uppercase text-[10px] tracking-widest mb-1">
                      Cabin Sound
                    </span>
                    <span className="text-xl sm:text-2xl font-light text-white">&lt; 44 dBA</span>
                  </div>
                </div>

                <div className="mt-8 pt-4 flex items-center justify-between">
                  <button
                    onClick={() => jumpToProgress(0.60)}
                    className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-white/70 hover:text-white uppercase"
                  >
                    <span>Penetrate Cloud Deck →</span>
                  </button>
                  <span className="font-mono text-[10px] text-white/40 uppercase">
                    FLIGHT PROGRESS: 35%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* LAYER 2: CHAPTER II · AERODYNAMIC PRECISION (FL150 CLOUD CANYON) */}
          <div
            className="absolute inset-0 flex items-center justify-center px-6 sm:px-12 pointer-events-none transition-all duration-300"
            style={{
              opacity: ch2Opacity,
              transform: `translateY(${(0.60 - scrollProgress) * 40}px)`,
              pointerEvents: ch2Opacity > 0.1 ? 'auto' : 'none',
              visibility: ch2Opacity > 0.01 ? 'visible' : 'hidden',
            }}
          >
            <div className="max-w-4xl mx-auto w-full text-center">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-black/5 border border-black/10">
                <Compass size={13} className="text-black/50" />
                <span className="font-serif text-[11px] uppercase tracking-[0.25em] text-black/50">
                  Chapter II · The Engineering
                </span>
              </div>
              <h2 className="font-serif text-3xl sm:text-5xl lg:text-[56px] font-normal tracking-tight text-black mb-6 leading-[1.12]">
                Sculpted for the stratosphere.
              </h2>
              <p className="font-sans text-base sm:text-xl text-black/70 font-normal leading-relaxed max-w-2xl mx-auto mb-10">
                Custom carbon-titanium composite fuselage, natural laminar flow swept wings,
                and acoustic dampening turbofans engineered to erase the friction of travel.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
                <div className="p-6 sm:p-7 rounded-3xl border border-black/10 bg-white/85 backdrop-blur-md hover:scale-105 transition-transform duration-300 shadow-lg">
                  <span className="font-mono text-xs text-blue-600 font-semibold mb-2 block">01</span>
                  <h3 className="font-serif text-xl text-black mb-2">Laminar Winglets</h3>
                  <p className="font-sans text-xs sm:text-sm text-black/60 leading-relaxed">
                    Bi-convex raked wingtips slicing through upper vortex wakes, cutting drag by 14% and eliminating roll oscillation.
                  </p>
                </div>

                <div className="p-6 sm:p-7 rounded-3xl border border-black/10 bg-white/85 backdrop-blur-md hover:scale-105 transition-transform duration-300 shadow-lg">
                  <span className="font-mono text-xs text-violet-600 font-semibold mb-2 block">02</span>
                  <h3 className="font-serif text-xl text-black mb-2">Acoustic Shield</h3>
                  <p className="font-sans text-xs sm:text-sm text-black/60 leading-relaxed">
                    Rear pylon-mounted turbofan nacelles directing jet wash away from passenger quarters. Interior decibels rival a quiet library.
                  </p>
                </div>

                <div className="p-6 sm:p-7 rounded-3xl border border-black/10 bg-white/85 backdrop-blur-md hover:scale-105 transition-transform duration-300 shadow-lg">
                  <span className="font-mono text-xs text-emerald-600 font-semibold mb-2 block">03</span>
                  <h3 className="font-serif text-xl text-black mb-2">Circadian Aura</h3>
                  <p className="font-sans text-xs sm:text-sm text-black/60 leading-relaxed">
                    Cabin pressurization at a relaxed 3,000 ft altitude equivalent with full-spectrum solar synchronization to eradicate fatigue.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => jumpToProgress(0.85)}
                  className="px-6 py-2.5 rounded-full border border-black/15 bg-black/5 hover:bg-black/10 text-black text-xs font-mono uppercase tracking-wider transition-colors"
                >
                  Approach Corridor →
                </button>
              </div>
            </div>
          </div>

          {/* LAYER 3: CHAPTER III · THE CLOUD DIVE & DESTINATION APPROACH (FL080 - GND) */}
          <div
            className="absolute inset-0 flex items-center justify-center px-6 sm:px-12 text-center pointer-events-none transition-all duration-300"
            style={{
              opacity: ch3Opacity,
              transform: `translateY(${(0.90 - scrollProgress) * 30}px)`,
              pointerEvents: ch3Opacity > 0.1 ? 'auto' : 'none',
              visibility: ch3Opacity > 0.01 ? 'visible' : 'hidden',
            }}
          >
            <div className="max-w-3xl mx-auto p-10 sm:p-14 rounded-3xl backdrop-blur-xl bg-white/90 border border-black/10 shadow-2xl">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-black/5 border border-black/10">
                <Layers size={13} className="text-black/50" />
                <span className="font-serif text-[11px] uppercase tracking-[0.25em] text-black/50">
                  Chapter III · The Descent & Arrival
                </span>
              </div>
              <h2 className="font-serif text-3xl sm:text-5xl lg:text-[58px] font-normal tracking-tight text-black mb-6 leading-[1.1]">
                Through the clouds.
                <br />
                Into absolute stillness.
              </h2>
              <p className="font-sans text-base sm:text-xl text-black/65 font-normal leading-relaxed max-w-xl mx-auto mb-10">
                Gliding smoothly through the cumulus banks. Ahead lies the destination tarmac,
                where our autonomous airport turnaround optimization and 3D ramp operations await.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigateToPage('in-hangar')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-black text-white font-sans text-sm font-bold tracking-wide hover:opacity-90 active:scale-95 transition-all shadow-xl"
                >
                  <Warehouse size={16} />
                  <span>Enter 3D Apron Operations Hub</span>
                  <ArrowUpRight size={15} />
                </button>

                <button
                  onClick={() => setIsRouteManifestOpen(true)}
                  className="px-7 py-3.5 rounded-full border border-black/20 text-black font-sans text-xs font-semibold uppercase tracking-wider hover:bg-black/5 active:scale-95 transition-all"
                >
                  View Route Manifest
                </button>

                <button
                  onClick={() => jumpToProgress(0.0)}
                  className="px-6 py-3.5 rounded-full border border-black/10 text-black/60 font-sans text-xs font-medium uppercase tracking-wider hover:text-black hover:bg-black/5 active:scale-95 transition-all"
                >
                  Replay Stratosphere Ascent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-OVER MODAL / DRAWER: ROUTE NETWORK MANIFEST                         */}
      {/* ========================================================================= */}
      {isRouteManifestOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-5xl h-full bg-white shadow-2xl overflow-y-auto p-6 sm:p-10">
            {/* Top Close Bar */}
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-black/10">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-black/40">
                  IMPERIUM GLOBAL DISPATCH
                </span>
                <h3 className="font-serif text-2xl text-black">Network Flight Manifest</h3>
              </div>
              <button
                onClick={() => setIsRouteManifestOpen(false)}
                className="p-2.5 rounded-full hover:bg-black/5 text-black/60 hover:text-black transition-colors"
                aria-label="Close manifest"
              >
                <X size={20} />
              </button>
            </div>

            {/* Route Manifest Component */}
            <RouteManifest />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 2: IN-HANGAR & 3D AIRSTRIP OPERATIONS (SEPARATE DEDICATED PAGE)      */}
      {/* ========================================================================= */}
      {activePage === 'in-hangar' && (
        <div className="relative z-20 animate-fade-in pt-24 pb-20">
          {/* Top Banner Bar with Page Switcher Back to In-Air */}
          <div className="max-w-7xl mx-auto px-6 sm:px-12 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigateToPage('in-air')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/15 bg-black/5 hover:bg-black/10 text-black text-xs font-sans transition-colors"
                >
                  <ArrowLeft size={14} /> Back to In-Air Flight
                </button>
                <span className="font-mono text-xs uppercase tracking-widest text-black/50">
                  Apron Stand 01
                </span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl text-black mt-2">
                Airstrip Ground Operations
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigateToPage('in-air')}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-black text-white font-sans text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-md"
              >
                <Plane size={14} />
                <span>Launch Flight In-Air</span>
              </button>
            </div>
          </div>

          {/* Dedicated 3D Hangar Interactive Servicing HUD Controls */}
          <HangarGroundControls
            status={groundStatus}
            cameraAngle={hangarCameraAngle}
            customModelName={customModelName}
            onSelectCameraAngle={setHangarCameraAngle}
            onChangeStatus={setGroundStatus}
            onLaunchFlight={() => navigateToPage('in-air')}
            onUploadModel={handleUploadModel}
            onResetModel={handleResetModel}
          />

          {/* 3D Viewport Spacer */}
          <div className="min-h-[55vh]" />

          {/* Autonomous Airport Turnaround Simulation System */}
          <div className="mt-8 border-t border-black/10 pt-16">
            <AirportSimulationSystem />
          </div>

          {/* Hangar Page Footer */}
          <footer className="mt-20 border-t border-black/10 py-16 px-6 text-center">
            <button
              onClick={() => navigateToPage('in-air')}
              className="inline-flex items-center gap-2 text-sm font-sans font-medium text-black/70 hover:text-black transition-colors"
            >
              <ArrowLeft size={16} /> Return to Stratospheric In-Air Flight Experience
            </button>
            <p className="font-serif text-[10px] uppercase tracking-widest text-black/30 mt-6">
              IMPERIUM AIRPORT OPERATIONS · AUTONOMOUS RAMP DISPATCH
            </p>
          </footer>
        </div>
      )}
    </main>
  );
}
