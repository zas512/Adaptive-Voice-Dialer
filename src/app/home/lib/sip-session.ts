"use client";
import { UA, WebSocketInterface } from "jssip";
import type { RTCSession } from "jssip/lib/RTCSession";

export type { RTCSession };

type SipProfile = {
  extensionId?: string;
  host?: string;
  port?: number;
  secret?: string;
  name?: string;
};

type SipHandlers = {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onRegistered?: () => void;
  onRegistrationFailed?: () => void;
  onNewRTCSession?: (session: RTCSession) => void;
};

export class SipSessionManager {
  public extensionRef: { current: string };
  private ua: UA | null = null;
  private controllers: Array<AbortController> = [];
  private disposed = false;

  constructor(
    private profile: SipProfile,
    private handlers: SipHandlers,
    extensionRef: { current: string },
  ) {
    this.extensionRef = extensionRef;
  }

  connect() {
    const { extensionId, host, port, secret, name } = this.profile;
    if (!extensionId || !host || !port || !secret) {
      this.handlers.onRegistrationFailed?.();
      return;
    }

    this.extensionRef.current = `${extensionId}@${host}`;
    const websocketScheme =
      window.location.protocol === "https:" ? "wss:" : "ws:";
    const websocketUrl = `${websocketScheme}//${host}:${port}/ws`;
    const sipUri = `sip:${extensionId}@${host}`;
    const socket = new WebSocketInterface(websocketUrl);

    const ua = new UA({
      sockets: [socket],
      uri: sipUri,
      authorization_user: extensionId,
      password: secret,
      display_name: name || extensionId,
      register: true,
      register_expires: 3600,
    });

    const controller = new AbortController();
    this.controllers.push(controller);

    ua.on("connected", () => {
      if (this.disposed || controller.signal.aborted) return;
      this.handlers.onConnected?.();
    });

    ua.on("disconnected", () => {
      if (this.disposed || controller.signal.aborted) return;
      this.handlers.onDisconnected?.();
    });

    ua.on("registered", () => {
      if (this.disposed || controller.signal.aborted) return;
      this.handlers.onRegistered?.();
    });

    ua.on("registrationFailed", () => {
      if (this.disposed || controller.signal.aborted) return;
      this.handlers.onRegistrationFailed?.();
    });

    ua.on("newRTCSession", (event: { session: RTCSession }) => {
      if (this.disposed || controller.signal.aborted) {
        event.session.terminate();
        return;
      }
      this.handlers.onNewRTCSession?.(event.session);
    });

    this.ua = ua;
    ua.start();
  }

  stop() {
    this.disposed = true;
    for (const controller of this.controllers) {
      controller.abort();
    }
    this.controllers = [];
    this.ua?.stop();
    this.ua = null;
  }

  getUA() {
    return this.ua;
  }
}
