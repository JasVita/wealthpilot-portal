"use client";

import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimelineItem } from "@/components/ui/timeline-item"; // Assume you have a timeline component
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Phone, Calendar } from "lucide-react";

const documents = [
  { name: "ID Proof.pdf", status: "Approved" },
  { name: "Suitability Form.pdf", status: "Pending" },
  { name: "Proof of Address.pdf", status: "Expired" },
];

const interactions = [
  { type: "Call", date: "2025-06-01", note: "Discussed fee structure" },
  { type: "Email", date: "2025-06-05", note: "Sent follow-up documents" },
  { type: "Meeting", date: "2025-06-10", note: "Finalized onboarding" },
];

const opportunities = [
  { name: "Private Equity Mandate", stage: 60, revenue: "$120,000", next: "2025-06-25" },
  { name: "Bond Ladder Strategy", stage: 40, revenue: "$75,000", next: "2025-06-30" },
];

export default function CrmPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 md:px-12 xl:px-24 py-12">
      <h1 className="text-4xl font-semibold mb-10">CRM</h1>
      <Tabs defaultValue="profile" className="space-y-8">
        <TabsList>
          <TabsTrigger value="profile">Profile & KYC</TabsTrigger>
          <TabsTrigger value="log">Interaction Log</TabsTrigger>
          <TabsTrigger value="opps">Opportunities</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Contact & Suitability</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <Label>Name</Label>
                <Input placeholder="Jane Doe" />
              </div>
              <div>
                <Label>Email</Label>
                <Input placeholder="jane@example.com" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input placeholder="+852 9876 5432" />
              </div>
              <div>
                <Label>Risk Profile</Label>
                <Input placeholder="Moderate" />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {documents.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between border px-4 py-2 rounded-md">
                  <span>{doc.name}</span>
                  <Badge
                    variant={
                      doc.status === "Approved" ? "default" : doc.status === "Pending" ? "secondary" : "destructive"
                    }
                  >
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interaction Log Tab */}
        <TabsContent value="log">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Interaction Log</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Add Entry</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>New Interaction</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Label>Type</Label>
                  <select className="w-full border rounded-md px-3 py-2">
                    <option>Call</option>
                    <option>Meeting</option>
                    <option>Email</option>
                  </select>
                  <Label>Note</Label>
                  <Input placeholder="Notes about the interaction" />
                  <Button className="w-full">Save Entry</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-4">
            {interactions.map((i, idx) => (
              <TimelineItem key={idx} icon={i.type === "Call" ? Phone : i.type === "Email" ? Mail : Calendar}>
                <strong>{i.type}</strong> on {i.date} – {i.note}
              </TimelineItem>
            ))}
          </div>
        </TabsContent>

        {/* Opportunities Tab */}
        <TabsContent value="opps">
          <Card>
            <CardHeader>
              <CardTitle>Opportunities Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Stage %</TableHead>
                    <TableHead>Est. Revenue</TableHead>
                    <TableHead>Next Action</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opp, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{opp.name}</TableCell>
                      <TableCell>
                        <Progress value={opp.stage} className="h-2" />
                      </TableCell>
                      <TableCell>{opp.revenue}</TableCell>
                      <TableCell>{opp.next}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => (window.location.href = `/orders?new&asset=${encodeURIComponent(opp.name)}`)}
                        >
                          Convert to Order
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
