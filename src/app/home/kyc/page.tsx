import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const clients = [
  {
    id: "CLNT-001",
    name: "Acme Corporation",
    contact: "support@acme.com",
    status: "Verified",
    lastUpdated: "2025-03-14",
  },
  {
    id: "CLNT-002",
    name: "Northwind Traders",
    contact: "billing@northwind.com",
    status: "Pending Review",
    lastUpdated: "2025-03-12",
  },
  {
    id: "CLNT-003",
    name: "Contoso Medical",
    contact: "compliance@contoso.com",
    status: "Requires Action",
    lastUpdated: "2025-03-02",
  },
];

const statusStyles: Record<string, string> = {
  Verified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  "Pending Review": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "Requires Action": "bg-destructive/10 text-destructive",
};

export default function KycPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">KYC Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your clients and customer records compliant and up to date.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Client Portfolio</CardTitle>
            <CardDescription>
              Track verification status and outstanding actions for each client.
            </CardDescription>
          </div>
          <Button disabled>Add new client</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client ID</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Primary Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.id}</TableCell>
                  <TableCell>{client.name}</TableCell>
                  <TableCell>{client.contact}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                        statusStyles[client.status] ??
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {client.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.lastUpdated}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" disabled>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}