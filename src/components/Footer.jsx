import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[#FAFAFA] border-t border-stone-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-1 mb-6">
              <span className="text-[#C1B6A9] font-extralight tracking-widest text-xl uppercase">Staffing</span>
              <span className="text-[#827A71] font-normal text-xl tracking-tight ml-1.5">Co.</span>
            </Link>
            <p className="text-lg text-stone-500 max-w-xs font-light">Staffing solutions for employers and job seekers across your local area.</p>
          </div>
          <div>
            <h4 className="text-base font-normal text-stone-900 mb-4 tracking-tight">Services</h4>
            <ul className="space-y-3 text-lg font-light text-stone-500">
              <li><Link to="/jobs" className="hover:text-stone-900 transition-colors">Job Postings</Link></li>
              <li><a href="/#employers" className="hover:text-stone-900 transition-colors">For Employers</a></li>
              <li><a href="/#job-seekers" className="hover:text-stone-900 transition-colors">For Job Seekers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-base font-normal text-stone-900 mb-4 tracking-tight">Company</h4>
            <ul className="space-y-3 text-lg font-light text-stone-500">
              <li><a href="/#faq" className="hover:text-stone-900 transition-colors">About Us</a></li>
              <li><a href="/#faq" className="hover:text-stone-900 transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-base font-normal text-stone-900 mb-4 tracking-tight">Contact</h4>
            <ul className="space-y-3 text-lg font-light text-stone-500">
              <li><a href="tel:8005550100" className="hover:text-stone-900 transition-colors">(800) 555-0100</a></li>
              <li><a href="mailto:hello@example.com" className="hover:text-stone-900 transition-colors">hello@example.com</a></li>
              <li className="text-base">123 Main Street, Suite 100<br/>Your City, ST 00000</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-stone-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-lg font-light text-stone-400">&copy; {new Date().getFullYear()} Staffing Co. All rights reserved.</p>
          <div className="flex items-center gap-4 text-stone-400">
            <a href="#" className="hover:text-stone-900 transition-colors" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <iconify-icon icon="lucide:facebook" strokeWidth="1.5" className="text-2xl"></iconify-icon>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
