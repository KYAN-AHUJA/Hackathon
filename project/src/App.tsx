import { useState, useEffect, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';

const routeCards = [
  { code: 'IM-01', title: 'Aurora line', meta: 'North Atlantic · 04:20', status: 'On course' },
  { code: 'IM-02', title: 'Solstice run', meta: 'Pacific Rim · 08:15', status: 'Boarding soon' },
  { code: 'IM-03', title: 'Mirage route', meta: 'Sahara crossing · 11:40', status: 'On course' },
];

const orbitalText = 'IMPERIUM · AVIATION · MOVE WITH THE ATMOSPHERE · ';

function App() {
  const [scrollY, setScrollY] = useState(0);
  const [activeRoute, setActiveRoute] = useState<number | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToRoutes = () => {
    document.getElementById('routes')?.scrollIntoView({ behavior: 'smooth' });
  };

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const heroProgress = Math.min(scrollY / vh, 1);
  const heroOpacity = Math.max(0, 1 - heroProgress * 1.4);
  const heroScale = 1 + heroProgress * 0.15;
  const heroTranslateY = heroProgress * 60;
  const whiteOpacity = Math.max(0, Math.min(1, (heroProgress - 0.5) * 2));

  return (
    <main className="shell">
      <div className="violet-sky" aria-hidden="true" style={{ opacity: heroOpacity }} />
      <div
        className="white-fade"
        aria-hidden="true"
        style={{ opacity: whiteOpacity }}
      />

      <section className="hero" ref={heroRef} id="top" style={{ opacity: heroOpacity }}>
        <div
          className="hero-inner"
          style={{ transform: `translateY(${heroTranslateY}px) scale(${heroScale})` }}
        >
          <div className="orbital-ring">
            <svg viewBox="0 0 400 400" className="orbital-svg">
              <defs>
                <path
                  id="orbitPath"
                  d="M 200,200 m -150,0 a 150,150 0 1,1 300,0 a 150,150 0 1,1 -300,0"
                  fill="none"
                />
              </defs>
              <text className="orbital-text">
                <textPath href="#orbitPath" startOffset="0%">
                  {orbitalText.repeat(2)}
                </textPath>
              </text>
            </svg>
          </div>

          <div className="hero-left">
            <p className="hero-tagline">Move with the atmosphere</p>
            <h1 className="hero-title">IMPERIUM</h1>
            <p className="hero-copy">
              A new kind of air travel for people who believe the journey should feel as
              extraordinary as the destination. All management done by us for your comfort.
            </p>
            <button className="hero-cta" onClick={scrollToRoutes}>
              Begin the journey <ArrowUpRight size={18} />
            </button>
          </div>
        </div>

        <button className="scroll-hint" onClick={scrollToRoutes} aria-label="Scroll to begin">
          <span>Scroll to begin</span>
          <span className="scroll-line" />
        </button>
      </section>

      <section className="routes-section" id="routes">
        <div className="routes-inner">
          <p className="section-label">The network</p>
          <h2 className="section-heading">Find your place in the sky.</h2>

          <div className="route-buttons">
            {routeCards.map((route, i) => (
              <button
                key={route.code}
                className={`route-btn ${activeRoute === i ? 'route-btn-active' : ''}`}
                onClick={() => setActiveRoute(activeRoute === i ? null : i)}
              >
                <span className="route-btn-code">{route.code}</span>
                <span className="route-btn-title">{route.title}</span>
                <span className="route-btn-meta">{route.meta}</span>
                <span className="route-btn-status">{route.status}</span>
              </button>
            ))}
          </div>

          {activeRoute !== null && (
            <div className="route-detail">
              <div className="route-detail-line" />
              <p className="route-detail-copy">
                {routeCards[activeRoute].title} — {routeCards[activeRoute].meta}.{' '}
                {routeCards[activeRoute].status}. All management done by us for your comfort.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
