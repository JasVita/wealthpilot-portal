import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// export function sendMail(opts: { to: string; subject: string; text: string; html: string }) {
//   return transport.sendMail({
//     from: process.env.EMAIL_FROM,
//     ...opts,
//   });
// }

export async function sendMail(opts: { to: string; subject: string; text: string; html: string }) {
  const nodemailer = (await import("nodemailer")).default;
  const transport  = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transport.sendMail({ from: process.env.EMAIL_FROM, ...opts });
}