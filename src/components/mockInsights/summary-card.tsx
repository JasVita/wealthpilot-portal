import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  description: string;
  icon?: React.ReactNode;
  details?: string;
}

export function SummaryCard({ title, sentiment, description, icon, details }: SummaryCardProps) {
  const getSentimentIcon = () => {
    switch (sentiment) {
      case "positive":
        return <Plus className="h-6 w-6 text-positive" />;
      case "negative":
        return <Minus className="h-6 w-6 text-negative" />;
      case "neutral":
        return <Minus className="h-6 w-6 text-neutral" />;
      case "mixed":
        return <TrendingUp className="h-6 w-6 text-neutral" />;
      default:
        return null;
    }
  };

  const getSentimentColor = () => {
    switch (sentiment) {
      case "positive":
        return "border-l-positive";
      case "negative":
        return "border-l-negative";
      case "neutral":
        return "border-l-neutral";
      case "mixed":
        return "border-l-neutral";
      default:
        return "border-l-border";
    }
  };

  const getGaugeColor = () => {
    switch (sentiment) {
      case "positive":
        return "text-positive";
      case "negative":
        return "text-negative";
      case "neutral":
        return "text-neutral";
      case "mixed":
        return "text-neutral";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className={cn("border-l-4 transition-shadow hover:shadow-md", getSentimentColor())}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>{title}</span>
          <div className="flex items-center gap-2">
            {icon}
            {getSentimentIcon()}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Sentiment Gauge */}
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-8 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "absolute top-0 left-0 h-full rounded-full transition-all",
                  sentiment === "positive"
                    ? "w-full bg-positive"
                    : sentiment === "negative"
                    ? "w-full bg-negative"
                    : sentiment === "mixed"
                    ? "w-1/2 bg-neutral"
                    : "w-1/3 bg-neutral"
                )}
              />
            </div>
            <span className={cn("text-sm font-medium", getGaugeColor())}>
              {sentiment === "positive"
                ? "Positive"
                : sentiment === "negative"
                ? "Negative"
                : sentiment === "mixed"
                ? "Mixed"
                : "Neutral"}
            </span>
          </div>

          <p className="text-sm text-foreground leading-relaxed">{description}</p>

          {details && <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{details}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
