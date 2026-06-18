import { useState } from 'react';

const JOB_TYPES = ['Full-Time', 'Part-Time', 'Temporary', 'Temp to Perm', 'Permanent', 'Contract'];

export default function JobForm({ job, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: job?.title || '',
    location: job?.location || 'Your City, ST',
    type: job?.type || 'Full-Time',
    description: job?.description || '',
    requirements: job?.requirements || '',
    pay_range: job?.pay_range || '',
    is_active: job?.is_active ?? 1
  });
  const [saving, setSaving] = useState(false);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const inputClass = "w-full rounded-xl border border-stone-200 px-4 py-3 text-base text-stone-900 font-light focus:outline-none focus:ring-2 focus:ring-[#827A71]/30 focus:border-[#827A71] transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-stone-700 mb-1.5 font-montserrat">Job Title</label>
          <input type="text" required value={form.title} onChange={e => update('title', e.target.value)} className={inputClass} placeholder="e.g. Forklift Operator" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5 font-montserrat">Location</label>
          <input type="text" required value={form.location} onChange={e => update('location', e.target.value)} className={inputClass} placeholder="Your City, ST" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5 font-montserrat">Job Type</label>
          <select value={form.type} onChange={e => update('type', e.target.value)} className={inputClass}>
            {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5 font-montserrat">Pay Range</label>
          <input type="text" value={form.pay_range} onChange={e => update('pay_range', e.target.value)} className={inputClass} placeholder="e.g. $18-22/hr" />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <input type="checkbox" id="is_active" checked={form.is_active === 1} onChange={e => update('is_active', e.target.checked ? 1 : 0)} className="w-5 h-5 rounded border-stone-300 text-[#827A71] focus:ring-[#827A71]" />
          <label htmlFor="is_active" className="text-sm font-medium text-stone-700 font-montserrat">Published (visible to job seekers)</label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5 font-montserrat">Description</label>
        <textarea required value={form.description} onChange={e => update('description', e.target.value)} rows={5} className={inputClass} placeholder="Describe the role, responsibilities, shifts, etc." />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5 font-montserrat">Requirements</label>
        <textarea value={form.requirements} onChange={e => update('requirements', e.target.value)} rows={3} className={inputClass} placeholder="List any skills, certifications, or experience needed" />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-[#817872] text-white rounded-xl py-3 font-normal hover:bg-stone-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (job ? 'Save Changes' : 'Create Job')}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors font-normal">
          Cancel
        </button>
      </div>
    </form>
  );
}
