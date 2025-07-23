import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Filter, Calendar, Eye } from "lucide-react";

interface FilterSidebarProps {
  isOpen: boolean;
}

export function FilterSidebar({ isOpen }: FilterSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="w-80 space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters & Customization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* View Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <Label className="text-sm font-medium">View Mode</Label>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="simplified-view" className="text-sm">
                  Simplified View
                </Label>
                <Switch id="simplified-view" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="deep-dive" className="text-sm">
                  Deep-dive Mode
                </Label>
                <Switch id="deep-dive" defaultChecked />
              </div>
            </div>
          </div>

          <Separator />

          {/* Date Range Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <Label className="text-sm font-medium">Publication Period</Label>
            </div>
            <Select defaultValue="3months">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months (Default)</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="all">All Periods</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Manager Filters */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Managers</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {[
                "Allianz GI",
                "Berenberg",
                "PineBridge",
                "BlackRock",
                "M&G",
                "L&G",
                "Invesco",
                "PGIM",
                "J.P. Morgan",
                "Allspring",
              ].map((manager) => (
                <div key={manager} className="flex items-center justify-between">
                  <Label htmlFor={manager} className="text-sm">
                    {manager}
                  </Label>
                  <Switch id={manager} defaultChecked />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Asset Class Filters */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Asset Classes</Label>
            <div className="space-y-2">
              {[
                "U.S. Equities",
                "International Equities",
                "Developed Gov't Bonds",
                "EM Gov't Bonds",
                "Investment-Grade Credit",
                "High-Yield Credit",
                "Precious Metals/Gold",
                "Industrial Metals",
                "REITs & Infrastructure",
                "Currencies",
              ].map((asset) => (
                <div key={asset} className="flex items-center justify-between">
                  <Label htmlFor={asset} className="text-sm">
                    {asset}
                  </Label>
                  <Switch id={asset} defaultChecked />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Regional Focus */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Regional Focus</Label>
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="europe">Europe</SelectItem>
                <SelectItem value="asia">Asia-Pacific</SelectItem>
                <SelectItem value="em">Emerging Markets</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
