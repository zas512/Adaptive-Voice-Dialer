"use client";
import { UA, WebSocketInterface } from "jssip";
import type { RTCSession } from "jssip/lib/RTCSession";
import type { SipHandlers, SipProfile } from "@/types/app";

export type { RTCSession };

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
    const { extensionId, url, port, secret, name } = this.profile;
    if (
      !extensionId?.trim() ||
      !url?.trim() ||
      !Number.isInteger(port) ||
      !port ||
      port < 1 ||
      port > 65535 ||
      !secret
    ) {
      this.handlers.onRegistrationFailed?.();
      return;
    }

    let serverUrl: URL;
    try {
      const inputUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(url)
        ? url
        : `https://${url}`;
      serverUrl = new URL(inputUrl);
    } catch {
      this.handlers.onRegistrationFailed?.();
      return;
    }

    if (
      !["http:", "https:", "ws:", "wss:"].includes(serverUrl.protocol) ||
      !serverUrl.hostname ||
      serverUrl.username ||
      serverUrl.password
    ) {
      this.handlers.onRegistrationFailed?.();
      return;
    }

    const host = serverUrl.hostname;
    const websocketScheme =
      serverUrl.protocol === "ws:" || serverUrl.protocol === "wss:"
        ? serverUrl.protocol
        : window.location.protocol === "https:"
          ? "wss:"
          : "ws:";
    const websocketPath = serverUrl.pathname === "/" ? "/ws" : serverUrl.pathname;
    const websocketUrl = `${websocketScheme}//${host}:${port}${websocketPath}${serverUrl.search}`;
    const normalizedExtension = extensionId.trim();
    this.extensionRef.current = `${normalizedExtension}@${host}`;
    const sipUri = `sip:${normalizedExtension}@${host}`;
    const socket = new WebSocketInterface(websocketUrl);

    const ua = new UA({
      sockets: [socket],
      uri: sipUri,
      authorization_user: normalizedExtension,
      password: secret,
      display_name: name || normalizedExtension,
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
