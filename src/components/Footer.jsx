import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[#FAFAFA] border-t border-stone-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-1 mb-6">
              <span className="text-[#C1B6A9] font-extralight tracking-widest text-xl uppercase">Task</span>
              <span className="text-[#827A71] font-normal text-xl tracking-tight -ml-1">Force</span>
            </Link>
            <p className="text-lg text-stone-500 max-w-xs font-light">Staffing Solutions in Guelph & surrounding areas since 2000.</p>
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
              <li><a href="tel:519-826-5252" className="hover:text-stone-900 transition-colors">519-826-5252</a></li>
              <li><a href="mailto:lisa@taskforce.ca" className="hover:text-stone-900 transition-colors">lisa@taskforce.ca</a></li>
              <li className="text-base">201-300 Willow Road<br/>Guelph, ON N1H 7C6</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-stone-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-lg font-light text-stone-400">&copy; {new Date().getFullYear()} Task Force Staffing Solutions Inc. All rights reserved.</p>
          <div className="flex items-center gap-4 text-stone-400">
            <a href="https://www.facebook.com/taskforcestaffing/" className="hover:text-stone-900 transition-colors" target="_blank" rel="noopener noreferrer">
              <iconify-icon icon="lucide:facebook" strokeWidth="1.5" className="text-2xl"></iconify-icon>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
