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
    <div className="bg-transparent p-3 text-foreground sm:p-6 lg:p-8">
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

      {/* Status strip */}
      <Card className="glass-depth">
        <CardHeader className="flex flex-row items-center justify-between gap-2 p-4">
          <CardTitle className="text-sm font-medium font-serif">Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div
            className="grid grid-cols-2 gap-3 border-t border-border p-4 md:grid-cols-4"
            role="status"
            aria-label="Dialer status"
          >
            <StatusRow
              icon={
                isRegistered ? (
                  <Volume2 className="h-3 w-3 text-success" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-warning" />
                )
              }
              label={`SIP ${isRegistered ? "registered" : registrationFailed ? "registration failed" : websocketConnected ? "registering" : "disconnected"}`}
            />
            <StatusRow
              icon={
                websocketConnected ? (
                  <Volume2 className="h-3 w-3 text-success" />
                ) : (
                  <VolumeX className="h-3 w-3 text-muted-foreground" />
                )
              }
              label={`Transport ${websocketConnected ? "connected" : "disconnected"}`}
            />
            <StatusRow
              icon={
                isCallActive ? (
                  <Phone className="h-3 w-3 text-success" />
                ) : (
                  <PhoneOff className="h-3 w-3 text-muted-foreground" />
                )
              }
              label={statusLabel}
            />
            <StatusRow
              icon={
                isAudioOn ? (
                  <Volume2 className="h-3 w-3 text-success" />
                ) : (
                  <VolumeX className="h-3 w-3 text-muted-foreground" />
                )
              }
              label={
                isCallActive
                  ? `Speaker ${isAudioOn ? "on" : "off"}`
                  : "Speaker ready"
              }
            />
          </div>
          {callStatus && (
            <div
              className="px-4 pb-4 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {callStatus}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dialer */}
        <Card className="glass-depth lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg font-semibold font-serif">Dialer</CardTitle>
            <CardDescription>Place and receive calls over your SIP line.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Phone Number Display */}
            <div className="rounded-xl border border-border bg-background/60 p-4 text-center">
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter number or dial"
                className="text-3xl font-mono text-center text-foreground font-medium"
                aria-label="Phone number"
              />
            </div>

            {/* Status pill */}
            <div className="text-center">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium ${
                  isRegistered
                    ? "border-success/30 bg-success/10 text-success"
                    : registrationFailed
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : websocketConnected
                        ? "border-warning/30 bg-warning/10 text-warning"
                        : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {isRegistered
                  ? "Registered and ready"
                  : registrationFailed
                    ? "SIP registration failed"
                    : websocketConnected
                      ? "Connected; registering SIP account…"
                      : "SIP transport disconnected"}
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, "*", 0, "#"].map((num) => (
                <Button key={num} onClick={() => handleNumberClick(String(num))} className="bg-secondary border-border hover:bg-secondary/80 text-foreground">
                  {num}
                </Button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={handleClear} className="flex-1 bg-secondary border-border hover:bg-secondary/80">
                Clear
              </Button>
              <Button onClick={handleBackspace} className="flex-1 bg-secondary border-border hover:bg-secondary/80">
                ←
              </Button>
            </div>

            {/* Call Button */}
            <Button
              onClick={handleCall}
              className={`w-full h-14 text-lg ${isIncomingCall || isCallActive ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}`}
              disabled={!isIncomingCall && !isCallActive && !isRegistered}
              aria-label={isIncomingCall ? "Answer call" : isCallActive ? "End call" : "Call"}
            >
              {isIncomingCall ? <><Phone className="w-5 h-5 mr-2" />Answer</> : isCallActive ? <><PhoneOff className="w-5 h-5 mr-2" />End Call</> : <><Phone className="w-5 h-5 mr-2" />Call</>}
            </Button>
            {isIncomingCall && (
              <Button onClick={handleDecline} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" aria-label="Decline call">
                Decline
              </Button>
            )}
            {audioPlaybackBlocked && (
              <Button onClick={handleEnableAudio} className="w-full bg-accent hover:bg-accent/80 text-accent-foreground">
                Enable call audio
              </Button>
            )}
            {isCallActive && (
              <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleToggleMute}
                className="w-full bg-secondary border-border hover:bg-secondary/80"
                aria-pressed={isMuted}
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {isMuted ? <><MicOff className="w-4 h-4 mr-2" />Unmute</> : <><Mic className="w-4 h-4 mr-2" />Mute</>}
              </Button>
              <Button
                onClick={handleToggleAudio}
                className={`w-full ${isAudioOn ? "bg-primary text-primary-foreground" : "bg-secondary border-border hover:bg-secondary/80"}`}
                aria-pressed={isAudioOn}
                aria-label={audioButtonLabel}
                disabled={!remoteAudioRef.current?.srcObject}
              >
                {isAudioOn ? <><Volume2 className="w-4 h-4 mr-2" />Speaker on</> : <><VolumeX className="w-4 h-4 mr-2" />Speaker off</>}
              </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-sm text-foreground font-medium">{label}</span>
    </div>
  );
}
