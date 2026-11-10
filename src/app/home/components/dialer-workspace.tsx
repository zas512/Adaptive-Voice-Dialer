"use client";
import {
  AlertCircle,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { StatusRowProps } from "@/types/app";
import type { useDialer } from "../hooks/use-dialer";

type DialerController = ReturnType<typeof useDialer>;

export function DialerWorkspace(props: Readonly<DialerController>) {
  const {
    remoteAudioRef,
    incomingRingtoneBlocked,
    handleEnableIncomingRingtone,
    incomingAnswerRef,
    isPreparingAnswerAudio,
    answerAudioError,
    isAudioOn,
    isRegistered,
    registrationFailed,
    websocketConnected,
    isIncomingCall,
    isCallActive,
    callDurationSeconds,
    callStatus,
    isMuted,
    handleToggleMute,
    handleToggleAudio,
    audioPlaybackBlocked,
    handleEnableAudio,
    callPhase,
    remoteParty,
    hasCallInProgress,
    handleCall,
    handleAnswerWithVoicemail,
    handleAutoAnswer,
    handleDecline,
    phoneNumber,
    setPhoneNumber,
    handleBackspace,
    handleNumberClick,
    handleSaveSipConfig,
    isSipConfigReady,
    sipConfigError,
    sipConfigMessage,
    sipConfigDraft,
    setSipConfigDraft,
    setSipConfigError,
    setSipConfigMessage,
    handleIncomingDialogKeyDown,
  } = props;

  return (
    <div className="space-y-6">
      {/* Hidden audio element for the remote call stream. */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        muted={!isAudioOn}
        className="sr-only"
      />
      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        role="status"
        aria-label="Dialer status"
      >
        <StatusRow
          icon={isRegistered ? <Volume2 /> : <AlertCircle />}
          title="SIP line"
          value={
            isRegistered
              ? "Registered"
              : registrationFailed
                ? "Registration failed"
                : websocketConnected
                  ? "Registering"
                  : "Disconnected"
          }
          tone={
            isRegistered
              ? "success"
              : registrationFailed || !websocketConnected
                ? "danger"
                : "warning"
          }
        />
        <StatusRow
          icon={websocketConnected ? <Volume2 /> : <VolumeX />}
          title="Asterisk WebSocket"
          value={websocketConnected ? "Connected" : "Disconnected"}
          tone={websocketConnected ? "success" : "danger"}
        />
      </section>
      <p className="text-xs leading-5 text-muted-foreground">
        AI/STT analyzes at most the first five seconds of the other party’s
        audio after the call is answered. The raw audio sample is not saved in
        call logs.
      </p>
      {isCallActive && (
        <Card className="border-success/30">
          <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <span className="size-2 rounded-full bg-success" />
                Live call
              </div>
              <h2 className="truncate text-lg font-semibold">
                {remoteParty || "Unknown caller"}
              </h2>
              <p className="text-sm text-muted-foreground">{callStatus}</p>
              <p
                className="font-mono text-2xl font-semibold tabular-nums"
                role="timer"
                aria-label={`Call duration ${Math.floor(callDurationSeconds / 60)} minutes ${callDurationSeconds % 60} seconds`}
              >
                {Math.floor(callDurationSeconds / 3600)
                  .toString()
                  .padStart(2, "0")}
                :
                {Math.floor((callDurationSeconds % 3600) / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(callDurationSeconds % 60).toString().padStart(2, "0")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleToggleMute}
                aria-pressed={isMuted}
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {isMuted ? (
                  <MicOff className="size-4" aria-hidden="true" />
                ) : (
                  <Mic className="size-4" aria-hidden="true" />
                )}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleToggleAudio}
                aria-pressed={isAudioOn}
                aria-label={isAudioOn ? "Turn speaker off" : "Turn speaker on"}
              >
                {isAudioOn ? (
                  <Volume2 className="size-4" aria-hidden="true" />
                ) : (
                  <VolumeX className="size-4" aria-hidden="true" />
                )}
                Speaker {isAudioOn ? "on" : "off"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleCall}
                aria-label="End call"
              >
                <PhoneOff className="size-4" aria-hidden="true" />
                End call
              </Button>
            </div>
            {audioPlaybackBlocked && (
              <Button type="button" variant="outline" onClick={handleEnableAudio}>
                <Volume2 className="size-4" aria-hidden="true" />
                Enable call audio
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      <Card className="overflow-hidden">
        <CardContent className="grid gap-6 px-5 py-6 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
          <div className="space-y-5">
            <div className="rounded-xl border border-input bg-muted/60 px-4 py-3">
              <input
                id="phone-number"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="Enter number"
                className="h-14 w-full border-0 bg-transparent px-0 text-center font-mono text-3xl font-medium tabular-nums focus:border-none shadow-none focus-visible:ring-0 ring-0 sm:text-4xl"
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
                ["*", "DEL"],
                ["0", "+"],
                ["call", "CALL"],
              ].map(([digit, letters]) =>
                digit === "call" ? (
                  <Button
                    key={digit}
                    type="button"
                    variant={
                      hasCallInProgress && !isIncomingCall
                        ? "destructive"
                        : "success"
                    }
                    onClick={handleCall}
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
                    className="h-[4.15rem] flex-row gap-2 rounded-2xl border-border text-lg font-semibold tabular-nums shadow-sm disabled:opacity-100"
                  >
                    {isIncomingCall ? (
                      <>
                        <Phone className="size-5" />
                        Answer
                      </>
                    ) : callPhase === "answering" ? (
                      <>
                        <Phone className="size-5" />
                        Answering
                      </>
                    ) : callPhase === "ending" ? (
                      <>
                        <PhoneOff className="size-5" />
                        Ending
                      </>
                    ) : hasCallInProgress ? (
                      <>
                        <PhoneOff className="size-5" />
                        End
                      </>
                    ) : (
                      <>
                        <Phone className="size-5" />
                        Call
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    key={digit}
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (digit === "*") {
                        handleBackspace();
                      } else {
                        handleNumberClick(digit);
                      }
                    }}
                    aria-label={
                      digit === "*" ? "Delete last digit" : `Dial ${digit}`
                    }
                    className="h-[4.15rem] flex-col gap-0 rounded-2xl border-border bg-card text-lg font-semibold tabular-nums shadow-sm hover:border-primary/40 hover:bg-secondary"
                  >
                    <span>{digit}</span>
                    {letters && (
                      <span className="text-[0.6rem] font-semibold tracking-[0.12em] text-muted-foreground">
                        {letters}
                      </span>
                    )}
                  </Button>
                ),
              )}
            </div>
          </div>
          <form
            onSubmit={handleSaveSipConfig}
            className="space-y-3 p-3 bg-background/50 rounded-2xl border border-border"
          >
            <h3 className="text-sm font-semibold">Connection settings</h3>
            <div className="space-y-1.5">
              <label htmlFor="sip-server-url" className="text-xs font-medium">
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
                <label htmlFor="sip-port" className="text-xs font-medium">
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
                <label htmlFor="sip-extension" className="text-xs font-medium">
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
            {sipConfigError && (
              <p
                className="rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground"
                role="alert"
              >
                {sipConfigError}
              </p>
            )}
            {sipConfigMessage && <p className="text-sm">{sipConfigMessage}</p>}
            {hasCallInProgress && (
              <p className="text-xs">
                End the active call before changing connection settings.
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={!isSipConfigReady || hasCallInProgress}
            >
              Save and reconnect
            </Button>
          </form>
        </CardContent>
      </Card>

      {isIncomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/55 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="incoming-call-title"
            aria-describedby="incoming-call-description"
            onKeyDown={handleIncomingDialogKeyDown}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl sm:p-8"
          >
            <div className="flex flex-col items-center text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-warning/15 text-warning">
                <Phone className="size-6" aria-hidden="true" />
              </span>
              <h2
                id="incoming-call-title"
                className="mt-4 text-xl font-semibold tracking-tight"
              >
                Incoming call
              </h2>
              <p
                id="incoming-call-description"
                className="mt-1 text-sm text-muted-foreground"
              >
                {remoteParty || "Unknown caller"}
              </p>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Button
                ref={incomingAnswerRef}
                onClick={handleCall}
                variant="success"
                className="h-12 rounded-full"
                disabled={isPreparingAnswerAudio}
              >
                <Phone className="size-4" aria-hidden="true" />
                Answer call
              </Button>
              <Button
                onClick={handleDecline}
                variant="destructive"
                className="h-12 rounded-full"
              >
                <PhoneOff className="size-4" aria-hidden="true" />
                Reject
              </Button>
            </div>
            {incomingRingtoneBlocked && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
                <p className="text-sm text-muted-foreground">
                  Browser blocked ringtone playback.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEnableIncomingRingtone}
                  className="shrink-0"
                >
                  <Volume2 className="size-4" aria-hidden="true" />
                  Play ringtone
                </Button>
              </div>
            )}

            <div className="mt-6 border-t border-border pt-5">
              <p className="text-sm font-semibold">Other response options</p>
              <div className="mt-3 grid gap-2">
                {[
                  {
                    label: "Auto answer",
                    description: "Answer and play the auto-answer recording",
                    available: true,
                  },
                  {
                    label: "Voicemail",
                    description: "Play the greeting, then end the call",
                    available: true,
                  },
                  {
                    label: "AI voice",
                    description: "Answer with an AI voice",
                    available: false,
                  },
                  {
                    label: "Answering machine",
                    description: "Play an answering-machine message",
                    available: false,
                  },
                ].map((option) => (
                  <Button
                    key={option.label}
                    type="button"
                    variant="outline"
                    onClick={
                      option.available
                        ? option.label === "Auto answer"
                          ? handleAutoAnswer
                          : handleAnswerWithVoicemail
                        : undefined
                    }
                    disabled={!option.available || isPreparingAnswerAudio}
                    className={`h-auto min-h-14 justify-between rounded-xl px-4 py-2 text-left ${option.available ? "" : "opacity-70"}`}
                    aria-label={
                      option.available
                        ? option.label === "Auto answer"
                          ? "Answer and play the auto-answer recording"
                          : "Answer and play the voicemail greeting"
                        : `${option.label}, coming soon`
                    }
                  >
                    <span>
                      <span className="block">{option.label}</span>
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[0.65rem] font-semibold ${option.available ? "bg-success/10 text-success" : "bg-secondary text-secondary-foreground"}`}
                    >
                      {option.available
                        ? isPreparingAnswerAudio
                          ? "Loading…"
                          : "Ready"
                        : "Soon"}
                    </span>
                  </Button>
                ))}
              </div>
              {answerAudioError && (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {answerAudioError}
                </p>
              )}
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Auto answer plays public/auto.mp3; voicemail plays
                public/voicemail.mp3. The call ends when playback finishes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusRow({ icon, title, value, tone }: Readonly<StatusRowProps>) {
  const toneStyles = {
    success: "bg-success/10 text-success",
    danger: "bg-destructive/10 text-destructive",
    warning: "bg-warning/15 text-warning",
    neutral: "bg-secondary text-muted-foreground",
  }[tone];

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${toneStyles}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="truncate text-sm font-semibold text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}
