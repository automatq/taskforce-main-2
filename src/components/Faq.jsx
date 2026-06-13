import { useEffect, useState, useRef } from 'react';
import clsx from 'clsx';

const FAQ_DATA = [
  {
    icon: 'clock-circle-linear',
    question: 'How quickly can I start working?',
    bgImage: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    title: 'Getting Started',
    answer: 'Most candidates can start working within days of registering with us. Once we complete your screening, skills assessment, and any required safety training (WHMIS, Health & Safety), we match you with available positions right away. Many of our placements begin the same week they walk through our door.'
  },
  {
    icon: 'buildings-2-linear',
    question: 'What types of jobs do you offer?',
    bgImage: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80',
    title: 'Job Types',
    answer: 'We place workers across a wide range of industries including manufacturing, warehousing, food production, construction, automotive, administration, customer service, logistics, and more. We offer temp, temp-to-perm, and permanent positions throughout Guelph, Cambridge, Kitchener-Waterloo, Fergus, and surrounding areas.'
  },
  {
    icon: 'wallet-money-linear',
    question: 'How does pay and scheduling work?',
    bgImage: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80',
    title: 'Pay & Schedule',
    answer: 'All Task Force employees are paid weekly. We offer flexible scheduling based on your needs — whether you prefer full-time, part-time, or variable hours. We believe in matching not just your skills but your lifestyle. We also provide equal opportunity positions, ensuring every employee gets the chance they deserve.'
  }
];

export default function Faq() {
  const [angle, setAngle] = useState(0);
  const [flippedStates, setFlippedStates] = useState({});
  const numCards = FAQ_DATA.length;
  const theta = 360 / numCards;
  const [radius, setRadius] = useState(380);

  const sceneRef = useRef(null);
  const dragStart = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setRadius(window.innerWidth < 640 ? 250 : 380);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const normalized = ((angle % 360) + 360) % 360;
  const activeIdx = Math.round((360 - normalized) / theta) % numCards;

  const handleNext = () => setAngle(prev => prev - theta);
  const handlePrev = () => setAngle(prev => prev + theta);

  const handleCardClick = (idx) => {
    if (idx !== activeIdx) {
      const targetAngle = -idx * theta;
      const diff = (targetAngle - angle) % 360;
      let shortest = diff;
      if (diff > 180) shortest -= 360;
      if (diff < -180) shortest += 360;
      setAngle(prev => prev + shortest);
    } else {
      setFlippedStates(prev => ({ ...prev, [idx]: !prev[idx] }));
    }
  };

  const handleTouchStart = (e) => {
    dragStart.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchEnd = (e) => {
    if (!isDragging.current) return;
    const dragEnd = e.changedTouches[0].clientX;
    const diff = dragStart.current - dragEnd;

    if (diff > 50) handleNext();
    else if (diff < -50) handlePrev();

    isDragging.current = false;
  };

  return (
    <section id="faq" className="relative py-24 lg:py-32 bg-[#FAFAFA] border-t border-stone-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10 text-center mb-16 lg:mb-24">
        <div className="inline-flex items-center justify-center gap-3 mb-6">
          <div className="w-7 h-7 rounded-full border border-[#8F877C] flex items-center justify-center text-[#8F877C]">
            <span className="text-sm font-light mt-0.5">?</span>
          </div>
          <span className="uppercase text-xs font-medium tracking-[0.2em] text-[#8F877C] font-montserrat">Common Questions</span>
        </div>

        <h2 className="text-6xl lg:text-7xl font-normal tracking-tight mb-8">
          <span className="text-[#2C2B29] font-playfair">Frequently Asked </span><span className="font-instrument-serif italic text-[#8F877C]">Questions</span>
        </h2>

        <p className="text-xl text-[#827A71] font-montserrat font-light max-w-3xl mx-auto leading-relaxed">Everything you need to know about working with Task Force, from getting started to getting paid.</p>
      </div>

      <div
        ref={sceneRef}
        className="faq-scene relative w-full max-w-6xl mx-auto h-[480px] sm:h-[550px] flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button onClick={handlePrev} className="absolute left-2 sm:left-10 z-50 w-12 h-12 bg-white/80 backdrop-blur-md rounded-full border border-stone-200 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-white transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[#827A71]/50">
          <iconify-icon icon="solar:arrow-left-linear" className="text-2xl"></iconify-icon>
        </button>
        <button onClick={handleNext} className="absolute right-2 sm:right-10 z-50 w-12 h-12 bg-white/80 backdrop-blur-md rounded-full border border-stone-200 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-white transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[#827A71]/50">
          <iconify-icon icon="solar:arrow-right-linear" className="text-2xl"></iconify-icon>
        </button>

        <div
          className="faq-carousel w-[280px] sm:w-[360px] h-[400px] sm:h-[480px] relative z-20"
          style={{ transform: `rotateY(${angle}deg)` }}
        >
          {FAQ_DATA.map((item, idx) => {
            const cardAngle = idx * theta;
            const isActive = idx === activeIdx;
            const isFlipped = flippedStates[idx];

            return (
              <div
                key={idx}
                onClick={() => handleCardClick(idx)}
                className={clsx("faq-card-wrapper group", isActive && "is-active")}
                style={{ transform: `rotateY(${cardAngle}deg) translateZ(${radius}px)` }}
              >
                <div className={clsx("faq-card-inner", isFlipped && "is-flipped")}>
                  <div className="faq-card-front bg-white/60 backdrop-blur-xl border border-stone-200 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center p-8 text-center pulse-glow-wheel">
                    <iconify-icon icon={`solar:${item.icon}`} className="text-4xl text-[#C1B6A9] mb-6"></iconify-icon>
                    <h3 className="text-2xl sm:text-3xl font-playfair text-[#2C2B29] leading-snug">{item.question}</h3>
                    <div className="absolute bottom-6 text-xs text-[#827A71] font-montserrat tracking-widest uppercase flex items-center gap-2">
                      Tap to reveal <iconify-icon icon="solar:refresh-linear" className="text-sm"></iconify-icon>
                    </div>
                  </div>
                  <div className="faq-card-back bg-stone-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-end">
                    <img src={item.bgImage} className="absolute inset-0 w-full h-full object-cover z-0" alt={item.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/80 to-stone-900/40 z-10"></div>
                    <div className="relative z-20 p-6 sm:p-8 h-full flex flex-col">
                      <h4 className="text-xl font-playfair text-white mb-4 border-b border-white/20 pb-4 shrink-0">{item.title}</h4>
                      <div className="overflow-y-auto hide-scrollbar flex-1 pb-2">
                        <p className="text-sm sm:text-base text-stone-200 font-montserrat font-light leading-relaxed">{item.answer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center mt-12 text-[#827A71] font-montserrat text-sm tracking-widest uppercase flex items-center justify-center gap-2 lg:hidden">
        <iconify-icon icon="solar:hand-swipe-linear" className="text-lg"></iconify-icon> Swipe to rotate
      </div>
    </section>
  );
}
