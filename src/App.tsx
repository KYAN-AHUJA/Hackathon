import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import Lenis from 'lenis';
import { Plane, Warehouse, ArrowUpRight, ArrowLeft } from 'lucide-react';
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

  const lenisRef = useRef<Lenis | null>(null);

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

  // Sync page changes with browser hash and reset scroll
  const navigateToPage = (page: 'in-air' | 'in-hangar') => {
    setActivePage(page);
    window.location.hash = page === 'in-hangar' ? '#hangar' : '#air';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setScrollProgress(0);
  };

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#hangar') {
        setActivePage('in-hangar');
      } else {
        setActivePage('in-air');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setScrollProgress(0);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    // Lenis smooth inertial scrolling for the flight journey
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.05,
    });
    lenisRef.current = lenis;

    let lastScrollY = window.scrollY;
    let rafId: number;

    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    lenis.on('scroll', (e: { scroll: number; velocity: number }) => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? Math.min(Math.max(e.scroll / maxScroll, 0), 1) : 0;
      setScrollProgress(progress);
      setScrollVelocity(e.velocity);

      flightAudio.updateSpeed(Math.min(Math.abs(e.velocity) * 0.1, 1));
      lastScrollY = e.scroll;
    });

    const handleNativeScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? Math.min(Math.max(window.scrollY / maxScroll, 0), 1) : 0;
      setScrollProgress(progress);
      const vel = window.scrollY - lastScrollY;
      setScrollVelocity(vel * 0.1);
      lastScrollY = window.scrollY;
    };
    window.addEventListener('scroll', handleNativeScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      window.removeEventListener('scroll', handleNativeScroll);
    };
  }, [activePage]);

  const scrollToSection = (id: string) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(`#${id}`, { offset: 0, duration: 1.6 });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isVioletZone = scrollProgress < 0.38;

  return (
    <main className="relative w-full bg-white selection:bg-black selection:text-white">
      {/* 3D WebGL Scene: In-Air (Chasing Up) vs In-Hangar (3D Airstrip Ground Scene) */}
      <FlightCanvas
        scrollProgress={scrollProgress}
        scrollVelocity={scrollVelocity}
        viewMode={activePage}
        hangarCameraAngle={hangarCameraAngle}
        groundStatus={groundStatus}
        customModelGroup={customModel}
        onTelemetryUpdate={setTelemetry}
      />

      {/* Atmospheric Violet Stratosphere Background (In-Air Page) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700"
        style={{
          background: 'linear-gradient(180deg, #0825c6 0%, #4a4bd0 55%, #6b6ce0 100%)',
          opacity: activePage === 'in-air' ? Math.max(0, 1 - scrollProgress * 2.2) : 0.04,
        }}
        aria-hidden="true"
      />

      {/* White Cloud Void Fade Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-white"
        style={{
          opacity:
            activePage === 'in-air'
              ? Math.min(1, Math.max(0, (scrollProgress - 0.28) * 2.4))
              : 0.96,
        }}
        aria-hidden="true"
      />

      {/* Global Top HUD Header & Telemetry */}
      <FlightTelemetry
        data={telemetry}
        isVioletZone={isVioletZone}
        viewMode={activePage}
        onToggleMode={navigateToPage}
      />

      {/* ========================================================================= */}
      {/* PAGE 1: IN-AIR FLIGHT JOURNEY (CHASING-UP PERSPECTIVE · ATMOS.LEEROY.CA) */}
      {/* ========================================================================= */}
      {activePage === 'in-air' && (
        <div className="relative z-20 animate-fade-in">
          {/* HERO SECTION — VIOLET HORIZON, EDITORIAL WORDMARK */}
          <section
            className="min-h-screen flex flex-col items-center justify-center px-6 text-center select-none"
            id="hero"
          >
            <div className="max-w-4xl mx-auto flex flex-col items-center">
              <p className="font-serif text-[11px] sm:text-xs uppercase tracking-[0.35em] text-white/60 mb-5 animate-fade-in">
                Move with the atmosphere
              </p>

              {/* Refined Font Size Wordmark */}
              <h1 className="font-serif text-white font-normal text-[clamp(44px,7.5vw,84px)] leading-[1.05] tracking-[0.2em] uppercase mb-10 drop-shadow-sm animate-fade-in">
                IMERIUM
              </h1>

              {/* Navigation Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
                <button
                  onClick={() => navigateToPage('in-hangar')}
                  className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white text-black font-sans text-sm sm:text-base font-bold leading-tight hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xl"
                >
                  <Warehouse size={16} />
                  <span>Enter 3D Hangar & Apron</span>
                  <ArrowUpRight size={16} />
                </button>

                <button
                  onClick={() => scrollToSection('ascent')}
                  className="px-7 py-3.5 rounded-full border border-white/30 text-white font-sans text-sm sm:text-base font-medium tracking-wide hover:bg-white/10 active:scale-95 transition-all duration-300 backdrop-blur-sm"
                >
                  Flight Experience
                </button>

                <button
                  onClick={() => scrollToSection('routes')}
                  className="px-7 py-3.5 rounded-full border border-white/30 text-white font-sans text-sm sm:text-base font-medium tracking-wide hover:bg-white/10 active:scale-95 transition-all duration-300 backdrop-blur-sm"
                >
                  Network Routes
                </button>
              </div>
            </div>

            {/* Scroll Indicator */}
            <div
              onClick={() => scrollToSection('ascent')}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 cursor-pointer text-white/50 hover:text-white transition-colors duration-300"
            >
              <span className="font-serif text-[10px] uppercase tracking-[0.25em]">
                Scroll to navigate flight
              </span>
              <div className="w-[1.5px] h-8 bg-white/20 relative overflow-hidden rounded-full">
                <div className="w-full h-1/2 bg-white/90 animate-scroll-pill rounded-full" />
              </div>
            </div>
          </section>

          {/* SECTION 1: STRATOSPHERIC ASCENT (FL450) */}
          <section
            className="min-h-screen flex items-center justify-center px-6 sm:px-12 py-32 sm:py-48"
            id="ascent"
          >
            <div className="max-w-4xl mx-auto w-full">
              <div className="p-8 sm:p-14 rounded-3xl backdrop-blur-md bg-white/10 border border-white/20 text-white transition-colors duration-500">
                <p className="font-serif text-xs uppercase tracking-[0.25em] text-white/60 mb-6">
                  Phase 01 · Cruising Altitude
                </p>
                <h2 className="font-serif text-3xl sm:text-5xl lg:text-[54px] font-normal leading-[1.12] tracking-tight mb-8">
                  Above weather systems.
                  <br />
                  Where silence becomes tangible.
                </h2>
                <p className="font-sans text-lg sm:text-2xl text-white/80 font-normal leading-relaxed max-w-2xl mb-12">
                  At 45,000 feet, turbulence ceases. The air density thins to a whisper,
                  allowing our custom aerodynamic profile to glide along the jet stream
                  with total calm and undisturbed grace.
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
              </div>
            </div>
          </section>

          {/* SECTION 2: AERODYNAMIC PRECISION & THE CRAFT */}
          <section
            className="min-h-screen flex items-center justify-center px-6 sm:px-12 py-32 sm:py-48"
            id="craft"
          >
            <div className="max-w-4xl mx-auto w-full text-center">
              <p className="font-serif text-[11px] uppercase tracking-[0.25em] text-black/40 mb-6">
                Aeronautical Engineering · The Imerium Craft
              </p>
              <h2 className="font-serif text-3xl sm:text-5xl lg:text-[58px] font-normal tracking-tight text-black mb-10 leading-[1.12]">
                Sculpted for the stratosphere.
              </h2>
              <p className="font-sans text-lg sm:text-2xl text-black/70 font-normal leading-relaxed max-w-2xl mx-auto mb-16">
                Custom carbon-titanium composite fuselage, natural laminar flow swept wings,
                and acoustic dampening turbines engineered to erase the friction of travel.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="p-8 rounded-3xl border border-black/10 bg-white/80 backdrop-blur-sm">
                  <span className="font-mono text-xs text-black/40 font-semibold mb-3 block">01</span>
                  <h3 className="font-serif text-2xl text-black mb-3">Laminar Winglets</h3>
                  <p className="font-sans text-sm text-black/60 leading-relaxed">
                    Bi-convex raked wingtips slicing through upper vortex wakes, cutting drag by 14% and eliminating high-altitude roll oscillation.
                  </p>
                </div>

                <div className="p-8 rounded-3xl border border-black/10 bg-white/80 backdrop-blur-sm">
                  <span className="font-mono text-xs text-black/40 font-semibold mb-3 block">02</span>
                  <h3 className="font-serif text-2xl text-black mb-3">Acoustic Shield</h3>
                  <p className="font-sans text-sm text-black/60 leading-relaxed">
                    Rear pylon-mounted turbofan nacelles directing jet wash away from passenger quarters. Interior decibels rival a quiet library.
                  </p>
                </div>

                <div className="p-8 rounded-3xl border border-black/10 bg-white/80 backdrop-blur-sm">
                  <span className="font-mono text-xs text-black/40 font-semibold mb-3 block">03</span>
                  <h3 className="font-serif text-2xl text-black mb-3">Circadian Aura</h3>
                  <p className="font-sans text-sm text-black/60 leading-relaxed">
                    Cabin pressurization at a relaxed 3,000 ft altitude equivalent with full-spectrum solar synchronization to eradicate fatigue.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: THE CLOUD DIVE */}
          <section
            className="min-h-screen flex items-center justify-center px-6 sm:px-12 py-32 sm:py-48 text-center"
            id="cloud-dive"
          >
            <div className="max-w-3xl mx-auto">
              <p className="font-serif text-[11px] uppercase tracking-[0.25em] text-black/40 mb-6">
                Atmospheric Descent
              </p>
              <h2 className="font-serif text-3xl sm:text-5xl lg:text-[60px] font-normal tracking-tight text-black mb-8 leading-[1.1]">
                Through the clouds.
                <br />
                Into absolute stillness.
              </h2>
              <p className="font-sans text-lg sm:text-2xl text-black/60 font-normal leading-relaxed max-w-xl mx-auto mb-12">
                Watch the aeroplane bank through the cumulus banks below.
                Scroll forward to descend smoothly into the destination horizon.
              </p>

              <button
                onClick={() => navigateToPage('in-hangar')}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-black text-white font-sans text-sm sm:text-base font-bold tracking-wide hover:opacity-90 active:scale-95 transition-all shadow-md"
              >
                <Warehouse size={16} />
                <span>Switch to 3D Hangar Airstrip</span>
              </button>
            </div>
          </section>

          {/* SECTION 4: ROUTE NETWORK MANIFEST */}
          <RouteManifest />

          {/* SECTION 5: COLOPHON */}
          <footer className="bg-white border-t border-black/10 py-24 sm:py-32 px-6 sm:px-12 text-center">
            <div className="max-w-4xl mx-auto">
              <h3 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal tracking-[0.2em] uppercase text-black mb-6">
                IMERIUM
              </h3>
              <p className="font-sans text-sm sm:text-base text-black/50 font-normal max-w-md mx-auto mb-10 leading-relaxed">
                Move with the atmosphere. A meditative approach to modern aviation.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-6 font-sans text-xs text-black/60 mb-12">
                <button
                  onClick={() => navigateToPage('in-hangar')}
                  className="font-bold text-black underline underline-offset-4 hover:opacity-80"
                >
                  Go to 3D Airstrip Operations Page →
                </button>
              </div>

              <p className="font-serif text-[11px] uppercase tracking-widest text-black/30">
                © {new Date().getFullYear()} IMERIUM AVIATION · ALL RIGHTS RESERVED
              </p>
            </div>
          </footer>
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
              IMERIUM AIRPORT OPERATIONS · AUTONOMOUS RAMP DISPATCH
            </p>
          </footer>
        </div>
      )}
    </main>
  );
}
