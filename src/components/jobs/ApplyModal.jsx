import { useState } from 'react';

export default function ApplyModal({ jobId, jobTitle, onClose }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [resume, setResume] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('phone', phone);
    formData.append('resume', resume);

    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-lg p-8 z-10"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors"
        >
          <iconify-icon icon="solar:close-circle-linear" className="text-2xl"></iconify-icon>
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-6">
              <iconify-icon icon="solar:check-circle-bold" className="text-3xl text-green-500"></iconify-icon>
            </div>
            <h3 className="text-2xl font-playfair text-[#2C2B29] mb-3">Application Sent!</h3>
            <p className="text-stone-500 font-montserrat font-light">
              Thanks for applying. We'll review your resume and be in touch soon.
            </p>
            <button
              onClick={onClose}
              className="mt-6 bg-[#817872] text-white rounded-full px-8 py-3 font-normal hover:bg-stone-800 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-2xl font-playfair text-[#2C2B29] mb-1">Apply Now</h3>
            <p className="text-stone-500 font-montserrat font-light text-base mb-8">{jobTitle}</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5 font-montserrat">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 text-base text-stone-900 font-light focus:outline-none focus:ring-2 focus:ring-[#827A71]/30 focus:border-[#827A71] transition-colors"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5 font-montserrat">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 text-base text-stone-900 font-light focus:outline-none focus:ring-2 focus:ring-[#827A71]/30 focus:border-[#827A71] transition-colors"
                  placeholder="(519) 000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5 font-montserrat">Resume</label>
                <label className="flex items-center gap-3 w-full rounded-xl border border-dashed border-stone-300 px-4 py-4 cursor-pointer hover:border-[#827A71] hover:bg-[#F5F4F2] transition-colors">
                  <iconify-icon icon="solar:upload-minimalistic-linear" className="text-2xl text-[#827A71]"></iconify-icon>
                  <div className="flex-1">
                    <span className="text-base text-stone-700 font-montserrat">
                      {resume ? resume.name : 'Upload your resume'}
                    </span>
                    <span className="block text-xs text-stone-400 font-montserrat mt-0.5">PDF, DOC, or DOCX (max 5MB)</span>
                  </div>
                  <input
                    type="file"
                    required
                    accept=".pdf,.doc,.docx"
                    onChange={e => setResume(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>

              {error && (
                <p className="text-red-600 text-sm font-montserrat bg-red-50 rounded-lg px-4 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#817872] text-white rounded-xl py-3.5 font-normal hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
