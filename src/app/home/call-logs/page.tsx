"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { getStoredAuthSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { CallLog } from "@/types/app";
import { useEffect, useState } from "react";

const statusStyles: Record<CallLog["callState"], string> = {
  in_progress: "border border-info/25 bg-info/10 text-info",
  completed: "border border-success/25 bg-success/10 text-success",
  missed: "border border-warning/25 bg-warning/10 text-warning",
  cancelled: "border border-border bg-muted text-muted-foreground",
  failed: "border border-destructive/25 bg-destructive/10 text-destructive"
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
        const session = getStoredAuthSession();
        const response = await fetch("/api/user/call-logs", {
          credentials: "include",
          headers: session
            ? { Authorization: `Bearer ${session.token}` }
            : undefined,
          signal: controller.signal
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
            : "Could not load call logs."
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
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
          <CardDescription>
            Review recent inbound and outbound activity across your dialer.
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
                <TableHead>Answered By</TableHead>
                <TableHead>Cancel Reason</TableHead>
                <TableHead>Started At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center text-muted-foreground"
                  >
                    Loading call logs...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center text-destructive"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : callLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
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
                          statusStyles[log.callState]
                        )}
                      >
                        {log.callState}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-72">
                      {log.aiInference ? (
                        <div className="space-y-1">
                          <p className="font-medium capitalize">
                            {log.aiInference.classification.classification ===
                            "ai"
                              ? "AI / automated"
                              : log.aiInference.classification
                                    .classification === "human"
                                ? "Human"
                                : "Voicemail"}
                          </p>
                        </div>
                      ) : log.callState === "in_progress" ? (
                        <span className="text-muted-foreground">
                          Analyzing first 5 seconds…
                        </span>
                      ) : (
                        "—"
                      )}
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
