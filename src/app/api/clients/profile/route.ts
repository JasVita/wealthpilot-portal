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

function readClientIdGET(req: NextRequest) {
  const s = req.nextUrl.searchParams.get("client_id");
  return s ? Number(s) : undefined;
}
async function readClientIdPOST(req: NextRequest) {
  try {
    const b = await req.json().catch(() => ({}));
    return typeof b?.client_id !== "undefined" ? Number(b.client_id) : undefined;
  } catch {
    return undefined;
  }
}

async function fetchFromDb(clientId: number) {
  // (optional) app.get_client_profile if you add it later
  try {
    const q = await pool.query<{ profile: any }>(
      "select app.get_client_profile($1)::jsonb as profile",
      [clientId]
    );
    if (q.rowCount && q.rows[0]?.profile) return q.rows[0].profile;
  } catch {
    // ignore and build manually
  }

  // Manual compose from your existing tables
  const basicQ = await pool.query(
    `select id, code, name, status, client_type, tier_label, chinese_name, gender,
            mfo_agreement_signed_on, introducer, referred_client, referral, remarks,
            created_by, created_at, updated_by, updated_at,
            organization_type, registered_address, publicly_traded, bo_control_type, boc_remarks
     from public.client where id = $1`,
    [clientId]
  );
  if (!basicQ.rowCount) return null;

  const personalQ = await pool.query(
    `select location, nationality, identity_id, date_of_birth, marital_status, employed,
            number_of_children, profession, company, tin, country_of_tin, is_us_person,
            school, education_level, remarks
     from public.client_personal where client_id = $1`,
    [clientId]
  );

  const contactQ = await pool.query(
    `select preferred_comm, email, phone, fax, address, remarks
     from public.client_contact where client_id = $1`,
    [clientId]
  );

  const relQ = await pool.query(
    `select relationship_type as relationship,
            custodian, account_name, account_number, investment_strategy, institution
     from public.client_relationship
     where client_id = $1
     order by id`,
    [clientId]
  );

  return {
    basic: basicQ.rows[0],
    personal: personalQ.rows[0] ?? {},
    contact: contactQ.rows[0] ?? {},
    associated_clients: relQ.rows ?? [],
  };
}

async function handler(clientId?: number) {
  if (!clientId || Number.isNaN(clientId)) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }
  try {
    const data = await fetchFromDb(clientId);
    if (!data) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[profile] db error", e);
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
}

export async function GET(req: NextRequest) {
  const clientId = readClientIdGET(req);
  return handler(clientId);
}
export async function POST(req: NextRequest) {
  const clientId = await readClientIdPOST(req);
  return handler(clientId);
}
