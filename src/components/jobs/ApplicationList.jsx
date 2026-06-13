export default function ApplicationList({ applications }) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500 font-montserrat font-light">
        No applications yet.
      </div>
    );
  }

  const downloadResume = async (appId, name) => {
    const token = localStorage.getItem('tf_admin_token');
    const res = await fetch(`/api/admin/applications/${appId}/resume`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return alert('Failed to download resume');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-resume`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-stone-200">
            <th className="pb-3 text-xs font-medium tracking-widest uppercase text-stone-500 font-montserrat">Name</th>
            <th className="pb-3 text-xs font-medium tracking-widest uppercase text-stone-500 font-montserrat">Phone</th>
            <th className="pb-3 text-xs font-medium tracking-widest uppercase text-stone-500 font-montserrat">Position</th>
            <th className="pb-3 text-xs font-medium tracking-widest uppercase text-stone-500 font-montserrat">Date</th>
            <th className="pb-3 text-xs font-medium tracking-widest uppercase text-stone-500 font-montserrat">Resume</th>
          </tr>
        </thead>
        <tbody>
          {applications.map(app => (
            <tr key={app.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
              <td className="py-4 text-base font-normal text-stone-900">{app.name}</td>
              <td className="py-4 text-base font-light text-stone-600">
                <a href={`tel:${app.phone}`} className="hover:text-[#827A71] transition-colors">{app.phone}</a>
              </td>
              <td className="py-4 text-base font-light text-stone-600">{app.job_title}</td>
              <td className="py-4 text-sm font-light text-stone-500">
                {new Date(app.created_at).toLocaleDateString('en-CA')}
              </td>
              <td className="py-4">
                <button
                  onClick={() => downloadResume(app.id, app.name)}
                  className="inline-flex items-center gap-1 text-sm text-[#827A71] hover:text-stone-900 font-montserrat font-medium transition-colors"
                >
                  <iconify-icon icon="solar:download-minimalistic-linear" className="text-base"></iconify-icon>
                  Download
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
