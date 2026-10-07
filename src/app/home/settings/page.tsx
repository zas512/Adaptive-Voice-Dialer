"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("Zain Ali");
  const [email, setEmail] = useState("zainalis.914@gmail.com");
  const [number, setNumber] = useState("+1 (555) 123-4567");
  const [enableTwoFactor, setEnableTwoFactor] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account details, security, and caller preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Enter your display name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="number">Direct Number</Label>
            <Input
              id="number"
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              placeholder="+1234567890"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="extension">Extension</Label>
            <Input id="extension" placeholder="e.g. 101" />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button disabled>Save changes</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Control authentication and session preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Two-factor authentication
              </h4>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security when signing in.
              </p>
            </div>
            <Button
              variant={enableTwoFactor ? "secondary" : "outline"}
              onClick={() => setEnableTwoFactor((prev) => !prev)}
            >
              {enableTwoFactor ? "Enabled" : "Enable"}
            </Button>
          </div>
          <Button variant="outline" disabled>
            Reset password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}