"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Settings, BarChart3, TrendingUp, DollarSign, Coins, Globe } from "lucide-react";
import { SummaryCard } from "@/components/mockInsights/summary-card";
import { AccordionManagerMatrix } from "@/components/mockInsights/accordion-manager-matrix";
import { CompactConsensusGrid } from "@/components/mockInsights/compact-consensus-grid";
import { MarketOverview } from "@/components/mockInsights/market-overview";
import { QuarterToggle } from "@/components/mockInsights/quarter-toggle";
import { FilterSidebar } from "@/components/mockInsights/filter-sidebar";
import { NewsInsights } from "@/components/mockInsights/news-insights";

const Index = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState<"Q2" | "Q3">("Q3");

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-foreground">Multi-Asset Manager Dashboard – Q3 2025</h1>
              <p className="text-muted-foreground text-lg">
                Aggregated views from leading multi-asset managers, April–July 2025
              </p>
              <QuarterToggle selectedQuarter={selectedQuarter} onQuarterChange={setSelectedQuarter} />
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Info className="h-4 w-4 mr-2" />
                    Info
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Dashboard Overview</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-sm">
                    <p>
                      This dashboard aggregates multi-asset allocation views from leading institutional asset managers
                      to provide a comprehensive market sentiment overview.
                    </p>
                    <p>
                      Data is sourced from public multi-asset outlook reports published between April and July 2025,
                      providing current institutional perspective on major asset classes.
                    </p>
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      For professional/institutional use only. Past performance does not guarantee future results.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Settings className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <SummaryCard
                title="U.S. Equities"
                sentiment="mixed"
                description="Divergent views: some managers remain overweight U.S. stocks, others trim exposure."
                icon={<TrendingUp className="h-4 w-4" />}
                details="3 positive, 3 negative, 4 neutral"
              />
              <SummaryCard
                title="Int'l Equities (Europe/EM)"
                sentiment="positive"
                description="PineBridge, PGIM, Invesco and Berenberg positive on Europe and EM markets."
                icon={<Globe className="h-4 w-4" />}
                details="4 positive, 6 neutral views"
              />
              <SummaryCard
                title="Developed Gov't Bonds"
                sentiment="positive"
                description="Strong consensus favoring high-quality Treasuries, Canadian and eurozone bonds."
                icon={<BarChart3 className="h-4 w-4" />}
                details="8 of 10 managers positive"
              />
              <SummaryCard
                title="Investment-Grade Credit"
                sentiment="neutral"
                description="Positive sentiment from PineBridge and PGIM; neutral from others."
                icon={<DollarSign className="h-4 w-4" />}
                details="2 positive, 8 neutral"
              />
              <SummaryCard
                title="Precious Metals/Gold"
                sentiment="neutral"
                description="Berenberg and BNY overweight gold; others maintain neutral positions."
                icon={<Coins className="h-4 w-4" />}
                details="2 positive, 8 neutral"
              />
              <SummaryCard
                title="EM Gov't Bonds"
                sentiment="neutral"
                description="Allianz GI likes EM hard-currency bonds; limited coverage overall."
                icon={<TrendingUp className="h-4 w-4" />}
                details="1 positive, 9 neutral"
              />
              <SummaryCard
                title="High-Yield & Bank Loans"
                sentiment="negative"
                description="Caution from PineBridge and Berenberg; Invesco overweight bank loans."
                icon={<BarChart3 className="h-4 w-4" />}
                details="1 positive, 2 negative, 7 neutral"
              />
              <SummaryCard
                title="Industrial Metals & Energy"
                sentiment="neutral"
                description="Positive views from Berenberg on industrial metals; commodity exposure from Invesco."
                icon={<TrendingUp className="h-4 w-4" />}
                details="2 positive, 8 neutral"
              />
              <SummaryCard
                title="REITs & Infrastructure"
                sentiment="neutral"
                description="Invesco overweight REITs; J.P. Morgan suggests real assets as inflation hedges."
                icon={<DollarSign className="h-4 w-4" />}
                details="2 positive, 8 neutral"
              />
              <SummaryCard
                title="Currencies (USD/EUR/JPY)"
                sentiment="mixed"
                description="USD mostly negative outlook; EUR/JPY favored by Invesco and Berenberg."
                icon={<Globe className="h-4 w-4" />}
                details="Mixed outlook across currencies"
              />
            </div>

            {/* Tabbed Content */}
            <Tabs defaultValue="positions" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="positions">Manager Positions</TabsTrigger>
                <TabsTrigger value="sentiment">Asset Sentiment</TabsTrigger>
                <TabsTrigger value="markets">Markets Overview</TabsTrigger>
                <TabsTrigger value="indicators">Economic Data</TabsTrigger>
              </TabsList>

              <TabsContent value="positions" className="space-y-6">
                <AccordionManagerMatrix selectedQuarter={selectedQuarter} />
              </TabsContent>

              <TabsContent value="sentiment" className="space-y-6">
                <CompactConsensusGrid selectedQuarter={selectedQuarter} />
              </TabsContent>

              <TabsContent value="markets" className="space-y-6">
                <MarketOverview />
              </TabsContent>

              <TabsContent value="indicators" className="space-y-6">
                <MarketOverview />
              </TabsContent>
            </Tabs>

            <NewsInsights />
          </div>

          {/* Filter Sidebar */}
          <FilterSidebar isOpen={showFilters} />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-12">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              For professional/institutional use only. Summaries based on public multi-asset outlooks published Apr–Jul
              2025.
            </p>
            <p>© 2025 Multi-Asset Dashboard. Data aggregated from public sources.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
