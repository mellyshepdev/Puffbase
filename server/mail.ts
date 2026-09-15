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

export function sendMail(to: string, subject: string, text: string): void {
  if (!transporter) return;
  void transporter
    .sendMail({ from: SMTP_FROM, to, subject, text })
    .catch((error) => console.error(`[mail] send to ${to} failed`, error));
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
