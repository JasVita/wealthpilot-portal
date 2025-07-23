import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface QuarterToggleProps {
  selectedQuarter: "Q2" | "Q3";
  onQuarterChange: (quarter: "Q2" | "Q3") => void;
}

export function QuarterToggle({ selectedQuarter, onQuarterChange }: QuarterToggleProps) {
  return (
    <Card className="w-fit py-0">
      <CardContent className="p-1">
        <div className="flex rounded-md bg-muted p-1">
          <Button
            variant={selectedQuarter === "Q2" ? "default" : "ghost"}
            size="sm"
            onClick={() => onQuarterChange("Q2")}
            className="text-sm font-medium"
          >
            Q2 2025
          </Button>
          <Button
            variant={selectedQuarter === "Q3" ? "default" : "ghost"}
            size="sm"
            onClick={() => onQuarterChange("Q3")}
            className="text-sm font-medium"
          >
            Q3 2025 (Forward)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
