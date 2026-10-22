import type { Request } from "express";
import { createHmac } from "node:crypto";
import { storage } from "./storage";

/** Visitor counts for published builder sites. usage.ts only sees the
 *  signed-in owner's own PuffBase traffic; people visiting a site are
 *  anonymous, so they are counted here instead.
 *
 *  The site html is cached at the edge for 60s, so counting the GET would
 *  miss most loads. Instead the served document carries a tiny beacon that
 *  POSTs /_pb/hit from the visitor's browser on every load (POSTs are never
 *  cached). Each hit is attributed to a visitor id: an HMAC of IP + user
 *  agent keyed by the server secret and the UTC day, so a visitor counts once
 *  per day and ids can't be joined across days or reversed to an IP. Raw IPs
 *  are never stored. Hits aggregate in memory and flush every 60s into
 *  site_visits (one row per site per day per visitor). */

const FLUSH_MS = 60_000;
const SECRET =
  process.env.SESSION_SECRET ?? process.env.PUFFBASE_INTERNAL_TOKEN ?? "puffbase-visits";
// Link previews, crawlers and uptime checkers are not visitors.
const BOT_UA = /bot|crawl|spider|slurp|preview|monitor|uptime|headless|curl|wget|python|go-http/i;

const BEACON = `<script>(function(){try{var u="/_pb/hit";if(navigator.sendBeacon&&navigator.sendBeacon(u))return;fetch(u,{method:"POST",keepalive:true})}catch(e){}})()</script>`;

/** Adds the beacon to a published document, just before </body> when there
 *  is one. The stored html is untouched - only the served copy carries it. */
export function withVisitBeacon(html: string): string {
  const at = html.toLowerCase().lastIndexOf("</body>");
  return at === -1 ? html + BEACON : html.slice(0, at) + BEACON + html.slice(at);
}

// "subdomain\u0000day\u0000visitor" -> hits since the last flush
const pending = new Map<string, number>();

export function recordVisit(req: Request, subdomain: string): void {
  const ua = req.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return;
  const day = new Date().toISOString().slice(0, 10);
  const visitor = createHmac("sha256", `${SECRET}:${day}`)
    .update(`${req.ip ?? ""}|${ua}`)
    .digest("hex")
    .slice(0, 32);
  const key = `${subdomain}\u0000${day}\u0000${visitor}`;
  pending.set(key, (pending.get(key) ?? 0) + 1);
}

export function startVisitFlush(): void {
  storage
    .ensureSiteVisitsTable()
    .catch((e) => console.error("site_visits table check failed:", e));
  const timer = setInterval(async () => {
    if (pending.size === 0) return;
    const rows = Array.from(pending, ([key, views]) => {
      const [subdomain, day, visitor] = key.split("\u0000");
      return { subdomain, day, visitor, views };
    });
    pending.clear();
    try {
      await storage.addSiteVisits(rows);
    } catch (e) {
      // counts must never take a site down - a dead DB just drops the window
      console.error("visit flush failed:", e);
    }
  }, FLUSH_MS);
  timer.unref();
}
