// Customer-facing email over the fleet mailserver (docker-mailserver on
// unit8, submission :587). Config: SMTP_URL=smtp://user:pass@host:587 (or
// smtps:// for :465) and SMTP_FROM. All sends are fire-and-forget - mail
// never blocks a request or a generation run.
import nodemailer from "nodemailer";

const SMTP_URL = process.env.SMTP_URL ?? "";
const SMTP_FROM =
  process.env.SMTP_FROM ?? "Puffbase <puffbase@prime-quality.online>";

export function mailConfigured(): boolean {
  return Boolean(SMTP_URL);
}

const transporter = SMTP_URL ? nodemailer.createTransport(SMTP_URL) : null;

export function sendMail(
  to: string,
  subject: string,
  text: string,
  html?: string,
): void {
  if (!transporter) return;
  void transporter
    .sendMail({ from: SMTP_FROM, to, subject, text, html })
    .catch((error) => console.error(`[mail] send to ${to} failed`, error));
}

export interface InvoiceMail {
  number: string;
  amount: string; // pre-formatted, e.g. "$19.00"
  currency: string;
  issuingDate?: string;
  dueDate?: string;
  invoiceUrl?: string; // Lago-hosted PDF
  customerName?: string;
}

/** Puffbase-themed invoice email - dark card on the site's own palette, text
 *  fallback identical to the other sends. Fired by the Lago webhook when an
 *  invoice finalizes; the PDF link is hosted by Lago so no attachment is
 *  needed. */
export function sendInvoice(to: string, inv: InvoiceMail): void {
  const who = inv.customerName ? ` ${inv.customerName}` : "";
  const lines = [
    `Hi${who},`,
    ``,
    `Your Puffbase invoice ${inv.number} is ready:`,
    ``,
    `  Amount due: ${inv.amount} ${inv.currency}`,
    inv.issuingDate ? `  Issued:     ${inv.issuingDate}` : ``,
    inv.dueDate ? `  Due:        ${inv.dueDate}` : ``,
    ``,
    inv.invoiceUrl ? `View or download the PDF: ${inv.invoiceUrl}` : ``,
    ``,
    `- Puffbase`,
  ].filter((l) => l !== ``);
  const text = lines.join("\n").replace(/\n{3,}/g, "\n\n");

  const row = (k: string, v: string) =>
    `<tr><td style="padding:8px 0;color:#8b8fa3;font-size:13px">${k}</td>` +
    `<td style="padding:8px 0;color:#e8e9f2;font-size:14px;text-align:right">${v}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#0c0d12;color:#e8e9f2;` +
    `font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">` +
    `<div style="max-width:520px;margin:0 auto;padding:32px 16px">` +
    `<div style="font-size:20px;font-weight:700;color:#a78bfa;margin-bottom:4px">Puffbase</div>` +
    `<div style="font-size:13px;color:#8b8fa3;margin-bottom:24px">Invoice ${inv.number}</div>` +
    `<div style="background:#161822;border:1px solid #262840;border-radius:12px;padding:20px 24px">` +
    `<table style="width:100%;border-collapse:collapse">${row("Amount due", `<b>${inv.amount} ${inv.currency}</b>`)}` +
    (inv.issuingDate ? row("Issued", inv.issuingDate) : "") +
    (inv.dueDate ? row("Due", inv.dueDate) : "") +
    `</table></div>` +
    (inv.invoiceUrl
      ? `<div style="margin:24px 0"><a href="${inv.invoiceUrl}" style="display:inline-block;background:#7c3aed;` +
        `color:#fff;text-decoration:none;font-size:14px;padding:10px 20px;border-radius:8px">View invoice PDF</a></div>`
      : "") +
    `<div style="font-size:12px;color:#62667a;margin-top:28px">` +
    `Your card is charged automatically by Puffbase billing. Questions? Reply to this email.</div>` +
    `</div></body></html>`;

  sendMail(to, `Your Puffbase invoice ${inv.number}`, text, html);
}

export function sendSurveyReceived(to: string, siteName: string): void {
  sendMail(
    to,
    `Puffbase is building "${siteName}"`,
    [
      `We got your site survey for "${siteName}".`,
      ``,
      `Generation runs on our own hardware, not an instant API - expect several`,
      `minutes before the first preview is ready, sometimes longer.`,
      ``,
      `You do not need to wait on the page. We will email you at this address`,
      `the moment your preview is ready to review.`,
      ``,
      `- Puffbase`,
    ].join("\n"),
  );
}

export function sendSiteReady(to: string, siteName: string, url: string): void {
  sendMail(
    to,
    `Your Puffbase site "${siteName}" is ready`,
    [
      `The first version of "${siteName}" is generated and ready to review:`,
      ``,
      url,
      ``,
      `Open it, then send change instructions from the project page - each`,
      `revision takes a few minutes for the same reason.`,
      ``,
      `- Puffbase`,
    ].join("\n"),
  );
}

export function sendSiteLive(to: string, siteName: string, url: string): void {
  sendMail(
    to,
    `"${siteName}" is live`,
    [`"${siteName}" is published and serving at:`, ``, url, ``, `- Puffbase`].join(
      "\n",
    ),
  );
}
