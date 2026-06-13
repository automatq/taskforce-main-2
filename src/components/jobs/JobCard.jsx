import { Link } from 'react-router-dom';

export default function JobCard({ job }) {
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="group bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-all hover:border-stone-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs font-medium tracking-widest uppercase text-[#827A71] bg-[#F5F4F2] rounded-full px-3 py-1 font-montserrat">
            {job.type}
          </span>
          {job.pay_range && (
            <span className="text-xs font-medium tracking-widest uppercase text-stone-500 bg-stone-100 rounded-full px-3 py-1 font-montserrat">
              {job.pay_range}
            </span>
          )}
        </div>
      </div>

      <h3 className="text-2xl font-playfair text-[#2C2B29] tracking-tight mb-2 group-hover:text-[#827A71] transition-colors">
        {job.title}
      </h3>

      <div className="flex items-center gap-2 text-stone-500 font-montserrat font-light text-base">
        <iconify-icon icon="solar:map-point-linear" className="text-lg text-[#C1B6A9]"></iconify-icon>
        {job.location}
      </div>

      <div className="mt-5 flex items-center gap-2 text-[#827A71] font-montserrat text-sm font-medium group-hover:gap-3 transition-all">
        View Details
        <iconify-icon icon="solar:arrow-right-linear" className="text-base"></iconify-icon>
      </div>
    </Link>
  );
}
