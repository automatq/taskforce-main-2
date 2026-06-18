import { Link } from 'react-router-dom';
import { useReveal } from './useReveal';

export default function Cta() {
  const revealRef = useReveal();

  return (
    <section className="lg:py-32 bg-white border-stone-200 border-t pt-24 pb-24 overflow-hidden relative">
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">

        <h2 ref={revealRef} className="lg:text-7xl xl:text-8xl leading-[1.05] text-5xl tracking-tight mb-12 flex flex-col font-normal items-center text-center w-full">
          <span className="cta-bounce-enter block text-[#2C2B29] font-playfair">Find work.</span>
          <span className="font-playfair text-[#8F877C] cta-bounce-enter block">Find talent.</span>
          <span className="font-playfair italic text-[#C8C2B7] cta-bounce-enter block">We make it easy.</span>
        </h2>

        <p className="text-2xl text-stone-500 max-w-2xl mr-auto mb-12 ml-auto font-light">Drop by our office, give us a call, or send us an email. We'd love to help you take the next step.</p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link to="/jobs" className="sm:w-auto hover:bg-stone-800 transition-colors flex btn-pulse text-xl font-normal text-white bg-[#817872] w-full rounded-full pt-4 pr-8 pb-4 pl-8 relative gap-x-2 gap-y-2 items-center justify-center">Get Started Today</Link>
          <a href="tel:8005550100" className="sm:w-auto hover:bg-stone-50 transition-all flex text-xl font-normal text-stone-900 bg-white w-full border-stone-200 border rounded-full pt-4 pr-8 pb-4 pl-8 gap-x-2 gap-y-2 items-center justify-center">
            Call (800) 555-0100
          </a>
        </div>
      </div>
    </section>
  );
}
