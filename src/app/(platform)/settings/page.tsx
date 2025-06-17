"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <main className="flex flex-col gap-10 px-4 sm:px-8 md:px-12 xl:px-24 max-w-5xl mx-auto py-12">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Settings</h1>

      {/* ─────────── Tabs ─────────── */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integration">Integrations</TabsTrigger>
        </TabsList>

        {/* ▸ Profile */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Public-facing information about you or your firm.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-6 md:grid-cols-2">
              {/* Full name */}
              <div className="grid gap-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input id="full-name" placeholder="Jane Doe" />
              </div>

              {/* Email */}
              <div className="grid gap-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" placeholder="jane@company.com" />
              </div>

              {/* Company */}
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="company">Company name</Label>
                <Input id="company" placeholder="WealthPilot Ltd." />
              </div>

              {/* Time zone */}
              <div className="grid gap-2">
                <Label>Time zone</Label>
                <Select defaultValue="Asia/Hong_Kong">
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Los_Angeles">America/Los Angeles (UTC-8)</SelectItem>
                    <SelectItem value="Asia/Hong_Kong">Asia/Hong Kong (UTC+8)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (UTC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>

            <CardFooter className="justify-end gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button>Save changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ▸ Security */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage passwords and sign-in methods.</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-factor authentication</p>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                </div>
                <Switch disabled /> {/* mocked; disabled for now */}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Login alerts</p>
                  <p className="text-sm text-muted-foreground">Receive an email when a new device signs in</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>

            <CardFooter className="justify-end">
              <Button>Update security</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ▸ Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose which email updates you receive.</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
              {["Weekly portfolio digest", "Important account notices", "Product announcements"].map((label) => (
                <div key={label} className="flex items-center justify-between">
                  <span>{label}</span>
                  <Switch />
                </div>
              ))}
            </CardContent>

            <CardFooter className="justify-end">
              <Button>Save preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ▸ Integrations */}
        <TabsContent value="integration">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>API keys and webhooks.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="api-key">Public API key</Label>
                <Input id="api-key" value="pk_live_************************" readOnly className="font-mono" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="webhook">Webhook URL</Label>
                <Input id="webhook" placeholder="https://example.com/webhook" />
              </div>
            </CardContent>

            <CardFooter className="justify-end">
              <Button>Regenerate key</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
