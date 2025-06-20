"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState("moderate");
  const [sharedWith, setSharedWith] = useState(["advisor@wealth.com"]);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-8 md:px-12 xl:px-24 py-12 space-y-10">
      <h1 className="text-4xl font-semibold">Settings</h1>

      {/* Sharing Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Sharing Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="shared-emails">Shared with</Label>
          <ul className="text-muted-foreground list-disc list-inside">
            {sharedWith.map((email, idx) => (
              <li key={idx}>{email}</li>
            ))}
          </ul>
          <Input
            placeholder="Add new email..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const value = (e.target as HTMLInputElement).value.trim();
                if (value && !sharedWith.includes(value)) {
                  setSharedWith([...sharedWith, value]);
                  (e.target as HTMLInputElement).value = "";
                }
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Risk Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="risk-select">Your risk preference</Label>
          <Select value={selectedRisk} onValueChange={setSelectedRisk}>
            <SelectTrigger className="mt-2 w-64">
              <SelectValue placeholder="Select risk level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label>Email alerts</Label>
            <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
          </div>
          <div className="flex items-center justify-between">
            <Label>SMS alerts</Label>
            <Switch checked={smsAlerts} onCheckedChange={setSmsAlerts} />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
