"use client";
import type { UA } from "jssip";
import type { EndEvent } from "jssip/lib/RTCSession";
import { AlertCircle, Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type RTCSession, SipSessionManager } from "@/app/home/lib/sip-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useProtectedRoute } from "@/hooks/use-protected-route";

export default function HomePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useProtectedRoute();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callStatus, setCallStatus] = useState("Connecting…");
  const [websocketConnected, setWebsocketConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationFailed, setRegistrationFailed] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);

  const uaRef = useRef<UA | null>(null);
  const sipExtensionRef = useRef("");
  const currentCallRef = useRef<RTCSession | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const sipManagerRef = useRef<SipSessionManager | null>(null);

  // Single source of truth for the status label shared across UI rows
  const statusLabel = isIncomingCall
    ? "Incoming call"
    : isCallActive
      ? callStatus === "In call."
        ? "In call"
        : "Calling"
      : "Idle";
  const audioButtonLabel = isAudioOn ? "Turn speaker off" : "Turn speaker on";

  // --- Call control handlers ---

  const handleCall = () => {
    const activeCall = currentCallRef.current;

    if (activeCall && isIncomingCall) {
      try {
        activeCall.answer({
          mediaConstraints: {
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          },
        });
        setCallStatus("Answering call…");
      } catch (error) {
        console.error("[sip] Could not answer the call.", error);
        setCallStatus("Could not answer the call.");
      }
      return;
    }

    if (activeCall) {
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
      setIsCallActive(true);
      setCallStatus("Calling…");
    } catch (error) {
      console.error("[sip] Could not start the call.", error);
      currentCallRef.current = null;
      setIsCallActive(false);
      setCallStatus("Could not start the call. Check microphone permissions.");
    }
  };

  const handleDecline = () => {
    currentCallRef.current?.terminate();
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

  // --- Lifecycle effect ---

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) return;

    let disposed = false;
    const sipProfile = {
      extensionId: user?.extensionId,
      host: user?.host,
      port: user?.port,
      secret: user?.secret,
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
        setIsCallActive(false);
        setIsIncomingCall(false);
        currentCallRef.current?.terminate();
        currentCallRef.current = null;
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
      },
      onRegistrationFailed: () => {
        if (disposed) return;
        setIsRegistered(false);
        setRegistrationFailed(true);
        setCallStatus(
          "SIP registration failed. Check your extension, SIP secret, and WebSocket endpoint with your administrator.",
        );
      },
      onNewRTCSession: async (session: RTCSession) => {
        if (disposed) {
          session.terminate();
          return;
        }

        const incoming = session.direction === "incoming";
        const remoteNumber = session.remote_identity.uri.user;

        if (incoming) {
          const configuredExtension = sipExtensionRef.current
            .split("@")[0]
            ?.trim()
            .toLowerCase();
          if (
            configuredExtension &&
            configuredExtension === remoteNumber.trim().toLowerCase()
          ) {
            console.warn(
              "[call] Ignoring call forked back to the same extension without rejecting the PBX branch.",
              { sessionId: session.id, extension: configuredExtension },
            );
            return;
          }
        }

        // Ignore additional concurrent calls
        const existingCall = currentCallRef.current;
        if (existingCall && existingCall !== session && !existingCall.isEnded()) {
          console.warn("[call] Ignoring additional call while another is active.", {
            sessionId: session.id,
            direction: session.direction,
            remoteNumber,
          });
          session.terminate();
          return;
        }

        currentCallRef.current = session;
        const disposeRef = () => disposed;
        await setupCallLifecycle(session, incoming, remoteNumber, {
          currentCallRef,
          remoteAudioRef,
          setIsIncomingCall,
          setIsCallActive,
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
    user?.extensionId,
    user?.host,
    user?.id,
    user?.name,
    user?.port,
    user?.secret,
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
            isCallActive ? (
              <Phone className="size-4 text-success" />
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
              {user?.extensionId || "Extension not configured"}
            </div>
            <div className="mt-1 truncate text-sm text-background/70">
              {user?.host || "Ask your administrator to configure your line"}
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

            <div className="mt-auto space-y-3 pt-8">
              <Button
                onClick={handleCall}
                variant={isCallActive ? "destructive" : "default"}
                className="h-12 w-full rounded-xl text-base"
                disabled={!isIncomingCall && !isCallActive && !isRegistered}
                aria-label={
                  isIncomingCall
                    ? "Answer call"
                    : isCallActive
                      ? "End call"
                      : "Call"
                }
              >
                {isIncomingCall ? (
                  <>
                    <Phone className="size-5" />
                    Answer call
                  </>
                ) : isCallActive ? (
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
async function setupCallLifecycle(
  session: RTCSession,
  incoming: boolean,
  remoteNumber: string,
  refs: {
    currentCallRef: React.MutableRefObject<RTCSession | null>;
    remoteAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
    setIsIncomingCall: (next: boolean) => void;
    setIsCallActive: (next: boolean) => void;
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

  const attachRemoteAudio = (peerConnection: RTCPeerConnection) => {
    peerConnection.addEventListener("iceconnectionstatechange", () => {
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
          if (disposeFlag()) return;
          audio.muted = false;
          refs.setAudioPlaybackBlocked(false);
          refs.setIsAudioOn(true);
        },
        (error: unknown) => {
          if (disposeFlag()) return;
          console.warn("[media] Browser blocked remote audio playback.", error);
          refs.setAudioPlaybackBlocked(true);
          refs.setIsAudioOn(false);
        },
      );
    });
  };

  if (incoming) {
    refs.setIsIncomingCall(true);
    refs.setCallStatus("Incoming call. Answer or decline.");
  }

  if (session.connection) {
    attachRemoteAudio(session.connection);
  } else {
    session.on("peerconnection", ({ peerconnection }: { peerconnection: RTCPeerConnection }) => {
      attachRemoteAudio(peerconnection);
    });
  }

  session.on("accepted", () => {
    if (disposeFlag() || refs.currentCallRef.current !== session) return;
    answeredAt = new Date();
    refs.setIsIncomingCall(false);
    refs.setIsCallActive(true);
    refs.setCallStatus("In call.");
  });

  const finalize = (event: EndEvent, failed = false) => {
    if (finalized) return;
    finalized = true;
    const endedAt = new Date();
    const callState = answeredAt
      ? "completed"
      : event.originator === "local"
        ? "cancelled"
        : incoming && event.originator === "remote" && !failed
          ? "missed"
          : "failed";
    const payload = {
      userId: user?.id,
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
    finalize(event);
    if (disposeFlag()) return;
    if (refs.currentCallRef.current === session) {
      refs.currentCallRef.current = null;
      clearRemoteAudio();
      refs.setAudioPlaybackBlocked(false);
      refs.setIsAudioOn(false);
      refs.setIsMuted(false);
      refs.setIsCallActive(false);
      refs.setIsIncomingCall(false);
      refs.setCallStatus("Call ended.");
    }
  });

  session.on("failed", (event: EndEvent) => {
    finalize(event, true);
    if (disposeFlag()) return;
    if (refs.currentCallRef.current === session) {
      refs.currentCallRef.current = null;
      clearRemoteAudio();
      refs.setAudioPlaybackBlocked(false);
      refs.setIsAudioOn(false);
      refs.setIsMuted(false);
      refs.setIsCallActive(false);
      refs.setIsIncomingCall(false);
      refs.setCallStatus("Call failed.");
    }
  });

  session.on("getusermediafailed", () => {
    if (disposeFlag() || refs.currentCallRef.current !== session) return;
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
