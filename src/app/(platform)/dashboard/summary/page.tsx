"use client";
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMockClientData } from "@/app/mockData";
import { Download } from "lucide-react";

export default function Page() {
  const data = getMockClientData(); // Fetch mock data

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate total income and expenses
  const totalIncome = data.cashFlow.reduce((sum, month) => sum + month.income, 0);
  const totalExpenses = data.cashFlow.reduce((sum, month) => sum + month.expense, 0);
  const netCashFlow = totalIncome - totalExpenses;

  // Calculate average monthly income and expenses
  const avgMonthlyIncome = totalIncome / data.cashFlow.length;
  const avgMonthlyExpense = totalExpenses / data.cashFlow.length;

  const generateReport = () => {
    // In a real application, this would generate a PDF report
    console.log("Generating consolidated report...");
    alert("Downloading consolidated financial report...");
  };

  const exportData = () => {
    console.log("Exporting data...");
    alert("Exporting financial data for client presentations...");
  };

  return (
    <div className="flex flex-col p-4 gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalNetWorth)}</div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Annual Net Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netCashFlow >= 0 ? "text-finwise-green" : "text-finwise-red"}`}>
              {formatCurrency(netCashFlow)}
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg">
              <span className="text-finwise-green">+{formatCurrency(avgMonthlyIncome)}</span> /
              <span className="text-finwise-red"> -{formatCurrency(avgMonthlyExpense)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Summary Table */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="text-lg">Account Summary</CardTitle>
          <CardDescription>Balance across financial institutions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-sm">Bank</th>
                  <th className="text-left py-2 px-2 text-sm">Account Type</th>
                  <th className="text-right py-2 px-2 text-sm">Currency</th>
                  <th className="text-right py-2 px-2 text-sm">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map((account, index) => (
                  <tr key={index} className="border-b last:border-0 hover:bg-finwise-lightGray">
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
                <tr className="bg-finwise-lightGray font-semibold">
                  <td colSpan={3} className="py-3 px-2 text-sm text-right">
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
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={generateReport}
          className="bg-finwise-navy hover:bg-finwise-blue flex items-center gap-2 flex-1"
        >
          <Download className="h-4 w-4" /> Download Consolidated Report (PDF)
        </Button>
        <Button
          onClick={exportData}
          variant="outline"
          className="border-finwise-navy text-finwise-navy hover:bg-finwise-lightGray flex items-center gap-2 flex-1"
        >
          <Download className="h-4 w-4" /> Export Data for Presentation
        </Button>
      </div>
    </div>
  );
}
