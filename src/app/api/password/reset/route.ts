import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  const { token, password } = await req.json();
  if (!token || !password)
    return NextResponse.json({ ok: false }, { status: 400 });

  // fetch all users that have an un‑used, un‑expired reset token
  const { rows } = await pool.query<{
    id: number;
    reset_token_hash: string | null;
    reset_token_exp:  Date   | null;
    reset_token_used: boolean;
  }>(
    `SELECT id, reset_token_hash, reset_token_exp, reset_token_used
       FROM public.users
      WHERE reset_token_hash IS NOT NULL
        AND reset_token_used = FALSE
        AND reset_token_exp  > now()`,
  );

  const user = rows.find((u) => bcrypt.compareSync(token, u.reset_token_hash!));
  if (!user)
    return NextResponse.json(
      { ok: false, message: "Invalid or expired link" },
      { status: 400 },
    );

  // mark token used + set new password
  const newHash = await bcrypt.hash(password, 10);
  await pool.query(
    `UPDATE public.users
        SET password_hash   = $1,
            reset_token_used = TRUE
      WHERE id = $2`,
    [newHash, user.id],
  );

  return NextResponse.json({ ok: true });
}
