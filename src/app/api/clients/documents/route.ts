import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function intOrUndef(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function fetchDocs(clientId: number) {
  const pool = getPool();
  // Pull the same columns you showed from get_client_documents_info
  const q = await pool.query<{
    id: number;
    client_id: number;
    bank_id: number;
    bank_name: string;
    account_number: string | null;
    as_of_date: string | null;
    created_at: string | null;
    pdf_url: string | null;
    excel_url: string | null;
  }>(
    `
    select id, client_id, bank_id, bank_name, account_number, as_of_date, created_at, pdf_url, excel_url
    from public.get_client_documents_info($1)
    order by as_of_date desc nulls last, created_at desc nulls last, id desc
  `,
    [clientId]
  );

  const documents = (q.rows ?? []).map((r) => ({
    id: String(r.id),
    bankname: r.bank_name,
    account_number: r.account_number,
    as_of_date: r.as_of_date ? new Date(r.as_of_date).toISOString() : null,
    pdf_url: r.pdf_url,
    excel_url: r.excel_url,
    bank_id: String(r.bank_id),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
  }));

  return { status: "ok", count: documents.length, documents };
}

async function handle(req: NextRequest) {
  let clientId: number | undefined;

  if (req.method === "GET") {
    clientId = intOrUndef(req.nextUrl.searchParams.get("client_id"));
  } else {
    const body = await req.json().catch(() => ({} as any));
    clientId = intOrUndef(body?.client_id);
  }

  if (!clientId) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }

  try {
    const data = await fetchDocs(clientId);
    return NextResponse.json(data);
  } catch (e) {
    console.error("[documents list] error:", e);
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }
}

export async function GET(req: NextRequest)  { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
