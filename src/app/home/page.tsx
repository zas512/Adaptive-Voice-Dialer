"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Phone, PhoneOff } from "lucide-react";
import JsSIP from "jssip";
import { useProtectedRoute } from "@/hooks/use-protected-route";

export default function HomePage() {
  const { isLoading: authLoading } = useProtectedRoute();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [callStatus, setCallStatus] = useState("Awaiting registration");
  const uaRef = useRef<JsSIP.UA | null>(null);
  const currentCallRef = useRef(null);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const handleCall = () => {
    if (!uaRef.current) {
      setCallStatus("Not registered. Configure SIP settings.");
      return;
    }
    if (currentCallRef.current) {
      currentCallRef.current = null;
      setIsConnected(false);
      setCallStatus("Call ended");
      return;
    }
    if (!phoneNumber) {
      setCallStatus("Please enter a phone number");
    }
  };

  const handleNumberClick = (num: string) => setPhoneNumber((prev) => prev + num);
  const handleClear = () => setPhoneNumber("");
  const handleBackspace = () => setPhoneNumber((prev) => prev.slice(0, -1));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dialer</CardTitle>
            <CardDescription>Enter a number or dial using the keypad.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter number or dial"
                className="text-2xl text-center border-transparent bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="text-center">
              <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-medium ${isConnected ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-700 dark:text-red-400"}`}>
                {callStatus}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, "*", 0, "#"].map((num) => (
                <Button key={num} onClick={() => handleNumberClick(String(num))} className="h-14 text-xl" variant="outline">
                  {num}
                </Button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button onClick={handleClear} className="flex-1" variant="outline">Clear</Button>
              <Button onClick={handleBackspace} className="flex-1" variant="outline">←</Button>
            </div>

            <Button onClick={handleCall} className={`w-full h-14 text-lg ${isConnected ? "bg-destructive hover:bg-destructive/90" : ""}`} disabled={!isConnected}>
              {isConnected ? (
                <><PhoneOff className="w-5 h-5 mr-2" /> End Call</>
              ) : (
                <><Phone className="w-5 h-5 mr-2" /> Call</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>Live system state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">SIP Status</span><span className={isConnected ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-destructive font-medium"}>{isConnected ? "Registered" : "Disconnected"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Call Status</span><span className={isConnected ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>{isConnected ? "In Call" : "Idle"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">WebSocket</span><span className="text-foreground font-medium">{uaRef.current ? "Configured" : "Not configured"}</span></div>
            </div>
            <div className="rounded-lg border border-border p-4 text-sm space-y-2">
              <h4 className="font-semibold">Quick Tips</h4>
              <p className="text-muted-foreground">Configure SIP settings in the account settings to begin placing real calls.</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                <li>Verify WebSocket host is reachable.</li>
                <li>Use secure credentials.</li>
                <li>Review call logs to monitor quality.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}