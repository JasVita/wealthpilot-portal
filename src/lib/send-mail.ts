// src/lib/send-mail.ts
import nodemailer from "nodemailer";

/* ─── 1. Single, shared transport ────────────────────────────────── */
export const transport = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,              // live.smtp.mailtrap.io
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: false,                              // STARTTLS on 587
  auth: {
    user: process.env.SMTP_USER,              // api
    pass: process.env.SMTP_PASS,              // f864a…
  },
  /* optional but useful while debugging */
  logger: true,                               // ← log to console
  debug:  true,                               // ← show SMTP convo
});

/* ─── 2. API helper ──────────────────────────────────────────────── */
export function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  return transport.sendMail({
    from: process.env.EMAIL_FROM,             // "Wealth Pilot <hello@…>"
    ...opts,
  });
}

/* ─── 3. (optional) one‑time self‑test on server boot ────────────── */
if (process.env.NODE_ENV !== "test") {
  // eslint‑disable‑next‑line no-console
  console.log("[mail] Verifying SMTP configuration…");
  transport
    .verify()
    .then(() => console.log("[mail] ✅  SMTP connection OK"))
    .catch((err) => {
      console.error("[mail] ❌  SMTP connection failed:", err);
      // Fail fast in production – uncomment if you want the process to exit
      // process.exit(1);
    });
}
