import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { Icon, ScoreChip } from './ui';

// Command-palette search across jobs, applicants, and employers.
// Navigates to the relevant section with a ?q= filter applied.
export default function GlobalSearch({ open, onClose }) {
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setQ('');
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    if (!data) {
      Promise.all([apiFetch('/admin/jobs'), apiFetch('/admin/applicants'), apiFetch('/admin/employers')])
        .then(([jobs, applicants, employers]) => setData({ jobs, applicants, employers }))
        .catch(() => {});
    }
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const has = (s) => s && String(s).toLowerCase().includes(term);
    const out = [];
    data.applicants.filter((a) => has(a.name) || has(a.email) || has(a.job_title)).slice(0, 5)
      .forEach((a) => out.push({ type: 'Applicant', icon: 'solar:user-rounded-linear', label: a.name, sub: `${a.job_title} · ${a.company || ''}`, score: a.ai_score, to: `/admin/applicants?q=${encodeURIComponent(a.name)}` }));
    data.jobs.filter((j) => has(j.title) || has(j.company) || has(j.location)).slice(0, 5)
      .forEach((j) => out.push({ type: 'Job', icon: 'solar:case-minimalistic-linear', label: j.title, sub: `${j.company || ''} · ${j.location}`, to: `/admin/jobs?q=${encodeURIComponent(j.title)}` }));
    data.employers.filter((e) => has(e.name) || has(e.contact_name)).slice(0, 5)
      .forEach((e) => out.push({ type: 'Employer', icon: 'solar:buildings-2-linear', label: e.name, sub: e.contact_name || '', to: `/admin/employers?q=${encodeURIComponent(e.name)}` }));
    return out;
  }, [q, data]);

  if (!open) return null;
  const go = (to) => { onClose(); navigate(to); };

  return (
    <div className="fixed inset-0 z-[75] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Icon name="solar:magnifer-linear" className="text-lg text-zinc-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) go(results[0].to); }}
            placeholder="Search candidates, jobs, employers…"
            className="flex-1 bg-transparent text-white placeholder:text-zinc-600 outline-none"
          />
          <kbd className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500 ring-1 ring-white/10">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {!q.trim() ? (
            <p className="px-3 py-8 text-center text-sm text-zinc-600">Type to search across your workspace…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-zinc-600">No matches for “{q}”</p>
          ) : (
            results.map((r, i) => (
              <button key={i} onClick={() => go(r.to)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-zinc-400 ring-1 ring-white/10"><Icon name={r.icon} className="text-base" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">{r.label}</span>
                  <span className="block truncate text-xs text-zinc-500">{r.sub}</span>
                </span>
                {r.score != null && <ScoreChip score={r.score} />}
                <span className="text-[10px] uppercase tracking-wide text-zinc-600">{r.type}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
