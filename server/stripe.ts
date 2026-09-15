// Card collection via Stripe Checkout in setup mode: the customer enters
// card details on Stripe's hosted page (nothing card-shaped touches this
// server - PCI stays out of our scope), Stripe returns a Customer with a
// saved payment method. Charged later by Lago/invoice flow, not here.
// Config: STRIPE_SECRET_KEY + APP_URL. Absent key -> builder skips the card
// step entirely (dev/local).
import Stripe from "stripe";

const KEY = process.env.STRIPE_SECRET_KEY ?? "";
const APP_URL = (process.env.APP_URL ?? "https://puffbase.prime-quality.online").replace(/\/$/, "");

export function stripeConfigured(): boolean {
  return Boolean(KEY);
}

const stripe = KEY ? new Stripe(KEY) : null;

/** Hosted Checkout session in setup mode. Returns the URL to redirect the
 *  user to. On completion Stripe sends them back to the builder project
 *  page, and confirmCardSetup() reads the session to save the customer. */
export async function createCardSetupSession(
  projectId: number,
  email: string,
): Promise<string> {
  if (!stripe) throw new Error("Stripe not configured");
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer_email: email || undefined,
    success_url: `${APP_URL}/#/builder/${projectId}?card=ok&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/#/builder/${projectId}?card=cancelled`,
    metadata: { projectId: String(projectId) },
  });
  return session.url!;
}

/** Verify a completed setup-mode session belongs to this project and hand
 *  back the Stripe customer id, which now has a default payment method. */
export async function confirmCardSetup(
  projectId: number,
  sessionId: string,
): Promise<string | undefined> {
  if (!stripe) return undefined;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (
    session.mode !== "setup" ||
    session.status !== "complete" ||
    session.metadata?.projectId !== String(projectId)
  ) {
    return undefined;
  }
  const customer = session.customer;
  return typeof customer === "string" ? customer : customer?.id;
}
