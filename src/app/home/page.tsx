"use client";
import { DialerWorkspace } from "./components/dialer-workspace";
import { useDialer } from "./hooks/use-dialer";

export default function HomePage() {
  const dialer = useDialer();
  return <DialerWorkspace {...dialer} />;
}
