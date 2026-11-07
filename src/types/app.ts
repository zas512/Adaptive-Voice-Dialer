import type { ReactNode } from "react";
import type { RTCSession } from "jssip/lib/RTCSession";

export type SipConfig = {
  url: string;
  port: string;
  extension: string;
};

export type CallPhase =
  | "idle"
  | "incoming"
  | "answering"
  | "dialing"
  | "ringing"
  | "connecting"
  | "active"
  | "ending"
  | "ended"
  | "failed"
  | "disconnected";

export interface StatusRowProps {
  icon: ReactNode;
  title: string;
  value: string;
  tone: "success" | "danger" | "warning" | "neutral";
}

export type Profile = {
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

export interface CallLog {
  id: string;
  sipSessionId: string;
  phoneNumber: string;
  callType: "inbound" | "outbound";
  callState: "completed" | "missed" | "cancelled" | "failed";
  amdStatus?: string | null;
  amdCause?: string | null;
  cancelReason: string | null;
  startedAt: string;
  durationSeconds: number;
}

export type AdminUser = {
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

export type UserFormState = {
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

export interface HomeLayoutProps {
  children: ReactNode;
  className?: string;
}

export type SipProfile = {
  extensionId?: string;
  url?: string;
  port?: number;
  secret?: string;
  name?: string;
};

export type AMDResult = {
  amdStatus: string;
  amdCause: string | null;
};

export type AMDMessage = AMDResult & {
  callId: string;
  fromTag: string | null;
  toTag: string | null;
  remoteParty: string;
};

export type SipHandlers = {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onRegistered?: () => void;
  onRegistrationFailed?: () => void;
  onNewRTCSession?: (session: RTCSession) => void;
  onAMDMessage?: (message: AMDMessage) => void;
};
