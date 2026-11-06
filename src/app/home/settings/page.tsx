"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: "user" | "agent" | "admin";
  number: string;
  extensionId: string;
  host: string;
  port: number | null;
  createdAt: string;
  updatedAt: string;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Changing reloadToken intentionally retries the request.
  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch("/api/user/profile", {
          credentials: "include",
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          user?: Profile;
          error?: string;
        };
        if (!response.ok || !result.user) {
          throw new Error(result.error || "Could not load your profile.");
        }
        setProfile(result.user);
        setName(result.user.name);
        setNumber(result.user.number);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof Error ? error.message : "Could not load your profile.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, [reloadToken]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError(null);
    setSaveMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, number }),
      });
      const result = (await response.json()) as {
        user?: Profile;
        error?: string;
      };
      if (!response.ok || !result.user) {
        throw new Error(result.error || "Could not save your profile.");
      }
      setProfile(result.user);
      setName(result.user.name);
      setNumber(result.user.number);
      setSaveMessage("Profile saved.");
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save your profile.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your name and direct number. Email and SIP extension are
            managed by your administrator.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {loadError && (
              <div className="md:col-span-2" role="alert">
                <p className="text-sm text-destructive">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setReloadToken((token) => token + 1)}
                >
                  Retry loading profile
                </Button>
              </div>
            )}
            {isLoading && (
              <p className="md:col-span-2 text-sm text-muted-foreground" role="status">
                Loading profile…
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
                disabled={isLoading || !profile || isSaving}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email ?? ""}
                readOnly
                aria-describedby="email-managed-note"
              />
              <p id="email-managed-note" className="text-xs text-muted-foreground">
                Email changes are managed by your administrator.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Direct number</Label>
              <Input
                id="number"
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                maxLength={40}
                disabled={isLoading || !profile || isSaving}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extension">SIP extension</Label>
              <Input
                id="extension"
                value={profile?.extensionId ?? ""}
                readOnly
                aria-describedby="extension-managed-note"
              />
              <p id="extension-managed-note" className="text-xs text-muted-foreground">
                SIP provisioning is managed by your administrator.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              {saveError && (
                <p className="text-sm text-destructive" role="alert">
                  {saveError}
                </p>
              )}
              {saveMessage && (
                <p className="text-sm text-success" role="status" aria-live="polite">
                  {saveMessage}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isLoading || !profile || isSaving}>
              {isSaving ? "Saving…" : "Save profile"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Control authentication and session preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium text-foreground">
              Two-factor authentication
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Two-factor authentication is not configured for this deployment.
              Ask your administrator about available sign-in protections.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Password changes are managed by your administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
