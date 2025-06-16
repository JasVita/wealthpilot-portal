"use client";
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { useTradeRetrocessionStore } from "@/stores/trade-retrocession-store";
import { TradeRetrocessionDatePicker } from "@/components/trade-retrocession-date-picker";

const TradeRetrocession = () => {
  const {
    searchQuery,
    timePeriod,
    currentPage,
    setSearchQuery,
    setTimePeriod,
    setCurrentPage,
    getCurrentPageData,
    getTotalPages,
    getSummaryTotals,
    filterData,
  } = useTradeRetrocessionStore();

  const currentData = getCurrentPageData();
  const totalPages = getTotalPages();
  const summaryTotals = getSummaryTotals();

  useEffect(() => {
    filterData();
  }, [filterData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4">
      <div className="mx-auto space-y-4">
        {/* Header */}
        {/* <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Trade Retrocession</h1>
            <p className="text-gray-600">Monitor and analyze client retrocession data</p>
          </div>
        </div> */}

        {/* Filters */}
        <Card className="flex gap-0">
          <CardHeader className="pb-0 mb-0">
            <CardTitle className="text-lg">Trade Retrocession</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 mt-0">
            <div className="flex items-center gap-7 space-y-0">
              {/* Time Period Selection */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medium text-gray-700">Time Period</label>
                <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as any)}>
                  <SelectTrigger className="h-8">
                    <Calendar className="mr-2 h-3 w-3" />
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                    <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                    <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                    <SelectItem value="last-year">Last Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Picker */}
              {timePeriod === "custom" && (
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-medium text-gray-700">Custom Date Range</label>
                  <TradeRetrocessionDatePicker />
                </div>
              )}

              {/* Search */}
              <div className="flex flex-1 flex-col space-y-1">
                <label className="text-xs font-medium text-gray-700">Search Clients</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by client name, RM, or account..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Retrocession Data</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">RM</TableHead>
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="font-semibold">Account</TableHead>
                    <TableHead className="font-semibold text-right">Net Assets Value (USD)</TableHead>
                    <TableHead className="font-semibold text-right">Commission (USD)</TableHead>
                    <TableHead className="font-semibold text-right">Revenue (USD)</TableHead>
                    <TableHead className="font-semibold text-right">Retrocession</TableHead>
                    <TableHead className="font-semibold text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium">{item.rm}</TableCell>
                      <TableCell className="font-medium">{item.client}</TableCell>
                      <TableCell className="text-gray-600">{item.account}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.netAssetsValue)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.commission)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.revenue)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="font-mono">
                          {formatPercentage(item.retrocession)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Summary and Pagination Footer */}
        <Card className="p-0">
          <CardContent className="p-4">
            {/* Summary Totals */}
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-3">
                <div className="text-xs font-medium text-blue-600">Total Net Assets</div>
                <div className="text-lg font-bold text-blue-900">{formatCurrency(summaryTotals.totalNetAssets)}</div>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <div className="text-xs font-medium text-green-600">Total Commission</div>
                <div className="text-lg font-bold text-green-900">{formatCurrency(summaryTotals.totalCommission)}</div>
              </div>
              <div className="rounded-lg bg-purple-50 p-3">
                <div className="text-xs font-medium text-purple-600">Total Revenue</div>
                <div className="text-lg font-bold text-purple-900">{formatCurrency(summaryTotals.totalRevenue)}</div>
              </div>
              <div className="rounded-lg bg-orange-50 p-3">
                <div className="text-xs font-medium text-orange-600">Avg Retrocession</div>
                <div className="text-lg font-bold text-orange-900">
                  {formatPercentage(summaryTotals.avgRetrocession)}
                </div>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-xs text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TradeRetrocession;
