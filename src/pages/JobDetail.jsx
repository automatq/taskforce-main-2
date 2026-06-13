import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ApplyModal from '../components/jobs/ApplyModal';

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setJob(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-[#827A71] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-32 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-playfair text-[#2C2B29] mb-4">Job Not Found</h2>
        <p className="text-stone-500 font-montserrat font-light mb-6">This position may have been filled or removed.</p>
        <Link to="/jobs" className="inline-flex items-center gap-2 text-[#827A71] font-montserrat hover:text-stone-900 transition-colors">
          <iconify-icon icon="solar:arrow-left-linear"></iconify-icon> Back to Job Board
        </Link>
      </div>
    );
  }

  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 text-[#827A71] font-montserrat text-base font-medium mb-8 hover:text-stone-900 transition-colors"
        >
          <iconify-icon icon="solar:arrow-left-linear"></iconify-icon> Back to Jobs
        </Link>

        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 lg:p-12">
          <div className="flex flex-wrap gap-3 mb-6">
            <span className="text-xs font-medium tracking-widest uppercase text-[#827A71] bg-[#F5F4F2] rounded-full px-3 py-1 font-montserrat">
              {job.type}
            </span>
            {job.pay_range && (
              <span className="text-xs font-medium tracking-widest uppercase text-stone-500 bg-stone-100 rounded-full px-3 py-1 font-montserrat">
                {job.pay_range}
              </span>
            )}
          </div>

          <h1 className="text-4xl lg:text-5xl font-playfair text-[#2C2B29] tracking-tight mb-4">
            {job.title}
          </h1>

          <div className="flex items-center gap-2 text-stone-500 font-montserrat font-light text-lg mb-10">
            <iconify-icon icon="solar:map-point-linear" className="text-xl text-[#C1B6A9]"></iconify-icon>
            {job.location}
          </div>

          <div className="border-t border-stone-200 pt-8 mb-8">
            <h2 className="text-xl font-playfair text-[#2C2B29] mb-4">Description</h2>
            <div className="text-stone-600 font-montserrat font-light text-base leading-relaxed whitespace-pre-line">
              {job.description}
            </div>
          </div>

          {job.requirements && (
            <div className="border-t border-stone-200 pt-8 mb-10">
              <h2 className="text-xl font-playfair text-[#2C2B29] mb-4">Requirements</h2>
              <div className="text-stone-600 font-montserrat font-light text-base leading-relaxed whitespace-pre-line">
                {job.requirements}
              </div>
            </div>
          )}

          <div className="border-t border-stone-200 pt-8 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowApply(true)}
              className="flex-1 bg-[#817872] text-white rounded-full py-4 font-normal text-lg hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
            >
              Apply Now
              <iconify-icon icon="solar:arrow-right-linear" className="text-lg"></iconify-icon>
            </button>
            <a
              href="tel:519-826-5252"
              className="flex-1 border border-stone-200 text-stone-900 rounded-full py-4 font-normal text-lg hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
            >
              <iconify-icon icon="solar:phone-linear" className="text-lg"></iconify-icon>
              Call Us Instead
            </a>
          </div>
        </div>
      </div>

      {showApply && (
        <ApplyModal jobId={job.id} jobTitle={job.title} onClose={() => setShowApply(false)} />
      )}
    </section>
  );
}
