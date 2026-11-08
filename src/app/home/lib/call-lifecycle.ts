import type { EndEvent, RTCSession } from "jssip/lib/RTCSession";
import { getStoredAuthSession } from "@/lib/auth-client";
import type { AMDResult, CallPhase } from "@/types/app";

/** Register the full call lifecycle using only the supplied refs and setters. */
export function setupCallLifecycle(
  session: RTCSession,
  incoming: boolean,
  remoteNumber: string,
  userId: string,
  refs: {
    currentCallRef: React.MutableRefObject<RTCSession | null>;
    remoteAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
    getAMDResult: () => AMDResult | null;
    onCallLogWrite?: (sessionId: string, write: Promise<boolean>) => void;
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
        refs.setCallStatus(
          "RTP media connection failed. Check the PBX RTP/ICE network settings.",
        );
      }
    });

    peerConnection.addEventListener("track", (event) => {
      const audio = refs.remoteAudioRef.current;
      if (
        refs.currentCallRef.current !== session ||
        !audio ||
        event.track.kind !== "audio"
      ) {
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
    refs.setCallStatus(
      `Incoming call from ${remoteNumber}. Answer or decline.`,
    );
  }

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

  session.on("connecting", () => {
    if (disposeFlag() || refs.currentCallRef.current !== session) return;
    if (!incoming) {
      refs.setCallPhase("dialing");
      refs.setCallStatus(`Calling ${remoteNumber}…`);
    }
  });

  session.on("progress", () => {
    if (disposeFlag() || refs.currentCallRef.current !== session || incoming)
      return;
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
    const amdResult = refs.getAMDResult();
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
      amdStatus: amdResult?.amdStatus ?? null,
      amdCause: amdResult?.amdCause ?? null,
      cancelReason: callState === "completed" ? null : event.cause || null,
      hangupBy: event.originator,
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
    console.info("[call] Final call-log payload.", payload);
    const authSession = getStoredAuthSession();
    const write = fetch("/api/user/call-logs", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(authSession
          ? { Authorization: `Bearer ${authSession.token}` }
          : {}),
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then(
        async (response) => {
          const responseBody: unknown = await response.json();
          console.info("[call] Call-log save response.", {
            status: response.status,
            body: responseBody,
          });
          if (!response.ok) {
            throw new Error(
              `Call log save failed with status ${response.status}`,
            );
          }
          return true;
        },
        (error: unknown) => {
          console.error("[call] Could not save call log.", error);
          return false;
        },
      )
      .catch((error: unknown) => {
        console.error("[call] Could not save call log.", error);
        return false;
      });
    refs.onCallLogWrite?.(session.id, write);
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
