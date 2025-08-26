import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.SSL_MODE ? { rejectUnauthorized: false } : undefined,
});

// Allowed columns per section
const WHITELIST: Record<string, { table: string; cols: string[] }> = {
  basic: {
    table: "public.client",
    cols: [
      "tier_label","chinese_name","gender","introducer","referred_client","referral",
      "remarks","mfo_agreement_signed_on","created_by","created_at","updated_by",
      "updated_at","organization_type","registered_address","publicly_traded",
      "bo_control_type","boc_remarks",
    ],
  },
  personal: {
    table: "public.client_personal",
    cols: [
      "location","nationality","identity_id","date_of_birth","marital_status","employed",
      "number_of_children","profession","company","tin","country_of_tin","is_us_person",
      "school","education_level","remarks",
    ],
  },
  contact: {
    table: "public.client_contact",
    cols: ["preferred_comm","email","phone","fax","address","remarks"],
  },
};

export async function POST(req: NextRequest) {
  try {
    const { client_id, section, values } = (await req.json()) as {
      client_id?: number;
      section?: "basic" | "personal" | "contact";
      values?: Record<string, any>;
    };

    if (!client_id || !section || !values || !WHITELIST[section]) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    const meta = WHITELIST[section];
    const keys = Object.keys(values).filter((k) => meta.cols.includes(k));
    if (keys.length === 0) {
      return NextResponse.json({ error: "no updatable fields" }, { status: 400 });
    }

    // ensure child table row exists
    if (section !== "basic") {
      await pool.query(`insert into ${meta.table} (client_id) values ($1)
                        on conflict (client_id) do nothing`, [client_id]);
    }

    const set = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const params = [client_id, ...keys.map((k) => values[k])];

    await pool.query(
      `update ${meta.table} set ${set} where ${section === "basic" ? "id" : "client_id"} = $1`,
      params
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[profile/update] error", e);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}
