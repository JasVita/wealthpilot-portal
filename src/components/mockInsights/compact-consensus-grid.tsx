import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, DollarSign, Globe, BarChart3, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetConsensus {
  assetClass: string;
  icon: React.ReactNode;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  sentiment: "positive" | "negative" | "neutral";
}

const consensusData: AssetConsensus[] = [
  {
    assetClass: "US Equities",
    icon: <TrendingUp className="h-4 w-4" />,
    positive: 3,
    neutral: 2,
    negative: 2,
    total: 7,
    sentiment: "neutral",
  },
  {
    assetClass: "Int'l Equities",
    icon: <Globe className="h-4 w-4" />,
    positive: 6,
    neutral: 1,
    negative: 0,
    total: 7,
    sentiment: "positive",
  },
  {
    assetClass: "Dev Gov't Bonds",
    icon: <BarChart3 className="h-4 w-4" />,
    positive: 7,
    neutral: 0,
    negative: 0,
    total: 7,
    sentiment: "positive",
  },
  {
    assetClass: "EM Gov't Bonds",
    icon: <Globe className="h-4 w-4" />,
    positive: 1,
    neutral: 5,
    negative: 1,
    total: 7,
    sentiment: "neutral",
  },
  {
    assetClass: "IG Credit",
    icon: <DollarSign className="h-4 w-4" />,
    positive: 1,
    neutral: 6,
    negative: 0,
    total: 7,
    sentiment: "neutral",
  },
  {
    assetClass: "HY Credit",
    icon: <BarChart3 className="h-4 w-4" />,
    positive: 1,
    neutral: 5,
    negative: 1,
    total: 7,
    sentiment: "neutral",
  },
  {
    assetClass: "Gold/Precious",
    icon: <Coins className="h-4 w-4" />,
    positive: 0,
    neutral: 7,
    negative: 0,
    total: 7,
    sentiment: "neutral",
  },
  {
    assetClass: "Industrial Met.",
    icon: <TrendingUp className="h-4 w-4" />,
    positive: 1,
    neutral: 6,
    negative: 0,
    total: 7,
    sentiment: "neutral",
  },
  {
    assetClass: "REITs",
    icon: <DollarSign className="h-4 w-4" />,
    positive: 2,
    neutral: 5,
    negative: 0,
    total: 7,
    sentiment: "neutral",
  },
  {
    assetClass: "Currencies",
    icon: <Globe className="h-4 w-4" />,
    positive: 2,
    neutral: 4,
    negative: 1,
    total: 7,
    sentiment: "neutral",
  },
];

interface CompactConsensusGridProps {
  selectedQuarter: "Q2" | "Q3";
}

export function CompactConsensusGrid({ selectedQuarter }: CompactConsensusGridProps) {
  // Update data description based on selected quarter
  const quarterText = selectedQuarter === "Q3" ? "Q3 2025" : "Q2 2025";

  const getSentimentColor = (sentiment: "positive" | "negative" | "neutral") => {
    switch (sentiment) {
      case "positive":
        return "border-positive/50 bg-positive/5";
      case "negative":
        return "border-negative/50 bg-negative/5";
      case "neutral":
        return "border-neutral/50 bg-neutral/5";
    }
  };

  const getSentimentIcon = (sentiment: "positive" | "negative" | "neutral") => {
    switch (sentiment) {
      case "positive":
        return <div className="w-3 h-3 rounded-full bg-positive"></div>;
      case "negative":
        return <div className="w-3 h-3 rounded-full bg-negative"></div>;
      case "neutral":
        return <div className="w-3 h-3 rounded-full bg-neutral"></div>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Class Sentiment Summary</CardTitle>
        <p className="text-sm text-muted-foreground">
          Aggregated consensus across {consensusData[0]?.total || 7} managers ({quarterText})
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {consensusData.map((data) => (
            <div
              key={data.assetClass}
              className={cn(
                "p-3 rounded-lg border-2 transition-all hover:shadow-sm",
                getSentimentColor(data.sentiment)
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-muted-foreground">{data.icon}</div>
                {getSentimentIcon(data.sentiment)}
              </div>

              <div className="space-y-1">
                <h4 className="font-medium text-sm leading-tight">{data.assetClass}</h4>
                <div className="text-xs text-muted-foreground">
                  {data.positive > 0 && <span className="text-positive">{data.positive} pos</span>}
                  {data.positive > 0 && (data.neutral > 0 || data.negative > 0) && ", "}
                  {data.neutral > 0 && <span className="text-neutral">{data.neutral} neu</span>}
                  {data.neutral > 0 && data.negative > 0 && ", "}
                  {data.negative > 0 && <span className="text-negative">{data.negative} neg</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-positive"></div>
            <span>Positive Majority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neutral"></div>
            <span>Neutral/Mixed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-negative"></div>
            <span>Negative Majority</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
