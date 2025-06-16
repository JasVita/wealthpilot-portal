import React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTradeRetrocessionStore } from "@/stores/trade-retrocession-store";

export function TradeRetrocessionDatePicker() {
  const { customDateRange, setCustomDateRange } = useTradeRetrocessionStore();

  const [date, setDate] = React.useState<{ from?: Date; to?: Date } | undefined>({
    from: customDateRange.from,
    to: customDateRange.to,
  });

  const handleDateChange = (selectedDate: { from?: Date; to?: Date } | undefined) => {
    setDate(selectedDate);
    setCustomDateRange({
      from: selectedDate?.from,
      to: selectedDate?.to,
    });
  };

  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            // @ts-ignore
            selected={date || { from: new Date(), to: new Date() }} // Provide default value
            onSelect={handleDateChange}
            numberOfMonths={2}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
