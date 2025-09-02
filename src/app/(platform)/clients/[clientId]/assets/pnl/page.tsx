"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import { MOCK_UI, USE_MOCKS } from "@/lib/dev-logger"; // ← mock styling helper

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/* ------------------------------ helpers ------------------------------ */

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);

const fmtPct = (v: number) =>
  `${v >= 0 ? "+" : ""}${v.toFixed(2)} %`;

function Pct({ v }: { v: number }) {
  const tone =
    v > 0 ? "text-emerald-600" : v < 0 ? "text-rose-600" : "text-muted-foreground";
  return <span className={tone}>{fmtPct(v)}</span>;
}

/* ------------------------------ mock data ------------------------------ */

const METRICS = [
  { key: "MTD", value: 1796.36, range: "31-07 → 08-07", change: 0.0 },
  { key: "QTD", value: 1978.32, range: "05-30 → 08-07", change: 0.0 },
  { key: "YTD", value: 30327.18, range: "2024-12-31 → 08-07", change: 0.12 },
  { key: "Cumulative", value: 231706.39, range: "2024-05-30 → 08-07", change: 1.006 },
];

const PROFIT_DISTRIBUTION_ROWS = [
  {
    acct: "JP Morgan SG 5201230 — Blue Pool",
    endingNetAssets: 251706.39,
    cumulativeNetPL: 229708.39,
    m25_03: -0.27,
    m25_04: 3.85,
    m25_05: 0.535,
  },
  {
    acct: "UBS SG 054600881789",
    endingNetAssets: 19718396.0,
    cumulativeNetPL: 0,
    m25_03: 0,
    m25_04: 0,
    m25_05: 0,
  },
  {
    acct: "UBS SG 054600880825",
    endingNetAssets: 30874506.0,
    cumulativeNetPL: 0,
    m25_03: 0,
    m25_04: 0,
    m25_05: 0,
  },
];

const MONTHS = [ "2024-08", "2024-09", "2024-10", "2024-11", "2024-12", "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08" ];

type ChangeRow = {
  month: string;
  mtd: number;
  realized: number;
  unrealized: number;
  fx: number;
  dividends: number;
  twrPct: number;
};

// mostly zeros to mirror the screenshot; sprinkle a few tiny values
const CHANGE_ROWS: ChangeRow[] = MONTHS.map((m, i) => ({
  month: m,
  mtd: i === 7 ? 5000 : 0, // 2025-03 bump
  realized: 0,
  unrealized: i === 4 ? 1200 : 0, // 2024-12 small
  fx: 0,
  dividends: i === 9 ? 300 : 0, // 2025-05 small
  twrPct: i === 7 ? 0.15 : 0,
}));

/* ------------------------------ chart data ------------------------------ */

function useBarData(range: string) {
  // range: "1M" | "3M" | "6M" | "YTD" | "1Y"
  const labels = useMemo(() => {
    switch (range) {
      case "1M":
        return MONTHS.slice(-1);
      case "3M":
        return MONTHS.slice(-3);
      case "6M":
        return MONTHS.slice(-6);
      case "YTD":
        // from Jan to current (last item)
        return MONTHS.filter((m) => m.startsWith("2025-"));
      default:
        return MONTHS; // 1Y
    }
  }, [range]);

  const values = labels.map((l) => {
    const row = CHANGE_ROWS.find((r) => r.month === l);
    return row ? row.mtd + row.unrealized + row.realized + row.fx + row.dividends : 0;
  });

  return {
    labels,
    datasets: [
      {
        label: "P&L in USD",
        data: values,
        backgroundColor: "#0f172a",
        borderSkipped: false,
        borderRadius: 4,
      },
    ],
  };
}

/* ------------------------------ components ------------------------------ */

function Metric({
  title,
  value,
  range,
  change,
}: {
  title: string;
  value: number;
  range: string;
  change: number;
}) {
  return (
    <Card className={MOCK_UI(USE_MOCKS)}>
      <CardContent className="pt-4">
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className="text-2xl font-semibold mt-1">{fmtCurrency(value)}</div>
        <div className="text-[11px] mt-1 text-muted-foreground">{range}</div>
        <div className="text-xs mt-1">
          <Pct v={change} />
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------------- page --------------------------------- */

export default function PnlPage() {
  const [range, setRange] = useState<"1M" | "3M" | "6M" | "YTD" | "1Y">("1Y");
  const barData = useBarData(range);

  return (
    <div className="flex flex-col gap-4">
      {/* Metric cards */}
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${MOCK_UI(USE_MOCKS, { badge: false })}`}>
        {METRICS.map((m) => (
          <Metric
            key={m.key}
            title={m.key}
            value={m.value}
            range={m.range}
            change={m.change}
          />
        ))}
      </div>

      {/* Chart */}
      <Card className={MOCK_UI(USE_MOCKS)}>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">P&amp;L in USD (TWR)</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={(v: any) => setRange(v)}>
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1M">1M</SelectItem>
                <SelectItem value="3M">3M</SelectItem>
                <SelectItem value="6M">6M</SelectItem>
                <SelectItem value="YTD">YTD</SelectItem>
                <SelectItem value="1Y">1Y</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { ticks: { callback: (v) => fmtCurrency(Number(v)) } },
                },
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Profit Distribution */}
      <Card  className={MOCK_UI(USE_MOCKS)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            Profit Distribution (2024-08 → 2025-08)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Custodian/Account</TableHead>
                <TableHead className="text-right">Ending Net Assets $</TableHead>
                <TableHead className="text-right">Cumulative Net P&amp;L $</TableHead>
                <TableHead className="text-right">Net P&amp;L % 25-03</TableHead>
                <TableHead className="text-right">Net P&amp;L % 25-04</TableHead>
                <TableHead className="text-right">Net P&amp;L % 25-05</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PROFIT_DISTRIBUTION_ROWS.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.acct}</TableCell>
                  <TableCell className="text-right">{fmtCurrency(r.endingNetAssets)}</TableCell>
                  <TableCell className="text-right">{fmtCurrency(r.cumulativeNetPL)}</TableCell>
                  <TableCell className="text-right">
                    <Pct v={r.m25_03} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Pct v={r.m25_04} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Pct v={r.m25_05} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Change in market value */}
      <Card  className={MOCK_UI(USE_MOCKS)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            Change in market valued in USD (2024-08 → 2025-08)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">MTD $</TableHead>
                <TableHead className="text-right">Realized $</TableHead>
                <TableHead className="text-right">Unrealized $</TableHead>
                <TableHead className="text-right">FX $</TableHead>
                <TableHead className="text-right">Dividends $</TableHead>
                <TableHead className="text-right">TWR %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CHANGE_ROWS.map((r) => (
                <TableRow key={r.month}>
                  <TableCell>{r.month}</TableCell>
                  <TableCell className="text-right">{fmtCurrency(r.mtd)}</TableCell>
                  <TableCell className="text-right">{fmtCurrency(r.realized)}</TableCell>
                  <TableCell className="text-right">{fmtCurrency(r.unrealized)}</TableCell>
                  <TableCell className="text-right">{fmtCurrency(r.fx)}</TableCell>
                  <TableCell className="text-right">{fmtCurrency(r.dividends)}</TableCell>
                  <TableCell className="text-right">
                    <Pct v={r.twrPct} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
