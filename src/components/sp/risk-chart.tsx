/* CounterpartyRiskChart.tsx */
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useMemo } from "react";
import { useWealthStore } from "@/stores/wealth-store";
import { buildCounterpartyRiskData } from "@/types";

const CounterpartyRiskChart = () => {
  /* 1️⃣  Grab the raw tables from Zustand */
  const tableDataArray = useWealthStore((s) => s.tableDataArray);

  /* 2️⃣  Convert → chart rows (memoised) */
  const data = useMemo(() => buildCounterpartyRiskData(tableDataArray), [tableDataArray]);

  /* 3️⃣  Tooltip reused verbatim */
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-[#11223D]">{payload[0].name}</p>
          <p className="text-sm text-[#11223D]/70">{payload[0].value}% of total exposure</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-[#11223D] mb-4">Counterparty Risk Distribution</h3>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {/* 🔒  All styling and colours unchanged  */}
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={2} dataKey="value">
              {data.map((entry: { color: string | undefined }, idx: any) => (
                <Cell key={`cell-${idx}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
              formatter={(value, entry) => `${value} (${entry.payload?.value || 0}%)`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CounterpartyRiskChart;
