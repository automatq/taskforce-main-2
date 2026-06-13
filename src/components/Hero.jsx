import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from './useReveal';

export default function Hero() {
  const revealRef = useReveal();
  const [hoverKey, setHoverKey] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    let loopInterval;
    if (isHovering) {
      setHoverKey(prev => prev + 1);
      loopInterval = setInterval(() => {
        setHoverKey(prev => prev + 1);
      }, 3200);
    }
    return () => clearInterval(loopInterval);
  }, [isHovering]);

  return (
    <section className="lg:px-8 lg:pt-32 lg:pb-32 flex flex-col lg:flex-row gap-16 max-w-7xl mr-auto ml-auto pt-24 pr-6 pb-24 pl-6 relative gap-x-16 gap-y-16 items-center">
      <div className="flex-1 w-full z-10 relative">
        <div className="inline-flex gap-2 bg-white/50 border-stone-200 border rounded-full mb-8 pt-1 pr-3 pb-1 pl-3 backdrop-blur-sm gap-x-2 gap-y-2 items-center">
          <span className="w-2 h-2 rounded-full bg-[#C1B6A9]"></span>
          <span className="text-base font-normal text-stone-600">Guelph's Trusted Staffing Agency — Over 23 Years Strong</span>
        </div>

        <h1 ref={revealRef} className="lg:text-8xl leading-[1.05] text-6xl tracking-tight mb-8 flex flex-col font-normal">
          <span className="cta-bounce-enter block text-[#2C2B29] font-playfair">Find Talent.</span>
          <span className="cta-bounce-enter block text-[#8F877C] font-playfair">Find Work.</span>
          <span className="cta-bounce-enter block font-playfair italic text-[#C8C2B7]">Task Force.</span>
        </h1>

        <p className="leading-relaxed text-2xl font-light text-stone-500 font-montserrat max-w-2xl mb-10">We match the right people with the right jobs. From screening and training to personality matching — we've got employers and job seekers covered across Guelph and surrounding areas.</p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link to="/jobs" className="hover:bg-stone-800 transition-all sm:w-auto text-xl font-normal text-white bg-[#817872] w-full rounded-full pt-4 pr-8 pb-4 pl-8 shadow-xl text-center">Search Jobs Now</Link>
          <a href="#employers" className="sm:w-auto hover:text-stone-900 transition-colors flex hover:border-stone-200 text-xl font-normal text-stone-600 w-full border-transparent border rounded-full pt-4 pr-8 pb-4 pl-8 gap-x-2 gap-y-2 items-center justify-center">Looking to Hire?</a>
        </div>
      </div>

      <div className="flex-1 w-full max-w-lg lg:max-w-none relative aspect-square lg:aspect-[4/3] flex items-center justify-center">
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" style={{ backgroundImage: "linear-gradient(to right, rgba(231, 229, 228, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(231, 229, 228, 0.4) 1px, transparent 1px)", backgroundSize: "4rem 4rem" }}></div>

        <div
          className="relative w-full h-full flex items-center justify-center cursor-crosshair"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <svg key={hoverKey} viewBox="0 0 400 400" className="w-[120%] h-[120%] lg:w-[140%] lg:h-[140%] text-stone-200 drop-shadow-sm" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
            {/* Network/connection lines representing staffing connections */}
            <line x1="150" y1="0" x2="150" y2="175" strokeWidth="1" className="text-stone-200" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both", animationDelay: "0.00s" }}></line>
            <line x1="250" y1="40" x2="250" y2="120" strokeWidth="1" className="text-stone-200" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both", animationDelay: "0.05s" }}></line>
            <line x1="300" y1="80" x2="300" y2="200" strokeWidth="1" className="text-stone-200" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both", animationDelay: "0.10s" }}></line>
            <line x1="100" y1="100" x2="100" y2="260" strokeWidth="1" className="text-stone-200" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both", animationDelay: "0.15s" }}></line>

            {/* Central connected blocks - representing people and positions linking together */}
            <g transform="translate(200, 200)">
              <polygon points="0,0 -50,-28.87 0,-57.74 50,-28.87" fill="#F5F5F4" stroke="currentColor" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both, fadeInBlock 2s ease-out both", animationDelay: "0.20s" }}></polygon>
              <polygon points="-50,-28.87 -50,28.87 0,57.74 0,0" fill="#FFFFFF" stroke="currentColor" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both, fadeInBlock 2s ease-out both", animationDelay: "0.25s" }}></polygon>
              <polygon points="0,0 0,57.74 50,28.87 50,-28.87" fill="#E7E5E4" stroke="currentColor" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both, fadeInBlock 2s ease-out both", animationDelay: "0.30s" }}></polygon>

              <g transform="translate(-50, 86.6)">
                <polygon points="0,0 -50,-28.87 0,-57.74 50,-28.87" fill="#FAFAFA" stroke="currentColor" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both, fadeInBlock 2s ease-out both", animationDelay: "0.35s" }}></polygon>
                <polygon points="-50,-28.87 -50,28.87 0,57.74 0,0" fill="#F5F5F4" stroke="currentColor" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both, fadeInBlock 2s ease-out both", animationDelay: "0.40s" }}></polygon>
                <polygon points="0,0 0,57.74 50,28.87 50,-28.87" fill="#FFFFFF" stroke="currentColor" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both, fadeInBlock 2s ease-out both", animationDelay: "0.45s" }}></polygon>
              </g>

              <g transform="translate(100, 28.87)">
                <polygon points="0,0 -50,-28.87 0,-57.74 50,-28.87" fill="#FFFFFF" stroke="currentColor" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both, fadeInBlock 2s ease-out both", animationDelay: "0.50s" }}></polygon>
                <polygon points="-50,-28.87 -50,28.87 0,57.74 0,0" fill="#E7E5E4" stroke="currentColor" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both, fadeInBlock 2s ease-out both", animationDelay: "0.55s" }}></polygon>
                <polygon points="0,0 0,57.74 50,28.87 50,-28.87" fill="#F5F5F4" stroke="currentColor" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both, fadeInBlock 2s ease-out both", animationDelay: "0.60s" }}></polygon>
              </g>

              <g transform="translate(50, -86.6)">
                <polygon points="-50,-28.87 -50,28.87 0,57.74 0,0" fill="#F5F5F4" stroke="currentColor" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both, fadeInBlock 2s ease-out both", animationDelay: "0.65s" }}></polygon>
                <polygon points="0,0 0,57.74 50,28.87 50,-28.87" fill="#FFFFFF" stroke="currentColor" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both, fadeInBlock 2s ease-out both", animationDelay: "0.70s" }}></polygon>
              </g>

               <g transform="translate(-100, -28.87)">
                <polygon points="0,0 -50,-28.87 0,-57.74 50,-28.87" fill="#FFFFFF" stroke="currentColor" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both, fadeInBlock 2s ease-out both", animationDelay: "0.75s" }}></polygon>
                <polygon points="-50,-28.87 -50,28.87 0,57.74 0,0" fill="#FAFAFA" stroke="currentColor" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both, fadeInBlock 2s ease-out both", animationDelay: "0.80s" }}></polygon>
                <polygon points="0,0 0,57.74 50,28.87 50,-28.87" fill="#E7E5E4" stroke="currentColor" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both, fadeInBlock 2s ease-out both", animationDelay: "0.85s" }}></polygon>
              </g>
            </g>

            <polyline points="50,258.87 100,287.74 150,258.87 150,201.13" fill="none" strokeWidth="1" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both", animationDelay: "0.90s" }}></polyline>
            <polyline points="250,258.87 300,287.74 350,258.87 350,201.13" fill="none" strokeWidth="1" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both", animationDelay: "0.95s" }}></polyline>
            <line x1="200" y1="257.74" x2="200" y2="350" strokeWidth="1" className="text-stone-200" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both", animationDelay: "1.00s" }}></line>
            <line x1="300" y1="287.74" x2="300" y2="380" strokeWidth="1" className="text-stone-200" style={{ strokeDasharray: 1000, animation: "drawLine 2s ease-out both", animationDelay: "1.05s" }}></line>
          </svg>
        </div>
      </div>
    </section>
  );
}
