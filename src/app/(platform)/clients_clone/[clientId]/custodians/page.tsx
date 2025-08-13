"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useClientStore } from "@/stores/clients-store";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Eye } from "lucide-react";
import { MOCK_UI, USE_MOCKS } from "@/lib/dev-logger"; // ← mock styling helper

const MOCK_ACCOUNTS = [
  {
    custodian: "UBS SG",
    accountNumber: "054600881789",
    accountName: "Goldman Sachs Investment Account",
    relationship: "Primary",
    strategy: "Balanced Growth",
    institution: "UBS Singapore",
  },
  {
    custodian: "JP Morgan SG",
    accountNumber: "5201230",
    accountName: "Goldman Sachs Secondary Account",
    relationship: "Secondary",
    strategy: "Conservative",
    institution: "JP Morgan Singapore",
  },
];

export default function CustodiansPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { setCurrClient } = useClientStore();

  useEffect(() => {
    if (clientId) setCurrClient(clientId);
  }, [clientId, setCurrClient]);

  return (
    <div className="p-4 space-y-6">
      {/* Card 1 - mark as mock */}
      <Card className={MOCK_UI(USE_MOCKS)}>
        <CardHeader>
          <CardTitle>All Accounts By Client</CardTitle>
          <CardDescription>Primary and secondary custodian accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Custodian</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Relationship Type</TableHead>
                <TableHead>Investment Strategy</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead className="text-center">Linked to APP</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ACCOUNTS.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.custodian}</TableCell>
                  <TableCell>{r.accountNumber}</TableCell>
                  <TableCell>{r.accountName}</TableCell>
                  <TableCell>{r.relationship}</TableCell>
                  <TableCell>{r.strategy}</TableCell>
                  <TableCell>{r.institution}</TableCell>
                  <TableCell className="text-center">
                    <Switch defaultChecked={i === 0} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Eye className="h-4 w-4" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Card 2 - mark as mock */}
      <Card className={MOCK_UI(USE_MOCKS)}>
        <CardHeader>
          <CardTitle>Associated Client Accounts</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Add your related entities table here (placeholder).
        </CardContent>
      </Card>
    </div>
  );
}
