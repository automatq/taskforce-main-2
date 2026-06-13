import { useEffect, useRef } from 'react';
import { useReveal } from './useReveal';

export default function Gallery() {
  const sectionRef = useRef(null);
  const itemsRef = useRef([]);
  const revealRef = useReveal();
  let currentParallaxProg = -1;

  useEffect(() => {
    let animationFrameId;

    const updateScroll = () => {
      const windowHeight = window.innerHeight;
      if (sectionRef.current && itemsRef.current.length > 0) {
        const rect = sectionRef.current.getBoundingClientRect();

        if (rect.top <= windowHeight && rect.bottom >= 0) {
          const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
          let targetProg = -rect.top / (rect.height - windowHeight);
          targetProg = clamp(targetProg, 0, 1);

          if (currentParallaxProg === -1) currentParallaxProg = targetProg;

          currentParallaxProg += (targetProg - currentParallaxProg) * 0.08;

          itemsRef.current.forEach(item => {
            if (!item) return;
            const speed = parseFloat(item.dataset.speed || "0");
            const rot = parseFloat(item.dataset.rotation || "0");

            const travelDistance = windowHeight * 2.2;
            const yOffset = (0.5 - currentParallaxProg) * travelDistance * speed;

            item.style.transform = `translateY(${yOffset}px) rotate(${rot}deg)`;
          });
        }
      }
      animationFrameId = requestAnimationFrame(updateScroll);
    };

    animationFrameId = requestAnimationFrame(updateScroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <section ref={sectionRef} id="jobs" className="relative h-[250vh] bg-[#161514] border-y border-[#2C2B29]">
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">

        <div className="bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2C2B29]/30 via-[#161514] to-[#11100F] absolute top-0 right-0 bottom-0 left-0"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C1B6A9]/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div ref={revealRef} id="gallery-content-wrapper" className="relative z-20 text-center p-8 lg:p-14 rounded-3xl bg-[#2C2B29]/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.3)] max-w-2xl mx-6">
          <span className="cta-bounce-enter uppercase block text-sm font-semibold text-[#C1B6A9] tracking-[0.2em] font-montserrat mb-6">Industries We Serve</span>
          <h2 className="text-5xl lg:text-7xl leading-[1.05] tracking-tight mb-8 flex flex-col font-normal items-center">
            <span className="cta-bounce-enter block text-white font-playfair">Manufacturing.</span>
            <span className="cta-bounce-enter block text-[#C1B6A9] font-playfair">Warehousing.</span>
            <span className="cta-bounce-enter block font-playfair italic text-[#827A71]">And beyond.</span>
          </h2>
          <p className="cta-bounce-enter text-xl lg:text-2xl text-stone-300 font-montserrat font-light leading-relaxed max-w-lg mx-auto">From factory floors to front offices, we place skilled workers across dozens of industries throughout Guelph and surrounding areas.</p>
        </div>

        <div ref={el => itemsRef.current[0] = el} className="parallax-item absolute w-64 lg:w-80 p-2 bg-[#2C2B29]/30 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl will-change-transform z-10" style={{top: '-5%', left: '8%'}} data-speed="0.8" data-rotation="-6deg">
          <img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800" alt="Construction Workers" className="w-full h-auto rounded-xl object-cover aspect-[4/5]"/>
        </div>
        <div ref={el => itemsRef.current[1] = el} className="parallax-item absolute w-60 lg:w-72 p-2 bg-[#2C2B29]/30 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl will-change-transform z-30 hidden md:block" style={{top: '15%', right: '12%'}} data-speed="0.6" data-rotation="4deg">
          <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800" alt="Manufacturing" className="w-full h-auto rounded-xl object-cover aspect-video"/>
        </div>
        <div ref={el => itemsRef.current[2] = el} className="parallax-item absolute w-40 lg:w-56 p-2 bg-[#2C2B29]/30 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl will-change-transform z-0" style={{top: '80%', left: '30%'}} data-speed="-0.5" data-rotation="-3deg">
          <img src="https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&q=80&w=800" alt="Office Work" className="w-full h-auto rounded-xl object-cover aspect-square"/>
        </div>
        <div ref={el => itemsRef.current[3] = el} className="parallax-item absolute w-52 lg:w-64 p-2 bg-[#2C2B29]/30 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl will-change-transform z-0 hidden lg:block" style={{top: '90%', right: '28%'}} data-speed="-0.7" data-rotation="5deg">
          <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800" alt="Warehouse" className="w-full h-auto rounded-xl object-cover aspect-[4/5]"/>
        </div>
        <div ref={el => itemsRef.current[4] = el} className="parallax-item absolute w-48 lg:w-64 p-2 bg-[#2C2B29]/30 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl will-change-transform z-10" style={{top: '75%', left: '45%'}} data-speed="-0.3" data-rotation="-2deg">
          <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=800" alt="Team Meeting" className="w-full h-auto rounded-xl object-cover aspect-[4/3]"/>
        </div>
        <div ref={el => itemsRef.current[5] = el} className="parallax-item absolute w-56 lg:w-72 p-2 bg-[#2C2B29]/30 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl will-change-transform z-30 hidden sm:block" style={{top: '-15%', left: '2%'}} data-speed="1.2" data-rotation="8deg">
          <img src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=800" alt="Professional Team" className="w-full h-auto rounded-xl object-cover aspect-[3/4]"/>
        </div>
        <div ref={el => itemsRef.current[6] = el} className="parallax-item absolute w-40 lg:w-56 p-2 bg-[#2C2B29]/30 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl will-change-transform z-10 hidden md:block" style={{top: '0%', left: '65%'}} data-speed="0.9" data-rotation="-7deg">
          <img src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&q=80&w=800" alt="Forklift Operation" className="w-full h-auto rounded-xl object-cover aspect-square"/>
        </div>
        <div ref={el => itemsRef.current[7] = el} className="parallax-item absolute w-52 lg:w-64 p-2 bg-[#2C2B29]/30 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl will-change-transform z-40" style={{top: '-20%', right: '8%'}} data-speed="1.5" data-rotation="3deg">
          <img src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=800" alt="Administrative Work" className="w-full h-auto rounded-xl object-cover aspect-[4/5]"/>
        </div>
        <div ref={el => itemsRef.current[8] = el} className="parallax-item absolute w-48 lg:w-60 p-2 bg-[#2C2B29]/30 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl will-change-transform z-10 hidden lg:block" style={{top: '110%', right: '-2%'}} data-speed="-1.1" data-rotation="-5deg">
          <img src="https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&q=80&w=800" alt="Food Production" className="w-full h-auto rounded-xl object-cover aspect-video"/>
        </div>
        <div ref={el => itemsRef.current[9] = el} className="parallax-item absolute w-44 lg:w-56 p-2 bg-[#2C2B29]/30 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl will-change-transform z-20 hidden sm:block" style={{top: '-10%', right: '25%'}} data-speed="1.3" data-rotation="6deg">
          <img src="https://images.unsplash.com/photo-1574169208507-84376144848b?auto=format&fit=crop&q=80&w=800" alt="Welding" className="w-full h-auto rounded-xl object-cover aspect-square"/>
        </div>
        <div ref={el => itemsRef.current[10] = el} className="parallax-item absolute w-48 lg:w-64 p-2 bg-[#2C2B29]/30 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl will-change-transform z-30 hidden md:block" style={{top: '120%', left: '15%'}} data-speed="-1.5" data-rotation="-10deg">
          <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800" alt="Modern Office" className="w-full h-auto rounded-xl object-cover aspect-square"/>
        </div>
        <div ref={el => itemsRef.current[11] = el} className="parallax-item absolute w-32 lg:w-48 p-2 bg-[#2C2B29]/30 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl will-change-transform z-10" style={{top: '5%', right: '40%'}} data-speed="0.5" data-rotation="12deg">
          <img src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800" alt="Logistics" className="w-full h-auto rounded-xl object-cover aspect-[3/4]"/>
        </div>

      </div>
    </section>
  );
}
