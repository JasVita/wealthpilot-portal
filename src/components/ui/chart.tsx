import React from "react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartProps {
  data: any[];
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (value: number) => string;
  className?: string;
}

// Area Chart Component
export const AreaChart: React.FC<ChartProps> = ({
  data,
  index,
  categories,
  colors = ["#1A2B4A", "#33C3F0", "#8E9196"],
  valueFormatter = (value) => value.toString(),
  className,
}) => {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <defs>
            {categories.map((category, i) => (
              <linearGradient key={i} id={`gradient-${category}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <XAxis dataKey={index} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickMargin={10} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            tickMargin={10}
            tickFormatter={valueFormatter}
          />
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
          <Tooltip
            formatter={(value: number) => [valueFormatter(value)]}
            labelStyle={{ color: "#1A2B4A", fontWeight: "bold" }}
            contentStyle={{
              backgroundColor: "white",
              borderColor: "#E2E8F0",
              borderRadius: "6px",
              padding: "8px",
              fontSize: "12px",
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ color: "#1A2B4A", fontSize: "12px" }}>{value}</span>}
          />
          {categories.map((category, i) => (
            <Area
              key={i}
              type="monotone"
              dataKey={category}
              stroke={colors[i % colors.length]}
              fill={`url(#gradient-${category})`}
              strokeWidth={2}
              dot={{ r: 0 }}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Line Chart Component
export const LineChart: React.FC<ChartProps> = ({
  data,
  index,
  categories,
  colors = ["#1A2B4A", "#33C3F0", "#8E9196"],
  valueFormatter = (value) => value.toString(),
  className,
}) => {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <XAxis dataKey={index} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickMargin={10} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            tickMargin={10}
            tickFormatter={valueFormatter}
          />
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
          <Tooltip
            formatter={(value: number) => [valueFormatter(value)]}
            labelStyle={{ color: "#1A2B4A", fontWeight: "bold" }}
            contentStyle={{
              backgroundColor: "white",
              borderColor: "#E2E8F0",
              borderRadius: "6px",
              padding: "8px",
              fontSize: "12px",
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ color: "#1A2B4A", fontSize: "12px" }}>{value}</span>}
          />
          {categories.map((category, i) => (
            <Line
              key={i}
              type="monotone"
              dataKey={category}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={{ r: 0 }}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Bar Chart Component
export const BarChart: React.FC<ChartProps> = ({
  data,
  index,
  categories,
  colors = ["#1A2B4A", "#33C3F0", "#8E9196"],
  valueFormatter = (value) => value.toString(),
  className,
}) => {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <XAxis dataKey={index} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickMargin={10} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            tickMargin={10}
            tickFormatter={valueFormatter}
          />
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
          <Tooltip
            formatter={(value: number) => [valueFormatter(value)]}
            labelStyle={{ color: "#1A2B4A", fontWeight: "bold" }}
            contentStyle={{
              backgroundColor: "white",
              borderColor: "#E2E8F0",
              borderRadius: "6px",
              padding: "8px",
              fontSize: "12px",
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ color: "#1A2B4A", fontSize: "12px" }}>{value}</span>}
          />
          {categories.map((category, i) => (
            <Bar key={i} dataKey={category} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} barSize={30} />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Pie Chart Component
export const PieChart: React.FC<ChartProps> = ({
  data,
  index,
  categories,
  colors = ["#1A2B4A", "#33C3F0", "#8E9196", "#2A9D8F", "#E63946"],
  valueFormatter = (value) => value.toString(),
  className,
}) => {
  const category = categories[0]; // Only uses the first category for pie chart

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""}
      </text>
    );
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey={category}
            nameKey={index}
          >
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [valueFormatter(value)]}
            labelStyle={{ color: "#1A2B4A", fontWeight: "bold" }}
            contentStyle={{
              backgroundColor: "white",
              borderColor: "#E2E8F0",
              borderRadius: "6px",
              padding: "8px",
              fontSize: "12px",
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ color: "#1A2B4A", fontSize: "12px" }}>{value}</span>}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};
