"use client";
import React, { JSX, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMockClientData } from "@/app/mockData";
import { AreaChart } from "@/components/ui/chart";
import {
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  Droplet,
  BarChart3,
  ShieldAlert,
  ActivitySquare,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Alert as AlertComponent } from "@/components/ui/alert";
import axios from "axios";
import { useWealthStore } from "@/stores/wealth-store";

interface AlertItem {
  title: string;
  description: string;
  recommendation: string;
  category: AlertCategory;
}

interface NewsItem {
  stock: string;
  title: string;
  summary: string;
  publication_time: string;
  source: string;
  trading_insight: string;
  impact: "positive" | "negative" | "neutral";
}

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

export default function Page() {
  const data = getMockClientData();
  const { task2ID } = useWealthStore();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const getNewsIcon = (impact: string) => {
    switch (impact) {
      case "positive":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "negative":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  useEffect(() => {
    const fetchInsights = async () => {
      if (!task2ID) return; // Wait until it's defined

      try {
        console.log("task2ID:", task2ID);
        const result = await axios.get(`https://api.wealthpilot.turoid.ai/bankdemo/result_news/${task2ID}`);
        console.log(JSON.stringify(result, null, 2));
        const alertData = JSON.parse(result.data.result.Alerts);
        const newsData = JSON.parse(result.data.result.News);

        const parsedAlerts: AlertItem[] = alertData.alerts.map((item: any) => ({
          title: item.type,
          description: item.description,
          recommendation: item.recommendation,
          category: item.category,
        }));

        const parsedNews: NewsItem[] = newsData.flatMap((stockItem: any) =>
          stockItem.news.map((item: any) => ({
            stock: stockItem.stock,
            title: item.title,
            summary: item.summary,
            publication_time: item.publication_time,
            source: item.source,
            trading_insight: item.trading_insight,
            impact:
              item.trading_insight.includes("bullish") || item.trading_insight.includes("strong")
                ? "positive"
                : item.trading_insight.includes("volatility") || item.trading_insight.includes("down")
                ? "negative"
                : "neutral",
          }))
        );

        setAlerts(parsedAlerts);
        setNews(parsedNews);
      } catch (err) {
        console.error("Failed to fetch insights:", err);
      }
    };

    fetchInsights();
  }, [task2ID]);

  return (
    <div className="flex flex-col overflow-auto h-[calc(100vh-64px)] gap-4 p-4">
      {/* Cash Flow Chart */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Monthly Cash Flow</CardTitle>
          <CardDescription>Income vs. Expenses over past 12 months</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px] w-full">
            <AreaChart
              data={data.cashFlow}
              index="month"
              categories={["income", "expense"]}
              colors={["#2A9D8F", "#E63946"]}
              valueFormatter={formatCurrency}
              className="h-full w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Market News */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Relevant Market News</CardTitle>
          <CardDescription>News affecting your portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {news.length > 0 ? (
              news.map((item, idx) => (
                <div key={idx} className="flex items-start space-x-4 p-4 rounded-md bg-gray-50 hover:bg-gray-100">
                  <div className="mt-1">{getNewsIcon(item.impact)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        <span className="text-sm text-gray-400 mr-2">[{item.stock}]</span>
                        {item.title}
                      </h4>
                      <span className="text-sm text-gray-500">
                        {new Date(item.publication_time).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{item.summary}</p>
                    <p className="text-sm text-gray-500 mt-1">{item.source}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Loading news...</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Alerts & Notifications</h3>
        <div className="space-y-3">
          {alerts.length > 0 ? (
            alerts.map((alert, index) => {
              const meta = categoryMeta[alert.category];
              return (
                <div key={index} className={meta.color + " p-2 rounded-lg border"}>
                  <div className="flex flex-row items-start w-full">
                    <div className="mr-2 mt-1.5 shrink-0">{meta.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm">{alert.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">💡 {alert.recommendation}</p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">Loading alerts...</p>
          )}
        </div>
      </div>
    </div>
  );
}
