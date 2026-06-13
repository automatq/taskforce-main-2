import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from './useReveal';
import clsx from 'clsx';

export default function LiveQuote() {
  const sectionRef = useRef(null);
  const mockupScrollRef = useRef(null);
  const mockupViewportRef = useRef(null);
  const quoteHeaderRef = useRef(null);

  const animItemsRef = useRef([]);
  const fastItemsRef = useRef([]);

  const lineRef = useRef(null);
  const [activeMilestones, setActiveMilestones] = useState({ 1: false, 2: false, 3: false });
  const [lineActive, setLineActive] = useState(false);
  const revealRef = useReveal();

  let currentPayProg = 0;

  useEffect(() => {
    let animationFrameId;

    const updateScroll = () => {
      const windowHeight = window.innerHeight;
      const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
      const mapRange = (val, inMin, inMax, outMin, outMax) => outMin + ((clamp(val, inMin, inMax) - inMin) / (inMax - inMin)) * (outMax - outMin);

      if (sectionRef.current && mockupScrollRef.current && mockupViewportRef.current) {
        const pRect = sectionRef.current.getBoundingClientRect();
        let targetPayProg = Math.max(0, Math.min(1, -pRect.top / (pRect.height - windowHeight)));
        currentPayProg += (targetPayProg - currentPayProg) * 0.05;

        const prog = currentPayProg;

        if (quoteHeaderRef.current) {
          const qhY = mapRange(prog, 0.0, 0.1, -20, 0);
          const qhO = mapRange(prog, 0.0, 0.1, 0, 1);
          quoteHeaderRef.current.style.transform = `translateY(${qhY}px)`;
          quoteHeaderRef.current.style.opacity = qhO;
        }

        const maxScroll = mockupScrollRef.current.scrollHeight - mockupViewportRef.current.clientHeight;
        if (maxScroll > 0) {
          const scrollY = mapRange(prog, 0.1, 0.9, 0, maxScroll + 50);
          mockupScrollRef.current.style.transform = `translateY(${-scrollY}px)`;
        }

        animItemsRef.current.forEach((item, idx) => {
          if (!item) return;
          const start = 0.05 + (idx * 0.05);
          const end = start + 0.1;
          const itemP = clamp(mapRange(prog, start, end, 0, 1), 0, 1);
          const dir = item.dataset.anim === 'left' ? -20 : (item.dataset.anim === 'right' ? 20 : 0);
          const yDir = item.dataset.anim === 'summary' ? 20 : 0;
          item.style.opacity = itemP;
          item.style.transform = `translate(${dir * (1 - itemP)}px, ${yDir * (1 - itemP)}px) scale(${0.95 + (0.05 * itemP)})`;
        });

        const fStart = 0.15;
        const fEnd = 0.35;
        const fProg = clamp(mapRange(prog, fStart, fEnd, 0, 1), 0, 1);
        fastItemsRef.current.forEach((item, idx) => {
          if (!item) return;
          const step = 1 / fastItemsRef.current.length;
          const itemStart = idx * step;
          const itemP = clamp(mapRange(fProg, itemStart, itemStart + step * 2, 0, 1), 0, 1);
          item.style.opacity = itemP;
          item.style.transform = `translateY(${15 * (1 - itemP)}px)`;
        });

        if (lineRef.current) {
          const mStart = 0.45;
          const mEnd = 0.85;
          const mProg = clamp(mapRange(prog, mStart, mEnd, 0, 1), 0, 1);

          lineRef.current.style.height = `${mProg * 100}%`;

          setLineActive(mProg > 0.05);
          setActiveMilestones({
            1: mProg > 0.05,
            2: mProg > 0.45,
            3: mProg > 0.85
          });
        }
      }
      animationFrameId = requestAnimationFrame(updateScroll);
    };

    animationFrameId = requestAnimationFrame(updateScroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <section ref={sectionRef} id="job-seekers" className="h-[350vh] relative bg-[#FAFAFA] border-t border-stone-200 z-10">
      <div className="sticky top-0 min-h-screen py-24 flex flex-col justify-center overflow-hidden w-full">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full blur-[80px] opacity-60 pointer-events-none"></div>

        <div className="max-w-7xl w-full mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

            <div className="order-2 lg:order-1" ref={revealRef}>
              <div className="cta-bounce-enter inline-flex items-center gap-2 mb-6">
                <iconify-icon icon="solar:routing-2-linear" className="text-3xl text-[#827A71]" strokeWidth="1.5"></iconify-icon>
                <span className="uppercase text-xs font-medium tracking-widest text-[#827A71] font-montserrat">How It Works</span>
              </div>

              <h2 className="text-5xl lg:text-6xl font-normal mb-8 leading-[1.05] tracking-tight flex flex-col">
                <span className="cta-bounce-enter block text-[#2C2B29] font-playfair">Register once.</span>
                <span className="cta-bounce-enter block text-[#8F877C] font-playfair">We handle</span>
                <span className="cta-bounce-enter block font-playfair italic text-[#C8C2B7]">the rest.</span>
              </h2>

              <p className="cta-bounce-enter text-xl text-stone-500 font-light leading-relaxed mb-10 font-montserrat">
                Whether you're looking for work or looking to hire, our process is simple and personal. We take the time to understand your needs and match you with the perfect fit.
              </p>

              <ul className="space-y-4 mb-10 text-stone-600">
                <li className="cta-bounce-enter tick-item flex items-center gap-3">
                  <iconify-icon icon="solar:check-circle-linear" className="text-[#827A71] text-2xl" strokeWidth="1.5"></iconify-icon>
                  <span className="text-lg font-light font-montserrat">Start working right away</span>
                </li>
                <li className="cta-bounce-enter tick-item flex items-center gap-3">
                  <iconify-icon icon="solar:check-circle-linear" className="text-[#827A71] text-2xl" strokeWidth="1.5"></iconify-icon>
                  <span className="text-lg font-light font-montserrat">Free WHMIS & Health and Safety training</span>
                </li>
                <li className="cta-bounce-enter tick-item flex items-center gap-3">
                  <iconify-icon icon="solar:check-circle-linear" className="text-[#827A71] text-2xl" strokeWidth="1.5"></iconify-icon>
                  <span className="text-lg font-light font-montserrat">Weekly pay from day one</span>
                </li>
              </ul>
            </div>

            <div className="order-1 lg:order-2 relative" id="process-section">
              <div className="bg-white/80 backdrop-blur-2xl border border-stone-200 rounded-[2rem] shadow-2xl overflow-hidden relative z-10 flex flex-col h-[550px]">

                <div ref={quoteHeaderRef} className="bg-[#F5F4F2] p-6 border-b border-stone-200 flex justify-between items-end relative z-30 shadow-sm opacity-0 will-change-transform">
                  <div>
                    <p className="text-xs font-medium tracking-widest uppercase text-stone-500 mb-1">Your Journey</p>
                    <h3 className="text-2xl font-normal text-stone-900 tracking-tight">Getting Started</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-widest mb-1">Serving</p>
                    <p className="text-xl font-normal text-stone-900 tracking-tight">Guelph & Area</p>
                  </div>
                </div>

                <div className="flex-1 relative overflow-hidden bg-white/30" ref={mockupViewportRef}>
                  <div ref={mockupScrollRef} className="absolute top-0 left-0 w-full p-6 pb-6 flex flex-col gap-4 will-change-transform">

                    <div ref={el => animItemsRef.current[0] = el} className="checkout-anim-item opacity-0 flex gap-4 items-center p-3 rounded-2xl bg-white border border-stone-100 shadow-sm" data-anim="left">
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[#FAFAFA] flex items-center justify-center border border-stone-200">
                        <iconify-icon icon="solar:user-plus-linear" className="text-2xl text-[#827A71]" strokeWidth="1.5"></iconify-icon>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-normal text-stone-900 text-base tracking-tight">Register With Us</h4>
                        <p className="text-sm text-stone-500 mt-0.5 font-light">Drop by or call to get started</p>
                      </div>
                    </div>

                    <div ref={el => animItemsRef.current[1] = el} className="checkout-anim-item opacity-0 flex gap-4 items-center p-3 rounded-2xl bg-white border border-stone-100 shadow-sm" data-anim="right">
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[#FAFAFA] flex items-center justify-center border border-stone-200">
                        <iconify-icon icon="solar:clipboard-check-linear" className="text-2xl text-[#827A71]" strokeWidth="1.5"></iconify-icon>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-normal text-stone-900 text-base tracking-tight">Skills Assessment</h4>
                        <p className="text-sm text-stone-500 mt-0.5 font-light">We review your experience & qualifications</p>
                      </div>
                    </div>

                    <div className="flex flex-col mt-2 px-1">
                      {[
                        { icon: 'shield-check-linear', w1: 'w-24', w2: 'w-8', label: 'Background Check' },
                        { icon: 'diploma-verified-linear', w1: 'w-32', w2: 'w-10', label: 'Safety Training' },
                        { icon: 'heart-pulse-linear', w1: 'w-20', w2: 'w-12', label: 'Behaviour Analysis' },
                        { icon: 'users-group-rounded-linear', w1: 'w-28', w2: 'w-8', label: 'Personality Profile' },
                        { icon: 'document-text-linear', w1: 'w-24', w2: 'w-10', label: 'Resume Review' },
                        { icon: 'star-linear', w1: 'w-20', w2: 'w-8', label: 'Reference Check' }
                      ].map((item, i) => (
                        <div key={i} ref={el => fastItemsRef.current[i] = el} className="fast-item opacity-0 flex items-center gap-3 p-2 bg-white rounded-xl border border-stone-100 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                          <div className="w-8 h-8 bg-[#F5F4F2] rounded-lg border border-stone-200 flex items-center justify-center text-stone-400">
                            <iconify-icon icon={`solar:${item.icon}`} className="text-sm"></iconify-icon>
                          </div>
                          <div className={`h-2 ${item.w1} bg-stone-100 rounded-full`}></div>
                          <div className="flex-1"></div>
                          <div className={`h-2 ${item.w2} bg-stone-100 rounded-full`}></div>
                        </div>
                      ))}
                    </div>

                    <div ref={el => animItemsRef.current[2] = el} className="checkout-anim-item opacity-0 flex gap-4 items-center p-3 rounded-2xl bg-white border border-stone-100 shadow-sm relative z-10" data-anim="summary">
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[#FAFAFA] flex items-center justify-center text-[#827A71] border border-stone-200">
                        <iconify-icon icon="solar:layers-linear" className="text-2xl" strokeWidth="1.5"></iconify-icon>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-normal text-stone-900 text-base tracking-tight">Full Screening Complete</h4>
                        <p className="text-sm text-stone-500 mt-0.5 font-light">Ready for placement</p>
                      </div>
                    </div>

                    <div className="mt-8 relative pt-2 pb-2" id="milestones-container">
                      <div className="absolute left-6 top-4 bottom-8 w-px bg-stone-200">
                        <div ref={lineRef} id="milestone-progress-line" className={clsx("w-full bg-[#827A71] h-0 origin-top", lineActive && "drawing-active")}></div>
                      </div>

                      <div className={clsx("milestone pl-16 relative mb-12", activeMilestones[1] && "active")}>
                        <div className="absolute left-[8px] top-0 w-8 h-8 rounded-full border-2 border-stone-200 bg-white milestone-dot z-10 flex items-center justify-center text-stone-400 shadow-sm">
                          <iconify-icon icon="solar:magnifer-linear" className="text-lg" strokeWidth="1.5"></iconify-icon>
                        </div>
                        <div className="milestone-content">
                          <span className="inline-block text-[10px] font-bold tracking-widest uppercase text-stone-500 bg-stone-200 rounded-full px-2.5 py-0.5 mb-1.5 milestone-badge">Step 1</span>
                          <h4 className="text-xl text-stone-900 font-normal tracking-tight mt-0.5">We Find Your Match</h4>
                        </div>
                      </div>

                      <div className={clsx("milestone pl-16 relative mb-12", activeMilestones[2] && "active")}>
                        <div className="absolute left-[8px] top-0 w-8 h-8 rounded-full border-2 border-stone-200 bg-white milestone-dot z-10 flex items-center justify-center text-stone-400 shadow-sm">
                          <iconify-icon icon="solar:diploma-verified-linear" className="text-lg" strokeWidth="1.5"></iconify-icon>
                        </div>
                        <div className="milestone-content">
                          <span className="inline-block text-[10px] font-bold tracking-widest uppercase text-stone-500 bg-stone-200 rounded-full px-2.5 py-0.5 mb-1.5 milestone-badge">Step 2</span>
                          <h4 className="text-xl text-stone-900 font-normal tracking-tight mt-0.5">Training & Preparation</h4>
                        </div>
                      </div>

                      <div className={clsx("milestone pl-16 relative", activeMilestones[3] && "active")}>
                        <div className="absolute left-[8px] top-0 w-8 h-8 rounded-full border-2 border-stone-200 bg-white milestone-dot z-10 flex items-center justify-center text-stone-400 shadow-sm">
                          <iconify-icon icon="solar:hand-shake-linear" className="text-lg" strokeWidth="1.5"></iconify-icon>
                        </div>
                        <div className="milestone-content" style={{ perspective: '1000px' }}>
                          <span className="inline-block text-[10px] font-bold tracking-widest uppercase text-stone-500 bg-stone-200 rounded-full px-2.5 py-0.5 mb-1.5 milestone-badge">Step 3</span>
                          <h4 className="text-xl text-stone-900 font-normal tracking-tight mt-0.5">Start Working</h4>

                          <div className="finance-card-wrapper mt-5">
                            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xl relative cursor-default flex flex-col gap-5">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#F5F4F2] border border-stone-200 flex items-center justify-center">
                                  <iconify-icon icon="solar:star-shine-linear" className="text-2xl text-[#827A71]" strokeWidth="1.5"></iconify-icon>
                                </div>
                                <div>
                                  <h4 className="font-normal text-stone-900 tracking-tight text-lg">You're Placed!</h4>
                                  <p className="text-sm text-stone-500 font-light mt-1">Enjoy weekly pay, flexible scheduling, and ongoing support from the Task Force team.</p>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 text-sm text-stone-600 font-light font-montserrat">
                                <div className="flex items-center gap-2">
                                  <iconify-icon icon="solar:check-circle-linear" className="text-[#827A71] text-lg" strokeWidth="1.5"></iconify-icon>
                                  <span>Flexible hours to fit your life</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <iconify-icon icon="solar:check-circle-linear" className="text-[#827A71] text-lg" strokeWidth="1.5"></iconify-icon>
                                  <span>Test drive new career paths</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <iconify-icon icon="solar:check-circle-linear" className="text-[#827A71] text-lg" strokeWidth="1.5"></iconify-icon>
                                  <span>Temp, temp-to-perm, or permanent</span>
                                </div>
                              </div>

                              <Link to="/jobs" className="w-full bg-[#817872] text-white py-3.5 rounded-xl font-normal tracking-widest uppercase text-sm hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(129,120,114,0.3)] hover:shadow-[0_6px_16px_rgba(28,25,23,0.4)] transform hover:-translate-y-0.5 duration-300 group">
                                Apply Now
                                <iconify-icon icon="solar:arrow-right-linear" className="text-lg group-hover:translate-x-1 transition-transform" strokeWidth="1.5"></iconify-icon>
                              </Link>
                            </div>
                          </div>

                        </div>
                      </div>

                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white/95 to-transparent pointer-events-none z-20 transition-opacity duration-300 ease-out"></div>
                </div>
              </div>

              <div className="absolute -bottom-10 -left-10 w-full h-full bg-[#E7E5E4]/60 rounded-[2rem] -z-10 transform -rotate-3 blur-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
