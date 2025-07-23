import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ManagerDetailModal } from "./manager-detail-modal";
import { ManagerPosition } from "./manager-matrix";

interface QuarterData {
  Q2: ManagerPosition[];
  Q3: ManagerPosition[];
}

const managersData: QuarterData = {
  Q2: [
    {
      manager: "M&G",
      positions: {
        usEquities: "negative",
        intlEquities: "negative",
        devGovBonds: "positive",
        emGovBonds: "neutral",
        igCredit: "negative",
        hyCredit: "negative",
        preciousMetals: "neutral",
        industrialMetals: "neutral",
        reits: "neutral",
        currencies: "positive",
      },
      notes: {
        usEquities: "Underweight equities especially U.S.",
        intlEquities: "Reduced equity exposure globally",
        devGovBonds: "Long duration in government bonds",
        emGovBonds: "Limited EM exposure",
        igCredit: "Underweight credit",
        hyCredit: "Cautious on high yield",
        preciousMetals: "Neutral precious metals",
        industrialMetals: "Limited commodity exposure",
        reits: "Neutral real estate",
        currencies: "Positive on Canada/Mexico currencies",
      },
      reasoning:
        "M&G maintains defensive posture with underweight equities (especially U.S.) and credit, while taking long duration positions in government bonds. Positive on Canada/Mexico currencies.",
      publicationDate: "2025-04-15",
    },
    {
      manager: "PGIM",
      positions: {
        usEquities: "neutral",
        intlEquities: "neutral",
        devGovBonds: "positive",
        emGovBonds: "positive",
        igCredit: "positive",
        hyCredit: "neutral",
        preciousMetals: "neutral",
        industrialMetals: "neutral",
        reits: "neutral",
        currencies: "neutral",
      },
      notes: {
        usEquities: "Defensive posture on equities",
        intlEquities: "Neutral international stance",
        devGovBonds: "Positive on high-quality fixed income",
        emGovBonds: "Slight preference for EM opportunities",
        igCredit: "Focus on quality credit",
        hyCredit: "Neutral high yield exposure",
        preciousMetals: "Neutral precious metals",
        industrialMetals: "Limited commodity exposure",
        reits: "Neutral real estate",
        currencies: "Balanced currency approach",
      },
      reasoning:
        "PGIM maintains defensive posture with neutral equities, positive on high-quality fixed income with slight preference for EM opportunities.",
      publicationDate: "2025-04-20",
    },
  ],
  Q3: [
    {
      manager: "PineBridge",
      positions: {
        usEquities: "neutral",
        intlEquities: "positive",
        devGovBonds: "positive",
        emGovBonds: "neutral",
        igCredit: "negative",
        hyCredit: "negative",
        preciousMetals: "neutral",
        industrialMetals: "neutral",
        reits: "neutral",
        currencies: "positive",
      },
      notes: {
        usEquities: "AI-driven productivity gains but expensive hedging",
        intlEquities: "Positive on non-U.S. equities, European industrials",
        devGovBonds: "Positive on government bonds",
        emGovBonds: "Selective EM exposure",
        igCredit: "Negative on investment-grade credit",
        hyCredit: "Negative on high-yield credit",
        preciousMetals: "Limited gold exposure",
        industrialMetals: "Selective exposure",
        reits: "Neutral real estate",
        currencies: "Positive on non-U.S. currencies",
      },
      reasoning:
        "PineBridge sees AI-driven productivity gains in the U.S. but notes expensive currency hedging. Favors European industrials, defense stocks, and China's DeepSeek-driven internet revival. Likes Indian stocks due to U.S.-China tensions.",
      publicationDate: "2025-07-01",
    },
    {
      manager: "BlackRock",
      positions: {
        usEquities: "positive",
        intlEquities: "neutral",
        devGovBonds: "positive",
        emGovBonds: "neutral",
        igCredit: "neutral",
        hyCredit: "neutral",
        preciousMetals: "neutral",
        industrialMetals: "positive",
        reits: "positive",
        currencies: "neutral",
      },
      notes: {
        usEquities: "Positive on U.S. equity overweight",
        intlEquities: "Neutral international stance",
        devGovBonds: "Positive on quality government bonds",
        emGovBonds: "Limited EM government exposure",
        igCredit: "Neutral on credit spreads",
        hyCredit: "Neutral high yield",
        preciousMetals: "Neutral gold",
        industrialMetals: "Real assets allocation",
        reits: "REITs as inflation hedge",
        currencies: "Diversified exposure",
      },
      reasoning:
        "BlackRock maintains positive stance on U.S. equities and government bonds while building real assets exposure as inflation hedge. Quality focus in fixed income.",
      publicationDate: "2025-06-20",
    },
    {
      manager: "Invesco",
      positions: {
        usEquities: "negative",
        intlEquities: "positive",
        devGovBonds: "positive",
        emGovBonds: "neutral",
        igCredit: "neutral",
        hyCredit: "positive",
        preciousMetals: "positive",
        industrialMetals: "positive",
        reits: "positive",
        currencies: "positive",
      },
      notes: {
        usEquities: "Underweight U.S. equities",
        intlEquities: "Positive on Europe, Korea, HK, Indonesia",
        devGovBonds: "Positive on quality government bonds",
        emGovBonds: "Selective EM exposure",
        igCredit: "Neutral IG credit exposure",
        hyCredit: "Positive on bank loans and HY",
        preciousMetals: "Positive on precious metals",
        industrialMetals: "Positive on industrial metals",
        reits: "Positive on REITs",
        currencies: "Positive on EM currencies",
      },
      reasoning:
        "Invesco underweights U.S. equities, favors Korea, Hong Kong and Indonesia. Positive on REITs, commodities and Europe. Positive on emerging market currencies.",
      publicationDate: "2025-06-30",
    },
    {
      manager: "BNY",
      positions: {
        usEquities: "neutral",
        intlEquities: "neutral",
        devGovBonds: "positive",
        emGovBonds: "neutral",
        igCredit: "negative",
        hyCredit: "negative",
        preciousMetals: "positive",
        industrialMetals: "positive",
        reits: "positive",
        currencies: "neutral",
      },
      notes: {
        usEquities: "Neutral equity stance",
        intlEquities: "Neutral international equities",
        devGovBonds: "Positive on government bonds",
        emGovBonds: "Limited EM exposure",
        igCredit: "Negative on investment-grade credit",
        hyCredit: "Negative on high yield",
        preciousMetals: "Positive on gold and precious metals",
        industrialMetals: "Positive on real assets",
        reits: "Positive on real estate",
        currencies: "Balanced approach",
      },
      reasoning:
        "BNY maintains neutral equities, positive on government bonds, negative on credit, and positive on real assets including gold and REITs.",
      publicationDate: "2025-06-25",
    },
    {
      manager: "Berenberg",
      positions: {
        usEquities: "positive",
        intlEquities: "positive",
        devGovBonds: "negative",
        emGovBonds: "neutral",
        igCredit: "neutral",
        hyCredit: "neutral",
        preciousMetals: "positive",
        industrialMetals: "positive",
        reits: "neutral",
        currencies: "positive",
      },
      notes: {
        usEquities: "Positive equity stance",
        intlEquities: "Positive on international equities",
        devGovBonds: "Negative on long-duration bonds",
        emGovBonds: "Neutral EM bonds",
        igCredit: "Neutral credit stance",
        hyCredit: "Neutral high yield",
        preciousMetals: "Positive on gold",
        industrialMetals: "Positive on metals",
        reits: "Neutral real estate",
        currencies: "Positive on yen",
      },
      reasoning:
        "Berenberg is positive on equities, negative on long-duration bonds, neutral on credit, positive on gold/metals, and positive on yen.",
      publicationDate: "2025-06-28",
    },
    {
      manager: "Allspring",
      positions: {
        usEquities: "negative",
        intlEquities: "negative",
        devGovBonds: "neutral",
        emGovBonds: "neutral",
        igCredit: "neutral",
        hyCredit: "neutral",
        preciousMetals: "neutral",
        industrialMetals: "neutral",
        reits: "neutral",
        currencies: "positive",
      },
      notes: {
        usEquities: "Negative on U.S. equities",
        intlEquities: "Negative on international equities",
        devGovBonds: "Neutral bonds",
        emGovBonds: "Neutral EM bonds",
        igCredit: "Neutral credit",
        hyCredit: "Neutral high yield",
        preciousMetals: "Neutral commodities",
        industrialMetals: "Neutral metals",
        reits: "Neutral real estate",
        currencies: "Positive currencies",
      },
      reasoning:
        "Allspring maintains negative stance on equities, neutral on bonds and credit, neutral on commodities, and positive on currencies.",
      publicationDate: "2025-07-02",
    },
    {
      manager: "J.P. Morgan",
      positions: {
        usEquities: "neutral",
        intlEquities: "neutral",
        devGovBonds: "positive",
        emGovBonds: "neutral",
        igCredit: "neutral",
        hyCredit: "neutral",
        preciousMetals: "positive",
        industrialMetals: "positive",
        reits: "positive",
        currencies: "neutral",
      },
      notes: {
        usEquities: "Neutral equity stance",
        intlEquities: "Neutral international equities",
        devGovBonds: "Positive on bonds",
        emGovBonds: "Neutral EM bonds",
        igCredit: "Neutral credit",
        hyCredit: "Neutral high yield",
        preciousMetals: "Positive on gold",
        industrialMetals: "Positive on real assets",
        reits: "Positive on real assets",
        currencies: "Neutral currencies",
      },
      reasoning:
        "J.P. Morgan maintains neutral equities, positive on bonds, neutral on credit, positive on real assets, and neutral on currencies.",
      publicationDate: "2025-06-18",
    },
    {
      manager: "RBC GAM",
      positions: {
        usEquities: "positive",
        intlEquities: "positive",
        devGovBonds: "neutral",
        emGovBonds: "neutral",
        igCredit: "neutral",
        hyCredit: "neutral",
        preciousMetals: "neutral",
        industrialMetals: "neutral",
        reits: "neutral",
        currencies: "neutral",
      },
      notes: {
        usEquities: "Positive but tilt to Europe",
        intlEquities: "Positive tilt toward Europe due to valuations",
        devGovBonds: "Neutral bonds",
        emGovBonds: "Limited EM exposure",
        igCredit: "Neutral credit stance",
        hyCredit: "Neutral high yield",
        preciousMetals: "Neutral precious metals",
        industrialMetals: "Limited commodity exposure",
        reits: "Neutral real estate",
        currencies: "Neutral approach",
      },
      reasoning:
        "RBC GAM maintains positive stance on equities with tilt toward Europe due to attractive valuations. Neutral on other asset classes.",
      publicationDate: "2025-06-25",
    },
    {
      manager: "Morgan Stanley",
      positions: {
        usEquities: "positive",
        intlEquities: "neutral",
        devGovBonds: "positive",
        emGovBonds: "positive",
        igCredit: "positive",
        hyCredit: "positive",
        preciousMetals: "neutral",
        industrialMetals: "neutral",
        reits: "neutral",
        currencies: "negative",
      },
      notes: {
        usEquities: "Slightly overweight high-quality U.S. stocks",
        intlEquities: "Neutral international stance",
        devGovBonds: "Positive on government bonds",
        emGovBonds: "Positive on EM bonds",
        igCredit: "Positive on securitized credit",
        hyCredit: "Positive on EM credit",
        preciousMetals: "Neutral precious metals",
        industrialMetals: "Neutral commodities",
        reits: "Neutral real estate",
        currencies: "Negative on non-U.S. currencies",
      },
      reasoning:
        "Morgan Stanley remains slightly overweight high-quality U.S. stocks, positive on government bonds and credit (securitized and EM), but negative on non-U.S. currencies.",
      publicationDate: "2025-06-28",
    },
    {
      manager: "LPL",
      positions: {
        usEquities: "neutral",
        intlEquities: "neutral",
        devGovBonds: "positive",
        emGovBonds: "neutral",
        igCredit: "negative",
        hyCredit: "neutral",
        preciousMetals: "positive",
        industrialMetals: "positive",
        reits: "positive",
        currencies: "positive",
      },
      notes: {
        usEquities: "Neutral equity stance",
        intlEquities: "Neutral international equities",
        devGovBonds: "Positive on government bonds",
        emGovBonds: "Neutral EM bonds",
        igCredit: "Negative on IG credit",
        hyCredit: "Neutral high yield",
        preciousMetals: "Positive on commodities",
        industrialMetals: "Positive on metals",
        reits: "Positive on real estate",
        currencies: "Positive on currencies",
      },
      reasoning:
        "LPL maintains neutral equities, positive on government bonds, negative on IG credit, positive on commodities and currencies.",
      publicationDate: "2025-07-01",
    },
    {
      manager: "T. Rowe Price",
      positions: {
        usEquities: "negative",
        intlEquities: "negative",
        devGovBonds: "negative",
        emGovBonds: "neutral",
        igCredit: "neutral",
        hyCredit: "positive",
        preciousMetals: "neutral",
        industrialMetals: "positive",
        reits: "positive",
        currencies: "positive",
      },
      notes: {
        usEquities: "Negative on equity exposure",
        intlEquities: "Negative on international equities",
        devGovBonds: "Negative on government bonds",
        emGovBonds: "Neutral EM bonds",
        igCredit: "Neutral IG credit",
        hyCredit: "Positive on high yield",
        preciousMetals: "Neutral precious metals",
        industrialMetals: "Positive on real-asset equities",
        reits: "Positive on real-asset equities",
        currencies: "Positive on currencies",
      },
      reasoning:
        "T. Rowe Price maintains negative stance on equities and government bonds, positive on high yield, real-asset equities, and currencies.",
      publicationDate: "2025-07-02",
    },
    {
      manager: "SSGA",
      positions: {
        usEquities: "positive",
        intlEquities: "positive",
        devGovBonds: "positive",
        emGovBonds: "neutral",
        igCredit: "positive",
        hyCredit: "positive",
        preciousMetals: "positive",
        industrialMetals: "neutral",
        reits: "neutral",
        currencies: "positive",
      },
      notes: {
        usEquities: "Neutral/positive with quality focus",
        intlEquities: "Europe and ASEAN discount highlighted",
        devGovBonds: "Positive on government bonds",
        emGovBonds: "Limited EM exposure",
        igCredit: "Positive on credit",
        hyCredit: "Overweight HY & MBS",
        preciousMetals: "Positive on gold",
        industrialMetals: "Limited commodity exposure",
        reits: "Neutral real estate",
        currencies: "Positive on currencies",
      },
      reasoning:
        "SSGA maintains neutral/positive stance on equities with quality focus, positive on government bonds, overweight HY & MBS, positive on gold and currencies.",
      publicationDate: "2025-06-18",
    },
  ],
};

