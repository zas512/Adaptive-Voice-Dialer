import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const callLogs = [
  {
    id: "CAL-001",
    contact: "John Carter",
    direction: "Outbound",
    duration: "03:24",
    status: "Completed",
    startedAt: "2025-03-18 10:32 AM",
  },
  {
    id: "CAL-002",
    contact: "Acme Support",
    direction: "Inbound",
    duration: "00:58",
    status: "Missed",
    startedAt: "2025-03-18 09:15 AM",
  },
  {
    id: "CAL-003",
    contact: "Jane Smith",
    direction: "Outbound",
    duration: "12:11",
    status: "Completed",
    startedAt: "2025-03-17 05:42 PM",
  },
  {
    id: "CAL-004",
    contact: "Inbound Queue",
    direction: "Inbound",
    duration: "08:03",
    status: "Voicemail",
    startedAt: "2025-03-17 04:12 PM",
  },
];

const statusStyles: Record<string, string> = {
  Completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Missed: "bg-destructive/10 text-destructive",
  Voicemail: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

export default function CallLogsPage() {
  return (
    <div className="space-y-6 text-[#f0f4f8]">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Call Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review recent inbound and outbound activity across your dialer.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
          <CardDescription>
            Monitor call performance and follow up with contacts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Call ID</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {callLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.id}</TableCell>
                  <TableCell>{log.contact}</TableCell>
                  <TableCell>{log.direction}</TableCell>
                  <TableCell>{log.duration}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                        statusStyles[log.status] ??
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {log.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.startedAt}
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