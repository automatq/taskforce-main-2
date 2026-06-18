export default function TrustMarquee() {
  const content = (
    <>
      <div className="flex items-center gap-2.5 text-stone-600">
        <iconify-icon icon="solar:verified-check-linear" className="text-[#827A71] text-xl" strokeWidth="1.5"></iconify-icon>
        <span className="text-[11px] sm:text-xs uppercase tracking-[0.15em] font-medium font-montserrat">Experienced Team</span>
      </div>
      <div className="flex items-center gap-2.5 text-stone-600">
        <iconify-icon icon="solar:users-group-rounded-linear" className="text-[#827A71] text-xl" strokeWidth="1.5"></iconify-icon>
        <span className="text-[11px] sm:text-xs uppercase tracking-[0.15em] font-medium font-montserrat">Personality Matching</span>
      </div>
      <div className="flex items-center gap-2.5 text-stone-600">
        <iconify-icon icon="solar:diploma-verified-linear" className="text-[#827A71] text-xl" strokeWidth="1.5"></iconify-icon>
        <span className="text-[11px] sm:text-xs uppercase tracking-[0.15em] font-medium font-montserrat">Free WHMIS & Safety Training</span>
      </div>
      <div className="flex items-center gap-2.5 text-stone-600">
        <iconify-icon icon="solar:wallet-money-linear" className="text-[#827A71] text-xl" strokeWidth="1.5"></iconify-icon>
        <span className="text-[11px] sm:text-xs uppercase tracking-[0.15em] font-medium font-montserrat">Weekly Pay</span>
      </div>
      <div className="flex items-center gap-2.5 text-stone-600">
        <iconify-icon icon="solar:hand-shake-linear" className="text-[#827A71] text-xl" strokeWidth="1.5"></iconify-icon>
        <span className="text-[11px] sm:text-xs uppercase tracking-[0.15em] font-medium font-montserrat">Equal Opportunity Employer</span>
      </div>
      <div className="flex items-center gap-2.5 text-stone-600">
        <iconify-icon icon="solar:map-point-linear" className="text-[#827A71] text-xl" strokeWidth="1.5"></iconify-icon>
        <span className="text-[11px] sm:text-xs uppercase tracking-[0.15em] font-medium font-montserrat">Your Local Area</span>
      </div>
    </>
  );

  return (
    <div className="w-full bg-white border-y border-stone-200 py-3.5 overflow-hidden relative z-20 flex trust-marquee-container shadow-sm">
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

      <div className="trust-marquee-content flex gap-8 sm:gap-14 shrink-0 px-4 sm:px-7 items-center">
        {content}
      </div>
      <div className="trust-marquee-content flex gap-8 sm:gap-14 shrink-0 px-4 sm:px-7 items-center">
        {content}
      </div>
    </div>
  );
}
