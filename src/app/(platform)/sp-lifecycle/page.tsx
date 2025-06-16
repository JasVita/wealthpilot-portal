// Updated SPLifecycleDashboard with UI improvements
"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart-lovable";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { useSPLifecycleStore } from "@/stores/sp-lifecycle-store";

const SPLifecycleDashboard = () => {
  const {
    timePeriod,
    lastUpdated,
    sortField,
    sortOrder,
    lifecycleEvents,
    productDistribution,
    setTimePeriod,
    setSorting,
    getSortedClientDistribution,
    getTotalSPPosition,
    getTotalAmount,
  } = useSPLifecycleStore();

  const clientDistribution = getSortedClientDistribution();
  const totalSPPosition = getTotalSPPosition();
  const totalAmount = getTotalAmount();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const monitorEvent = lifecycleEvents.find((e) => e.type === "monitor");
  const unofficialEvent = lifecycleEvents.find((e) => e.type === "unofficial_result");
  const settlementEvent = lifecycleEvents.find((e) => e.type === "settlement");

  const chartConfig = {
    value: {
      label: "Percentage",
    },
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4">
      <div className="mx-auto space-y-6">
        {/* Top Card - LifeCycle Events */}
        <Card className="w-full">
          <CardHeader className="">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <CardTitle className="text-lg">LifeCycle Events</CardTitle>
              <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-x-4 md:space-y-0">
                <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as any)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                    <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                    <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                    <SelectItem value="last-year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-500">Last updated: {lastUpdated}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {/* Monitor Card */}
              <Card className="bg-blue-50/50 flex flex-col gap-0 h-fit">
                <CardHeader className="">
                  <CardTitle className="text-base text-blue-700">Monitor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 flex  justify-between ">
                  <div className="flex flex-col">
                    <span className="font-semibold text-lg text-left">{monitorEvent?.autocallObservation || 0}</span>
                    <span className="text-xs text-gray-600 text-center">Autocall Observation</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-lg text-left">{monitorEvent?.finalFixing || 0}</span>
                    <span className="text-xs text-gray-600 text-center">Final Fixing</span>
                  </div>
                </CardContent>
              </Card>

              {/* Unofficial Result Card */}
              <Card className="bg-green-50/50 flex flex-col gap-0 h-fit">
                <CardHeader className="">
                  <CardTitle className="text-base text-green-700">Unofficial Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 flex  justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-lg text-left">{unofficialEvent?.autocalled || 0}</span>
                    <span className="text-xs text-gray-600 text-center">Autocalled</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-lg text-left">{unofficialEvent?.expiredCash || 0}</span>
                    <span className="text-xs text-gray-600 text-center">Expired (Cash)</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-lg text-left">{unofficialEvent?.expiredPhysical || 0}</span>
                    <span className="text-xs text-gray-600 text-center">Expired (Physical)</span>
                  </div>
                </CardContent>
              </Card>

              {/* Settlement Card */}
              <Card className="bg-purple-50/50 flex flex-col gap-0 h-fit">
                <CardHeader className="">
                  <CardTitle className="text-base text-purple-700">Settlement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 flex justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-lg text-left">{settlementEvent?.couponPayment || 0}</span>
                    <span className="text-xs text-gray-600 text-center w-fit">Coupon Payment</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-lg text-left">{settlementEvent?.finalSettlement || 0}</span>
                    <span className="text-xs text-gray-600 text-center w-fit">Final Settle</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-lg text-left">{settlementEvent?.settlementNumbers || 0}</span>
                    <span className="text-xs text-gray-600 text-center w-fit">Settle Numbers</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Client/Custodian Distribution */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-lg">Client/Custodian Distribution</CardTitle>
              <div className="grid grid-cols-2 gap-4 pt-2 bg-gray-100 p-2 rounded">
                <div>
                  <div className="text-sm text-gray-600">SP Position</div>
                  <div className="text-xl font-bold">{formatNumber(totalSPPosition)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Amount (USD)</div>
                  <div className="text-xl font-bold">{formatCurrency(totalAmount)}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No.</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Position</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientDistribution.map((client, idx) => (
                      <TableRow key={client.id} className="hover:bg-gray-50/50">
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{client.clientNo}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(client.position)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(client.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Product/Issuer Distribution */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-lg">Product/Issuer Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <ChartContainer config={chartConfig} className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {productDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="mt-4 space-y-2 w-full">
                {productDistribution.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SPLifecycleDashboard;
