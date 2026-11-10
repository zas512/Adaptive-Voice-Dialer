"use client";
import type { UA } from "jssip";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { setupCallLifecycle } from "@/app/home/lib/call-lifecycle";
import { type RTCSession, SipSessionManager } from "@/app/home/lib/sip-session";
import { useProtectedRoute } from "@/hooks/use-protected-route";
import { getStoredAuthSession } from "@/lib/auth-client";
import type { AMDResult, CallPhase, SipConfig } from "@/types/app";

const SIP_CONFIG_STORAGE_PREFIX = "react-dialer.sip-config.";
const ANSWER_AUDIO_FILES = ["voicemail.mp3", "auto.mp3"] as const;
const ACTIVE_CALL_PHASES: CallPhase[] = [
  "incoming",
  "answering",
  "dialing",
  "ringing",
  "connecting",
  "active",
  "ending",
];

type AnswerAudioFile = (typeof ANSWER_AUDIO_FILES)[number];
type AnswerAudioLoadStatus = "loading" | "ready" | "error";

type AnswerAudioPlayback = {
  session: RTCSession;
  audioContext: AudioContext;
  source: AudioBufferSourceNode;
  stream: MediaStream;
  started: boolean;
  finished: boolean;
  hangupTimer: number | null;
};

function getDefaultSipConfig(user: {
  extensionId?: string;
  host?: string;
  port?: number;
}): SipConfig {
  return {
    url: user.host ?? "",
    port: user.port ? String(user.port) : "",
    extension: user.extensionId ?? "",
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

  if (
    typeof value.url !== "string" ||
    typeof value.port !== "string" ||
    typeof value.extension !== "string"
  ) {
    throw new TypeError("Saved SIP settings are incomplete.");
  }

  return {
    url: value.url,
    port: value.port,
    extension: value.extension,
  };
}

export function useDialer() {
  const { user, isLoading: authLoading, isAuthenticated } = useProtectedRoute();
  const [sipConfig, setSipConfig] = useState<SipConfig>({
    url: "",
    port: "",
    extension: "",
  });
  const [sipConfigDraft, setSipConfigDraft] = useState<SipConfig>({
    url: "",
    port: "",
    extension: "",
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
  const [incomingRingtoneBlocked, setIncomingRingtoneBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  const uaRef = useRef<UA | null>(null);
  const sipExtensionRef = useRef("");
  const currentCallRef = useRef<RTCSession | null>(null);
  const amdResultsRef = useRef(new WeakMap<RTCSession, AMDResult>());
  const amdSessionsRef = useRef(new Map<string, RTCSession>());
  const callLogWritesRef = useRef(new Map<string, Promise<boolean>>());
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const incomingRingtoneRef = useRef<HTMLAudioElement | null>(null);
  const sipManagerRef = useRef<SipSessionManager | null>(null);
  const answerAudioContextRef = useRef<AudioContext | null>(null);
  const answerAudioBuffersRef = useRef<
    Partial<Record<AnswerAudioFile, AudioBuffer>>
  >({});
  const answerAudioPlaybackRef = useRef<AnswerAudioPlayback | null>(null);
  const answerAudioPreparationSessionRef = useRef<RTCSession | null>(null);
  const incomingAnswerRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isSipConfigReady = Boolean(user?.id && configuredUserId === user.id);
  const isIncomingCall = callPhase === "incoming";
  const isCallActive = callPhase === "active";
  const hasCallInProgress = ACTIVE_CALL_PHASES.includes(callPhase);
  const [isPreparingAnswerAudio, setIsPreparingAnswerAudio] = useState(false);
  const [answerAudioError, setAnswerAudioError] = useState<string | null>(null);
  const [answerAudioLoadStatus, setAnswerAudioLoadStatus] = useState<
    Record<AnswerAudioFile, AnswerAudioLoadStatus>
  >({ "voicemail.mp3": "loading", "auto.mp3": "loading" });
  const [answerAudioLoadErrors, setAnswerAudioLoadErrors] = useState<
    Partial<Record<AnswerAudioFile, string>>
  >({});

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

  useEffect(() => {
    const audioContext = new AudioContext();
    const abortController = new AbortController();
    let disposed = false;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      abortController.abort();
    }, 15_000);

    answerAudioContextRef.current = audioContext;
    void Promise.all(
      ANSWER_AUDIO_FILES.map(async (audioFile) => {
        try {
          const response = await fetch(`/${audioFile}`, {
            signal: abortController.signal,
          });
          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }
          const audioBuffer = await audioContext.decodeAudioData(
            await response.arrayBuffer(),
          );
          if (disposed) return;

          answerAudioBuffersRef.current[audioFile] = audioBuffer;
          setAnswerAudioLoadStatus((previous) => ({
            ...previous,
            [audioFile]: "ready",
          }));
        } catch (error: unknown) {
          if (disposed) return;
          console.error(`[call response] Could not preload /${audioFile}.`, error);
          const message = timedOut
            ? `Loading /${audioFile} timed out. Refresh the dialer to retry.`
            : `Could not preload /${audioFile}. Refresh the dialer to retry.`;
          setAnswerAudioLoadStatus((previous) => ({
            ...previous,
            [audioFile]: "error",
          }));
          setAnswerAudioLoadErrors((previous) => ({
            ...previous,
            [audioFile]: message,
          }));
        }
      }),
    ).finally(() => window.clearTimeout(timeoutId));

    return () => {
      disposed = true;
      abortController.abort();
      window.clearTimeout(timeoutId);
      if (answerAudioContextRef.current === audioContext) {
        answerAudioContextRef.current = null;
      }
      if (audioContext.state !== "closed") {
        void audioContext.close().catch((error: unknown) => {
          console.warn("[call response] Could not close preload audio context.", error);
        });
      }
    };
  }, []);

  useEffect(() => {
    if (!isIncomingCall) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    incomingAnswerRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [isIncomingCall]);

  useEffect(() => {
    if (!isCallActive) {
      setCallDurationSeconds(0);
      return;
    }

    const connectedAt = Date.now();
    const updateDuration = () => {
      setCallDurationSeconds(Math.floor((Date.now() - connectedAt) / 1000));
    };
    updateDuration();
    const intervalId = window.setInterval(updateDuration, 1000);

    return () => window.clearInterval(intervalId);
  }, [isCallActive]);

  useEffect(() => {
    const ringtone = new Audio("/incoming.mp3");
    ringtone.preload = "auto";
    ringtone.loop = true;
    incomingRingtoneRef.current = ringtone;

    return () => {
      ringtone.pause();
      ringtone.currentTime = 0;
      incomingRingtoneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ringtone = incomingRingtoneRef.current;
    if (!isIncomingCall || !ringtone) {
      setIncomingRingtoneBlocked(false);
      return;
    }

    let active = true;
    ringtone.currentTime = 0;
    void ringtone.play().then(
      () => {
        if (active) setIncomingRingtoneBlocked(false);
      },
      (error: unknown) => {
        if (!active) return;
        console.warn(
          "[media] Browser blocked incoming ringtone playback.",
          error,
        );
        setIncomingRingtoneBlocked(true);
      },
    );

    return () => {
      active = false;
      ringtone.pause();
      ringtone.currentTime = 0;
    };
  }, [isIncomingCall]);

  const handleEnableIncomingRingtone = () => {
    const ringtone = incomingRingtoneRef.current;
    if (!ringtone) return;

    void ringtone.play().then(
      () => setIncomingRingtoneBlocked(false),
      (error: unknown) => {
        console.error("[media] Could not play incoming ringtone.", error);
        setIncomingRingtoneBlocked(true);
      },
    );
  };

  // --- Call control handlers ---

  const handleCall = () => {
    const activeCall = currentCallRef.current;

    if (activeCall && isIncomingCall) {
      try {
        setCallPhase("answering");
        setCallStatus("Answering incoming call…");
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
      setCallStatus(
        "Not registered. Wait for SIP registration before calling.",
      );
      return;
    }

    setCallPhase("dialing");
    setCallStatus("Calling…");
    try {
      const target = phoneNumber.trim().replace(/\s/g, "");
      const dest = `sip:${target}@${sipExtensionRef.current.split("@")[1] || sipExtensionRef.current}`;
      const call = uaRef.current.call(dest, {
        mediaConstraints: {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
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

  const stopAnswerAudioPlayback = (session?: RTCSession) => {
    const playback = answerAudioPlaybackRef.current;
    if (!playback || (session && playback.session !== session)) return;

    answerAudioPlaybackRef.current = null;
    if (playback.hangupTimer !== null) {
      window.clearTimeout(playback.hangupTimer);
    }
    playback.source.onended = null;
    if (playback.started && !playback.finished) {
      playback.source.stop();
    }
    playback.stream.getTracks().forEach((track) => {
      track.stop();
    });
    playback.source.disconnect();
  };

  const handleAnswerWithAudio = async (
    audioFile: AnswerAudioFile,
    audioLabel: "voicemail greeting" | "auto-answer recording",
  ) => {
    const incomingCall = currentCallRef.current;
    if (!incomingCall || !isIncomingCall || isPreparingAnswerAudio) return;

    answerAudioPreparationSessionRef.current = incomingCall;
    setIsPreparingAnswerAudio(true);
    setAnswerAudioError(null);
    setCallStatus(`Preparing ${audioLabel}…`);

    let audioContext: AudioContext | null = null;
    try {
      audioContext = answerAudioContextRef.current;
      const audioBuffer = answerAudioBuffersRef.current[audioFile];
      if (!audioContext || !audioBuffer || audioContext.state === "closed") {
        throw new Error(`/${audioFile} has not finished preloading.`);
      }
      await audioContext.resume();

      if (
        answerAudioPreparationSessionRef.current !== incomingCall ||
        currentCallRef.current !== incomingCall ||
        incomingCall.isEnded()
      ) {
        return;
      }

      const source = audioContext.createBufferSource();
      const destination = audioContext.createMediaStreamDestination();
      source.buffer = audioBuffer;
      source.connect(destination);

      const playback: AnswerAudioPlayback = {
        session: incomingCall,
        audioContext,
        source,
        stream: destination.stream,
        started: false,
        finished: false,
        hangupTimer: null,
      };
      answerAudioPlaybackRef.current = playback;

      source.onended = () => {
        playback.finished = true;
        if (currentCallRef.current !== incomingCall) return;
        setCallPhase("ending");
        setCallStatus(`${audioLabel} finished. Ending call…`);
        playback.hangupTimer = window.setTimeout(() => {
          if (
            currentCallRef.current === incomingCall &&
            !incomingCall.isEnded()
          ) {
            incomingCall.terminate();
          }
        }, 500);
      };

      incomingCall.on("confirmed", () => {
        if (
          currentCallRef.current !== incomingCall ||
          answerAudioPlaybackRef.current !== playback
        ) {
          return;
        }
        try {
          source.start();
          playback.started = true;
          setCallStatus(`Playing ${audioLabel} to caller…`);
        } catch (error: unknown) {
          console.error("[call response] Could not play audio.", error);
          setCallPhase("ending");
          setCallStatus(`Could not play ${audioLabel}. Ending call…`);
          incomingCall.terminate();
        }
      });
      incomingCall.on("ended", () => stopAnswerAudioPlayback(incomingCall));
      incomingCall.on("failed", () => stopAnswerAudioPlayback(incomingCall));

      incomingCall.answer({
        mediaStream: destination.stream,
        mediaConstraints: { video: false },
      });
      setCallPhase("answering");
      setCallStatus(`Answering with ${audioLabel}…`);
    } catch (error: unknown) {
      console.error("[call response] Could not prepare audio.", error);
      stopAnswerAudioPlayback(incomingCall);
      if (currentCallRef.current === incomingCall && !incomingCall.isEnded()) {
        const errorMessage = `Could not load ${audioFile}. Check the audio file and retry.`;
        setCallStatus(errorMessage);
        setAnswerAudioError(errorMessage);
      }
    } finally {
      if (answerAudioPreparationSessionRef.current === incomingCall) {
        answerAudioPreparationSessionRef.current = null;
      }
      setIsPreparingAnswerAudio(false);
    }
  };

  const handleAnswerWithVoicemail = () =>
    handleAnswerWithAudio("voicemail.mp3", "voicemail greeting");
  const handleAutoAnswer = () =>
    handleAnswerWithAudio("auto.mp3", "auto-answer recording");

  const handleDecline = () => {
    const incomingCall = currentCallRef.current;
    if (!incomingCall || !isIncomingCall) return;

    answerAudioPreparationSessionRef.current = null;
    setCallPhase("ending");
    setCallStatus("Declining incoming call…");
    incomingCall.terminate({
      status_code: 486,
      reason_phrase: "Busy Here",
    });
  };

  const handleIncomingDialogKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleDecline();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = event.currentTarget.querySelectorAll<HTMLButtonElement>(
      "button:not([disabled])",
    );
    const first = focusable.item(0);
    const last = focusable.item(focusable.length - 1);
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
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
      setCallStatus(
        "Call audio is not available yet. Wait for the call to connect.",
      );
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
      setCallStatus(
        "Remote audio is not available yet. Wait for the call to connect.",
      );
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
    if (authLoading || !isAuthenticated || !user?.id || !isSipConfigReady) {
      return;
    }

    const userId = user.id;
    let disposed = false;
    const sipProfile = {
      extensionId: sipConfig.extension,
      url: sipConfig.url,
      port: Number(sipConfig.port),
      secret: sipConfig.extension,
      name: user?.name,
    };

    const manager = new SipSessionManager(
      sipProfile,
      {
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
        onAMDMessage: (message) => {
          const matchingSessionId = [
            message.fromTag && `${message.callId}${message.fromTag}`,
            message.toTag && `${message.callId}${message.toTag}`,
          ]
            .filter((id): id is string => Boolean(id))
            .find((id) => amdSessionsRef.current.has(id));
          const activeSession = currentCallRef.current;
          const activeSessionIsLive =
            activeSession !== null && !activeSession.isEnded();
          const session = matchingSessionId
            ? amdSessionsRef.current.get(matchingSessionId)
            : activeSessionIsLive
              ? activeSession
              : undefined;
          if (!session) {
            console.warn("[call][AMD] No call session available for message.", {
              callId: message.callId,
              fromTag: message.fromTag,
              toTag: message.toTag,
              remoteParty: message.remoteParty,
              activeSessionId: activeSession?.id ?? null,
              activeSessionIsLive,
              knownSessionIds: [...amdSessionsRef.current.keys()],
            });
            return;
          }

          const remoteParty = session.remote_identity.uri.user?.trim();
          if (!message.amdStatus || !message.amdCause) {
            console.warn("[call][AMD] Message is missing a required field.", {
              sessionId: session.id,
              amdStatus: message.amdStatus,
              amdCause: message.amdCause,
            });
            return;
          }

          const result = {
            amdStatus: message.amdStatus,
            amdCause: message.amdCause,
          };
          amdResultsRef.current.set(session, result);
          console.info("[call][AMD] Updated live call data.", {
            sessionId: session.id,
            matchMethod: matchingSessionId
              ? "sip-session-id"
              : "only-active-call",
            callId: message.callId,
            fromTag: message.fromTag,
            toTag: message.toTag,
            expectedRemoteParty: remoteParty ?? null,
            messageRemoteParty: message.remoteParty,
            remotePartyMatches: remoteParty === message.remoteParty,
            ...result,
          });

          if (session.isEnded()) {
            const write = callLogWritesRef.current.get(session.id);
            if (!write) {
              console.warn(
                "[call][AMD] Call ended but its call-log save is not tracked.",
                { sessionId: session.id, ...result },
              );
              return;
            }

            void write
              .then(async (saved) => {
                if (!saved) {
                  console.error(
                    "[call][AMD] Skipping update because initial call-log save failed.",
                    { sessionId: session.id, ...result },
                  );
                  return;
                }

                console.info("[call][AMD] Updating saved call log.", {
                  userId,
                  sipSessionId: session.id,
                  ...result,
                });
                const authSession = getStoredAuthSession();
                const response = await fetch("/api/user/call-logs", {
                  method: "PATCH",
                  credentials: "include",
                  headers: {
                    "Content-Type": "application/json",
                    ...(authSession
                      ? { Authorization: `Bearer ${authSession.token}` }
                      : {}),
                  },
                  body: JSON.stringify({
                    sipSessionId: session.id,
                    ...result,
                  }),
                });
                const responseBody: unknown = await response.json();
                console.info("[call][AMD] Call-log update response.", {
                  status: response.status,
                  body: responseBody,
                });
                if (!response.ok) {
                  throw new Error(
                    `AMD call log update failed with status ${response.status}`,
                  );
                }
              })
              .catch((error: unknown) => {
                console.error(
                  "[call] Could not update call log with AMD.",
                  error,
                );
              });
          }
        },
        onNewRTCSession: (session: RTCSession) => {
          if (disposed) {
            session.terminate({
              status_code: 480,
              reason_phrase: "Temporarily Unavailable",
            });
            return;
          }

          const incoming = session.direction === "incoming";
          const remoteNumber =
            session.remote_identity.uri.user?.trim() || "Unknown caller";

          // Ignore additional concurrent calls
          const existingCall = currentCallRef.current;
          if (
            existingCall &&
            existingCall !== session &&
            !existingCall.isEnded()
          ) {
            console.warn(
              "[call] Ignoring additional call while another is active.",
              {
                sessionId: session.id,
                direction: session.direction,
                remoteNumber,
              },
            );
            session.terminate({
              status_code: 486,
              reason_phrase: "Busy Here",
            });
            return;
          }

          currentCallRef.current = session;
          amdSessionsRef.current.set(session.id, session);
          console.info("[call] Live call session created.", {
            sessionId: session.id,
            direction: session.direction,
            remoteParty: remoteNumber,
          });
          setRemoteParty(remoteNumber);
          setCallPhase(incoming ? "incoming" : "dialing");
          setCallStatus(
            incoming
              ? `Incoming call from ${remoteNumber}. Answer or decline.`
              : `Calling ${remoteNumber}…`,
          );
          const disposeRef = () => disposed;
          setupCallLifecycle(
            session,
            incoming,
            remoteNumber,
            {
              currentCallRef,
              remoteAudioRef,
              getAMDResult: () => amdResultsRef.current.get(session) ?? null,
              onCallLogWrite: (sessionId, write) => {
                callLogWritesRef.current.set(sessionId, write);
              },
              setCallPhase,
              setCallStatus,
              setAudioPlaybackBlocked,
              setIsAudioOn,
              setIsMuted,
            },
            disposeRef,
          );
        },
      },
      sipExtensionRef,
    );

    sipManagerRef.current = manager;
    manager.connect();
    uaRef.current = manager.getUA();

    return () => {
      currentCallRef.current?.terminate();
      disposed = true;
      sipManagerRef.current?.stop();
      currentCallRef.current = null;
      amdSessionsRef.current.clear();
      callLogWritesRef.current.clear();
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

  return {
    remoteAudioRef,
    incomingRingtoneBlocked,
    handleEnableIncomingRingtone,
    incomingAnswerRef,
    isAudioOn,
    statusLabel,
    isRegistered,
    registrationFailed,
    websocketConnected,
    isIncomingCall,
    isPreparingAnswerAudio,
    answerAudioError,
    answerAudioLoadStatus,
    answerAudioLoadErrors,
    isCallActive,
    callDurationSeconds,
    callPhase,
    callStatus,
    remoteParty,
    hasCallInProgress,
    handleCall,
    handleAnswerWithVoicemail,
    handleAutoAnswer,
    handleDecline,
    audioPlaybackBlocked,
    handleEnableAudio,
    handleToggleMute,
    isMuted,
    handleToggleAudio,
    audioButtonLabel,
    phoneNumber,
    setPhoneNumber,
    handleBackspace,
    handleClear,
    handleNumberClick,
    sipConfig,
    handleSaveSipConfig,
    isSipConfigReady,
    sipConfigError,
    sipConfigMessage,
    sipConfigDraft,
    setSipConfigDraft,
    setSipConfigError,
    setSipConfigMessage,
    handleIncomingDialogKeyDown,
  };
}
