import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ManagerDetailModal } from "./manager-detail-modal";

export interface ManagerPosition {
  manager: string;
  positions: {
    usEquities: "positive" | "negative" | "neutral";
    intlEquities: "positive" | "negative" | "neutral";
    devGovBonds: "positive" | "negative" | "neutral";
    emGovBonds: "positive" | "negative" | "neutral";
    igCredit: "positive" | "negative" | "neutral";
    hyCredit: "positive" | "negative" | "neutral";
    preciousMetals: "positive" | "negative" | "neutral";
    industrialMetals: "positive" | "negative" | "neutral";
    reits: "positive" | "negative" | "neutral";
    currencies: "positive" | "negative" | "neutral";
  };
  notes: {
    usEquities: string;
    intlEquities: string;
    devGovBonds: string;
    emGovBonds: string;
    igCredit: string;
    hyCredit: string;
    preciousMetals: string;
    industrialMetals: string;
    reits: string;
    currencies: string;
  };
  reasoning: string;
  publicationDate: string;
}

const managersData: ManagerPosition[] = [
  {
    manager: "Allianz GI",
    positions: {
      usEquities: "positive",
      intlEquities: "positive",
      devGovBonds: "positive",
      emGovBonds: "positive",
      igCredit: "neutral",
      hyCredit: "negative",
      preciousMetals: "neutral",
      industrialMetals: "neutral",
      reits: "neutral",
      currencies: "negative",
    },
    notes: {
      usEquities: "Equity allocations north of 70%",
      intlEquities: "International equity overweight",
      devGovBonds: "Favor quality government bonds",
      emGovBonds: "EM hard-currency bonds attractive",
      igCredit: "Selective IG credit exposure",
      hyCredit: "Cautious on high yield",
      preciousMetals: "Neutral gold allocation",
      industrialMetals: "Limited exposure",
      reits: "Neutral REIT allocation",
      currencies: "USD weakness expected",
    },
    reasoning:
      "Allianz GI maintains high equity allocation while favoring quality fixed income. Expects continued USD weakness amid global rebalancing.",
    publicationDate: "2025-06-15",
  },
  {
    manager: "Berenberg",
    positions: {
      usEquities: "positive",
      intlEquities: "positive",
      devGovBonds: "positive",
      emGovBonds: "neutral",
      igCredit: "positive",
      hyCredit: "negative",
      preciousMetals: "positive",
      industrialMetals: "positive",
      reits: "neutral",
      currencies: "neutral",
    },
    notes: {
      usEquities: "Overweight developed markets",
      intlEquities: "Europe focus with selective EM",
      devGovBonds: "High-quality sovereign focus",
      emGovBonds: "Limited EM government exposure",
      igCredit: "Investment grade preferred",
      hyCredit: "Cautious on credit spreads",
      preciousMetals: "Gold overweight",
      industrialMetals: "Industrial metals positive",
      reits: "Neutral real estate",
      currencies: "Balanced currency exposure",
    },
    reasoning:
      "Berenberg takes a broadly constructive view across asset classes, emphasizing quality and inflation protection strategies.",
    publicationDate: "2025-06-10",
  },
  {
    manager: "PineBridge",
    positions: {
      usEquities: "neutral",
      intlEquities: "positive",
      devGovBonds: "neutral",
      emGovBonds: "neutral",
      igCredit: "positive",
      hyCredit: "negative",
      preciousMetals: "neutral",
      industrialMetals: "neutral",
      reits: "neutral",
      currencies: "positive",
    },
    notes: {
      usEquities: "Neutral US equity stance",
      intlEquities: "Germany & China opportunities",
      devGovBonds: "Duration-neutral stance",
      emGovBonds: "Selective EM exposure",
      igCredit: "Investment-grade credit focus",
      hyCredit: "Cautious on high-yield spreads",
      preciousMetals: "Limited gold exposure",
      industrialMetals: "Selective exposure",
      reits: "Neutral real estate",
      currencies: "EUR and EM currencies positive",
    },
    reasoning:
      "PineBridge sees opportunities in Germany, China and investment-grade credit; cautious on high-yield spreads.",
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
      usEquities: "US equity overweight",
      intlEquities: "Neutral international stance",
      devGovBonds: "Quality bias maintained",
      emGovBonds: "Limited EM government exposure",
      igCredit: "Cautious on spreads",
      hyCredit: "Neutral high yield",
      preciousMetals: "Neutral gold",
      industrialMetals: "Real assets allocation",
      reits: "REITs as inflation hedge",
      currencies: "Diversified exposure",
    },
    reasoning:
      "BlackRock maintains US equity overweight while building real assets exposure as inflation hedge. Quality focus in fixed income.",
    publicationDate: "2025-06-20",
  },
  {
    manager: "M&G",
    positions: {
      usEquities: "negative",
      intlEquities: "negative",
      devGovBonds: "positive",
      emGovBonds: "neutral",
      igCredit: "negative",
      hyCredit: "negative",
      preciousMetals: "positive",
      industrialMetals: "neutral",
      reits: "neutral",
      currencies: "neutral",
    },
    notes: {
      usEquities: "Cautious on US valuations",
      intlEquities: "Risk-off international stance",
      devGovBonds: "Safe haven preference",
      emGovBonds: "Limited EM exposure",
      igCredit: "Credit risk concerns",
      hyCredit: "High yield underweight",
      preciousMetals: "Gold allocation increased",
      industrialMetals: "Neutral commodities",
      reits: "Neutral real estate",
      currencies: "USD neutrality",
    },
    reasoning:
      "M&G takes defensive stance on risk assets, preferring safe haven bonds and gold amid valuation concerns.",
    publicationDate: "2025-06-25",
  },
  {
    manager: "L&G",
    positions: {
      usEquities: "negative",
      intlEquities: "neutral",
      devGovBonds: "positive",
      emGovBonds: "neutral",
      igCredit: "neutral",
      hyCredit: "neutral",
      preciousMetals: "neutral",
      industrialMetals: "neutral",
      reits: "positive",
      currencies: "negative",
    },
    notes: {
      usEquities: "Reduce US equity exposure",
      intlEquities: "Neutral international allocation",
      devGovBonds: "Government bond preference",
      emGovBonds: "Limited EM government exposure",
      igCredit: "Neutral credit allocation",
      hyCredit: "Neutral high yield",
      preciousMetals: "Neutral gold",
      industrialMetals: "Limited commodity exposure",
      reits: "REITs and infrastructure positive",
      currencies: "USD bearish view",
    },
    reasoning: "L&G reduces equity exposure in favor of government bonds and real assets. Bearish on USD prospects.",
    publicationDate: "2025-07-05",
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
      preciousMetals: "neutral",
      industrialMetals: "positive",
      reits: "positive",
      currencies: "positive",
    },
    notes: {
      usEquities: "Risk-off US positioning",
      intlEquities: "Europe and EM positive",
      devGovBonds: "Quality government bonds",
      emGovBonds: "Selective EM exposure",
      igCredit: "Moderate IG credit exposure",
      hyCredit: "Bank loans overweight",
      preciousMetals: "Neutral precious metals",
      industrialMetals: "Industrial metals focus",
      reits: "REITs overweight",
      currencies: "EM currency positive",
    },
    reasoning:
      "Invesco adopts risk-off approach with government bonds and industrial metals. Positive on emerging market currencies.",
    publicationDate: "2025-06-30",
  },
  {
    manager: "PGIM",
    positions: {
      usEquities: "neutral",
      intlEquities: "positive",
      devGovBonds: "positive",
      emGovBonds: "neutral",
      igCredit: "positive",
      hyCredit: "neutral",
      preciousMetals: "neutral",
      industrialMetals: "neutral",
      reits: "neutral",
      currencies: "neutral",
    },
    notes: {
      usEquities: "Neutral US stance",
      intlEquities: "International opportunities",
      devGovBonds: "High-quality fixed income preference",
      emGovBonds: "Limited EM government exposure",
      igCredit: "Investment grade focus",
      hyCredit: "Neutral high yield",
      preciousMetals: "Limited gold exposure",
      industrialMetals: "Neutral commodities",
      reits: "Neutral real estate",
      currencies: "Balanced currency view",
    },
    reasoning:
      "PGIM prefers high-quality fixed income and international equity opportunities while maintaining balanced risk approach.",
    publicationDate: "2025-06-18",
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
      preciousMetals: "neutral",
      industrialMetals: "neutral",
      reits: "positive",
      currencies: "neutral",
    },
    notes: {
      usEquities: "Balanced US equity view",
      intlEquities: "Neutral international stance",
      devGovBonds: "Government bonds preferred",
      emGovBonds: "Limited EM exposure",
      igCredit: "Neutral credit stance",
      hyCredit: "Neutral high yield",
      preciousMetals: "Neutral precious metals",
      industrialMetals: "Limited commodity exposure",
      reits: "Real assets as inflation hedge",
      currencies: "Neutral currency view",
    },
    reasoning:
      "J.P. Morgan suggests real assets as inflation hedges while maintaining balanced approach across equity markets.",
    publicationDate: "2025-06-28",
  },
  {
    manager: "Allspring",
    positions: {
      usEquities: "negative",
      intlEquities: "negative",
      devGovBonds: "positive",
      emGovBonds: "neutral",
      igCredit: "negative",
      hyCredit: "negative",
      preciousMetals: "positive",
      industrialMetals: "positive",
      reits: "neutral",
      currencies: "neutral",
    },
    notes: {
      usEquities: "Underweight US equities",
      intlEquities: "Risk-off international stance",
      devGovBonds: "High-grade bonds favored",
      emGovBonds: "Limited EM government exposure",
      igCredit: "Credit underweight",
      hyCredit: "High yield underweight",
      preciousMetals: "Gold overweight",
      industrialMetals: "Commodity overweight",
      reits: "Neutral real estate",
      currencies: "Balanced approach",
    },
    reasoning:
      "Allspring underweights risk assets in favor of high-grade bonds and commodities. Defensive positioning overall.",
    publicationDate: "2025-07-08",
  },
];

