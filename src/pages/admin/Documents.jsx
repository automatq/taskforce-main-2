import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { GlassCard, Table, Button, IconButton, Spinner, EmptyState, Icon, SearchInput, relativeDate } from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const toast = useToast();

  useEffect(() => {
    apiFetch('/admin/documents').then(setDocs).catch((err) => toast.error(err.message)).finally(() => setLoading(false));
  }, []);

  const fetchBlob = async (id) => {
    const token = localStorage.getItem('tf_admin_token');
    const res = await fetch(`/api/admin/applicants/${id}/resume`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { toast.error('Document not available'); return null; }
    return res.blob();
  };

  const view = async (id) => {
    const blob = await fetchBlob(id);
    if (!blob) return;
    window.open(URL.createObjectURL(blob), '_blank');
  };

  const download = async (id, name) => {
    const blob = await fetchBlob(id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name.replace(/\s+/g, '_')}_resume.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const shown = docs.filter((d) =>
    `${d.applicant_name} ${d.job_title} ${d.company || ''}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search documents…" />
        <p className="text-sm text-zinc-500">{docs.length} résumés on file</p>
      </div>

      <GlassCard>
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : shown.length === 0 ? (
          <EmptyState icon="solar:document-text-linear" title="No documents" hint="Résumés uploaded by applicants are stored here." />
        ) : (
          <Table columns={[
            { label: 'Document' }, { label: 'Candidate' }, { label: 'Role' }, { label: 'Company' }, { label: 'Uploaded' }, { label: '', align: 'right' },
          ]}>
            {shown.map((d) => (
              <tr key={d.application_id} className="group transition hover:bg-zinc-950/[0.03] dark:hover:bg-white/[0.03]">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300 ring-1 ring-rose-400/20">
                      <Icon name="solar:file-text-bold" className="text-base" />
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-white">Résumé.pdf</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300">{d.applicant_name}</td>
                <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">{d.job_title}</td>
                <td className="px-5 py-3.5 text-zinc-500">{d.company || '—'}</td>
                <td className="px-5 py-3.5 text-zinc-500">{relativeDate(d.created_at)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                    <IconButton icon="solar:eye-linear" title="Preview" onClick={() => view(d.application_id)} />
                    <Button variant="ghost" icon="solar:download-linear" className="!px-3 !py-1.5 text-xs" onClick={() => download(d.application_id, d.applicant_name)}>Download</Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </GlassCard>
    </div>
  );
}
