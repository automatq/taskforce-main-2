import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const DAYS = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' }, { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' }, { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' }, { key: 'sun', label: 'Sun' },
];

// Monday of the current week, as YYYY-MM-DD.
function mostRecentMonday() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const STATUS_LABEL = { submitted: 'Pending review', approved: 'Approved', rejected: 'Needs changes', invoiced: 'Approved · Invoiced' };
const STATUS_COLOR = { submitted: 'text-amber-600 bg-amber-50', approved: 'text-green-600 bg-green-50', rejected: 'text-red-600 bg-red-50', invoiced: 'text-green-600 bg-green-50' };

export default function TimesheetSubmit() {
  const { token } = useParams();
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [weekStart, setWeekStart] = useState(mostRecentMonday());
  const [hours, setHours] = useState({ mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    fetch(`/api/timesheet/${token}`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then(setCtx)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [token]);

  const total = DAYS.reduce((t, d) => t + (Number(hours[d.key]) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/timesheet/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart, daily_hours: hours, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setSuccess(true);
      setHours({ mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' });
      setNotes('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-[#827A71] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-32 max-w-lg mx-auto px-6">
        <iconify-icon icon="solar:link-broken-linear" className="text-5xl text-[#C1B6A9] mb-4"></iconify-icon>
        <h2 className="text-3xl font-playfair text-[#2C2B29] mb-4">Link Not Found</h2>
        <p className="text-stone-500 font-montserrat font-light">This timesheet link isn't valid. Please contact your recruiter for a new one.</p>
      </div>
    );
  }

  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-2xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex bg-white border-stone-200 border rounded-full mb-8 pt-1 pr-3 pb-1 pl-3 shadow-sm gap-x-2 items-center">
            <span className="w-2 h-2 rounded-full bg-[#C1B6A9]"></span>
            <span className="text-sm font-normal text-stone-600">Weekly Timesheet</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-playfair text-[#2C2B29] tracking-tight mb-3">
            Hi {ctx.candidate.name.split(' ')[0]}
          </h1>
          <p className="text-lg text-stone-500 font-montserrat font-light">
            {ctx.job.title}{ctx.job.company ? ` · ${ctx.job.company}` : ''}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 mb-8">
          {success && (
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
              <iconify-icon icon="solar:check-circle-bold" className="text-xl text-green-500"></iconify-icon>
              <p className="text-sm font-montserrat text-green-700">Timesheet submitted — your recruiter will review it shortly.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5 font-montserrat">Week Starting</label>
              <input
                type="date"
                required
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="w-full rounded-xl border border-stone-200 px-4 py-3 text-base text-stone-900 font-light focus:outline-none focus:ring-2 focus:ring-[#827A71]/30 focus:border-[#827A71] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2 font-montserrat">Hours Worked</label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {DAYS.map((d) => (
                  <div key={d.key} className="text-center">
                    <span className="block text-xs text-stone-400 font-montserrat mb-1">{d.label}</span>
                    <input
                      type="number" min="0" max="24" step="0.5"
                      value={hours[d.key]}
                      onChange={(e) => setHours({ ...hours, [d.key]: e.target.value })}
                      placeholder="0"
                      className="w-full rounded-lg border border-stone-200 px-2 py-2 text-center text-sm text-stone-900 font-light focus:outline-none focus:ring-2 focus:ring-[#827A71]/30 focus:border-[#827A71] transition-colors"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-stone-500 font-montserrat">Total: <span className="font-medium text-stone-900">{total} hrs</span></p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5 font-montserrat">Notes <span className="text-stone-400 font-light">(optional)</span></label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything your recruiter should know about this week"
                className="w-full rounded-xl border border-stone-200 px-4 py-3 text-base text-stone-900 font-light focus:outline-none focus:ring-2 focus:ring-[#827A71]/30 focus:border-[#827A71] transition-colors resize-none"
              />
            </div>

            {error && <p className="text-red-600 text-sm font-montserrat bg-red-50 rounded-lg px-4 py-2">{error}</p>}

            <button
              type="submit"
              disabled={submitting || total <= 0}
              className="w-full bg-[#817872] text-white rounded-xl py-3.5 font-normal hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Submitting…
                </>
              ) : (
                'Submit Timesheet'
              )}
            </button>
          </form>
        </div>

        {ctx.history.length > 0 && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8">
            <h2 className="text-lg font-playfair text-[#2C2B29] mb-4">Recent Submissions</h2>
            <div className="divide-y divide-stone-100">
              {ctx.history.map((h) => (
                <div key={h.week_start} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm text-stone-900 font-montserrat">Week of {h.week_start}</div>
                    <div className="text-xs text-stone-400 font-montserrat">{h.hours} hrs</div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full font-montserrat ${STATUS_COLOR[h.status] || 'text-stone-500 bg-stone-100'}`}>
                    {STATUS_LABEL[h.status] || h.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
