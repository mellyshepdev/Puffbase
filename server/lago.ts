// Lago billing client - customers are keyed by the Keycloak account so a
// Puffbase account maps 1:1 onto a Lago customer (external_id = KC sub).
//
// Env:
//   LAGO_API_URL   e.g. http://lago-api:3000 or http://<tailnet-ip>:3100
//   LAGO_API_KEY   org API key from the Lago dashboard
//
// Plans are created in Lago by the admin; this side only references plan
// codes (LAGO_PLAN_* or sent in the subscribe request).

const API_URL = (process.env.LAGO_API_URL ?? "").replace(/\/$/, "");
const API_KEY = process.env.LAGO_API_KEY ?? "";

export function lagoConfigured(): boolean {
  return !!API_URL && !!API_KEY;
}

async function lagoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Lago ${res.status} ${path}: ${detail.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

type LagoCustomer = { lago_id: string; external_id: string };

/** Idempotent: Lago treats create-with-same-external_id as an update.
 *  `stripeCustomerId` links the Lago customer to the saved Stripe card so
 *  invoices auto-charge it (provider "stripe" is configured org-wide). */
export async function ensureCustomer(
  externalId: string,
  email: string,
  name?: string,
  stripeCustomerId?: string,
): Promise<string> {
  const data = await lagoFetch<{ customer: LagoCustomer }>("/customers", {
    method: "POST",
    body: JSON.stringify({
      customer: {
        external_id: externalId,
        email,
        name: name ?? email,
        ...(stripeCustomerId
          ? {
              payment_provider: "stripe",
              payment_provider_code: "stripe",
              provider_customer: { provider_customer_id: stripeCustomerId },
            }
          : {}),
      },
    }),
  });
  return data.customer.lago_id;
}

export async function createSubscription(
  externalCustomerId: string,
  planCode: string,
): Promise<string> {
  const data = await lagoFetch<{ subscription: { lago_id: string } }>(
    "/subscriptions",
    {
      method: "POST",
      body: JSON.stringify({
        subscription: {
          external_id: crypto.randomUUID(),
          external_customer_id: externalCustomerId,
          plan_code: planCode,
        },
      }),
    },
  );
  return data.subscription.lago_id;
}

export async function getSubscription(
  externalCustomerId: string,
): Promise<unknown[]> {
  const data = await lagoFetch<{ subscriptions: unknown[] }>(
    `/subscriptions?external_customer_id=${encodeURIComponent(externalCustomerId)}`,
  );
  return data.subscriptions ?? [];
}

/** One usage event against the customer's subscription. `code` must match a
 *  billable metric defined in Lago (e.g. api_calls, sum_agg over `count`).
 *  Lago rejects events for unknown external_customer_ids, so callers must
 *  only emit for owners that already have a Lago customer. */
export async function emitUsageEvent(
  externalCustomerId: string,
  code: string,
  properties: Record<string, string | number>,
): Promise<void> {
  await lagoFetch("/events", {
    method: "POST",
    body: JSON.stringify({
      event: {
        transaction_id: crypto.randomUUID(),
        external_customer_id: externalCustomerId,
        code,
        timestamp: Math.floor(Date.now() / 1000),
        properties,
      },
    }),
  });
}

type LagoInvoice = {
  status: string;
  payment_status: string | null;
  issuing_date: string; // 'YYYY-MM-DD' - lexical compare works for ranges
  total_amount_cents: number;
  total_paid_amount_cents: number;
};

/** Recognized revenue = finalized invoices. This is the billing system's
 *  number, not a metric rollup, so the dashboard's revenue card and chart
 *  are real even while nobody writes `revenue` rows into `metrics`.
 *  Returns dollars (client formats USD), per-day for the chart. */
export async function revenueSummary(startDate: string): Promise<{
  totalDollars: number;
  paidDollars: number;
  byDay: Map<string, number>;
}> {
  const startDay = startDate.slice(0, 10);
  const byDay = new Map<string, number>();
  let totalCents = 0;
  let paidCents = 0;
  // Bounded pagination - 100/page covers years of invoices, and a pathological
  // history can't stall a dashboard request forever.
  for (let page = 1; page <= 5; page++) {
    const data = await lagoFetch<{
      invoices: LagoInvoice[];
      meta?: { current_page?: number; total_pages?: number };
    }>(`/invoices?status=finalized&per_page=100&page=${page}`);
    for (const inv of data.invoices ?? []) {
      if (inv.issuing_date < startDay) continue;
      totalCents += inv.total_amount_cents ?? 0;
      paidCents += inv.total_paid_amount_cents ?? 0;
      byDay.set(
        inv.issuing_date,
        (byDay.get(inv.issuing_date) ?? 0) + (inv.total_amount_cents ?? 0) / 100,
      );
    }
    const totalPages = data.meta?.total_pages ?? page;
    if (page >= totalPages) break;
  }
  return { totalDollars: totalCents / 100, paidDollars: paidCents / 100, byDay };
}