const assetClasses = [
  { key: "usEquities", label: "US Equities" },
  { key: "intlEquities", label: "Int'l Equities" },
  { key: "devGovBonds", label: "Dev Gov't Bonds" },
  { key: "emGovBonds", label: "EM Gov't Bonds" },
  { key: "igCredit", label: "IG Credit" },
  { key: "hyCredit", label: "HY Credit" },
  { key: "preciousMetals", label: "Gold" },
  { key: "industrialMetals", label: "Metals" },
  { key: "reits", label: "REITs" },
  { key: "currencies", label: "FX" },
];

interface AccordionManagerMatrixProps {
  selectedQuarter: "Q2" | "Q3";
}

export function AccordionManagerMatrix({ selectedQuarter }: AccordionManagerMatrixProps) {
  const [selectedManager, setSelectedManager] = useState<ManagerPosition | null>(null);

  const currentData = managersData[selectedQuarter];

  const getPositionIcon = (position: "positive" | "negative" | "neutral") => {
    switch (position) {
      case "positive":
        return <ArrowUpRight className="h-3 w-3 text-positive" />;
      case "negative":
        return <ArrowDownRight className="h-3 w-3 text-negative" />;
      case "neutral":
        return <Minus className="h-3 w-3 text-neutral" />;
    }
  };

  const getOverallSentiment = (positions: ManagerPosition["positions"]) => {
    const values = Object.values(positions);
    const positive = values.filter((v) => v === "positive").length;
    const negative = values.filter((v) => v === "negative").length;

    if (positive > negative + 2) return "positive";
    if (negative > positive + 2) return "negative";
    return "neutral";
  };

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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Manager Positions (Condensed)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click on a manager to expand their detailed asset class positions
          </p>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {currentData.map((manager) => {
              const overallSentiment = getOverallSentiment(manager.positions);
              return (
                <AccordionItem key={manager.manager} value={manager.manager} className="border rounded-lg">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        {getSentimentIcon(overallSentiment)}
                        <span className="font-medium">{manager.manager}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Overall {overallSentiment}</div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      {/* Asset positions grid */}
                      <div className="grid grid-cols-5 gap-2">
                        {assetClasses.map((asset) => {
                          const position = manager.positions[asset.key as keyof typeof manager.positions];
                          const note = manager.notes[asset.key as keyof typeof manager.notes];
                          return (
                            <div key={asset.key} className="text-center">
                              <div className="text-xs text-muted-foreground mb-1">{asset.label}</div>
                              <div
                                className={cn(
                                  "inline-flex items-center justify-center w-8 h-8 rounded-full",
                                  position === "positive" && "bg-positive/10",
                                  position === "negative" && "bg-negative/10",
                                  position === "neutral" && "bg-neutral/10"
                                )}
                                title={note}
                              >
                                {getPositionIcon(position)}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Manager details button */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <p className="text-sm text-muted-foreground truncate pr-4">
                          {manager.reasoning.slice(0, 80)}...
                        </p>
                        <button
                          onClick={() => setSelectedManager(manager)}
                          className="text-xs text-primary hover:underline whitespace-nowrap"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 pt-4 border-t text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-3 w-3 text-positive" />
              <span>Positive</span>
            </div>
            <div className="flex items-center gap-2">
              <Minus className="h-3 w-3 text-neutral" />
              <span>Neutral</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-3 w-3 text-negative" />
              <span>Negative</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <ManagerDetailModal manager={selectedManager} onClose={() => setSelectedManager(null)} />
    </>
  );
}
