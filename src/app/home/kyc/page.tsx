"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type KycStatus = "pending-review" | "verified" | "requires-action";

type KycClient = {
  id: string;
  name: string;
  contact: string;
  status: KycStatus;
  createdAt: string;
  updatedAt: string;
};

const statusLabels: Record<KycStatus, string> = {
  "pending-review": "Pending review",
  verified: "Verified",
  "requires-action": "Requires action",
};

const statusStyles: Record<KycStatus, string> = {
  verified: "bg-success/10 text-success",
  "pending-review": "bg-warning/10 text-warning",
  "requires-action": "bg-destructive/10 text-destructive",
};

function isKycStatus(value: string): value is KycStatus {
  return (
    value === "pending-review" ||
    value === "verified" ||
    value === "requires-action"
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export default function KycPage() {
  const [clients, setClients] = useState<KycClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<KycStatus>("pending-review");
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Changing reloadToken intentionally retries the request.
  useEffect(() => {
    const controller = new AbortController();

    async function loadClients() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch("/api/user/kyc", {
          credentials: "include",
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          clients?: KycClient[];
          error?: string;
        };
        if (!response.ok || !Array.isArray(result.clients)) {
          throw new Error(result.error || "Could not load client records.");
        }
        setClients(result.clients);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load client records.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadClients();
    return () => controller.abort();
  }, [reloadToken]);

  const handleCreateClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    setNotice(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/user/kyc", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clientName, contact: clientContact }),
      });
      const result = (await response.json()) as {
        client?: KycClient;
        error?: string;
      };
      if (!response.ok || !result.client) {
        throw new Error(result.error || "Could not create the client record.");
      }
      const newClient = result.client;
      setClients((current) => [newClient, ...current]);
      setClientName("");
      setClientContact("");
      setIsCreateOpen(false);
      setNotice("Client record created.");
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not create the client record.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveReview = async (id: string) => {
    setActionError(null);
    setNotice(null);
    setSavingStatusId(id);

    try {
      const response = await fetch("/api/user/kyc", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: reviewStatus }),
      });
      const result = (await response.json()) as {
        client?: KycClient;
        error?: string;
      };
      if (!response.ok || !result.client) {
        throw new Error(result.error || "Could not save the review status.");
      }
      const updatedClient = result.client;
      setClients((current) =>
        current.map((client) =>
          client.id === updatedClient.id ? updatedClient : client,
        ),
      );
      setReviewingId(null);
      setNotice("Review status saved.");
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not save the review status.",
      );
    } finally {
      setSavingStatusId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          KYC records
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track client contact details and internal review status. Identity
          documents are not collected by this app.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Client records</CardTitle>
            <CardDescription>
              Records are visible only to the account that created them.
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={() => {
              setActionError(null);
              setIsCreateOpen((open) => !open);
            }}
          >
            {isCreateOpen ? "Close form" : "Add client record"}
          </Button>
        </CardHeader>
        {isCreateOpen && (
          <CardContent className="border-t border-border">
            <form
              onSubmit={handleCreateClient}
              className="grid gap-4 pt-4 sm:grid-cols-2"
            >
              <div className="space-y-2">
                <Label htmlFor="client-name">Client name</Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  maxLength={160}
                  required
                  autoComplete="organization"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-contact">Primary contact</Label>
                <Input
                  id="client-contact"
                  value={clientContact}
                  onChange={(event) => setClientContact(event.target.value)}
                  maxLength={254}
                  required
                  placeholder="Email or phone number"
                />
              </div>
              {actionError && (
                <p className="text-sm text-destructive sm:col-span-2" role="alert">
                  {actionError}
                </p>
              )}
              <div className="flex flex-wrap gap-2 sm:col-span-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Adding…" : "Add client"}
                </Button>
              </div>
            </form>
          </CardContent>
        )}
        <CardContent>
          {notice && (
            <p className="mb-4 text-sm text-success" role="status" aria-live="polite">
              {notice}
            </p>
          )}
          {actionError && !isCreateOpen && (
            <p className="mb-4 text-sm text-destructive" role="alert">
              {actionError}
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client name</TableHead>
                <TableHead>Primary contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Loading client records…
                  </TableCell>
                </TableRow>
              ) : loadError ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    <p className="mb-3 text-destructive">{loadError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setReloadToken((token) => token + 1)}
                    >
                      Retry loading records
                    </Button>
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No client records yet. Add a record to begin tracking reviews.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.contact}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                          statusStyles[client.status],
                        )}
                      >
                        {statusLabels[client.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(client.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {reviewingId === client.id ? (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Label
                            className="sr-only"
                            htmlFor={`review-${client.id}`}
                          >
                            Review status for {client.name}
                          </Label>
                          <select
                            id={`review-${client.id}`}
                            value={reviewStatus}
                            onChange={(event) => {
                              if (isKycStatus(event.target.value)) {
                                setReviewStatus(event.target.value);
                              }
                            }}
                            className="h-10 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="pending-review">Pending review</option>
                            <option value="verified">Verified</option>
                            <option value="requires-action">Requires action</option>
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleSaveReview(client.id)}
                            disabled={savingStatusId === client.id}
                          >
                            {savingStatusId === client.id ? "Saving…" : "Save"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setReviewingId(null)}
                            disabled={savingStatusId === client.id}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReviewStatus(client.status);
                            setReviewingId(client.id);
                            setActionError(null);
                          }}
                        >
                          Review
                        </Button>
                      )}
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
