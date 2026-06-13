import { useState, useEffect } from 'react';

export default function IntroLoader({ onComplete }) {
  const [exiting, setExiting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 2200);
    const doneTimer = setTimeout(() => {
      setDone(true);
      onComplete?.();
    }, 2800);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  if (done) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] bg-[#FAFAFA] flex flex-col items-center justify-center ${exiting ? 'intro-exit' : ''}`}
    >
      <svg
        viewBox="0 0 300 120"
        className="w-[320px] sm:w-[400px] h-auto"
        fill="none"
        stroke="#827A71"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Person - left side */}
        <g className="intro-person">
          {/* Head */}
          <circle cx="60" cy="35" r="12" style={{ strokeDasharray: 100, animation: 'drawLine 1s ease-out both', animationDelay: '0s' }} />
          {/* Body */}
          <line x1="60" y1="47" x2="60" y2="72" style={{ strokeDasharray: 100, animation: 'drawLine 0.8s ease-out both', animationDelay: '0.15s' }} />
          {/* Arms */}
          <line x1="60" y1="55" x2="45" y2="65" style={{ strokeDasharray: 100, animation: 'drawLine 0.6s ease-out both', animationDelay: '0.25s' }} />
          <line x1="60" y1="55" x2="75" y2="62" style={{ strokeDasharray: 100, animation: 'drawLine 0.6s ease-out both', animationDelay: '0.3s' }} />
          {/* Legs */}
          <line x1="60" y1="72" x2="48" y2="90" style={{ strokeDasharray: 100, animation: 'drawLine 0.6s ease-out both', animationDelay: '0.35s' }} />
          <line x1="60" y1="72" x2="72" y2="90" style={{ strokeDasharray: 100, animation: 'drawLine 0.6s ease-out both', animationDelay: '0.4s' }} />
        </g>

        {/* Briefcase - right side */}
        <g className="intro-briefcase">
          {/* Case body */}
          <rect x="215" y="42" width="30" height="22" rx="3" style={{ strokeDasharray: 200, animation: 'drawLine 1s ease-out both', animationDelay: '0.3s' }} />
          {/* Handle */}
          <path d="M225 42 L225 37 Q225 33 229 33 L231 33 Q235 33 235 37 L235 42" style={{ strokeDasharray: 200, animation: 'drawLine 0.8s ease-out both', animationDelay: '0.5s' }} />
          {/* Clasp */}
          <line x1="227" y1="53" x2="233" y2="53" style={{ strokeDasharray: 100, animation: 'drawLine 0.4s ease-out both', animationDelay: '0.65s' }} />
        </g>

        {/* Connection line from person's hand to briefcase */}
        <g className="intro-connection">
          {/* Right arm extends into connection */}
          <path
            d="M75 62 Q95 58 110 55 Q130 51 150 53"
            style={{ strokeDasharray: 200, animation: 'drawLine 0.8s ease-out both', animationDelay: '0.8s' }}
          />
          {/* Connection from briefcase side */}
          <path
            d="M215 53 Q195 51 175 53 Q165 54 150 53"
            style={{ strokeDasharray: 200, animation: 'drawLine 0.8s ease-out both', animationDelay: '0.8s' }}
          />
          {/* Connection node dots */}
          <circle cx="110" cy="55" r="2" fill="#C1B6A9" stroke="none" style={{ animation: 'fadeInBlock 0.4s ease-out both', animationDelay: '1.1s' }} />
          <circle cx="190" cy="53" r="2" fill="#C1B6A9" stroke="none" style={{ animation: 'fadeInBlock 0.4s ease-out both', animationDelay: '1.1s' }} />
        </g>

        {/* Center spark/pulse */}
        <circle
          cx="150"
          cy="53"
          r="5"
          fill="#C1B6A9"
          stroke="none"
          className="intro-spark"
          style={{ animation: 'introPulse 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both', animationDelay: '1.3s' }}
        />
        <circle
          cx="150"
          cy="53"
          r="3"
          fill="#827A71"
          stroke="none"
          style={{ animation: 'fadeInBlock 0.3s ease-out both', animationDelay: '1.3s' }}
        />
      </svg>

      {/* Brand text */}
      <div className="mt-8 intro-text" style={{ animation: 'introFadeIn 0.6s ease-out both', animationDelay: '1.5s' }}>
        <div className="flex items-center gap-1">
          <span className="text-[#C1B6A9] font-light tracking-widest text-2xl uppercase">Task</span>
          <span className="text-[#827A71] font-normal text-2xl tracking-tight -ml-1">Force</span>
        </div>
        <p className="text-sm text-stone-400 font-montserrat font-light tracking-wider text-center mt-1">Connecting People to Opportunity</p>
      </div>
    </div>
  );
}
