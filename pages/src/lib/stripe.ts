// Minimal Stripe Checkout client (plain fetch - the hosted page does all
// the card handling, nothing card-shaped touches this app). Mirrors
// server/stripe.ts: setup-mode Checkout puts a card on file, the account's
// plan is applied when confirmSetup() verifies the returned session.
// Config: STRIPE_SECRET_KEY. Absent key -> upgrade flows return 503 and the
// plan page shows "checkout unavailable".

const KEY = process.env.STRIPE_SECRET_KEY ?? "";
const API = "https://api.stripe.com/v1";

export function stripeConfigured(): boolean {
  return Boolean(KEY);
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...init?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `stripe ${res.status}`);
  return data as T;
}

/** Hosted Checkout session in setup mode. The user picks the plan first;
 *  Stripe collects the card, then returns them to /plan?session=... where
 *  confirmSetup() applies the plan + stores the customer id. */
export async function createCardSetupSession(
  accountId: string,
  plan: string,
  email: string,
  origin: string,
): Promise<string> {
  const body = new URLSearchParams({
    mode: "setup",
    currency: "usd",
    "payment_method_types[]": "card",
    customer_email: email,
    success_url: `${origin}/plan?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/plan?checkout=cancelled`,
    "metadata[accountId]": accountId,
    "metadata[plan]": plan,
  });
  const session = await call<{ url: string }>("/checkout/sessions", {
    method: "POST",
    body,
  });
  return session.url;
}

/** Verify a completed setup session belongs to this account+plan and hand
 *  back the Stripe customer id (which now has a default payment method). */
export async function confirmCardSetup(
  accountId: string,
  plan: string,
  sessionId: string,
): Promise<string | undefined> {
  const session = await call<{
    mode: string;
    status: string;
    metadata?: Record<string, string>;
    customer?: string | { id: string };
  }>(`/checkout/sessions/${encodeURIComponent(sessionId)}`).catch(() => null);
  if (!session) return undefined;
  if (
    session.mode !== "setup" ||
    session.status !== "complete" ||
    session.metadata?.accountId !== accountId ||
    session.metadata?.plan !== plan
  ) {
    return undefined;
  }
  const c = session.customer;
  return typeof c === "string" ? c : c?.id;
}
