import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

interface TokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET must be set to sign authentication tokens.");
  }
  return secret;
}

function encodeSegment(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function createAuthToken(userId: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = encodeSegment({ alg: "HS256", typ: "JWT" });
  const payload = encodeSegment({
    sub: userId,
    iat: issuedAt,
    exp: issuedAt + TOKEN_LIFETIME_SECONDS,
  });
  const unsignedToken = `${header}.${payload}`;
  const signature = createHmac("sha256", getSigningSecret())
    .update(unsignedToken)
    .digest("base64url");

  return `${unsignedToken}.${signature}`;
}

export function verifyAuthToken(token: string): string | null {
  const [header, payload, signature, extra] = token.split(".");
  if (!header || !payload || !signature || extra !== undefined) return null;

  try {
    const decodedHeader: unknown = JSON.parse(
      Buffer.from(header, "base64url").toString("utf8"),
    );
    if (
      typeof decodedHeader !== "object" ||
      decodedHeader === null ||
      !("alg" in decodedHeader) ||
      decodedHeader.alg !== "HS256"
    ) {
      return null;
    }

    const unsignedToken = `${header}.${payload}`;
    const expectedSignature = createHmac("sha256", getSigningSecret())
      .update(unsignedToken)
      .digest();
    const providedSignature = Buffer.from(signature, "base64url");
    if (
      expectedSignature.length !== providedSignature.length ||
      !timingSafeEqual(expectedSignature, providedSignature)
    ) {
      return null;
    }

    const decodedPayload: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (
      typeof decodedPayload !== "object" ||
      decodedPayload === null ||
      !("sub" in decodedPayload) ||
      typeof decodedPayload.sub !== "string" ||
      !("iat" in decodedPayload) ||
      typeof decodedPayload.iat !== "number" ||
      !("exp" in decodedPayload) ||
      typeof decodedPayload.exp !== "number"
    ) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (
      decodedPayload.exp <= now ||
      decodedPayload.iat > now ||
      decodedPayload.exp - decodedPayload.iat > TOKEN_LIFETIME_SECONDS
    ) {
      return null;
    }

    return decodedPayload.sub;
  } catch (error) {
    if (error instanceof Error && error.message.includes("AUTH_SECRET")) {
      throw error;
    }
    return null;
  }
}
