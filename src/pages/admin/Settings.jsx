import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { GlassCard, Field, Input, Select, Button, Spinner, Icon, StatusBadge } from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';

const ATS_PROVIDERS = ['', 'Bullhorn', 'Vincere', 'JobAdder', 'Crelate', 'Recruiterflow', 'Custom'];

export default function Settings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const toast = useToast();

  useEffect(() => {
    apiFetch('/admin/settings').then((d) => {
      setData({ name: d.name, aiScoring: d.aiScoring, stripe: d.stripe, settings: d.settings || {} });
    }).finally(() => setLoading(false));
    if (new URLSearchParams(window.location.search).get('sub') === 'success') {
      toast.success('Subscription active — welcome aboard!');
    }
  }, []);

  const update = (k, v) => setData((d) => ({ ...d, settings: { ...d.settings, [k]: v } }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setSaved(false);
    try {
      await apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify({ name: data.name, settings: data.settings }) });
      setSaved(true); toast.success('Settings saved');
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  const subscribe = async () => {
    try {
      const r = await apiFetch('/admin/billing/checkout', { method: 'POST' });
      if (r.url) window.location.href = r.url;
    } catch (err) { toast.error(err.message); }
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

        <GlassCard className="p-6">
          <div className="flex items-center gap-2">
            <Icon name="solar:link-circle-bold" className="text-lg text-sky-300" />
            <h2 className="text-sm font-semibold text-white">Integrations</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Route placed candidates into your ATS and activate the phone/voice agents.</p>
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="ATS Provider">
                <Select value={s.ats_provider || ''} onChange={(e) => update('ats_provider', e.target.value)}>
                  {ATS_PROVIDERS.map((p) => <option key={p} value={p}>{p || '— None —'}</option>)}
                </Select>
              </Field>
              <Field label="ATS Webhook URL" hint="where candidates are POSTed">
                <Input value={s.ats_webhook || ''} onChange={(e) => update('ats_webhook', e.target.value)} placeholder="https://…" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone Provider" hint="activates The Receptionist"><Input value={s.phone_provider || ''} onChange={(e) => update('phone_provider', e.target.value)} placeholder="Twilio · +1 (800) …" /></Field>
              <Field label="Voice Provider" hint="activates The Voice"><Input value={s.voice_provider || ''} onChange={(e) => update('voice_provider', e.target.value)} placeholder="Vapi / Retell" /></Field>
            </div>
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
            <h2 className="text-sm font-semibold text-white">AI Candidate Scoring & Agents</h2>
          </div>
          <StatusBadge status={data.aiScoring ? 'active' : 'draft'} />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {data.aiScoring
            ? 'Connected. Applications are auto-scored and the Reviewer + Follow-up agents are live.'
            : 'Set LLM_API_KEY on the server to enable AI scoring and the AI agents.'}
        </p>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Subscription</h2>
            <div className="mt-1 text-xs text-zinc-500">Professional — Full ATS + CRM, AI agents, invoicing</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-white">$950<span className="text-sm text-zinc-500">/mo</span></div>
            <div className="text-xs text-emerald-300">{data.stripe ? 'Stripe connected' : 'Active'}</div>
          </div>
        </div>
        <div className="mt-4">
          {data.stripe ? (
            <Button icon="solar:card-linear" onClick={subscribe} className="w-full justify-center">Manage subscription via Stripe</Button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-xs text-zinc-500 ring-1 ring-white/10">
              <Icon name="solar:info-circle-linear" className="text-sm" />
              Connect Stripe (STRIPE_SECRET_KEY + STRIPE_PRICE_ID) to take real $950/mo subscriptions.
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