const assetClasses = [
  { key: "usEquities", label: "US Equities" },
  { key: "intlEquities", label: "Int'l Equities" },
  { key: "devGovBonds", label: "Dev Gov't Bonds" },
  { key: "emGovBonds", label: "EM Gov't Bonds" },
  { key: "igCredit", label: "IG Credit" },
  { key: "hyCredit", label: "HY Credit" },
  { key: "preciousMetals", label: "Gold/Precious" },
  { key: "industrialMetals", label: "Industrial Met." },
  { key: "reits", label: "REITs" },
  { key: "currencies", label: "Currencies" },
];

export function ManagerMatrix() {
  const [selectedManager, setSelectedManager] = useState<ManagerPosition | null>(null);
  const [sortBy, setSortBy] = useState<"manager" | "asset">("manager");

  const getPositionIcon = (position: "positive" | "negative" | "neutral") => {
    switch (position) {
      case "positive":
        return <ArrowUpRight className="h-4 w-4 text-positive" />;
      case "negative":
        return <ArrowDownRight className="h-4 w-4 text-negative" />;
      case "neutral":
        return <Minus className="h-4 w-4 text-neutral" />;
    }
  };

  const getPositionBg = (position: "positive" | "negative" | "neutral") => {
    switch (position) {
      case "positive":
        return "bg-positive/10 hover:bg-positive/20";
      case "negative":
        return "bg-negative/10 hover:bg-negative/20";
      case "neutral":
        return "bg-neutral/10 hover:bg-neutral/20";
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Manager Positions Matrix</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={sortBy === "manager" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("manager")}
              >
                Sort by Manager
              </Button>
              <Button variant={sortBy === "asset" ? "default" : "outline"} size="sm" onClick={() => setSortBy("asset")}>
                Sort by Asset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Manager</TableHead>
                  {assetClasses.map((asset) => (
                    <TableHead key={asset.key} className="text-center min-w-28">
                      {asset.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {managersData.map((manager) => (
                  <TableRow key={manager.manager} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Button
                        variant="link"
                        className="p-0 h-auto font-medium text-left justify-start"
                        onClick={() => setSelectedManager(manager)}
                      >
                        {manager.manager}
                      </Button>
                    </TableCell>
                    {assetClasses.map((asset) => {
                      const position = manager.positions[asset.key as keyof typeof manager.positions];
                      const note = manager.notes[asset.key as keyof typeof manager.notes];
                      return (
                        <TableCell key={asset.key} className="text-center p-2">
                          <div
                            className={cn(
                              "inline-flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors",
                              getPositionBg(position)
                            )}
                            title={note}
                          >
                            {getPositionIcon(position)}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-positive" />
              <span>Positive</span>
            </div>
            <div className="flex items-center gap-2">
              <Minus className="h-4 w-4 text-neutral" />
              <span>Neutral</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-negative" />
              <span>Negative</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <ManagerDetailModal manager={selectedManager} onClose={() => setSelectedManager(null)} />
    </>
  );
}
