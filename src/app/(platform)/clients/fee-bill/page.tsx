"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Download } from "lucide-react";

const mockFeeSchedule = [
  { tier: "0 - 1M", rate: "1.00%" },
  { tier: "1M - 5M", rate: "0.80%" },
  { tier: "> 5M", rate: "0.60%" },
];

const mockInvoices = [
  { date: "2024-12-01", amount: "$1,250.00", status: "Paid" },
  { date: "2025-01-01", amount: "$1,400.00", status: "Paid" },
  { date: "2025-02-01", amount: "$1,320.00", status: "Unpaid" },
];

const mockRevenueShare = [
  { partner: "Advisor A", month: "May 2025", share: "$820.00" },
  { partner: "Advisor B", month: "May 2025", share: "$620.00" },
];

export default function FeeBillingPage() {
  return (
    <main className="flex flex-col gap-16 px-4 sm:px-8 md:px-12 xl:px-24 max-w-7xl mx-auto py-12">
      <h1 className="text-4xl font-semibold">Fee & Billing</h1>

      {/* Fee Schedule Editor */}
      <section>
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Fee Schedule</CardTitle>
            <Button variant="ghost" size="sm">
              <Pencil className="w-4 h-4 mr-1" /> Edit Schedule
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead>Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockFeeSchedule.map(({ tier, rate }) => (
                  <TableRow key={tier}>
                    <TableCell>{tier}</TableCell>
                    <TableCell>{rate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Invoice History */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockInvoices.map(({ date, amount, status }) => (
                  <TableRow key={date}>
                    <TableCell>{date}</TableCell>
                    <TableCell>{amount}</TableCell>
                    <TableCell>{status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Revenue Share Report */}
      <section>
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Revenue Share Report</CardTitle>
            <Button variant="secondary" size="sm">
              <Download className="w-4 h-4 mr-2" /> Download Report
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockRevenueShare.map(({ partner, month, share }) => (
                  <TableRow key={partner + month}>
                    <TableCell>{partner}</TableCell>
                    <TableCell>{month}</TableCell>
                    <TableCell>{share}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
