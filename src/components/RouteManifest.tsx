import { useState } from 'react';
import { ArrowUpRight, Check, X, Calendar, Users, MapPin } from 'lucide-react';

export interface RouteItem {
  code: string;
  title: string;
  corridor: string;
  duration: string;
  mach: string;
  status: string;
  departure: string;
  destination: string;
  description: string;
}

const routes: RouteItem[] = [
  {
    code: 'AT-01',
    title: 'Aurora Line',
    corridor: 'North Atlantic · Reykjavik – London',
    duration: '03:15',
    mach: 'Mach 0.94',
    status: 'On Course',
    departure: 'Reykjavik (KEF)',
    destination: 'London Farnborough (FAB)',
    description:
      'Chasing the midnight sun across the sub-arctic jet stream. Uninterrupted polar views and whisper-quiet flight profiles at 47,000 feet.',
  },
  {
    code: 'AT-02',
    title: 'Solstice Run',
    corridor: 'Pacific Rim · Tokyo – San Francisco',
    duration: '07:45',
    mach: 'Mach 0.92',
    status: 'Boarding Soon',
    departure: 'Tokyo Haneda (HND)',
    destination: 'San Francisco (SFO)',
    description:
      'Cruising at the boundary of dawn. Arrive before the day begins with atmospheric circadian lighting calibrated to Pacific timezones.',
  },
  {
    code: 'AT-03',
    title: 'Mirage Route',
    corridor: 'Sahara Crossing · Zurich – Dubai',
    duration: '05:20',
    mach: 'Mach 0.90',
    status: 'Scheduled',
    departure: 'Zurich Kloten (ZRH)',
    destination: 'Dubai World Central (DWC)',
    description:
      'Slicing above the desert dunes through thermal-free upper stratosphere. Ultra-smooth aerodynamic stability and private sleeping suites.',
  },
  {
    code: 'AT-04',
    title: 'Meridian Flight',
    corridor: 'Transcontinental · New York – Paris',
    duration: '05:40',
    mach: 'Mach 0.93',
    status: 'On Course',
    departure: 'New York Teterboro (TEB)',
    destination: 'Paris Le Bourget (LBG)',
    description:
      'The classic supersonic corridor reimagined. Direct oceanic entry with zero ground-level delay and bespoke chef-curated dining.',
  },
];

