"use client";

import { useEffect, useState } from "react";
import { useClientStore } from "@/stores/clients-store";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Edit2 } from "lucide-react";
import { MOCK_UI, USE_MOCKS } from "@/lib/dev-logger"; 

type TeamMember = { name: string; role: string; email: string };
type Room = { name: string; active: boolean; members: number };

const FEATURE_LIST = ["Portfolio View", "Trade History", "Statements", "Reports", "Tax Documents"];

const DEFAULT_TEAM: TeamMember[] = [
  { name: "Sarah Johnson", role: "Relationship Manager", email: "sarah@company.com" },
  { name: "Alice Johnson", role: "Investment Advisor", email: "alice@company.com" },
  { name: "Bob Wilson", role: "Operations", email: "bob@company.com" },
];

export default function ClientSettingsPage({ params }: { params: { clientId: string } }) {
  const { setCurrClient, clients } = useClientStore();

  useEffect(() => {
    if (params.clientId) setCurrClient(params.clientId);
  }, [params.clientId, setCurrClient]);

  // ----- Data Permission -----
  const [features, setFeatures] = useState<string[]>(FEATURE_LIST);
  const toggleFeature = (f: string) =>
    setFeatures((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  // ----- Service Team -----
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM);

  // ----- App Settings -----
  const summary = clients[params.clientId]?.summary ?? {};
  const [app, setApp] = useState({
    active: true,
    loginName: "min.li@easyview.com.hk",
    loginEmail: "min.li@easyview.com.hk",
    lastLogin: "2025-07-29 18:45:32",
    version: "1.4.3",
    ip: "--",
    device: "iPhone13,4",
    supportsTrade: true,
    supportsQuote: true,
    statementVisibility: "Non-Tradable",
    pnlVisibility: "Non-Tradable",
    tradableProducts: "Equity",
  });
  const [tradeNotifDisabled, setTradeNotifDisabled] = useState(true);

  // ----- Chat Rooms -----
  const [rooms, setRooms] = useState<Room[]>([
    { name: "General Discussion", active: true, members: 3 },
    { name: "Trading Updates", active: true, members: 2 },
  ]);

  // ----- RFQ Settings -----
  const [rfq, setRfq] = useState({ product: "RFQ default UF", note: "5 %", equityOtc: "2 bps", fxOtc: "1 bps" });
  const [rfqCustodians, setRfqCustodians] = useState<string[]>(["UBS CH", "JP Morgan SG", "EAM HK"]);
  const custodiansCsv = rfqCustodians.join(", ");

  return (
    <div className="p-4 space-y-6">
      {/* Data Permission */}
      <Card className={MOCK_UI(USE_MOCKS)}>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Data Permission</CardTitle>
            <CardDescription>Feature access per client</CardDescription>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit feature access</DialogTitle>
                <DialogDescription>Enable or disable features for this client.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                {FEATURE_LIST.map((f) => (
                  <div key={f} className="flex items-center justify-between rounded border p-2">
                    <div className="text-sm">{f}</div>
                    <Switch checked={features.includes(f)} onCheckedChange={() => toggleFeature(f)} />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button type="button">Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="flex flex-wrap gap-2">
          {features.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {/* Service Team */}
      <Card className={MOCK_UI(USE_MOCKS)}>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Service Team</CardTitle>
            <CardDescription>Contacts assigned to this client</CardDescription>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit service team</DialogTitle>
                <DialogDescription>Update names, roles and emails.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {team.map((m, i) => (
                  <div key={i} className="rounded border p-3 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={m.name}
                          onChange={(e) => {
                            const next = [...team];
                            next[i] = { ...next[i], name: e.target.value };
                            setTeam(next);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Role</Label>
                        <Input
                          value={m.role}
                          onChange={(e) => {
                            const next = [...team];
                            next[i] = { ...next[i], role: e.target.value };
                            setTeam(next);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Email</Label>
                        <Input
                          type="email"
                          value={m.email}
                          onChange={(e) => {
                            const next = [...team];
                            next[i] = { ...next[i], email: e.target.value };
                            setTeam(next);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button type="button">Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {team.map((m) => (
            <div key={m.email} className="space-y-1">
              <div className="font-medium">{m.name}</div>
              <div className="text-sm text-muted-foreground">{m.role}</div>
              <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <Mail className="h-3.5 w-3.5" />
                {m.email}
              </a>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* App Setting */}
      <Card className={MOCK_UI(USE_MOCKS)}>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>APP Setting</CardTitle>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit app settings</DialogTitle>
                <DialogDescription>Values here are local for demo; wire to your API to persist.</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded border p-2">
                  <Label className="text-sm">Active</Label>
                  <Switch checked={app.active} onCheckedChange={(v) => setApp((s) => ({ ...s, active: v }))} />
                </div>

                <div>
                  <Label className="text-xs">Login Name</Label>
                  <Input value={app.loginName} onChange={(e) => setApp((s) => ({ ...s, loginName: e.target.value }))} />
                </div>

                <div>
                  <Label className="text-xs">Login Email</Label>
                  <Input value={app.loginEmail} onChange={(e) => setApp((s) => ({ ...s, loginEmail: e.target.value }))} />
                </div>

                <div>
                  <Label className="text-xs">App Version</Label>
                  <Input value={app.version} onChange={(e) => setApp((s) => ({ ...s, version: e.target.value }))} />
                </div>

                <div>
                  <Label className="text-xs">Device</Label>
                  <Input value={app.device} onChange={(e) => setApp((s) => ({ ...s, device: e.target.value }))} />
                </div>

                <div>
                  <Label className="text-xs">Tradable Products</Label>
                  <Input
                    value={app.tradableProducts}
                    onChange={(e) => setApp((s) => ({ ...s, tradableProducts: e.target.value }))}
                  />
                </div>

                <div className="flex items-center justify-between rounded border p-2">
                  <Label className="text-sm">Supports Trade</Label>
                  <Switch
                    checked={app.supportsTrade}
                    onCheckedChange={(v) => setApp((s) => ({ ...s, supportsTrade: v }))}
                  />
                </div>

                <div className="flex items-center justify-between rounded border p-2">
                  <Label className="text-sm">Supports Quotation</Label>
                  <Switch
                    checked={app.supportsQuote}
                    onCheckedChange={(v) => setApp((s) => ({ ...s, supportsQuote: v }))}
                  />
                </div>

                <div>
                  <Label className="text-xs">P&amp;L Visibility</Label>
                  <Input value={app.pnlVisibility} onChange={(e) => setApp((s) => ({ ...s, pnlVisibility: e.target.value }))} />
                </div>

                <div>
                  <Label className="text-xs">Statement Visibility</Label>
                  <Input
                    value={app.statementVisibility}
                    onChange={(e) => setApp((s) => ({ ...s, statementVisibility: e.target.value }))}
                  />
                </div>
              </div>

              <Separator className="my-2" />

              <div className="flex items-center justify-between rounded border p-2">
                <div className="text-sm">Trade Notification Disabled</div>
                <Switch checked={tradeNotifDisabled} onCheckedChange={setTradeNotifDisabled} />
              </div>

              <DialogFooter>
                <Button type="button">Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          <div className="space-y-1">
            <Row k="Active" v={app.active ? "Yes" : "No"} />
            <Row k="Login Name" v={app.loginName} />
            <Row k="App Version" v={app.version} />
            <Row k="IP Address" v="--" />
            <Row k="Tradable Products" v={app.tradableProducts} />
            <Row k="P&L Visibility" v={app.pnlVisibility} />
          </div>
          <div className="space-y-1">
            <Row k="Login Email" v={app.loginEmail} />
            <Row k="Last Login Time" v={app.lastLogin} />
            <Row k="Log Equipment" v={app.device} />
            <Row k="App supports trade" v={app.supportsTrade ? "Tradable" : "—"} />
            <Row k="App supports quotation" v={app.supportsQuote ? "Tradable" : "—"} />
            <Row k="Statement Visibility" v={app.statementVisibility} />
          </div>

          <Separator className="md:col-span-2 my-2" />

          <div className="md:col-span-2 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Trade Notification Disabled</div>
            <Switch checked={tradeNotifDisabled} onCheckedChange={setTradeNotifDisabled} />
          </div>
        </CardContent>
      </Card>

      {/* Chat Rooms */}
      <Card className={MOCK_UI(USE_MOCKS)}>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Chat Room Activated</CardTitle>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit chat rooms</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                {rooms.map((r, i) => (
                  <div key={i} className="rounded border p-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div>
                      <Label className="text-xs">Room name</Label>
                      <Input
                        value={r.name}
                        onChange={(e) => {
                          const next = [...rooms];
                          next[i] = { ...next[i], name: e.target.value };
                          setRooms(next);
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded border p-2">
                      <Label className="text-sm">Active</Label>
                      <Switch
                        checked={r.active}
                        onCheckedChange={(v) => {
                          const next = [...rooms];
                          next[i] = { ...next[i], active: v };
                          setRooms(next);
                        }}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Members</Label>
                      <Input
                        type="number"
                        min={0}
                        value={r.members}
                        onChange={(e) => {
                          const next = [...rooms];
                          next[i] = { ...next[i], members: Number(e.target.value) || 0 };
                          setRooms(next);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button type="button">Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Members</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((r) => (
                <TableRow key={r.name}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>
                    <Badge className={r.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                      {r.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.members}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* SP RFQ Settings */}
      <Card className={MOCK_UI(USE_MOCKS)}>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>SP RFQ Settings</CardTitle>
            <CardDescription>Defaults by product</CardDescription>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit RFQ defaults</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Product</Label>
                  <Input value={rfq.product} onChange={(e) => setRfq((s) => ({ ...s, product: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Note</Label>
                  <Input value={rfq.note} onChange={(e) => setRfq((s) => ({ ...s, note: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Equity OTC</Label>
                  <Input value={rfq.equityOtc} onChange={(e) => setRfq((s) => ({ ...s, equityOtc: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">FX OTC</Label>
                  <Input value={rfq.fxOtc} onChange={(e) => setRfq((s) => ({ ...s, fxOtc: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Custodians (comma-separated)</Label>
                  <Textarea
                    rows={3}
                    defaultValue={custodiansCsv}
                    onBlur={(e) =>
                      setRfqCustodians(
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button">Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Equity OTC</TableHead>
                <TableHead>FX OTC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{rfq.product}</TableCell>
                <TableCell>{rfq.note}</TableCell>
                <TableCell>{rfq.equityOtc}</TableCell>
                <TableCell>{rfq.fxOtc}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div>
            <div className="text-sm font-medium mb-2">Custodians available to place order</div>
            <div className="flex flex-wrap gap-2">
              {rfqCustodians.map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | number }) {
  return (
    <div className="grid grid-cols-12 gap-2 py-1">
      <div className="col-span-5 md:col-span-4 text-muted-foreground">{k}</div>
      <div className="col-span-7 md:col-span-8 break-words">{v ?? "—"}</div>
    </div>
  );
}
