"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProtectedRouteByRole } from "@/hooks/use-protected-route";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";

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

export default function AdminUsersPage() {
  const router = useRouter();
  const { isLoading: roleLoading, hasRole } = useProtectedRouteByRole("admin");
  const { data: users, isLoading: usersLoading } = useApiQuery<AdminUser[]>(
    ["admin", "users"],
    "/admin/users",
    { enabled: hasRole }
  );

  if (roleLoading || (!hasRole && roleLoading)) {
    return <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Checking permissions…</div>;
  }
  if (!hasRole) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage user access across your organization.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>Manage access levels for administrators, agents, and users.</CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading users…</div>
          ) : users && users.length > 0 ? (
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
                    <TableCell className="font-medium">{user.name || "—"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>{user.number || "—"}</TableCell>
                    <TableCell>{user.extensionId || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-muted-foreground">No users found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}