export function RouteManifest() {
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | null>(null);
  const [isCharterOpen, setIsCharterOpen] = useState(false);
  const [charterSuccess, setCharterSuccess] = useState(false);
  const [charterForm, setCharterForm] = useState({
    date: '2026-10-15',
    guests: 4,
    name: '',
    email: '',
  });

  const handleBook = (route: RouteItem) => {
    setSelectedRoute(route);
    setIsCharterOpen(true);
    setCharterSuccess(false);
  };

  const submitCharter = (e: React.FormEvent) => {
    e.preventDefault();
    setCharterSuccess(true);
    setTimeout(() => {
      setIsCharterOpen(false);
      setCharterSuccess(false);
    }, 2800);
  };

  return (
    <section className="relative z-20 bg-white py-24 sm:py-36 px-6 sm:px-12" id="routes">
      <div className="max-w-4xl mx-auto text-center">
        {/* Caption Label in Times 10px / small caps style */}
        <p className="font-serif text-[11px] uppercase tracking-[0.25em] text-black/40 mb-5">
          Atmospheric Network · 2026 Manifest
        </p>

        {/* Section Heading in Playfair Display 50px */}
        <h2 className="font-serif text-3xl sm:text-5xl lg:text-[54px] font-normal tracking-tight text-black mb-6 leading-[1.12]">
          Find your place in the sky.
        </h2>

        <p className="font-sans text-base sm:text-xl text-black/60 font-normal max-w-xl mx-auto mb-16 leading-relaxed">
          Curated stratospheric corridors managed with total precision.
          Every flight is an unhurried, private journey through pristine atmosphere.
        </p>

        {/* Route Selector List */}
        <div className="flex flex-col gap-4 text-left">
          {routes.map((route) => {
            const isSelected = selectedRoute?.code === route.code;
            return (
              <div
                key={route.code}
                className={`rounded-2xl border transition-all duration-300 p-6 sm:p-8 cursor-pointer ${
                  isSelected
                    ? 'border-black bg-black text-white'
                    : 'border-black/10 bg-white hover:border-black/30 hover:bg-black/[0.015]'
                }`}
                onClick={() => setSelectedRoute(isSelected ? null : route)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-mono text-xs font-semibold tracking-wider ${
                        isSelected ? 'text-white/60' : 'text-black/40'
                      }`}
                    >
                      {route.code}
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-normal">
                      {route.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-8">
                    <span
                      className={`text-xs sm:text-sm font-sans tracking-wide ${
                        isSelected ? 'text-white/70' : 'text-black/50'
                      }`}
                    >
                      {route.corridor}
                    </span>
                    <span
                      className={`hidden md:inline-block px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider ${
                        isSelected
                          ? 'bg-white/15 text-white'
                          : 'bg-black/5 text-black/70'
                      }`}
                    >
                      {route.status}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isSelected && (
                  <div className="mt-6 pt-6 border-t border-white/20 animate-fade-in">
                    <p className="font-sans text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl mb-6">
                      {route.description}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 font-mono text-xs text-white/70">
                      <div>
                        <div className="text-[10px] uppercase text-white/40 mb-1">Departure</div>
                        <div className="text-white font-medium">{route.departure}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-white/40 mb-1">Arrival</div>
                        <div className="text-white font-medium">{route.destination}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-white/40 mb-1">Cruising Speed</div>
                        <div className="text-white font-medium">{route.mach}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-white/40 mb-1">Flight Time</div>
                        <div className="text-white font-medium">{route.duration}</div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBook(route);
                      }}
                      className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-white text-black font-sans text-sm font-bold tracking-wide hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                      Reserve This Flight <ArrowUpRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Charter Inquiry Modal Sheet */}
      {isCharterOpen && selectedRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-8 sm:p-10 shadow-2xl text-left border border-black/10">
            <button
              onClick={() => setIsCharterOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            {charterSuccess ? (
              <div className="text-center py-12 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center mx-auto mb-6">
                  <Check size={32} />
                </div>
                <h4 className="font-serif text-3xl mb-3">Manifest Confirmed</h4>
                <p className="font-sans text-black/60 text-sm max-w-xs mx-auto">
                  Your flight coordinator will contact you directly to confirm crew assignment and boarding coordinates.
                </p>
              </div>
            ) : (
              <div>
                <p className="font-serif text-[11px] uppercase tracking-widest text-black/40 mb-1">
                  Private Charter Inquiry
                </p>
                <h3 className="font-serif text-3xl text-black mb-2">
                  {selectedRoute.title}
                </h3>
                <p className="font-sans text-sm text-black/50 mb-8 flex items-center gap-1.5">
                  <MapPin size={14} /> {selectedRoute.corridor}
                </p>

                <form onSubmit={submitCharter} className="space-y-4">
                  <div>
                    <label className="block font-sans text-xs uppercase tracking-wider text-black/60 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Lord or Lady Harrington"
                      value={charterForm.name}
                      onChange={(e) => setCharterForm({ ...charterForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-full border border-black/20 focus:border-black focus:outline-none font-sans text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs uppercase tracking-wider text-black/60 mb-1.5">
                      Private Email / Contact
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="client@sanctuary.com"
                      value={charterForm.email}
                      onChange={(e) => setCharterForm({ ...charterForm, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-full border border-black/20 focus:border-black focus:outline-none font-sans text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-sans text-xs uppercase tracking-wider text-black/60 mb-1.5">
                        <Calendar size={12} className="inline mr-1" /> Departure Date
                      </label>
                      <input
                        type="date"
                        value={charterForm.date}
                        onChange={(e) => setCharterForm({ ...charterForm, date: e.target.value })}
                        className="w-full px-4 py-3 rounded-full border border-black/20 focus:border-black focus:outline-none font-sans text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-sans text-xs uppercase tracking-wider text-black/60 mb-1.5">
                        <Users size={12} className="inline mr-1" /> Passenger Count
                      </label>
                      <select
                        value={charterForm.guests}
                        onChange={(e) => setCharterForm({ ...charterForm, guests: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-full border border-black/20 focus:border-black focus:outline-none font-sans text-sm bg-white"
                      >
                        {[1, 2, 4, 6, 8, 12].map((num) => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? 'Guest' : 'Guests'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full py-4 rounded-full bg-black text-white font-sans font-bold text-sm tracking-wider uppercase hover:opacity-90 active:scale-[0.99] transition-all"
                    >
                      Request Flight Slot
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
