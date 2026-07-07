// Stripe webhook — the only reliable way to know a subscription is actually
// paid. The Checkout redirect (`success_url`) tells you the *customer's
// browser* came back; it does NOT confirm payment. Only the webhook, verified
// with the signing secret, is trustworthy server-side confirmation.
import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';

const ORG_ID = 1;
const TOLERANCE_SECONDS = 5 * 60; // reject events with a stale signature timestamp (replay protection)

function readIntegrations() {
  const row = db.prepare('SELECT integrations FROM organizations WHERE id = ?').get(ORG_ID);
  try { return JSON.parse(row?.integrations || '{}'); } catch { return {}; }
}
function writeIntegrations(obj) {
  db.prepare('UPDATE organizations SET integrations = ? WHERE id = ?').run(JSON.stringify(obj), ORG_ID);
}
export function getStripeSubscription() {
  return readIntegrations().stripe_subscription || null;
}

// Verifies the `Stripe-Signature` header against the raw request body.
// https://docs.stripe.com/webhooks#verify-manually
function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) throw new Error('Missing Stripe-Signature header');
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => p.split('=')).filter((p) => p.length === 2)
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) throw new Error('Malformed Stripe-Signature header');

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > TOLERANCE_SECONDS) throw new Error('Stripe webhook timestamp too old — possible replay');

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Stripe signature mismatch');
  }
}

const router = Router();

// Mounted with express.raw() in index.js — req.body is a Buffer here, not parsed JSON.
router.post('/webhook', (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[stripe] webhook received but STRIPE_WEBHOOK_SECRET is not set — rejecting');
    return res.status(503).send('Webhook not configured');
  }

  let event;
  try {
    verifyStripeSignature(req.body.toString('utf8'), req.headers['stripe-signature'], secret);
    event = JSON.parse(req.body.toString('utf8'));
  } catch (err) {
    console.error('[stripe] webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const integrations = readIntegrations();
  const obj = event.data?.object || {};

  switch (event.type) {
    case 'checkout.session.completed':
      integrations.stripe_subscription = {
        status: 'active',
        customer_id: obj.customer,
        subscription_id: obj.subscription,
        updated_at: new Date().toISOString(),
      };
      writeIntegrations(integrations);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.created':
      integrations.stripe_subscription = {
        ...(integrations.stripe_subscription || {}),
        status: obj.status, // active | past_due | canceled | unpaid | trialing …
        customer_id: obj.customer,
        subscription_id: obj.id,
        updated_at: new Date().toISOString(),
      };
      writeIntegrations(integrations);
      break;
    case 'customer.subscription.deleted':
      integrations.stripe_subscription = {
        ...(integrations.stripe_subscription || {}),
        status: 'canceled',
        updated_at: new Date().toISOString(),
      };
      writeIntegrations(integrations);
      break;
    default:
      // Ignore events we don't act on.
      break;
  }

  res.json({ received: true });
});

export default router;
