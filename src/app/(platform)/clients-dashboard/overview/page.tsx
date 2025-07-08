"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/ui/chart";
import { useWealthStore } from "@/stores/wealth-store";
import { useEffect } from "react";
const barChartData = [
  { label: "Q1", Revenue: 120000, Profit: 30000 },
  { label: "Q2", Revenue: 150000, Profit: 45000 },
  { label: "Q3", Revenue: 130000, Profit: 32000 },
  { label: "Q4", Revenue: 170000, Profit: 50000 },
];
const mockTableData = [
  { category: "Marketing", budget: 35000, spent: 28000 },
  { category: "R&D", budget: 50000, spent: 47000 },
  { category: "Operations", budget: 40000, spent: 39000 },
  { category: "HR", budget: 25000, spent: 20000 },
];

export default function Page() {
  const { setCurrClient } = useWealthStore();

  useEffect(() => {
    setCurrClient("Overall");
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4">
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Quarterly Financial Summary</CardTitle>
          <CardDescription>Mock Revenue & Profit Performance</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px] w-full">
            <BarChart
              data={barChartData}
              index="label"
              categories={["Revenue", "Profit"]}
              colors={["#60a5fa", "#34d399"]}
              valueFormatter={(val: number) =>
                new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(val)
              }
              className="h-full w-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Department Budget Overview</CardTitle>
          <CardDescription>Budget vs. Actual Spending</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200">
                <th className="py-2">Category</th>
                <th className="py-2 text-right">Budget (USD)</th>
                <th className="py-2 text-right">Spent (USD)</th>
              </tr>
            </thead>
            <tbody>
              {mockTableData.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100 last:border-none hover:bg-gray-50">
                  <td className="py-2">{row.category}</td>
                  <td className="py-2 text-right">
                    {row.budget.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                  </td>
                  <td className="py-2 text-right">
                    {row.spent.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
