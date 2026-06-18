import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  const sectionLink = (hash, label) => {
    if (isHome) {
      return <a href={hash} className="hover:text-stone-900 transition-colors">{label}</a>;
    }
    return <Link to={`/${hash}`} className="hover:text-stone-900 transition-colors">{label}</Link>;
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#FAFAFA]/80 backdrop-blur-md border-b border-stone-200/50">
      <div className="lg:px-8 flex h-20 max-w-7xl mr-auto ml-auto pr-6 pl-6 items-center justify-between">
        <Link to="/" className="flex items-center gap-1 cursor-pointer">
          <span className="text-[#C1B6A9] font-light tracking-widest text-2xl uppercase">Staffing</span>
          <div className="relative flex items-center">
            <span className="text-[#827A71] font-normal text-2xl tracking-tight ml-1.5">Co.</span>
            <div className="absolute -bottom-1 -right-2 w-8 h-0.5 bg-[#827A71]/60 rounded-full rotate-[-5deg]"></div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-lg font-light text-stone-500">
          <Link to="/jobs" className="hover:text-stone-900 transition-colors">Jobs</Link>
          {sectionLink('#employers', 'Employers')}
          {sectionLink('#job-seekers', 'Job Seekers')}
          {sectionLink('#faq', 'About')}
        </div>

        <div className="flex items-center gap-4">
          <Link to="/jobs" className="hidden md:flex items-center gap-2 text-lg font-normal text-stone-900 hover:text-stone-600 transition-colors">
            Contact Us
          </Link>
          <Link to="/jobs" className="hover:bg-stone-800 transition-all flex text-lg font-normal text-white bg-[#817872] rounded-full pt-2.5 pr-5 pb-2.5 pl-5 gap-x-2 gap-y-2 items-center">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
