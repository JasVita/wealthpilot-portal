"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star } from "lucide-react";

import { useClientStore } from "@/stores/clients-store";

const fmtCurrency = (n?: number) =>
  n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function ClientListPage() {
  const router = useRouter();
  const { clients, order, setCurrClient, loadClients } = useClientStore();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Ensure the store is populated even if the user lands directly on /clients_clone
  useEffect(() => {
    if (!order.length) {
      setLoading(true);
      loadClients()
        .catch((e) => setErr(e?.message ?? "Failed to load clients"))
        .finally(() => setLoading(false));
    }
  }, [order.length, loadClients]);

  const rows = useMemo(() => order.map((id) => clients[id]).filter(Boolean), [order, clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.summary?.code ?? "").toLowerCase().includes(q) ||
        String(r.id).toLowerCase().includes(q)
    );
  }, [rows, query]);

  const totals = useMemo(() => {
    const sum = (fn: (n: number) => number) =>
      filtered.reduce((a, r) => a + fn((r.summary?.net_assets_usd as number) ?? 0), 0);

    const total_custodians = filtered.reduce((a, r) => a + (r.summary?.total_custodians || 0), 0);
    const net_assets =
      filtered.reduce((a, r) => a + (r.summary?.net_assets_usd || 0), 0) ||
      // fallback: derive from first pie if API didn’t send summary
      filtered.reduce(
        (a, r) => a + (r.pieChartData?.charts?.[0]?.data?.reduce((x, y) => x + y, 0) ?? 0),
        0
      );
    const total_assets = filtered.reduce((a, r) => a + (r.summary?.total_assets_usd || 0), 0);
    const total_debts = filtered.reduce((a, r) => a + (r.summary?.total_debts_usd || 0), 0);
    return { total_custodians, net_assets, total_assets, total_debts };
  }, [filtered]);

  const goToClient = (id: string) => {
    setCurrClient(id);
    router.push(`/clients_clone/${id}/assets`);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[320px] w-full" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Client List</AlertTitle>
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">Client List</div>
          <div className="text-sm text-muted-foreground">Click a client to open their detailed overview.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Export</Button>
          <Button variant="outline" size="sm">Table View Settings</Button>
          <Button size="sm">New Client</Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Client Name / Code / ID"
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Clients</CardTitle>
          <CardDescription>{filtered.length} result(s)</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Follow</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Total Custodians</TableHead>
                <TableHead className="text-right">Net Assets USD</TableHead>
                <TableHead className="text-right">Total Assets USD</TableHead>
                <TableHead className="text-right">Total Debts USD</TableHead>
                <TableHead>RM</TableHead>
                <TableHead>Mandate Type</TableHead>
                <TableHead className="text-center">Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>App</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const s = c.summary ?? {};
                const netFromPie = c.pieChartData?.charts?.[0]?.data?.reduce((a, b) => a + b, 0);
                const net = s.net_assets_usd ?? netFromPie;
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => goToClient(c.id)}>
                    <TableCell>
                      <Star className={`h-4 w-4 ${s.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    </TableCell>
                    <TableCell className="space-y-0.5">
                      <div className="font-medium leading-tight">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{s.code ?? c.id}</div>
                    </TableCell>
                    <TableCell className="text-right">{s.total_custodians ?? "—"}</TableCell>
                    <TableCell className="text-right">{fmtCurrency(net)}</TableCell>
                    <TableCell className="text-right">{fmtCurrency(s.total_assets_usd)}</TableCell>
                    <TableCell className="text-right">{fmtCurrency(s.total_debts_usd)}</TableCell>
                    <TableCell>{s.rm ?? "—"}</TableCell>
                    <TableCell>{s.mandate_type ?? "—"}</TableCell>
                    <TableCell className="text-center">{s.risk_profile ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.status ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      {s.app_status ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{s.app_status}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Totals row */}
              <TableRow className="font-semibold">
                <TableCell />
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{totals.total_custodians}</TableCell>
                <TableCell className="text-right">{fmtCurrency(totals.net_assets)}</TableCell>
                <TableCell className="text-right">{fmtCurrency(totals.total_assets)}</TableCell>
                <TableCell className="text-right">{fmtCurrency(totals.total_debts)}</TableCell>
                <TableCell colSpan={5} />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
