import type { EndEvent, RTCSession } from "jssip/lib/RTCSession";
import {
  captureFirstFiveSeconds,
  type CallAudioCapture,
} from "@/app/home/lib/call-audio";
import { getStoredAuthSession } from "@/lib/auth-client";
import type { AIInference, AMDResult, CallPhase } from "@/types/app";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAIInference(value: unknown): value is AIInference {
  if (!isRecord(value) || !isRecord(value.classification)) {
    return false;
  }

  const classification = value.classification;
  return (
    "classification" in classification &&
    (classification.classification === "ai" ||
      classification.classification === "human" ||
      classification.classification === "voicemail") &&
    "confidence" in classification &&
    typeof classification.confidence === "number" &&
    Number.isFinite(classification.confidence) &&
    classification.confidence >= 0 &&
    classification.confidence <= 1 &&
    "reasoning" in classification &&
    typeof classification.reasoning === "string" &&
    typeof value.transcription === "string" &&
    typeof value.model === "string" &&
    typeof value.classificationModel === "string" &&
    value.sampleRate === 16_000 &&
    value.channels === 1 &&
    typeof value.analyzedAt === "string" &&
    !Number.isNaN(Date.parse(value.analyzedAt))
  );
}

function authHeaders(contentType?: string): HeadersInit {
  const session = getStoredAuthSession();
  return {
    ...(contentType ? { "Content-Type": contentType } : {}),
    ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
  };
}

/** Register the full call lifecycle using only the supplied refs and setters. */
export function setupCallLifecycle(
  session: RTCSession,
  incoming: boolean,
  remoteNumber: string,
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
  let callAccepted = false;
  let audioAnalysisStarted = false;
  let remoteAudioStream: MediaStream | null = null;
  let audioCapture: CallAudioCapture | null = null;
  const initialLogPayload = {
    sipSessionId: session.id,
    phoneNumber: remoteNumber,
    callType: incoming ? "inbound" : "outbound",
    callState: "in_progress",
    amdStatus: null,
    amdCause: null,
    aiInference: null,
    cancelReason: null,
    hangupBy: null,
    startedAt: startedAt.toISOString(),
    answeredAt: null,
    endedAt: startedAt.toISOString(),
    durationSeconds: 0,
  };
  const initialLogWrite = fetch("/api/user/call-logs", {
    method: "POST",
    credentials: "include",
    headers: authHeaders("application/json"),
    body: JSON.stringify(initialLogPayload),
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Call log creation failed with status ${response.status}`,
        );
      }
      return true;
    })
    .catch((error: unknown) => {
      console.error("[call] Could not create the active call log.", error);
      return false;
    });
  refs.onCallLogWrite?.(session.id, initialLogWrite);

  const analyzeCallAudio = async (blob: Blob) => {
    if (blob.size <= 44) return;

    const saved = await initialLogWrite;
    if (!saved) {
      throw new Error(
        "Cannot attach AI inference because the call log was not saved.",
      );
    }

    const capturedSeconds = (blob.size - 44) / (16_000 * 2);
    const formData = new FormData();
    formData.append("audio", blob, `${session.id}-first-five-seconds.wav`);
    formData.append(
      "callData",
      JSON.stringify({
        sipSessionId: session.id,
        phoneNumber: remoteNumber,
        callType: incoming ? "inbound" : "outbound",
        startedAt: startedAt.toISOString(),
        capturedSeconds,
      }),
    );

    const response = await fetch("/api/user/call-audio", {
      method: "POST",
      credentials: "include",
      headers: authHeaders(),
      body: formData,
    });
    const result: unknown = await response.json();
    if (!response.ok) {
      const errorMessage =
        typeof result === "object" &&
        result !== null &&
        "error" in result &&
        typeof result.error === "string"
          ? result.error
          : `Call audio analysis failed with status ${response.status}`;
      throw new Error(errorMessage);
    }
    if (
      typeof result !== "object" ||
      result === null ||
      !("transcription" in result) ||
      !("model" in result) ||
      !("classification" in result) ||
      !("classificationModel" in result) ||
      !("sampleRate" in result) ||
      !("channels" in result) ||
      !("analyzedAt" in result)
    ) {
      throw new Error("Call audio analysis returned an invalid response.");
    }

    const inference: unknown = {
      transcription: result.transcription,
      model: result.model,
      classification: result.classification,
      classificationModel: result.classificationModel,
      sampleRate: result.sampleRate,
      channels: result.channels,
      analyzedAt: result.analyzedAt,
    };
    if (!isAIInference(inference)) {
      throw new Error("Call audio analysis returned invalid inference data.");
    }

    const updateResponse = await fetch("/api/user/call-logs", {
      method: "PATCH",
      credentials: "include",
      headers: authHeaders("application/json"),
      body: JSON.stringify({
        sipSessionId: session.id,
        aiInference: inference,
      }),
    });
    if (!updateResponse.ok) {
      throw new Error(
        `Could not save AI inference to the call log (${updateResponse.status}).`,
      );
    }
    console.info("[call][AI] Saved first-five-second call analysis.", {
      sessionId: session.id,
      capturedSeconds,
      classification: inference.classification.classification,
    });
  };

  const startAudioAnalysis = () => {
    if (
      audioAnalysisStarted ||
      !callAccepted ||
      !remoteAudioStream ||
      !remoteAudioStream.getAudioTracks().some((track) => !track.muted) ||
      disposeFlag()
    ) {
      return;
    }

    audioAnalysisStarted = true;
    try {
      audioCapture = captureFirstFiveSeconds(remoteAudioStream);
      void audioCapture.result
        .then((blob) => (blob ? analyzeCallAudio(blob) : undefined))
        .catch((error: unknown) => {
          console.error("[call][AI] Could not analyze the call audio.", error);
        });
    } catch (error: unknown) {
      console.error("[call][AI] Could not capture the call audio.", error);
    }
  };

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
      remoteAudioStream = new MediaStream(remoteStream.getAudioTracks());
      event.track.addEventListener("unmute", startAudioAnalysis, {
        once: true,
      });
      startAudioAnalysis();
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
    callAccepted = true;
    answeredAt ??= new Date();
    refs.setCallPhase("connecting");
    refs.setCallStatus(`Call with ${remoteNumber} accepted. Connecting audio…`);
    startAudioAnalysis();
  });

  session.on("confirmed", () => {
    if (disposeFlag() || refs.currentCallRef.current !== session) return;
    callAccepted = true;
    answeredAt ??= new Date();
    refs.setCallPhase("active");
    refs.setCallStatus(`In call with ${remoteNumber}.`);
    startAudioAnalysis();
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
      sipSessionId: session.id,
      callState,
      amdStatus: amdResult?.amdStatus ?? null,
      amdCause: amdResult?.amdCause ?? null,
      cancelReason: callState === "completed" ? null : event.cause || null,
      hangupBy: event.originator,
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
    void initialLogWrite
      .then(async (saved) => {
        if (!saved) {
          throw new Error("Cannot finalize a call log that was not created.");
        }
        const response = await fetch("/api/user/call-logs", {
          method: "PATCH",
          credentials: "include",
          headers: authHeaders("application/json"),
          body: JSON.stringify(payload),
          keepalive: true,
        });
        if (!response.ok) {
          throw new Error(
            `Call log update failed with status ${response.status}`,
          );
        }
      })
      .catch((error: unknown) => {
        console.error("[call] Could not finalize the call log.", error);
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
    audioCapture?.stop();
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
    audioCapture?.stop();
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
