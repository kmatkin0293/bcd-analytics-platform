import { cookies } from "next/headers";

export const THOUGHTSPOT_SESSION_COOKIE = "ts_session";

/** Minimum token lifetime we request from ThoughtSpot: 8 hours. */
export const THOUGHTSPOT_TOKEN_VALIDITY_SECONDS = 8 * 60 * 60;

export type ThoughtSpotSession = {
  username: string;
  displayName: string;
  token: string;
  /** Absolute expiry, epoch milliseconds — mirrors the ThoughtSpot token's own expiry. */
  expiresAt: number;
};

/** Reads and validates the caller's session cookie. Returns null if missing, malformed, or expired. */
export async function getThoughtSpotSession(): Promise<ThoughtSpotSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(THOUGHTSPOT_SESSION_COOKIE)?.value;
  if (!raw) return null;

  let session: ThoughtSpotSession;
  try {
    session = JSON.parse(raw);
  } catch {
    return null;
  }

  if (session.expiresAt <= Date.now()) return null;

  return session;
}

/** First token of a display name, for greetings ("Morning, Maya."). */
export function getFirstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || displayName;
}

/** Up to two uppercase initials for an avatar badge. */
export function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
