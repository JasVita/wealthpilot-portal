import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface RegionData {
  region: string;
  sentiment: "positive" | "negative" | "neutral";
  summary: string;
  ytdReturn: number;
  index: string;
}

interface EconomicIndicator {
  indicator: string;
  value: string;
  change: number;
  unit: string;
  source: string;
}

const regionData: RegionData[] = [
  {
    region: "U.S.",
    sentiment: "neutral",
    summary:
      "PineBridge sees AI-driven productivity gains but notes expensive currency hedging. Invesco and RBC trim U.S. equities. Morgan Stanley slightly overweight high-quality U.S. stocks.",
    ytdReturn: 12.3,
    index: "S&P 500",
  },
  {
    region: "Europe",
    sentiment: "positive",
    summary:
      "PineBridge favors European industrials and defense stocks. RBC tilts toward Europe due to attractive valuations. Invesco overweight Europe. SSGA sees Europe trading at a discount.",
    ytdReturn: 8.7,
    index: "MSCI Europe",
  },
  {
    region: "ASEAN/Asia ex-China",
    sentiment: "positive",
    summary:
      "Invesco favors Korea, Hong Kong and Indonesia. SSGA highlights valuation discount. T. Rowe Price overweights Asia/EM.",
    ytdReturn: 15.2,
    index: "MSCI AC ASEAN",
  },
  {
    region: "China",
    sentiment: "neutral",
    summary:
      "PineBridge points to DeepSeek-driven revival of China's internet sector. Morgan Stanley remains cautious.",
    ytdReturn: -2.1,
    index: "CSI 300",
  },
  {
    region: "India",
    sentiment: "positive",
    summary: "PineBridge likes Indian stocks because India benefits from U.S.-China tensions.",
    ytdReturn: 18.4,
    index: "Nifty 50",
  },
];

const economicData: EconomicIndicator[] = [
  {
    indicator: "U.S. Inflation",
    value: "2.7%",
    change: -0.3,
    unit: "YoY",
    source: "BLS",
  },
  {
    indicator: "U.S. GDP Growth",
    value: "1.6%",
    change: -0.8,
    unit: "Annualized Q1",
    source: "BEA",
  },
  {
    indicator: "USD Index (DXY)",
    value: "105.2",
    change: -1.2,
    unit: "MoM",
    source: "Fed",
  },
  {
    indicator: "HK Inflation",
    value: "1.9%",
    change: 0.4,
    unit: "YoY",
    source: "C&SD",
  },
  {
    indicator: "HK GDP Growth",
    value: "3.1%",
    change: 0.7,
    unit: "Q1 YoY",
    source: "C&SD",
  },
];

const currencyData = [
  { pair: "USD/HKD", rate: "7.82", change: 0.1 },
  { pair: "USD/EUR", rate: "0.93", change: -1.8 },
  { pair: "USD/JPY", rate: "149.5", change: -2.3 },
];

export function MarketOverview() {
  const getSentimentIcon = (sentiment: "positive" | "negative" | "neutral") => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="h-4 w-4 text-positive" />;
      case "negative":
        return <TrendingDown className="h-4 w-4 text-negative" />;
      case "neutral":
        return <Minus className="h-4 w-4 text-neutral" />;
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3 text-positive" />;
    if (change < 0) return <TrendingDown className="h-3 w-3 text-negative" />;
    return <Minus className="h-3 w-3 text-neutral" />;
  };

  return (
    <div className="space-y-6">
      {/* Regional Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Market & Economic Overview</CardTitle>
          <p className="text-sm text-muted-foreground">Regional sentiment and key economic indicators</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Regional tiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {regionData.map((region) => (
              <div key={region.region} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{region.region}</h4>
                  {getSentimentIcon(region.sentiment)}
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {region.index}:{" "}
                    <span className={cn("font-medium", region.ytdReturn > 0 ? "text-positive" : "text-negative")}>
                      {region.ytdReturn > 0 ? "+" : ""}
                      {region.ytdReturn}%
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{region.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Economic Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Economic Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {economicData.map((item) => (
                <div key={item.indicator} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium text-sm">{item.indicator}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.unit} • {item.source}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg">{item.value}</span>
                    <div className="flex items-center gap-1">
                      {getChangeIcon(item.change)}
                      <span
                        className={cn(
                          "text-xs font-medium",
                          item.change > 0 ? "text-positive" : item.change < 0 ? "text-negative" : "text-neutral"
                        )}
                      >
                        {item.change > 0 ? "+" : ""}
                        {item.change}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Currency Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currencyData.map((item) => (
                <div key={item.pair} className="flex items-center justify-between">
                  <div className="font-medium">{item.pair}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{item.rate}</span>
                    <div className="flex items-center gap-1">
                      {getChangeIcon(item.change)}
                      <span className={cn("text-xs font-medium", item.change > 0 ? "text-positive" : "text-negative")}>
                        {item.change > 0 ? "+" : ""}
                        {item.change}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
              Quarterly change • Live data feed connection pending
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
