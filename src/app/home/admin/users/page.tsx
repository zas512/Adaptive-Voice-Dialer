"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { useProtectedRouteByRole } from "@/hooks/use-protected-route";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "agent";
  number?: string;
  extensionId?: string;
  host?: string;
  port?: number | null;
  secret?: string;
  createdAt: string;
  updatedAt: string;
};

type UserFormState = {
  id?: string;
  name: string;
  email: string;
  password: string;
  role: "user" | "admin" | "agent";
  number: string;
  extensionId: string;
  host: string;
  port: string;
  secret: string;
};

const emptyForm: UserFormState = {
  name: "",
  email: "",
  password: "",
  role: "user",
  number: "",
  extensionId: "",
  host: "",
  port: "",
  secret: "",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { isLoading: roleLoading, hasRole } = useProtectedRouteByRole("admin");

  const { data: users, isLoading: usersLoading } = useApiQuery<AdminUser[]>(
    ["admin", "users"],
    "/admin/users",
    {
      enabled: hasRole,
    }
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState<UserFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const createUserMutation = useApiMutation<
    AdminUser,
    Omit<UserFormState, "id">
  >("/admin/users", "POST", {
    invalidateQueries: [["admin", "users"]],
    onSuccess: () => {
      setIsModalOpen(false);
      setFormData(emptyForm);
    },
    onError: (error) => {
      setFormError(error.message);
    },
  });

  const updateUserMutation = useApiMutation<
    AdminUser,
    Required<Pick<UserFormState, "id">> & Partial<UserFormState>
  >("/admin/users", "PUT", {
    invalidateQueries: [["admin", "users"]],
    onSuccess: () => {
      setIsModalOpen(false);
      setFormData(emptyForm);
    },
    onError: (error) => {
      setFormError(error.message);
    },
  });

  const isProcessing =
    createUserMutation.isPending || updateUserMutation.isPending;

  useEffect(() => {
    if (!roleLoading && !hasRole) {
      router.replace("/home");
    }
  }, [hasRole, roleLoading, router]);

  useEffect(() => {
    if (!isModalOpen) return;
    modalRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => returnFocusRef.current?.focus();
  }, [isModalOpen]);

  const rememberModalOpener = () => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };

  const openCreateModal = () => {
    rememberModalOpener();
    setFormMode("create");
    setFormData(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: AdminUser) => {
    rememberModalOpener();
    setFormMode("edit");
    setFormData({
      id: user.id,
      name: user.name ?? "",
      email: user.email,
      password: "",
      role: user.role,
      number: user.number ?? "",
      extensionId: user.extensionId ?? "",
      host: user.host ?? "",
      port: user.port ? String(user.port) : "",
      secret: user.secret ?? "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isProcessing) return;
    setIsModalOpen(false);
    setFormData(emptyForm);
    setFormError(null);
  };

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable.item(0);
    const last = focusable.item(focusable.length - 1);
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleFormChange = (field: keyof UserFormState, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (formMode === "create" && !formData.password) {
      setFormError("Password is required for new users.");
      return;
    }

    if (formMode === "edit" && !formData.id) {
      setFormError("Missing user identifier.");
      return;
    }

    const basePayload: Record<string, unknown> = {
      name: formData.name || undefined,
      email: formData.email,
      role: formData.role,
      number: formData.number || undefined,
      extensionId: formData.extensionId || undefined,
      host: formData.host || undefined,
      port: formData.port ? Number.parseInt(formData.port, 10) : undefined,
      secret: formData.secret || undefined,
    };

    if (formData.password) {
      basePayload.password = formData.password;
    }

    try {
      if (formMode === "create") {
        await createUserMutation.mutateAsync(
          basePayload as Omit<UserFormState, "id">
        );
      } else {
        await updateUserMutation.mutateAsync({
          id: formData.id,
          ...(basePayload as Partial<UserFormState>),
        });
      }
    } catch (error) {
      // Errors handled through onError callbacks
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    }
  };

  if (roleLoading || (!hasRole && roleLoading)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Checking permissions…
      </div>
    );
  }

  if (!hasRole) {
    return null;
  }

  const directoryContent = (() => {
    if (usersLoading) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          Loading users…
        </div>
      );
    }

    if (users && users.length > 0) {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Extension</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.name || "—"}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="capitalize">{user.role}</TableCell>
                <TableCell>{user.number || "—"}</TableCell>
                <TableCell>{user.extensionId || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(user)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    return (
      <div className="py-12 text-center text-muted-foreground">
        No users found.
      </div>
    );
  })();

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Team directory</CardTitle>
            <CardDescription>
              Manage accounts, access levels, and SIP provisioning.
            </CardDescription>
          </div>
          <Button onClick={openCreateModal} className="shrink-0">
            Add user
          </Button>
        </CardHeader>
        <CardContent>
          {directoryContent}
        </CardContent>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 px-3 py-4 backdrop-blur sm:items-center">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-dialog-title"
            tabIndex={-1}
            onKeyDown={handleDialogKeyDown}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-card shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2
                id="user-dialog-title"
                className="text-lg font-semibold text-foreground"
              >
                {formMode === "create" ? "Create user" : "Edit user"}
              </h2>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                Close
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(event) =>
                      handleFormChange("name", event.target.value)
                    }
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      handleFormChange("email", event.target.value)
                    }
                    required
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(event) =>
                      handleFormChange(
                        "role",
                        event.target.value as UserFormState["role"]
                      )
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <option value="user">User</option>
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {formMode === "create" ? "Password *" : "Password"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(event) =>
                      handleFormChange("password", event.target.value)
                    }
                    placeholder={
                      formMode === "create"
                        ? "••••••"
                        : "Leave blank to keep current"
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Direct Number</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(event) =>
                      handleFormChange("number", event.target.value)
                    }
                    placeholder="+1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extensionId">Extension</Label>
                  <Input
                    id="extensionId"
                    value={formData.extensionId}
                    onChange={(event) =>
                      handleFormChange("extensionId", event.target.value)
                    }
                    placeholder="1001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    value={formData.host}
                    onChange={(event) =>
                      handleFormChange("host", event.target.value)
                    }
                    placeholder="sip.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(event) =>
                      handleFormChange("port", event.target.value)
                    }
                    placeholder="5060"
                    min={1}
                    max={65535}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="secret">Secret</Label>
                  <Input
                    id="secret"
                    value={formData.secret}
                    onChange={(event) =>
                      handleFormChange("secret", event.target.value)
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>

              {formError && (
                <div
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isProcessing}>
                  {(() => {
                    if (isProcessing) {
                      return "Saving...";
                    }
                    if (formMode === "create") {
                      return "Create user";
                    }
                    return "Save changes";
                  })()}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
