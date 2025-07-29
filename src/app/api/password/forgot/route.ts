import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt  from "bcryptjs";
import { getPool } from "@/lib/db";
import { sendMail } from "@/lib/send-mail";

export const runtime = "nodejs";          // ✅ ensure Node runtime
export const dynamic = "force-dynamic";   // avoid static optimisation

export async function POST(req: Request) {
  const { email } = await req.json();

  // look up user; *always* pretend success to prevent enumeration
  const { rows } = await getPool().query<{ id: number }>(
    "SELECT id FROM public.users WHERE LOWER(username)=LOWER($1) LIMIT 1",
    [email],
  );
  if (!rows.length) return NextResponse.json({ ok: true });

  // create token (256‑bit) and hash
  const token = crypto.randomBytes(32).toString("hex");
  const hash  = await bcrypt.hash(token, 10);

  await getPool().query(
    `UPDATE public.users
        SET reset_token_hash=$1,
            reset_token_exp =now() + interval '1 hour',
            reset_token_used=false
      WHERE id=$2`,
    [hash, rows[0].id],
  );

  const link =
    `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  await sendMail({
    to: email,
    subject: "Reset your Wealth Pilot password",
    text:  `Click the link to reset: ${link}`,
    html:  `<p>Click <a href="${link}">here</a> to reset your password.</p>`,
  });

  return NextResponse.json({ ok: true });
}
