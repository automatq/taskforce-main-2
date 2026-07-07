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
  const [qbo, setQbo] = useState(null);
  const toast = useToast();

  const loadSettings = () => apiFetch('/admin/settings').then((d) => {
    setData({
      name: d.name, aiScoring: d.aiScoring, stripe: d.stripe,
      stripeWebhookConfigured: d.stripeWebhookConfigured,
      subscription: d.subscription, settings: d.settings || {},
    });
  });

  useEffect(() => {
    loadSettings().finally(() => setLoading(false));
    apiFetch('/admin/quickbooks/status').then(setQbo).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get('sub') === 'success') {
      // The redirect confirms the customer's browser came back from Checkout —
      // it does NOT confirm payment. The real status comes from the Stripe
      // webhook, which may land a moment after the redirect, so poll briefly.
      toast.info('Finishing up with Stripe…');
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts += 1;
        await loadSettings();
        if (attempts >= 5) clearInterval(poll);
      }, 2000);
    }
    const qp = params.get('qbo');
    if (qp === 'connected') toast.success('QuickBooks connected');
    else if (qp === 'denied') toast.error('QuickBooks authorization was denied');
    else if (qp) toast.error('QuickBooks connection failed — please try again');
  }, []);

  const connectQbo = async () => {
    try {
      const r = await apiFetch('/admin/quickbooks/connect');
      window.location.href = r.url;
    } catch (err) { toast.error(err.message); }
  };
  const disconnectQbo = async () => {
    try {
      await apiFetch('/admin/quickbooks/disconnect', { method: 'POST' });
      setQbo((q) => ({ ...q, connected: false, company: null }));
      toast.success('QuickBooks disconnected');
    } catch (err) { toast.error(err.message); }
  };

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
          <div className="flex items-center gap-2">
            <Icon name="solar:wallet-money-bold" className={`text-lg ${qbo?.connected ? 'text-emerald-300' : 'text-zinc-500'}`} />
            <h2 className="text-sm font-semibold text-white">QuickBooks Online</h2>
          </div>
          <StatusBadge status={qbo?.connected ? 'active' : qbo?.configured ? 'connect' : 'draft'} />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {qbo?.connected
            ? `Connected${qbo.company ? ` to ${qbo.company}` : ''}. New invoices can be pushed straight into QuickBooks from Billing.`
            : qbo?.configured
              ? 'Connect your QuickBooks company to auto-sync invoices. You can also export a QuickBooks-ready CSV from Billing anytime.'
              : 'Set QBO_CLIENT_ID and QBO_CLIENT_SECRET (Intuit Developer app) to enable live sync. The QuickBooks CSV export in Billing works without this.'}
        </p>
        <div className="mt-4">
          {qbo?.connected ? (
            <Button variant="ghost" icon="solar:link-broken-linear" onClick={disconnectQbo}>Disconnect QuickBooks</Button>
          ) : qbo?.configured ? (
            <Button icon="solar:link-circle-linear" onClick={connectQbo}>Connect QuickBooks</Button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-xs text-zinc-500 ring-1 ring-white/10">
              <Icon name="solar:info-circle-linear" className="text-sm" />
              CSV export is available now; live sync needs an Intuit Developer app.
            </div>
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Subscription</h2>
            <div className="mt-1 text-xs text-zinc-500">Professional — Full ATS + CRM, AI agents, invoicing</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-white">$950<span className="text-sm text-zinc-500">/mo</span></div>
            {data.subscription ? (
              <StatusBadge status={data.subscription.status === 'active' ? 'active' : data.subscription.status} />
            ) : (
              <div className="text-xs text-zinc-500">{data.stripe ? 'Not subscribed' : 'Not connected'}</div>
            )}
          </div>
        </div>
        <div className="mt-4">
          {data.stripe ? (
            <Button icon="solar:card-linear" onClick={subscribe} className="w-full justify-center">
              {data.subscription?.status === 'active' ? 'Manage subscription via Stripe' : 'Subscribe — $950/mo'}
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-xs text-zinc-500 ring-1 ring-white/10">
              <Icon name="solar:info-circle-linear" className="text-sm" />
              Connect Stripe (STRIPE_SECRET_KEY + STRIPE_PRICE_ID + STRIPE_WEBHOOK_SECRET) to take real $950/mo subscriptions.
            </div>
          )}
          {data.stripe && !data.stripeWebhookConfigured && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-300">
              <Icon name="solar:danger-triangle-linear" className="mt-0.5 text-xs" />
              STRIPE_WEBHOOK_SECRET isn't set — checkout will work, but payment can never be confirmed. Add it so subscriptions actually activate.
            </p>
          )}
          {data.stripe && data.stripeWebhookConfigured && !data.subscription && (
            <p className="mt-2 text-[11px] text-zinc-600">Payment status is confirmed via Stripe webhook, not just the checkout redirect — it can take a few seconds to appear after subscribing.</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
