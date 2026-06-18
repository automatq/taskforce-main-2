import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { GlassCard, Field, Input, Button, Spinner, Icon, StatusBadge } from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';

export default function Settings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const toast = useToast();

  useEffect(() => {
    apiFetch('/admin/settings').then((d) => {
      setData({ name: d.name, aiScoring: d.aiScoring, settings: d.settings || {} });
    }).finally(() => setLoading(false));
  }, []);

  const update = (k, v) => setData((d) => ({ ...d, settings: { ...d.settings, [k]: v } }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setSaved(false);
    try {
      await apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify({ name: data.name, settings: data.settings }) });
      setSaved(true);
      toast.success('Settings saved');
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  if (loading || !data) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  const s = data.settings;

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={save} className="space-y-6">
        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-white">Agency Profile</h2>
          <p className="mt-1 text-xs text-zinc-500">Shown across your console and on outgoing documents.</p>
          <div className="mt-5 space-y-4">
            <Field label="Agency Name"><Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Contact Email"><Input type="email" value={s.email || ''} onChange={(e) => update('email', e.target.value)} placeholder="hello@example.com" /></Field>
              <Field label="Phone"><Input value={s.phone || ''} onChange={(e) => update('phone', e.target.value)} placeholder="(800) 555-0100" /></Field>
            </div>
            <Field label="Address"><Input value={s.address || ''} onChange={(e) => update('address', e.target.value)} placeholder="Your City, ST" /></Field>
          </div>
        </GlassCard>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          {saved && <span className="flex items-center gap-1 text-sm text-emerald-300"><Icon name="solar:check-circle-bold" className="text-base" /> Saved</span>}
        </div>
      </form>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="solar:magic-stick-3-bold" className={`text-lg ${data.aiScoring ? 'text-emerald-300' : 'text-zinc-500'}`} />
            <h2 className="text-sm font-semibold text-white">AI Candidate Scoring</h2>
          </div>
          <StatusBadge status={data.aiScoring ? 'active' : 'draft'} />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {data.aiScoring
            ? 'Connected. New applications are automatically scored 0–100 by Claude against the job description and requirements.'
            : 'Set the ANTHROPIC_API_KEY environment variable on the server to enable automatic AI scoring of new applicants.'}
        </p>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-sm font-semibold text-white">Subscription</h2>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-white">Professional</div>
            <div className="text-xs text-zinc-500">Full ATS + CRM, AI scoring, invoicing</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-white">$950<span className="text-sm text-zinc-500">/mo</span></div>
            <div className="text-xs text-emerald-300">Active</div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
