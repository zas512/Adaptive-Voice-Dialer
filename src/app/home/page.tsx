"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useProtectedRoute } from "@/hooks/use-protected-route";
import { UA, WebSocketInterface } from "jssip";
import { Phone, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SipProfile = {
  id: string;
  name?: string;
  extensionId?: string;
  host?: string;
  port?: number;
  secret?: string;
};

type SipProfileResponse = {
  user: SipProfile;
};

type SipSession = ReturnType<UA["call"]>;

export default function HomePage() {
  // Protected route - redirects to login if not authenticated
  const { user, isLoading: authLoading, isAuthenticated } = useProtectedRoute();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callStatus, setCallStatus] = useState("");
  const [websocketConnected, setWebsocketConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const [sipHost, setSipHost] = useState("");
  const uaRef = useRef<UA | null>(null);
  const sipExtensionRef = useRef("");
  const currentCallRef = useRef<ReturnType<UA["call"]> | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) return;

    let disposed = false;
    let sip: UA | null = null;
    const controller = new AbortController();

    async function connectToSipServer() {
      try {
        const response = await fetch("/api/user/profile", {
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Could not load SIP profile (${response.status}).`);
        }

        const { user: profile } =
          (await response.json()) as SipProfileResponse;

        if (disposed) return;

        const { extensionId, host, port, secret, name } = profile;
        if (!extensionId || !host || !port || !secret) {
          setCallStatus("SIP settings are incomplete. Contact your administrator.");
          return;
        }

        setSipHost(host);
        sipExtensionRef.current = extensionId;
        const websocketUrl = `ws://${host}:${port}/ws`;
        const sipUri = `sip:${extensionId}@${host}`;
        console.info("[sip] Connecting with configuration:", {
          websocketUrl,
          sipUri,
          authorizationUser: extensionId,
          displayName: name || extensionId,
          registrationEnabled: true,
        });
        const socket = new WebSocketInterface(websocketUrl);
        sip = new UA({
          sockets: [socket],
          uri: sipUri,
          authorization_user: extensionId,
          password: secret,
          display_name: name || extensionId,
          register: true,
          register_expires: 3600,
        });

        sip.on("connected", () => {
          if (disposed) return;
          setWebsocketConnected(true);
          setCallStatus("WebSocket connected; registering SIP account...");
        });

        sip.on("disconnected", () => {
          if (disposed) return;
          setWebsocketConnected(false);
          setIsRegistered(false);
          setIsCallActive(false);
          setIsIncomingCall(false);
          currentCallRef.current = null;
          setCallStatus("WebSocket disconnected.");
        });

        sip.on("registered", () => {
          if (disposed) return;
          setWebsocketConnected(true);
          setIsRegistered(true);
          setCallStatus("Registered and ready.");
        });

        sip.on("registrationFailed", () => {
          if (disposed) return;
          setIsRegistered(false);
          setCallStatus("SIP registration failed. Check the extension and credentials.");
        });

        sip.on("newRTCSession", ({ session }: { session: SipSession }) => {
          if (disposed) {
            session.terminate();
            return;
          }

          const incoming = session.direction === "incoming";
          const remoteNumber = session.remote_identity.uri.user;

          if (
            incoming &&
            remoteNumber.trim().toLowerCase() ===
              sipExtensionRef.current.trim().toLowerCase()
          ) {
            console.warn(
              "[call] Ignoring call forked back to the same extension without rejecting the PBX branch.",
              {
                sessionId: session.id,
                extension: sipExtensionRef.current,
              },
            );
            return;
          }

          const existingCall = currentCallRef.current;
          if (
            existingCall &&
            existingCall !== session &&
            !existingCall.isEnded()
          ) {
            console.warn("[call] Ignoring additional call while another is active.", {
              sessionId: session.id,
              direction: session.direction,
              remoteNumber,
            });
            session.terminate();
            return;
          }

          currentCallRef.current = session;
          const startedAt = new Date();
          let answeredAt: Date | null = null;
          let callLogFinalized = false;
          console.info("[call] Call session received:", {
            sessionId: session.id,
            direction: session.direction,
            remoteNumber,
          });
          setIsIncomingCall(incoming);
          setIsCallActive(!incoming);
          setCallStatus(
            incoming
              ? `Incoming call from ${remoteNumber}`
              : "Calling...",
          );

          const attachRemoteAudio = (peerConnection: RTCPeerConnection) => {
            console.info("[media] Peer connection created:", {
              sessionId: session.id,
              direction: session.direction,
              iceConnectionState: peerConnection.iceConnectionState,
              iceGatheringState: peerConnection.iceGatheringState,
            });

            peerConnection.addEventListener("iceconnectionstatechange", () => {
              console.info("[media] ICE connection state:", {
                sessionId: session.id,
                state: peerConnection.iceConnectionState,
              });

              if (peerConnection.iceConnectionState === "failed") {
                setCallStatus("RTP media connection failed. Check the PBX RTP/ICE network settings.");
              }
            });

            peerConnection.addEventListener("connectionstatechange", () => {
              console.info("[media] Peer connection state:", {
                sessionId: session.id,
                state: peerConnection.connectionState,
              });
            });

            peerConnection.addEventListener("icecandidateerror", (event) => {
              console.warn("[media] ICE candidate error:", {
                sessionId: session.id,
                errorCode: event.errorCode,
                errorText: event.errorText,
              });
            });

            peerConnection.addEventListener("track", (event) => {
              const audio = remoteAudioRef.current;
              if (
                currentCallRef.current !== session ||
                !audio ||
                event.track.kind !== "audio"
              ) {
                return;
              }

              const remoteStream =
                event.streams[0] ?? new MediaStream([event.track]);
              audio.srcObject = remoteStream;
              audio.volume = 1;
              setAudioPlaybackBlocked(false);
              console.info("[media] Remote audio track received:", {
                sessionId: session.id,
                trackState: event.track.readyState,
                muted: event.track.muted,
                streamCount: event.streams.length,
              });
              event.track.addEventListener("mute", () => {
                console.warn("[media] Remote audio track muted.", {
                  sessionId: session.id,
                });
              });
              event.track.addEventListener("unmute", () => {
                console.info("[media] Remote audio track unmuted.", {
                  sessionId: session.id,
                });
              });

              void audio.play().then(
                () => {
                  console.info("[media] Remote audio playback started.", {
                    sessionId: session.id,
                  });
                },
                (error: unknown) => {
                  console.warn("[media] Browser blocked remote audio playback.", {
                    sessionId: session.id,
                    error,
                  });
                  setAudioPlaybackBlocked(true);
                  setCallStatus("Call connected. Enable audio playback to hear the call.");
                },
              );
            });
          };

          if (session.connection) {
            attachRemoteAudio(session.connection);
          } else {
            session.on(
              "peerconnection",
              ({ peerconnection }: { peerconnection: RTCPeerConnection }) => {
              attachRemoteAudio(peerconnection);
              },
            );
          }

          session.on("accepted", () => {
            if (disposed || currentCallRef.current !== session) return;
            answeredAt = new Date();
            console.info("[call] Call accepted:", {
              sessionId: session.id,
              direction: session.direction,
              remoteNumber,
            });
            setIsIncomingCall(false);
            setIsCallActive(true);
            setCallStatus("In call.");
          });

          const finalizeCall = (originator?: string, cause?: string) => {
            if (callLogFinalized) return;
            callLogFinalized = true;
            const endedAt = new Date();
            const callState = answeredAt
              ? "completed"
              : incoming
                ? originator === "local"
                  ? "cancelled"
                  : "missed"
                : cause?.toLowerCase().includes("cancel")
                  ? "cancelled"
                  : "failed";
            const payload = {
              sipSessionId: session.id,
              phoneNumber: remoteNumber,
              callType: incoming ? "inbound" : "outbound",
              callState,
              cancelReason: callState === "completed" ? null : cause || "Unknown",
              hangupBy:
                originator === "local" ||
                originator === "remote" ||
                originator === "system"
                  ? originator
                  : null,
              startedAt: startedAt.toISOString(),
              answeredAt: answeredAt?.toISOString() ?? null,
              endedAt: endedAt.toISOString(),
              durationSeconds: answeredAt
                ? Math.max(
                    0,
                    Math.floor((endedAt.getTime() - answeredAt.getTime()) / 1000),
                  )
                : 0,
            };

            void fetch("/api/user/call-logs", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              keepalive: true,
            }).then(async (response) => {
              if (!response.ok) {
                const result = (await response.json()) as { error?: string };
                throw new Error(
                  result.error || `Call log save failed (${response.status}).`,
                );
              }
            }).catch((error: unknown) => {
              console.error("[call] Could not save call log.", error);
            });
          };

          session.on(
            "ended",
            ({ originator, cause }: { originator: string; cause: string }) => {
              finalizeCall(originator, cause);
              if (disposed) return;
              console.info("[call] Call ended:", {
                sessionId: session.id,
                direction: session.direction,
                remoteNumber,
                originator,
                cause,
              });
              if (currentCallRef.current === session) {
                currentCallRef.current = null;
                if (remoteAudioRef.current) {
                  remoteAudioRef.current.srcObject = null;
                }
                setAudioPlaybackBlocked(false);
                setIsCallActive(false);
                setIsIncomingCall(false);
                setCallStatus("Call ended.");
              }
            },
          );

          session.on(
            "failed",
            ({
              originator,
              cause,
              message,
            }: {
              originator: string;
              cause: string;
              message: unknown;
            }) => {
              finalizeCall(originator, cause);
              if (disposed) return;
              const sipResponse =
                typeof message === "object" &&
                message !== null &&
                "status_code" in message &&
                typeof message.status_code === "number"
                  ? {
                      statusCode: message.status_code,
                      reasonPhrase:
                        "reason_phrase" in message &&
                        typeof message.reason_phrase === "string"
                          ? message.reason_phrase
                          : "",
                    }
                  : null;
              console.warn("[call] Call failed:", {
                sessionId: session.id,
                direction: session.direction,
                remoteNumber,
                originator,
                cause,
                sipResponse,
              });
              if (currentCallRef.current === session) {
                currentCallRef.current = null;
                if (remoteAudioRef.current) {
                  remoteAudioRef.current.srcObject = null;
                }
                setAudioPlaybackBlocked(false);
                setIsCallActive(false);
                setIsIncomingCall(false);
                setCallStatus(
                  sipResponse
                    ? `Call failed: ${sipResponse.statusCode} ${sipResponse.reasonPhrase}.`
                    : `Call failed: ${cause}.`,
                );
              }
            },
          );

          session.on("getusermediafailed", () => {
            if (disposed || currentCallRef.current !== session) return;
            setCallStatus("Microphone access failed. Check browser permissions.");
          });
        });

        uaRef.current = sip;
        sip.start();
        setCallStatus("Connecting to SIP server...");
      } catch (error) {
        if (disposed || controller.signal.aborted) return;
        console.error("[sip] Could not initialize the dialer.", error);
        setCallStatus("Could not load SIP settings. Check your profile and try again.");
      }
    }

    void connectToSipServer();

    return () => {
      disposed = true;
      controller.abort();
      currentCallRef.current?.terminate();
      currentCallRef.current = null;
      uaRef.current = null;
      sipExtensionRef.current = "";
      sip?.stop();
    };
  }, [authLoading, isAuthenticated, user?.id]);

  const handleCall = () => {
    const activeCall = currentCallRef.current;

    if (activeCall && isIncomingCall) {
      try {
        console.info("[call] Answering incoming call:", {
          sessionId: activeCall.id,
          remoteNumber: activeCall.remote_identity.uri.user,
        });
        activeCall.answer({
          mediaConstraints: {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          },
        });
        setCallStatus("Answering call...");
      } catch (error) {
        console.error("[sip] Could not answer the call.", error);
        setCallStatus("Could not answer the call.");
      }
      return;
    }

    if (activeCall) {
      console.info("[call] Hanging up:", {
        sessionId: activeCall.id,
        remoteNumber: activeCall.remote_identity.uri.user,
      });
      activeCall.terminate();
      return;
    }

    if (!phoneNumber.trim()) {
      setCallStatus("Enter a phone number to call.");
      return;
    }

    if (!uaRef.current || !isRegistered || !sipHost) {
      setCallStatus("Not registered. Wait for SIP registration before calling.");
      return;
    }

    try {
      const target = phoneNumber.trim().replace(/\s/g, "");
      console.info("[call] Dialing:", {
        target,
        sipHost,
        sipUri: `sip:${target}@${sipHost}`,
      });
      currentCallRef.current = uaRef.current.call(
        `sip:${target}@${sipHost}`,
        {
          mediaConstraints: {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          },
        },
      );
      setIsCallActive(true);
      setCallStatus("Calling...");
    } catch (error) {
      console.error("[sip] Could not start the call.", error);
      currentCallRef.current = null;
      setIsCallActive(false);
      setCallStatus("Could not start the call. Check microphone permissions.");
    }
  };

  const handleDecline = () => {
    const activeCall = currentCallRef.current;
    if (activeCall) {
      console.info("[call] Declining incoming call:", {
        sessionId: activeCall.id,
        remoteNumber: activeCall.remote_identity.uri.user,
      });
    }
    currentCallRef.current?.terminate();
  };

  const handleEnableAudio = () => {
    const audio = remoteAudioRef.current;
    if (!audio) return;

    void audio.play().then(
      () => {
        setAudioPlaybackBlocked(false);
      },
      (error: unknown) => {
        console.error("[media] Could not start remote audio playback.", error);
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

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <Card className="glass-depth">
        <CardHeader>
          <CardTitle>Important Notices</CardTitle>
          <CardDescription>Real-time insights into your dialer environment.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-sm text-muted-foreground">SIP Registration</div>
            <div className="text-base font-semibold text-foreground">
              {isRegistered ? "Registered" : "Not registered"}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Active Call</div>
            <div className="text-base font-semibold text-foreground">
              {isIncomingCall
                ? "Incoming call"
                : isCallActive
                  ? "In progress"
                  : "No active calls"}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">WebSocket Status</div>
            <div className="text-base font-semibold text-foreground">
              {websocketConnected ? "Connected" : "Disconnected"}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Dialer */}
        <Card className="glass-depth lg:col-span-2">
        <CardHeader>
          <CardTitle>Dialer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phone Number Display */}
          <div className="rounded-lg border border-border p-4 text-center">
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter number or dial"
              className="text-2xl text-center"
            />
          </div>

          {/* Status */}
          <div className="text-center">
            <div
              className={`inline-block rounded-full px-4 py-2 text-sm ${
                isRegistered
                  ? "bg-green-500/20 text-green-500"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {callStatus || (isRegistered ? "Ready" : "Connecting to SIP server...")}
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "*", 0, "#"].map((num) => (
              <Button
                key={num}
                onClick={() => handleNumberClick(String(num))}
                className="h-16 text-xl"
                variant="outline"
              >
                {num}
              </Button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleClear} className="flex-1" variant="outline">
              Clear
            </Button>
            <Button
              onClick={handleBackspace}
              className="flex-1"
              variant="outline"
            >
              ←
            </Button>
          </div>

          {/* Call Button */}
          <Button
            onClick={handleCall}
            className={`w-full h-16 text-lg ${
              isCallActive ? "bg-destructive hover:bg-destructive/90" : ""
            }`}
            disabled={!isIncomingCall && !isCallActive && !isRegistered}
          >
            {isIncomingCall ? (
              <>
                <Phone className="w-5 h-5 mr-2" />
                Answer
              </>
            ) : isCallActive ? (
              <>
                <PhoneOff className="w-5 h-5 mr-2" />
                End Call
              </>
            ) : (
              <>
                <Phone className="w-5 h-5 mr-2" />
                Call
              </>
            )}
          </Button>
          {isIncomingCall && (
            <Button
              onClick={handleDecline}
              className="w-full"
              variant="destructive"
            >
              Decline
            </Button>
          )}
          {audioPlaybackBlocked && (
            <Button onClick={handleEnableAudio} className="w-full" variant="outline">
              Enable call audio
            </Button>
          )}
        </CardContent>
      </Card>

        {/* Info Panel */}
        <Card className="glass-depth">
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">SIP Status:</span>
                <span
                  className={
                    websocketConnected
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  }
                >
                  {websocketConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Call Status:</span>
                <span
                  className={
                    isCallActive
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                  }
                >
                  {isCallActive ? "In Call" : isIncomingCall ? "Incoming" : "Idle"}
                </span>
              </div>
            </div>
            <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
              <h3 className="text-sm font-semibold text-foreground">
                Quick Tips
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure your SIP settings in the configuration file to start
                placing calls.
              </p>
              <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
                <li>Ensure your WebSocket connection is reachable.</li>
                <li>Use secure credentials for your SIP accounts.</li>
                <li>
                  Review call logs regularly to monitor call quality and uptime.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
