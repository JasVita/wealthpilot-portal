"use client";

import React, { JSX, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircleIcon } from "lucide-react";

import {
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  Droplet,
  BarChart3,
  ShieldAlert,
  ActivitySquare,
} from "lucide-react";

import axios from "axios";
import type { AlertItem, NewsItem } from "@/types";
import { useClientStore } from "@/stores/clients-store";

/* ─────────── Helpers ─────────── */
function safeJSONParse<T>(input: unknown, fallback: T): T {
  if (typeof input !== "string") return fallback;
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}
function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/* ─────────── Meta (unchanged) ─────────── */
type AlertCategory =
  | "1. Large/irregular fund movements"
  | "2. Concentration or high-risk portfolio issues"
  | "3. Maturity reminders (bonds, deposits, policies)"
  | "4. Low liquidity or excessive idle cash"
  | "5. AUM or performance fluctuations"
  | "6. Compliance issues (KYC/AML/documents)"
  | "7. Market event match for held positions";

const categoryMeta: Record<AlertCategory, { icon: JSX.Element; color: string }> = {
  "1. Large/irregular fund movements": {
    icon: <CircleDollarSign className="w-4 h-4 text-yellow-600" />,
    color: "bg-yellow-50 border-yellow-400 text-yellow-800",
  },
  "2. Concentration or high-risk portfolio issues": {
    icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
    color: "bg-red-50 border-red-400 text-red-800",
  },
  "3. Maturity reminders (bonds, deposits, policies)": {
    icon: <CalendarClock className="w-4 h-4 text-blue-600" />,
    color: "bg-blue-50 border-blue-400 text-blue-800",
  },
  "4. Low liquidity or excessive idle cash": {
    icon: <Droplet className="w-4 h-4 text-indigo-600" />,
    color: "bg-indigo-50 border-indigo-400 text-indigo-800",
  },
  "5. AUM or performance fluctuations": {
    icon: <BarChart3 className="w-4 h-4 text-orange-600" />,
    color: "bg-orange-50 border-orange-400 text-orange-800",
  },
  "6. Compliance issues (KYC/AML/documents)": {
    icon: <ShieldAlert className="w-4 h-4 text-rose-600" />,
    color: "bg-rose-50 border-rose-400 text-rose-800",
  },
  "7. Market event match for held positions": {
    icon: <ActivitySquare className="w-4 h-4 text-violet-600" />,
    color: "bg-violet-50 border-violet-400 text-violet-800",
  },
};
const fallbackMeta = {
  icon: <AlertTriangle className="w-4 h-4 text-gray-600" />,
  color: "bg-gray-50 border-gray-400 text-gray-800",
};

/* ─────────── Component ─────────── */
export default function Page() {
  /* ─ Local state ─ */
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const { currClient: clientId } = useClientStore();

  /* ─────────── Fetch Insights ─────────── */
  useEffect(() => {
    if (!clientId) return;

    const fetchInsights = async () => {
      setStatus("loading");
      try {
        const { data: res } = await axios.get<{
          alerts: string;
          news: string;
        }>(`${process.env.NEXT_PUBLIC_API_URL}/client/${clientId}/news-alerts`);

        /* ALERTS */
        const alertData = safeJSONParse<{ alerts?: any[] }>(res.alerts, {
          alerts: [],
        });
        const parsedAlerts: AlertItem[] = (alertData.alerts ?? []).map((item) => ({
          title: item?.type ?? "Untitled Alert",
          description: item?.description ?? "No description provided.",
          recommendation: item?.recommendation ?? "",
          category: (item?.category as AlertCategory) ?? "1. Large/irregular fund movements",
        }));

        /* NEWS */
        const rawNews = safeJSONParse<Record<string, any>>(res.news, {});
        const parsedNews: NewsItem[] = Object.entries(rawNews).flatMap(([stockSymbol, stockData]) =>
          (stockData?.news ?? []).map((item: any) => {
            const impactNum = toNumber(item?.forecasted_impact_pct);
            return {
              stock: stockSymbol,
              title: item?.title ?? "Untitled",
              summary: item?.summary ?? "No summary provided.",
              publication_time: item?.published_at ?? null,
              source: item?.source ?? "Unknown",
              trading_insight: item?.trading_insight ?? "",
              impact: impactNum ?? 0,
            } as unknown as NewsItem;
          })
        );

        setAlerts(parsedAlerts);
        setNews(parsedNews);
        setStatus("ready");
      } catch (err: any) {
        console.error("❌ Failed to fetch news & alerts:", err);
        setErrorMsg(err?.response?.data?.message || err.message || "Unknown error");
        setStatus("error");
      }
    };

    void fetchInsights();
  }, [clientId]);

  /* ─────────── Render States ─────────── */
  if (status === "idle") return <></>;

  if (status === "loading")
    return (
      <div className="p-6 space-y-4">
        {/* <Skeleton className="h-[340px] w-full rounded-xl" /> */}
        <Skeleton className="h-[220px] w-full rounded-xl" />
        <Skeleton className="h-[160px] w-full rounded-xl" />
      </div>
    );

  if (status === "error")
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircleIcon className="h-5 w-5" />
          <AlertTitle>Unable to load insights</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      </div>
    );

  return (
    <div className="flex flex-col overflow-auto h-[calc(100vh-64px)] gap-4 p-4">
      {/* Cash Flow Chart */}
      {/* <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Monthly Cash Flow</CardTitle>
          <CardDescription>Income vs. Expenses over past 12 months</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px] w-full">
            <AreaChart
              data={chartData}
              index="month"
              categories={["income", "expense"]}
              colors={["#2A9D8F", "#E63946"]}
              valueFormatter={fmtCurrency}
              className="h-full w-full"
            />
          </div>
        </CardContent>
      </Card> */}

      {/* Market News */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Relevant Market News</CardTitle>
          <CardDescription>News affecting your portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          {news.length ? (
            <div className="space-y-4">
              {news.map((item, idx) => {
                const impactValue = toNumber(item?.impact) ?? 0;
                const impactLabel = impactValue > 0 ? `+${impactValue}` : impactValue.toString();
                const impactClass =
                  impactValue > 0
                    ? "bg-green-100 text-green-800"
                    : impactValue < 0
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800";

                return (
                  <div key={idx} className="flex items-start space-x-4 p-4 rounded-md bg-gray-50 hover:bg-gray-100">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{item.stock}</h4>
                        <span className="text-sm text-gray-500">
                          {item.publication_time ? new Date(item.publication_time).toLocaleDateString() : "-"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{item.summary}</p>
                      {item.trading_insight && <p className="text-sm mt-1">{item.trading_insight}</p>}
                      <p className="text-sm text-gray-500 mt-1">{item.source}</p>
                      <p className={`text-sm mt-1 px-2 py-1 rounded ${impactClass}`}>
                        {`Turoid AI forecast: ${impactLabel}%`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {status === "ready" ? "No relevant news found for current holdings." : "Loading news..."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Alerts & Notifications</h3>
        {alerts.length ? (
          <div className="space-y-3">
            {alerts.map((alert, index) => {
              const meta = categoryMeta[alert.category as AlertCategory] ?? fallbackMeta;
              return (
                <div key={index} className={`${meta.color} p-2 rounded-lg border`}>
                  <div className="flex items-start">
                    <div className="mr-2 mt-1.5 shrink-0">{meta.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm">{alert.description}</p>
                      {alert.recommendation && (
                        <p className="text-xs text-muted-foreground mt-1">💡 {alert.recommendation}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {status === "ready" ? "No alerts for this period." : "Loading alerts..."}
          </p>
        )}
      </div>
    </div>
  );
}
