"use client";
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMockClientData } from "@/app/mockData";
import { Download } from "lucide-react";

export default function Page() {
  const data = getMockClientData();

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const totalIncome = data.cashFlow.reduce((sum, month) => sum + month.income, 0);
  const totalExpenses = data.cashFlow.reduce((sum, month) => sum + month.expense, 0);
  const netCashFlow = totalIncome - totalExpenses;

  const avgMonthlyIncome = totalIncome / data.cashFlow.length;
  const avgMonthlyExpense = totalExpenses / data.cashFlow.length;

  const generateReport = () => {
    alert("Downloading consolidated financial report...");
  };

  const exportData = () => {
    alert("Exporting financial data for client presentations...");
  };

  return (
    <div className="flex flex-col overflow-auto h-[calc(100vh-64px)] gap-4 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Net Worth</CardTitle>
            <CardDescription>Overall assets across all accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium text-black">{formatCurrency(data.totalNetWorth)}</div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Annual Net Cash Flow</CardTitle>
            <CardDescription>Income minus expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-medium ${netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(netCashFlow)}
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Monthly Averages</CardTitle>
            <CardDescription>Across the past year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium">
              <span className="text-green-600">+{formatCurrency(avgMonthlyIncome)}</span> /{" "}
              <span className="text-red-600">-{formatCurrency(avgMonthlyExpense)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Summary Table */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Account Summary</CardTitle>
          <CardDescription>Balance across financial institutions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-sm font-semibold">Bank</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold">Account Type</th>
                  <th className="text-right py-2 px-2 text-sm font-semibold">Currency</th>
                  <th className="text-right py-2 px-2 text-sm font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map((account, index) => (
                  <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-2 text-sm">{account.bankName}</td>
                    <td className="py-3 px-2 text-sm">{account.accountType}</td>
                    <td className="py-3 px-2 text-sm text-right">{account.currency}</td>
                    <td className="py-3 px-2 text-sm text-right font-medium">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: account.currency,
                        minimumFractionDigits: 2,
                      }).format(account.balance)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan={3} className="py-3 px-2 text-sm text-left">
                    Total (USD Equivalent)
                  </td>
                  <td className="py-3 px-2 text-sm text-right">{formatCurrency(data.totalNetWorth)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button onClick={generateReport} className="bg-black hover:bg-gray-800 text-white flex items-center gap-2">
          <Download className="h-4 w-4" /> Download Consolidated Report (PDF)
        </Button>
        <Button
          onClick={exportData}
          variant="outline"
          className="border-black text-black hover:bg-gray-100 flex items-center gap-2"
        >
          <Download className="h-4 w-4" /> Export Data for Presentation
        </Button>
      </div>
    </div>
  );
}
