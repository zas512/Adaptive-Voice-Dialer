"use client";
import { useState } from "react";
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
  const uaRef = useRef<JsSIP.UA | null>(null); // fixed below
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Dialer</CardTitle></CardHeader>
        <CardContent>Dialer content — register to SIP to make real calls.</CardContent>
      </Card>
    </div>
  );
}
