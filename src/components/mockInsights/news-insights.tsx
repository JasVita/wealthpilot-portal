import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsItem {
  title: string;
  summary: string;
  timestamp: string;
  source: string;
  sentiment: "positive" | "negative" | "neutral";
  url: string;
}

interface AssetNewsData {
  assetClass: string;
  icon: React.ComponentType<{ className?: string }>;
  news: NewsItem[];
}

const newsData: AssetNewsData[] = [
  {
    assetClass: "U.S. Equities",
    icon: TrendingUp,
    news: [
      {
        title: "AI Stocks Drive S&P 500 to New Highs",
        summary: "Technology sector leads market gains as AI productivity gains accelerate across industries.",
        timestamp: "2h ago",
        source: "Financial Times",
        sentiment: "positive",
        url: "#",
      },
      {
        title: "Fed Policy Uncertainty Weighs on Market Sentiment",
        summary: "Investors remain cautious ahead of next policy meeting amid mixed economic signals.",
        timestamp: "4h ago",
        source: "Bloomberg",
        sentiment: "neutral",
        url: "#",
      },
    ],
  },
  {
    assetClass: "International Equities",
    icon: TrendingUp,
    news: [
      {
        title: "European Industrials See Strong Q3 Earnings",
        summary: "Defense and industrial stocks outperform as geopolitical tensions support sector demand.",
        timestamp: "1h ago",
        source: "Reuters",
        sentiment: "positive",
        url: "#",
      },
      {
        title: "Asia Ex-China Markets Benefit from Diversification",
        summary: "ASEAN markets attract flows as investors seek alternatives to China exposure.",
        timestamp: "3h ago",
        source: "Nikkei",
        sentiment: "positive",
        url: "#",
      },
    ],
  },
  {
    assetClass: "Government Bonds",
    icon: TrendingUp,
    news: [
      {
        title: "Treasury Yields Stabilize on Quality Demand",
        summary: "Flight to quality supports government bond markets amid global uncertainty.",
        timestamp: "2h ago",
        source: "Wall Street Journal",
        sentiment: "positive",
        url: "#",
      },
    ],
  },
  {
    assetClass: "Credit",
    icon: TrendingDown,
    news: [
      {
        title: "Credit Spreads Widen on Economic Concerns",
        summary: "Corporate credit faces pressure as managers turn cautious on spread compression.",
        timestamp: "1h ago",
        source: "Financial Times",
        sentiment: "negative",
        url: "#",
      },
    ],
  },
  {
    assetClass: "Commodities",
    icon: TrendingUp,
    news: [
      {
        title: "Gold Hits Multi-Month Highs on Safe Haven Demand",
        summary: "Precious metals rally as investors seek inflation hedges and portfolio diversification.",
        timestamp: "30m ago",
        source: "MarketWatch",
        sentiment: "positive",
        url: "#",
      },
      {
        title: "Industrial Metals Benefit from Infrastructure Spending",
        summary: "Copper and aluminum prices rise on renewed infrastructure investment globally.",
        timestamp: "2h ago",
        source: "Bloomberg",
        sentiment: "positive",
        url: "#",
      },
    ],
  },
  {
    assetClass: "Currencies",
    icon: TrendingDown,
    news: [
      {
        title: "Dollar Weakens on Fed Policy Expectations",
        summary: "USD index declines as markets price in more dovish monetary policy stance.",
        timestamp: "1h ago",
        source: "Reuters",
        sentiment: "negative",
        url: "#",
      },
    ],
  },
];

export function NewsInsights() {
  const getSentimentIcon = (sentiment: "positive" | "negative" | "neutral") => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="h-3 w-3 text-positive" />;
      case "negative":
        return <TrendingDown className="h-3 w-3 text-negative" />;
      case "neutral":
        return <Minus className="h-3 w-3 text-neutral" />;
    }
  };

  const getSentimentColor = (sentiment: "positive" | "negative" | "neutral") => {
    switch (sentiment) {
      case "positive":
        return "border-l-positive";
      case "negative":
        return "border-l-negative";
      case "neutral":
        return "border-l-neutral";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>News & Insights</CardTitle>
        <p className="text-sm text-muted-foreground">Latest headlines by asset class with sentiment analysis</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {newsData.map((assetData) => (
            <div key={assetData.assetClass} className="space-y-3">
              <div className="flex items-center gap-2">
                <assetData.icon className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-sm">{assetData.assetClass}</h4>
              </div>

              <div className="space-y-2">
                {assetData.news.map((newsItem, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-lg border-l-2 bg-muted/30 space-y-2",
                      getSentimentColor(newsItem.sentiment)
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-xs font-medium leading-tight">{newsItem.title}</h5>
                      {getSentimentIcon(newsItem.sentiment)}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">{newsItem.summary}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {newsItem.source}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{newsItem.timestamp}</span>
                      </div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary cursor-pointer" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          News feed updates every 15 minutes • Sentiment analysis powered by AI
        </div>
      </CardContent>
    </Card>
  );
}
