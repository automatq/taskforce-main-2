import { useEffect, useRef } from 'react';

export default function Features() {
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const card1Ref = useRef(null);
  const card2Ref = useRef(null);
  const card3Ref = useRef(null);

  useEffect(() => {
    let animationFrameId;

    const updateScroll = () => {
      if (sectionRef.current && card1Ref.current && card2Ref.current && card3Ref.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const winH = window.innerHeight;

        const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
        let rawP = -rect.top / (rect.height - winH);
        let p = clamp(rawP, 0, 1);
        let easeP = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

        if (headingRef.current) {
          let hProg = clamp(rawP * 3, 0, 1);
          headingRef.current.style.opacity = hProg;
          headingRef.current.style.transform = `translateY(${20 * (1 - hProg)}px)`;
        }

        const isDesktop = window.innerWidth >= 1024;
        if (isDesktop) {
          card1Ref.current.style.transform = `translateX(calc(${-15 - 105 * easeP}%)) rotate(${-3 - 9 * easeP}deg) translateY(${10 * easeP}px)`;
          card2Ref.current.style.transform = `translateY(${-15 * easeP}px) scale(${1 + 0.05 * easeP})`;
          card3Ref.current.style.transform = `translateX(calc(${15 + 105 * easeP}%)) rotate(${3 + 9 * easeP}deg) translateY(${10 * easeP}px)`;
        } else {
          card1Ref.current.style.transform = `translateY(calc(${-5 - 55 * easeP}%)) rotate(${-2 - 4 * easeP}deg) scale(${1 - 0.05 * easeP})`;
          card2Ref.current.style.transform = `scale(${1 + 0.02 * easeP})`;
          card3Ref.current.style.transform = `translateY(calc(${5 + 55 * easeP}%)) rotate(${2 + 4 * easeP}deg) scale(${1 - 0.05 * easeP})`;
        }
      }
      animationFrameId = requestAnimationFrame(updateScroll);
    };

    animationFrameId = requestAnimationFrame(updateScroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <section ref={sectionRef} id="employers" className="h-[250vh] relative bg-[#FAFAFA] border-t border-stone-200 z-10">
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-stone-100/50 blur-3xl rounded-full opacity-60 pointer-events-none"></div>

        <div ref={headingRef} id="features-heading" className="relative z-40 text-center mb-10 lg:mb-16 opacity-0 translate-y-8 will-change-transform max-w-4xl mx-auto">
          <div className="inline-flex bg-white border-stone-200 border rounded-full mb-8 pt-1 pr-3 pb-1 pl-3 shadow-sm gap-x-2 items-center">
            <span className="w-2 h-2 rounded-full bg-[#C1B6A9]"></span>
            <span className="text-sm font-normal text-stone-600">For Employers</span>
            <span className="w-2 h-2 rounded-full bg-[#C1B6A9]"></span>
            <span className="text-sm font-normal text-stone-600">For Job Seekers</span>
          </div>

          <h2 className="text-5xl lg:text-7xl leading-[1.05] tracking-tight flex flex-col font-normal items-center text-center">
            <span className="font-playfair text-[#2C2B29]">We've Got You</span>
            <span className="font-playfair italic text-[#8F877C]">Covered</span>
          </h2>
        </div>

        <div className="relative w-full max-w-[320px] sm:max-w-[360px] h-[380px] lg:h-[460px] z-30 perspective-normal mt-4 lg:mt-0">

          <div ref={card1Ref} className="absolute inset-0 bg-white rounded-[2rem] p-8 lg:p-10 border border-stone-200 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] flex flex-col will-change-transform origin-bottom z-10">
            <div className="w-14 h-14 rounded-2xl border border-stone-100 bg-[#FAFAFA] flex items-center justify-center mb-6 shadow-sm">
              <iconify-icon icon="solar:magnifer-linear" className="text-2xl text-[#827A71]"></iconify-icon>
            </div>
            <h3 className="text-2xl lg:text-3xl font-normal text-stone-900 tracking-tight mb-4 mt-auto">Search & Screen</h3>
            <p className="leading-relaxed text-sm lg:text-base text-stone-500 font-montserrat font-light">
              We do the searching for you. Every candidate is screened for skills, qualifications, and behavioural fit before you ever meet them.
            </p>
          </div>

          <div ref={card3Ref} className="absolute inset-0 bg-white rounded-[2rem] p-8 lg:p-10 border border-stone-200 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] flex flex-col will-change-transform origin-bottom z-20">
            <div className="w-14 h-14 rounded-2xl border border-stone-100 bg-[#FAFAFA] flex items-center justify-center mb-6 shadow-sm">
              <iconify-icon icon="solar:rocket-2-linear" className="text-2xl text-[#827A71]"></iconify-icon>
            </div>
            <h3 className="text-2xl lg:text-3xl font-normal text-stone-900 tracking-tight mb-4 mt-auto">Start Immediately</h3>
            <p className="leading-relaxed text-sm lg:text-base text-stone-500 font-montserrat font-light">
              Looking for work? Get started with us and you can begin working right away. Weekly pay, flexible schedules, and real opportunities.
            </p>
          </div>

          <div ref={card2Ref} className="absolute inset-0 bg-[#2C2B29] rounded-[2rem] p-8 lg:p-10 border border-[#3A3936] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.4)] flex flex-col will-change-transform origin-bottom z-30">
            <div className="w-14 h-14 rounded-2xl border border-[#3A3936] bg-[#1F1E1D] flex items-center justify-center mb-6 shadow-inner">
              <iconify-icon icon="solar:users-group-rounded-linear" className="text-2xl text-[#C1B6A9]"></iconify-icon>
            </div>
            <h3 className="text-2xl lg:text-3xl font-normal text-white tracking-tight mb-4 mt-auto">Perfect Match</h3>
            <p className="leading-relaxed text-sm lg:text-base text-stone-300 font-montserrat font-light">
              We match your personality to the right job. The best matches make employers and employees happiest — that's been our philosophy from day one.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
