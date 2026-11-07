"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { StatusRowProps } from "@/types/app";
import {
  AlertCircle,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { useDialer } from "../hooks/use-dialer";

type DialerController = ReturnType<typeof useDialer>;

export function DialerWorkspace(props: DialerController) {
  const {
    remoteAudioRef,
    incomingAnswerRef,
    isAudioOn,
    statusLabel,
    isRegistered,
    registrationFailed,
    websocketConnected,
    isIncomingCall,
    isCallActive,
    callPhase,
    callStatus,
    remoteParty,
    hasCallInProgress,
    handleCall,
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
  } = props;

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
          title="WebSocket"
          value={websocketConnected ? "Connected" : "Disconnected"}
          tone={websocketConnected ? "success" : "danger"}
        />
        <StatusRow
          icon={isIncomingCall || isCallActive ? <Phone /> : <PhoneOff />}
          title="Call"
          value={statusLabel}
          tone={
            isCallActive
              ? "success"
              : isIncomingCall
                ? "warning"
                : callPhase === "failed" || callPhase === "disconnected"
                  ? "danger"
                  : "neutral"
          }
        />
        <StatusRow
          icon={isAudioOn ? <Volume2 /> : <VolumeX />}
          title="Call audio"
          value={isCallActive ? `Speaker ${isAudioOn ? "on" : "off"}` : "Ready"}
          tone={isAudioOn ? "success" : "neutral"}
        />
      </section>

      {callStatus && (
        <div
          className={`flex flex-col gap-1 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
            callPhase === "failed" || callPhase === "disconnected"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : callPhase === "active"
                ? "border-success/30 bg-success/10 text-success"
                : callPhase === "incoming"
                  ? "border-warning/35 bg-warning/10 text-warning"
                  : "border-border bg-card text-muted-foreground"
          }`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span>{callStatus}</span>
          {remoteParty && (
            <span className="font-semibold text-foreground">
              {isIncomingCall ? "Caller" : "Other party"}: {remoteParty}
            </span>
          )}
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/55 px-5 py-5 sm:px-7">
          <CardTitle className="text-lg font-semibold tracking-tight">
            Dialer
          </CardTitle>
          <CardDescription>
            Enter a number or use the keypad to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 px-5 py-6 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between xl:col-span-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {isIncomingCall
                  ? "Incoming call"
                  : isCallActive
                    ? "Call in progress"
                    : isRegistered
                      ? "Ready to call"
                      : "Connect your SIP line first"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {remoteParty ||
                  (isRegistered
                    ? "Enter a number or use the keypad."
                    : "Calling is available once your extension is registered.")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:min-w-52">
              <Button
                onClick={handleCall}
                variant={
                  hasCallInProgress && !isIncomingCall
                    ? "destructive"
                    : "success"
                }
                className="h-14 w-full rounded-full text-base shadow-md"
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
                  variant="destructive"
                  className="w-full rounded-full"
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
                    aria-pressed={isMuted}
                    aria-label={
                      isMuted ? "Unmute microphone" : "Mute microphone"
                    }
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

          <div className="space-y-5">
            <div className="rounded-xl border border-input bg-muted/60 px-4 py-3">
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
                ["*", "DEL"],
                ["0", "+"],
                ["#", "CLR"],
              ].map(([digit, letters]) => (
                <Button
                  key={digit}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (digit === "*") {
                      handleBackspace();
                    } else if (digit === "#") {
                      handleClear();
                    } else {
                      handleNumberClick(digit);
                    }
                  }}
                  aria-label={
                    digit === "*"
                      ? "Delete last digit"
                      : digit === "#"
                        ? "Clear number"
                        : `Dial ${digit}`
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
              ))}
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
                    : registrationFailed || !websocketConnected
                      ? "bg-destructive"
                      : "bg-warning"
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
                        : "Disconnected"}
                </p>
                <p className="mt-1 text-sm leading-5 text-background/70">
                  {isRegistered
                    ? "Your SIP extension is registered."
                    : registrationFailed
                      ? "Check your extension details with your administrator."
                      : websocketConnected
                        ? "Calls become available when your extension is registered."
                        : "Check the SIP endpoint and network, then reload to reconnect."}
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
                connection port. These settings stay in this browser profile;
                the SIP password uses your extension.
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
              <p className="rounded-lg border border-background/15 bg-background/5 px-3 py-2 text-xs leading-5 text-background/80">
                SIP password is set to the extension above.
              </p>
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
          </div>
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

            <div className="mt-6 border-t border-border pt-5">
              <p className="text-sm font-semibold">Other response options</p>
              <div className="mt-3 grid gap-2">
                {[
                  {
                    label: "Voicemail",
                    description: "Send the caller to voicemail",
                  },
                  {
                    label: "AI voice",
                    description: "Answer with an AI voice",
                  },
                  {
                    label: "Answering machine",
                    description: "Play an answering-machine message",
                  },
                ].map((option) => (
                  <Button
                    key={option.label}
                    type="button"
                    variant="outline"
                    disabled
                    className="h-auto min-h-14 justify-between rounded-xl px-4 py-2 text-left opacity-70"
                    aria-label={`${option.label}, coming soon`}
                  >
                    <span>
                      <span className="block">{option.label}</span>
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[0.65rem] font-semibold text-secondary-foreground">
                      Soon
                    </span>
                  </Button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                These response options are not available yet. Answer and Reject
                control the live call.
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
