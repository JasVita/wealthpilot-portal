/* maturity-card/MaturityChart.tsx */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { useMemo } from "react";
import { useWealthStore } from "@/stores/wealth-store";
import { buildMaturityChartData } from "@/types"; // path per your project

const MaturityChart = () => {
  /* 1️⃣  Pull the bank snapshots from Zustand */
  const tableDataArray = useWealthStore((s) => s.tableDataArray);

  /* 2️⃣  Transform → chart-ready rows (memoised) */
  const data = useMemo(() => buildMaturityChartData(tableDataArray), [tableDataArray]);

  return (
    <div className="glass-card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-[#11223D] mb-4">Maturity Ladder</h3>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          {/* 🔒  UNCHANGED styling & colours  */}
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="quarter"
              tick={{ fontSize: 11, fill: "#11223D" }}
              stroke="#11223D"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#11223D" }}
              stroke="#11223D"
              label={{ value: "USD MM", angle: -90, position: "insideLeft", style: { textAnchor: "middle" } }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />

            {/* keep the exact same bar order / colours */}
            <Bar dataKey="Goldman Sachs" stackId="a" fill="#0CA3A3" name="Goldman Sachs" />
            <Bar dataKey="Morgan Stanley" stackId="a" fill="#11223D" name="Morgan Stanley" />
            <Bar dataKey="JP Morgan" stackId="a" fill="#8B5CF6" name="JP Morgan" />
            <Bar dataKey="UBS" stackId="a" fill="#F59E0B" name="UBS" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MaturityChart;
