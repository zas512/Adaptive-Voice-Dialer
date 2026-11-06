"use client";
import type { UA } from "jssip";
import type { EndEvent } from "jssip/lib/RTCSession";
import { AlertCircle, Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { type RTCSession, SipSessionManager } from "@/app/home/lib/sip-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useProtectedRoute } from "@/hooks/use-protected-route";

type SipConfig = {
  url: string;
  port: string;
  extension: string;
  password: string;
};

type CallPhase =
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

const SIP_CONFIG_STORAGE_PREFIX = "react-dialer.sip-config.";
const ACTIVE_CALL_PHASES: CallPhase[] = [
  "incoming",
  "answering",
  "dialing",
  "ringing",
  "connecting",
  "active",
  "ending",
];

function getDefaultSipConfig(user: {
  extensionId?: string;
  host?: string;
  port?: number;
  secret?: string;
}): SipConfig {
  return {
    url: user.host ?? "",
    port: user.port ? String(user.port) : "",
    extension: user.extensionId ?? "",
    password: user.secret ?? "",
  };
}

function getStoredSipConfig(userId: string): SipConfig | null {
  const stored = window.localStorage.getItem(
    `${SIP_CONFIG_STORAGE_PREFIX}${userId}`,
  );
  if (!stored) return null;

  const value: unknown = JSON.parse(stored);
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("url" in value) ||
    !("port" in value) ||
    !("extension" in value)
  ) {
    throw new Error("Saved SIP settings are not valid.");
  }

  const password = "password" in value ? value.password : "";
  if (
    typeof value.url !== "string" ||
    typeof value.port !== "string" ||
    typeof value.extension !== "string" ||
    typeof password !== "string"
  ) {
    throw new Error("Saved SIP settings are incomplete.");
  }

  return {
    url: value.url,
    port: value.port,
    extension: value.extension,
    password,
  };
}

