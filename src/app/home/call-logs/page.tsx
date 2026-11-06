"use client";

import { useEffect, useState } from "react";
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

interface CallLog {
  id: string;
  sipSessionId: string;
  phoneNumber: string;
  callType: "inbound" | "outbound";
  callState: "completed" | "missed" | "cancelled" | "failed";
  cancelReason: string | null;
  startedAt: string;
  durationSeconds: number;
}

const statusStyles: Record<CallLog["callState"], string> = {
  completed: "bg-emerald-500/20 text-emerald-500",
  missed: "bg-destructive/10 text-destructive",
  cancelled: "bg-amber-500/20 text-amber-500",
  failed: "bg-blue-500/20 text-blue-500",
};

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function CallLogsPage() {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCallLogs() {
      try {
        const response = await fetch("/api/user/call-logs", {
          credentials: "include",
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          callLogs?: CallLog[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(result.error || "Could not load call logs.");
        }
        setCallLogs(result.callLogs ?? []);
      } catch (loadError: unknown) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load call logs.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadCallLogs();
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Call Logs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review recent inbound and outbound activity across your dialer.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
          <CardDescription>
            Monitor call performance and quickly follow up with your contacts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Call ID</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Call State</TableHead>
                <TableHead>Cancel Reason</TableHead>
                <TableHead>Started At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    Loading call logs...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-destructive"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : callLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    No calls have been logged yet.
                  </TableCell>
                </TableRow>
              ) : (
                callLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.sipSessionId.slice(-8)}
                    </TableCell>
                    <TableCell>{log.phoneNumber}</TableCell>
                    <TableCell className="capitalize">{log.callType}</TableCell>
                    <TableCell>{formatDuration(log.durationSeconds)}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                          statusStyles[log.callState],
                        )}
                      >
                        {log.callState}
                      </span>
                    </TableCell>
                    <TableCell>{log.cancelReason ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(log.startedAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
