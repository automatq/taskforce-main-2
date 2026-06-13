import { useState, useEffect } from 'react';
import JobCard from '../components/jobs/JobCard';

export default function JobBoard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/jobs')
      .then(res => res.json())
      .then(data => {
        setJobs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex bg-white border-stone-200 border rounded-full mb-8 pt-1 pr-3 pb-1 pl-3 shadow-sm gap-x-2 items-center">
            <span className="w-2 h-2 rounded-full bg-[#C1B6A9]"></span>
            <span className="text-sm font-normal text-stone-600">Current Openings</span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-playfair text-[#2C2B29] tracking-tight mb-6">
            Job <span className="italic text-[#8F877C]">Board</span>
          </h1>
          <p className="text-xl text-stone-500 font-montserrat font-light max-w-2xl mx-auto">
            Browse available positions at Task Force Staffing Solutions. We place workers across Guelph and surrounding areas.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-stone-300 border-t-[#827A71] rounded-full animate-spin"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 shadow-sm">
            <iconify-icon icon="solar:clipboard-list-linear" className="text-6xl text-[#C1B6A9] mb-4"></iconify-icon>
            <h3 className="text-2xl font-playfair text-[#2C2B29] mb-3">No Positions Available</h3>
            <p className="text-stone-500 font-montserrat font-light max-w-md mx-auto mb-6">
              We don't have any openings listed right now, but we're always looking for great people. Give us a call or drop by our office.
            </p>
            <a
              href="tel:519-826-5252"
              className="inline-flex items-center gap-2 bg-[#817872] text-white rounded-full px-8 py-3 font-normal hover:bg-stone-800 transition-colors"
            >
              <iconify-icon icon="solar:phone-linear" className="text-lg"></iconify-icon>
              Call 519-826-5252
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