export default function HomePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useProtectedRoute();
  const [sipConfig, setSipConfig] = useState<SipConfig>({
    url: "",
    port: "",
    extension: "",
    password: "",
  });
  const [sipConfigDraft, setSipConfigDraft] = useState<SipConfig>({
    url: "",
    port: "",
    extension: "",
    password: "",
  });
  const [configuredUserId, setConfiguredUserId] = useState<string | null>(null);
  const [sipConfigError, setSipConfigError] = useState<string | null>(null);
  const [sipConfigMessage, setSipConfigMessage] = useState<string | null>(null);
  const [sipConfigRevision, setSipConfigRevision] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callStatus, setCallStatus] = useState("Connecting…");
  const [websocketConnected, setWebsocketConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationFailed, setRegistrationFailed] = useState(false);
  const [callPhase, setCallPhase] = useState<CallPhase>("idle");
  const [remoteParty, setRemoteParty] = useState("");
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);

  const uaRef = useRef<UA | null>(null);
  const sipExtensionRef = useRef("");
  const currentCallRef = useRef<RTCSession | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const sipManagerRef = useRef<SipSessionManager | null>(null);
  const isSipConfigReady = Boolean(user?.id && configuredUserId === user.id);
  const isIncomingCall = callPhase === "incoming";
  const isCallActive = callPhase === "active";
  const hasCallInProgress = ACTIVE_CALL_PHASES.includes(callPhase);

  const statusLabel = {
    idle: "Idle",
    incoming: "Incoming call",
    answering: "Answering",
    dialing: "Calling",
    ringing: "Ringing",
    connecting: "Connecting call",
    active: "In call",
    ending: "Ending call",
    ended: "Call ended",
    failed: "Call failed",
    disconnected: "Disconnected",
  }[callPhase];
  const audioButtonLabel = isAudioOn ? "Turn speaker off" : "Turn speaker on";

  // --- Call control handlers ---

  const handleCall = () => {
    const activeCall = currentCallRef.current;

    if (activeCall && isIncomingCall) {
      try {
        setCallPhase("answering");
        setCallStatus("Answering incoming call…");
        activeCall.answer({
          mediaConstraints: {
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          },
        });
        setCallStatus("Answering call…");
      } catch (error) {
        console.error("[sip] Could not answer the call.", error);
        setCallPhase("incoming");
        setCallStatus("Could not answer the call.");
      }
      return;
    }

    if (activeCall) {
      setCallPhase("ending");
      setCallStatus("Ending call…");
      activeCall.terminate();
      return;
    }

    if (!phoneNumber.trim()) {
      setCallStatus("Enter a phone number to call.");
      return;
    }

    if (!uaRef.current || !isRegistered) {
      setCallStatus("Not registered. Wait for SIP registration before calling.");
      return;
    }

    setCallPhase("dialing");
    setCallStatus("Calling…");
    try {
      const target = phoneNumber.trim().replace(/\s/g, "");
      const dest = `sip:${target}@${sipExtensionRef.current.split("@")[1] || sipExtensionRef.current}`;
      const call = uaRef.current.call(dest, {
        mediaConstraints: {
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        },
      });
      currentCallRef.current = call;
    } catch (error) {
      console.error("[sip] Could not start the call.", error);
      currentCallRef.current = null;
      setCallPhase("failed");
      setCallStatus("Could not start the call. Check microphone permissions.");
    }
  };

  const handleDecline = () => {
    const incomingCall = currentCallRef.current;
    if (!incomingCall || !isIncomingCall) return;

    setCallPhase("ending");
    setCallStatus("Declining incoming call…");
    incomingCall.terminate({
      status_code: 486,
      reason_phrase: "Busy Here",
    });
  };

  const handleToggleMute = () => {
    const activeCall = currentCallRef.current;
    if (!activeCall || !isCallActive) return;

    try {
      if (isMuted) {
        activeCall.unmute({ audio: true });
      } else {
        activeCall.mute({ audio: true });
      }
      setIsMuted(!isMuted);
    } catch (error) {
      console.error("[media] Could not change microphone mute state.", error);
      setCallStatus(
        `Could not ${isMuted ? "unmute" : "mute"} the microphone. Try again.`,
      );
    }
  };

  const handleEnableAudio = () => {
    const audio = remoteAudioRef.current;
    if (!audio?.srcObject) {
      setCallStatus("Call audio is not available yet. Wait for the call to connect.");
      return;
    }
    audio.muted = false;
    void audio.play().then(
      () => {
        setAudioPlaybackBlocked(false);
        setIsAudioOn(true);
      },
      (error: unknown) => {
        console.error("[media] Could not start remote audio playback.", error);
        setAudioPlaybackBlocked(true);
      },
    );
  };

  const handleToggleAudio = () => {
    const audio = remoteAudioRef.current;
    if (!audio?.srcObject) {
      setCallStatus("Remote audio is not available yet. Wait for the call to connect.");
      return;
    }

    const nextAudioOn = !isAudioOn;
    audio.muted = !nextAudioOn;
    if (!nextAudioOn) {
      setIsAudioOn(false);
      return;
    }

    void audio.play().then(
      () => {
        setAudioPlaybackBlocked(false);
        setIsAudioOn(true);
      },
      (error: unknown) => {
        console.error("[media] Could not start remote audio playback.", error);
        audio.muted = true;
        setIsAudioOn(false);
        setAudioPlaybackBlocked(true);
      },
    );
  };

  const handleNumberClick = (num: string) => {
    setPhoneNumber((prev) => prev + num);
  };

  const handleClear = () => {
    setPhoneNumber("");
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const handleSaveSipConfig = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSipConfigError(null);
    setSipConfigMessage(null);

    if (!user?.id) {
      setSipConfigError("Sign in again before saving SIP settings.");
      return;
    }

    const nextConfig = {
      url: sipConfigDraft.url.trim(),
      port: sipConfigDraft.port.trim(),
      extension: sipConfigDraft.extension.trim(),
      password: sipConfigDraft.password,
    };
    const port = Number(nextConfig.port);

    if (!nextConfig.url) {
      setSipConfigError("Enter a SIP server URL.");
      return;
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      setSipConfigError("Enter a port between 1 and 65535.");
      return;
    }
    if (!nextConfig.extension) {
      setSipConfigError("Enter your SIP extension.");
      return;
    }
    if (!nextConfig.password) {
      setSipConfigError("Enter your SIP password.");
      return;
    }

    let parsedUrl: URL;
    try {
      const inputUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(nextConfig.url)
        ? nextConfig.url
        : `https://${nextConfig.url}`;
      parsedUrl = new URL(inputUrl);
    } catch {
      setSipConfigError("Enter a valid server URL.");
      return;
    }
    if (
      !["http:", "https:", "ws:", "wss:"].includes(parsedUrl.protocol) ||
      !parsedUrl.hostname ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      setSipConfigError("Enter a valid server URL without credentials.");
      return;
    }

    try {
      window.localStorage.setItem(
        `${SIP_CONFIG_STORAGE_PREFIX}${user.id}`,
        JSON.stringify(nextConfig),
      );
    } catch (error: unknown) {
      console.error("[sip] Could not save local SIP settings.", error);
      setSipConfigError("Could not save SIP settings in this browser.");
      return;
    }

    setSipConfig(nextConfig);
    setSipConfigDraft(nextConfig);
    setWebsocketConnected(false);
    setIsRegistered(false);
    setRegistrationFailed(false);
    setSipConfigRevision((revision) => revision + 1);
    setSipConfigMessage("Settings saved locally. Reconnecting to SIP…");
    setCallStatus("Connecting with the updated SIP settings.");
  };

  // --- Lifecycle effect ---

  useEffect(() => {
    if (!user?.id) return;

    const defaults = getDefaultSipConfig(user);
    try {
      const storedConfig = getStoredSipConfig(user.id);
      const config = storedConfig ?? defaults;
      setSipConfig(config);
      setSipConfigDraft(config);
      setSipConfigError(null);
    } catch (error: unknown) {
      console.error("[sip] Could not read local SIP settings.", error);
      setSipConfig(defaults);
      setSipConfigDraft(defaults);
      setSipConfigError(
        "Saved SIP settings could not be read. Review the values and save again.",
      );
    }
    setConfiguredUserId(user.id);
  }, [user?.extensionId, user?.host, user?.id, user?.port]);

  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated ||
      !user?.id ||
      !isSipConfigReady
    ) {
      return;
    }

    const userId = user.id;
    let disposed = false;
    const sipProfile = {
      extensionId: sipConfig.extension,
      url: sipConfig.url,
      port: Number(sipConfig.port),
      secret: sipConfig.password || user?.secret,
      name: user?.name,
    };

    const manager = new SipSessionManager(sipProfile, {
      onConnected: () => {
        if (disposed) return;
        setWebsocketConnected(true);
        setRegistrationFailed(false);
        setCallStatus("WebSocket connected. Waiting for SIP registration.");
      },
      onDisconnected: () => {
        if (disposed) return;
        setWebsocketConnected(false);
        setIsRegistered(false);
        setRegistrationFailed(false);
        const activeSession = currentCallRef.current;
        currentCallRef.current = null;
        activeSession?.terminate();
        setCallPhase("disconnected");
        setRemoteParty("");
        const audio = remoteAudioRef.current;
        if (audio) {
          audio.pause();
          audio.srcObject = null;
        }
        setAudioPlaybackBlocked(false);
        setIsAudioOn(false);
        setIsMuted(false);
        setCallStatus(
          "SIP WebSocket disconnected. Check the endpoint and network, then reload to reconnect.",
        );
      },
      onRegistered: () => {
        if (disposed) return;
        setWebsocketConnected(true);
        setIsRegistered(true);
        setRegistrationFailed(false);
        setCallStatus("Registered and ready.");
        if (sipConfigRevision > 0) {
          setSipConfigMessage("Settings saved locally. SIP line registered.");
        }
      },
      onRegistrationFailed: () => {
        if (disposed) return;
        setIsRegistered(false);
        setRegistrationFailed(true);
        if (sipConfigRevision > 0) {
          setSipConfigMessage(
            "Settings are saved locally, but registration failed.",
          );
        }
        setCallStatus(
          "SIP registration failed. Check your extension, SIP secret, and WebSocket endpoint with your administrator.",
        );
      },
      onNewRTCSession: (session: RTCSession) => {
        if (disposed) {
          session.terminate({ status_code: 480, reason_phrase: "Temporarily Unavailable" });
          return;
        }

        const incoming = session.direction === "incoming";
        const remoteNumber =
          session.remote_identity.uri.user?.trim() || "Unknown caller";

        // Ignore additional concurrent calls
        const existingCall = currentCallRef.current;
        if (existingCall && existingCall !== session && !existingCall.isEnded()) {
          console.warn("[call] Ignoring additional call while another is active.", {
            sessionId: session.id,
            direction: session.direction,
            remoteNumber,
          });
          session.terminate({
            status_code: 486,
            reason_phrase: "Busy Here",
          });
          return;
        }

        currentCallRef.current = session;
        setRemoteParty(remoteNumber);
        setCallPhase(incoming ? "incoming" : "dialing");
        setCallStatus(
          incoming
            ? `Incoming call from ${remoteNumber}. Answer or decline.`
            : `Calling ${remoteNumber}…`,
        );
        const disposeRef = () => disposed;
        setupCallLifecycle(session, incoming, remoteNumber, userId, {
          currentCallRef,
          remoteAudioRef,
          setCallPhase,
          setCallStatus,
          setAudioPlaybackBlocked,
          setIsAudioOn,
          setIsMuted,
        }, disposeRef);
      },
    }, sipExtensionRef);

    sipManagerRef.current = manager;
    manager.connect();
    uaRef.current = manager.getUA();

    return () => {
      disposed = true;
      sipManagerRef.current?.stop();
      currentCallRef.current?.terminate();
      currentCallRef.current = null;
      uaRef.current = null;
      sipExtensionRef.current = "";
    };
  }, [
    authLoading,
    isAuthenticated,
    isSipConfigReady,
    sipConfig.extension,
    sipConfig.port,
    sipConfig.url,
    user?.id,
    user?.name,
    user?.secret,
    sipConfigRevision,
  ]);

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Hidden audio element for remote stream - tracks for captions compliance */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        muted={!isAudioOn}
        className="sr-only"
      />
      <track
        kind="captions"
        label="English captions"
        srcLang="en"
        className="sr-only"
      />

      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Make a call
        </h2>
        <p className="text-sm text-muted-foreground">
          Calls run through your configured SIP extension.
        </p>
      </div>

      <section
        className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm sm:grid-cols-2 xl:grid-cols-4"
        role="status"
        aria-label="Dialer status"
      >
        <StatusRow
          icon={
            isRegistered ? (
              <Volume2 className="size-4 text-success" />
            ) : (
              <AlertCircle className="size-4 text-warning" />
            )
          }
          label={`SIP ${isRegistered ? "registered" : registrationFailed ? "registration failed" : websocketConnected ? "registering" : "disconnected"}`}
        />
        <StatusRow
          icon={
            websocketConnected ? (
              <Volume2 className="size-4 text-success" />
            ) : (
              <VolumeX className="size-4 text-muted-foreground" />
            )
          }
          label={`Transport ${websocketConnected ? "connected" : "disconnected"}`}
        />
        <StatusRow
          icon={
            isIncomingCall ? (
              <Phone className="size-4 text-warning" />
            ) : isCallActive ? (
              <Phone className="size-4 text-success" />
            ) : callPhase === "failed" ? (
              <AlertCircle className="size-4 text-destructive" />
            ) : (
              <PhoneOff className="size-4 text-muted-foreground" />
            )
          }
          label={statusLabel}
        />
        <StatusRow
          icon={
            isAudioOn ? (
              <Volume2 className="size-4 text-success" />
            ) : (
              <VolumeX className="size-4 text-muted-foreground" />
            )
          }
          label={
            isCallActive
              ? `Speaker ${isAudioOn ? "on" : "off"}`
              : "Speaker ready"
          }
        />
      </section>

      {callStatus && (
        <p
          className="text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {callStatus}
        </p>
      )}
      {remoteParty && (
        <p className="text-sm text-muted-foreground">
          {isIncomingCall ? "Caller" : "Other party"}:{" "}
          <span className="font-medium text-foreground">{remoteParty}</span>
        </p>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/80 px-5 py-5 sm:px-7">
          <CardTitle className="text-lg font-semibold tracking-tight">
            Dialer
          </CardTitle>
          <CardDescription>
            Enter a number or use the keypad to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 px-5 py-6 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <label
                htmlFor="phone-number"
                className="eyebrow block pb-2 text-left"
              >
                Phone number
              </label>
              <Input
                id="phone-number"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="Enter number"
                className="h-14 border-0 bg-transparent px-0 text-center font-mono text-3xl font-medium tabular-nums shadow-none focus-visible:ring-0 sm:text-4xl"
                aria-label="Phone number"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                ["1", ""],
                ["2", "ABC"],
                ["3", "DEF"],
                ["4", "GHI"],
                ["5", "JKL"],
                ["6", "MNO"],
                ["7", "PQRS"],
                ["8", "TUV"],
                ["9", "WXYZ"],
                ["*", ""],
                ["0", "+"],
                ["#", ""],
              ].map(([digit, letters]) => (
                <Button
                  key={digit}
                  type="button"
                  variant="outline"
                  onClick={() => handleNumberClick(digit)}
                  className="h-[4.15rem] flex-col gap-0 rounded-xl border-border bg-card text-lg font-semibold tabular-nums hover:border-primary/40 hover:bg-secondary"
                >
                  <span>{digit}</span>
                  {letters && (
                    <span className="text-[0.6rem] font-semibold tracking-[0.12em] text-muted-foreground">
                      {letters}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={handleClear}>
                Clear number
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleBackspace}
                aria-label="Delete last digit"
              >
                Delete last digit
              </Button>
            </div>
          </div>

          <div className="flex flex-col rounded-xl bg-foreground p-5 text-background sm:p-6">
            <div className="eyebrow text-background/65">Your SIP line</div>
            <div className="mt-2 text-lg font-semibold">
              {sipConfig.extension || "Extension not configured"}
            </div>
            <div className="mt-1 truncate text-sm text-background/70">
              {sipConfig.url || "Configure your SIP server below"}
            </div>

            <div className="mt-6 flex items-start gap-3 border-t border-background/15 pt-5">
              <span
                className={`mt-1 size-2.5 shrink-0 rounded-full ${
                  isRegistered
                    ? "bg-success"
                    : registrationFailed
                      ? "bg-destructive"
                      : websocketConnected
                        ? "bg-warning"
                        : "bg-background/45"
                }`}
              />
              <div>
                <p className="text-sm font-semibold">
                  {isRegistered
                    ? "Ready to call"
                    : registrationFailed
                      ? "Registration failed"
                      : websocketConnected
                        ? "Connecting your line"
                        : "Waiting for connection"}
                </p>
                <p className="mt-1 text-sm leading-5 text-background/70">
                  {isRegistered
                    ? "Your SIP extension is registered."
                    : registrationFailed
                      ? "Check your extension details with your administrator."
                      : "Calls become available when your extension is registered."}
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSaveSipConfig}
              className="mt-6 space-y-3 border-t border-background/15 pt-5"
            >
              <h3 className="text-sm font-semibold">Connection settings</h3>
              <p className="text-xs leading-5 text-background/70">
                Enter a hostname or WebSocket URL. The port field sets the
                connection port. Settings, including the SIP password, stay in
                this browser profile.
              </p>
              <div className="space-y-1.5">
                <label
                  htmlFor="sip-server-url"
                  className="text-xs font-medium text-background/80"
                >
                  SIP server URL
                </label>
                <Input
                  id="sip-server-url"
                  value={sipConfigDraft.url}
                  onChange={(event) => {
                    setSipConfigDraft((current) => ({
                      ...current,
                      url: event.target.value,
                    }));
                    setSipConfigError(null);
                    setSipConfigMessage(null);
                  }}
                  placeholder="pbx.example.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  disabled={!isSipConfigReady || hasCallInProgress}
                  className="h-10 bg-background text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="sip-port"
                    className="text-xs font-medium text-background/80"
                  >
                    Port
                  </label>
                  <Input
                    id="sip-port"
                    type="number"
                    min={1}
                    max={65535}
                    step={1}
                    value={sipConfigDraft.port}
                    onChange={(event) => {
                      setSipConfigDraft((current) => ({
                        ...current,
                        port: event.target.value,
                      }));
                      setSipConfigError(null);
                      setSipConfigMessage(null);
                    }}
                    placeholder="8089"
                    required
                    disabled={!isSipConfigReady || hasCallInProgress}
                    className="h-10 bg-background text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="sip-extension"
                    className="text-xs font-medium text-background/80"
                  >
                    Extension
                  </label>
                  <Input
                    id="sip-extension"
                    value={sipConfigDraft.extension}
                    onChange={(event) => {
                      setSipConfigDraft((current) => ({
                        ...current,
                        extension: event.target.value,
                      }));
                      setSipConfigError(null);
                      setSipConfigMessage(null);
                    }}
                    placeholder="1001"
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                    disabled={!isSipConfigReady || hasCallInProgress}
                    className="h-10 bg-background text-foreground"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="sip-password"
                  className="text-xs font-medium text-background/80"
                >
                  SIP password
                </label>
                <Input
                  id="sip-password"
                  type="password"
                  value={sipConfigDraft.password}
                  onChange={(event) => {
                    setSipConfigDraft((current) => ({
                      ...current,
                      password: event.target.value,
                    }));
                    setSipConfigError(null);
                    setSipConfigMessage(null);
                  }}
                  autoComplete="off"
                  required
                  disabled={!isSipConfigReady || hasCallInProgress}
                  className="h-10 bg-background text-foreground"
                />
              </div>
              {sipConfigError && (
                <p
                  className="rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground"
                  role="alert"
                >
                  {sipConfigError}
                </p>
              )}
              {sipConfigMessage && (
                <p className="text-sm text-background/80" role="status">
                  {sipConfigMessage}
                </p>
              )}
              {hasCallInProgress && (
                <p className="text-xs text-background/70">
                  End the active call before changing connection settings.
                </p>
              )}
              <Button
                type="submit"
                variant="secondary"
                className="w-full"
                disabled={!isSipConfigReady || hasCallInProgress}
              >
                Save and reconnect
              </Button>
            </form>

            <div className="mt-auto space-y-3 pt-8">
              <Button
                onClick={handleCall}
                variant={hasCallInProgress && !isIncomingCall ? "destructive" : "default"}
                className="h-12 w-full rounded-xl text-base"
                disabled={
                  callPhase === "answering" ||
                  callPhase === "ending" ||
                  (!isIncomingCall && !hasCallInProgress && !isRegistered)
                }
                aria-label={
                  isIncomingCall
                    ? "Answer call"
                    : hasCallInProgress
                      ? "End call"
                      : "Call"
                }
              >
                {isIncomingCall ? (
                  <>
                    <Phone className="size-5" />
                    Answer call
                  </>
                ) : callPhase === "answering" ? (
                  <>
                    <Phone className="size-5" />
                    Answering…
                  </>
                ) : callPhase === "ending" ? (
                  <>
                    <PhoneOff className="size-5" />
                    Ending call…
                  </>
                ) : hasCallInProgress ? (
                  <>
                    <PhoneOff className="size-5" />
                    End call
                  </>
                ) : (
                  <>
                    <Phone className="size-5" />
                    Call
                  </>
                )}
              </Button>
              {isIncomingCall && (
                <Button
                  onClick={handleDecline}
                  variant="outline"
                  className="w-full border-background/30 bg-transparent text-background hover:bg-background/10"
                  aria-label="Decline call"
                >
                  Decline
                </Button>
              )}
              {audioPlaybackBlocked && (
                <Button
                  onClick={handleEnableAudio}
                  variant="secondary"
                  className="w-full"
                >
                  Enable call audio
                </Button>
              )}
              {isCallActive && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleToggleMute}
                    variant="outline"
                    className="border-background/30 bg-transparent text-background hover:bg-background/10"
                    aria-pressed={isMuted}
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                  >
                    {isMuted ? (
                      <>
                        <MicOff className="size-4" />
                        Unmute
                      </>
                    ) : (
                      <>
                        <Mic className="size-4" />
                        Mute
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleToggleAudio}
                    variant="outline"
                    className="border-background/30 bg-transparent text-background hover:bg-background/10"
                    aria-pressed={isAudioOn}
                    aria-label={audioButtonLabel}
                    disabled={!remoteAudioRef.current?.srcObject}
                  >
                    {isAudioOn ? (
                      <>
                        <Volume2 className="size-4" />
                        Speaker on
                      </>
                    ) : (
                      <>
                        <VolumeX className="size-4" />
                        Speaker off
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Register the full call lifecycle on a new RTCSession. Disposal is checked via
 *  the disposeFlag argument rather than by reading closures defined in this module,
 *  so setupCallLifecycle stays out of HomePage's render cycle and never touches
 *  state outside the component boundary. */
function setupCallLifecycle(
  session: RTCSession,
  incoming: boolean,
  remoteNumber: string,
  userId: string,
  refs: {
    currentCallRef: React.MutableRefObject<RTCSession | null>;
    remoteAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
    setCallPhase: (phase: CallPhase) => void;
    setCallStatus: (status: string) => void;
    setAudioPlaybackBlocked: (next: boolean) => void;
    setIsAudioOn: (next: boolean) => void;
    setIsMuted: (next: boolean) => void;
  },
  disposeFlag: () => boolean,
) {
  const startedAt = new Date();
  let answeredAt: Date | null = null;
  let finalized = false;
  const isMissedCall = (event: EndEvent) =>
    incoming &&
    !answeredAt &&
    (event.cause === "No Answer" ||
      (event.originator === "remote" && event.cause === "Canceled"));
  const isLocallyCanceled = (event: EndEvent) =>
    event.originator === "local" && event.cause === "Canceled";

  const attachRemoteAudio = (peerConnection: RTCPeerConnection) => {
    peerConnection.addEventListener("iceconnectionstatechange", () => {
      if (disposeFlag() || refs.currentCallRef.current !== session) return;
      if (peerConnection.iceConnectionState === "failed") {
        refs.setCallStatus("RTP media connection failed. Check the PBX RTP/ICE network settings.");
      }
    });

    peerConnection.addEventListener("track", (event) => {
      const audio = refs.remoteAudioRef.current;
      if (refs.currentCallRef.current !== session || !audio || event.track.kind !== "audio") {
        return;
      }
      const remoteStream = event.streams[0] ?? new MediaStream([event.track]);
      audio.srcObject = remoteStream;
      audio.volume = 1;
      audio.muted = true;
      void audio.play().then(
        () => {
          if (disposeFlag() || refs.currentCallRef.current !== session) return;
          audio.muted = false;
          refs.setAudioPlaybackBlocked(false);
          refs.setIsAudioOn(true);
        },
        (error: unknown) => {
          if (disposeFlag() || refs.currentCallRef.current !== session) return;
          console.warn("[media] Browser blocked remote audio playback.", error);
          refs.setAudioPlaybackBlocked(true);
          refs.setIsAudioOn(false);
        },
      );
    });
  };

  if (incoming) {
    refs.setCallPhase("incoming");
    refs.setCallStatus(`Incoming call from ${remoteNumber}. Answer or decline.`);
  }

  if (session.connection) {
    attachRemoteAudio(session.connection);
  } else {
    session.on("peerconnection", ({ peerconnection }: { peerconnection: RTCPeerConnection }) => {
      attachRemoteAudio(peerconnection);
    });
  }

  session.on("connecting", () => {
    if (disposeFlag() || refs.currentCallRef.current !== session) return;
    if (!incoming) {
      refs.setCallPhase("dialing");
      refs.setCallStatus(`Calling ${remoteNumber}…`);
    }
  });

  session.on("progress", () => {
    if (disposeFlag() || refs.currentCallRef.current !== session || incoming) return;
    refs.setCallPhase("ringing");
    refs.setCallStatus(`${remoteNumber} is ringing…`);
  });

  session.on("accepted", () => {
    if (disposeFlag() || refs.currentCallRef.current !== session) return;
    answeredAt ??= new Date();
    refs.setCallPhase("connecting");
    refs.setCallStatus(`Call with ${remoteNumber} accepted. Connecting audio…`);
  });

  session.on("confirmed", () => {
    if (disposeFlag() || refs.currentCallRef.current !== session) return;
    answeredAt ??= new Date();
    refs.setCallPhase("active");
    refs.setCallStatus(`In call with ${remoteNumber}.`);
  });

  const finalize = (event: EndEvent, failed = false) => {
    if (finalized) return;
    finalized = true;
    const endedAt = new Date();
    const wasMissed = isMissedCall(event);
    const callState = wasMissed
      ? "missed"
      : failed
        ? "failed"
        : answeredAt
          ? "completed"
          : event.originator === "local"
            ? "cancelled"
            : "failed";
    const payload = {
      userId,
      sipSessionId: session.id,
      phoneNumber: remoteNumber,
      callType: incoming ? "inbound" : "outbound",
      callState,
      cancelReason: callState === "completed" ? null : event.cause || null,
      hangupBy: event.originator,
      startedAt: startedAt.toISOString(),
      answeredAt: answeredAt?.toISOString() ?? null,
      endedAt: endedAt.toISOString(),
      durationSeconds: answeredAt
        ? Math.max(0, Math.floor((endedAt.getTime() - answeredAt.getTime()) / 1000))
        : 0,
    };
    void fetch("/api/user/call-logs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch((error: unknown) => {
      console.error("[call] Could not save call log.", error);
    });
  };

  const clearRemoteAudio = () => {
    const audio = refs.remoteAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.srcObject = null;
    audio.muted = true;
  };

  session.on("ended", (event: EndEvent) => {
    if (disposeFlag()) return;
    finalize(event);
    if (refs.currentCallRef.current === session) {
      refs.currentCallRef.current = null;
      clearRemoteAudio();
      refs.setAudioPlaybackBlocked(false);
      refs.setIsAudioOn(false);
      refs.setIsMuted(false);
      refs.setCallPhase("ended");
      refs.setCallStatus(
        event.originator === "remote"
          ? `${remoteNumber} ended the call.`
          : "Call ended.",
      );
    }
  });

  session.on("failed", (event: EndEvent) => {
    if (disposeFlag()) return;
    finalize(event, true);
    if (refs.currentCallRef.current === session) {
      refs.currentCallRef.current = null;
      clearRemoteAudio();
      refs.setAudioPlaybackBlocked(false);
      refs.setIsAudioOn(false);
      refs.setIsMuted(false);
      const missed = isMissedCall(event);
      const canceled = isLocallyCanceled(event);
      refs.setCallPhase(missed || canceled ? "ended" : "failed");
      if (missed) {
        refs.setCallStatus(`Missed call from ${remoteNumber}.`);
      } else if (canceled && incoming) {
        refs.setCallStatus(`You declined the call from ${remoteNumber}.`);
      } else if (canceled) {
        refs.setCallStatus(`Call with ${remoteNumber} canceled.`);
      } else if (event.cause === "User Denied Media Access") {
        refs.setCallStatus(
          "Microphone access failed. Allow microphone access in your browser and try again.",
        );
      } else {
        refs.setCallStatus(`Call with ${remoteNumber} failed: ${event.cause}.`);
      }
    }
  });

  session.on("getusermediafailed", () => {
    if (disposeFlag() || refs.currentCallRef.current !== session) return;
    refs.setCallPhase("failed");
    refs.setCallStatus("Microphone access failed. Check browser permissions.");
  });
}

import type { ReactNode } from "react";

interface StatusRowProps { icon: ReactNode; label: string }
function StatusRow({ icon, label }: StatusRowProps) {
  return (
    <div className="flex items-center gap-3 bg-card px-4 py-3.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
        {icon}
      </div>
      <span className="min-w-0 text-sm font-medium capitalize text-foreground">
        {label}
      </span>
    </div>
  );
}
