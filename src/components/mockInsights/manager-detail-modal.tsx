import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ManagerPosition } from "./manager-matrix";

interface ManagerDetailModalProps {
  manager: ManagerPosition | null;
  onClose: () => void;
}

export function ManagerDetailModal({ manager, onClose }: ManagerDetailModalProps) {
  if (!manager) return null;

  const getPositionColor = (position: "positive" | "negative" | "neutral") => {
    switch (position) {
      case "positive":
        return "text-positive bg-positive/10";
      case "negative":
        return "text-negative bg-negative/10";
      case "neutral":
        return "text-neutral bg-neutral/10";
    }
  };

  const getPositionIcon = (position: "positive" | "negative" | "neutral") => {
    switch (position) {
      case "positive":
        return <TrendingUp className="h-3 w-3" />;
      case "negative":
        return <TrendingDown className="h-3 w-3" />;
      case "neutral":
        return <Minus className="h-3 w-3" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const assetClassDetails = [
    {
      key: "usEquities",
      label: "U.S. Equities",
      position: manager.positions.usEquities,
      note: manager.notes.usEquities,
    },
    {
      key: "intlEquities",
      label: "International Equities",
      position: manager.positions.intlEquities,
      note: manager.notes.intlEquities,
    },
    {
      key: "devGovBonds",
      label: "Developed Gov't Bonds",
      position: manager.positions.devGovBonds,
      note: manager.notes.devGovBonds,
    },
    {
      key: "emGovBonds",
      label: "EM Gov't Bonds",
      position: manager.positions.emGovBonds,
      note: manager.notes.emGovBonds,
    },
    {
      key: "igCredit",
      label: "Investment-Grade Credit",
      position: manager.positions.igCredit,
      note: manager.notes.igCredit,
    },
    { key: "hyCredit", label: "High-Yield Credit", position: manager.positions.hyCredit, note: manager.notes.hyCredit },
    {
      key: "preciousMetals",
      label: "Precious Metals/Gold",
      position: manager.positions.preciousMetals,
      note: manager.notes.preciousMetals,
    },
    {
      key: "industrialMetals",
      label: "Industrial Metals",
      position: manager.positions.industrialMetals,
      note: manager.notes.industrialMetals,
    },
    { key: "reits", label: "REITs & Infrastructure", position: manager.positions.reits, note: manager.notes.reits },
    { key: "currencies", label: "Currencies", position: manager.positions.currencies, note: manager.notes.currencies },
  ];

  return (
    <Dialog open={!!manager} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{manager.manager} - Multi-Asset Outlook</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Publication Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Published: {formatDate(manager.publicationDate)}</span>
          </div>

          {/* Manager Reasoning */}
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">Manager Perspective</h3>
            <p className="text-sm text-foreground leading-relaxed bg-muted/50 p-4 rounded-lg">{manager.reasoning}</p>
          </div>

          <Separator />

          {/* Asset Class Positions */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">Asset Class Positions</h3>
            <div className="space-y-3">
              {assetClassDetails.map((asset) => (
                <div key={asset.key} className="flex items-start justify-between p-3 rounded-lg border bg-card">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{asset.label}</span>
                      <Badge variant="secondary" className={cn("text-xs", getPositionColor(asset.position))}>
                        <span className="flex items-center gap-1">
                          {getPositionIcon(asset.position)}
                          {asset.position.charAt(0).toUpperCase() + asset.position.slice(1)}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{asset.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" className="text-xs">
              <ExternalLink className="h-3 w-3 mr-1" />
              Download Full Report
            </Button>
            <div className="text-xs text-muted-foreground">For professional/institutional use only</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
