import {
  ApiException,
  AuthenticationApi,
  createBasicConfig,
  UsersApi,
} from "@thoughtspot/rest-api-sdk";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { THOUGHTSPOT_DEMO_USERNAME } from "@/config";
import { env } from "@/env";
import {
  THOUGHTSPOT_SESSION_COOKIE,
  THOUGHTSPOT_TOKEN_VALIDITY_SECONDS,
  type ThoughtSpotSession,
} from "@/lib/thoughtspot-session";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // The login form's username/password fields are decorative demo
  // placeholders (see THOUGHTSPOT_DEMO_USERNAME in src/config.ts) — we only
  // check that *something* was submitted so the form's own validation UX
  // still makes sense, then always authenticate against the one real
  // ThoughtSpot user behind the scenes, regardless of what was typed.
  const submitted =
    typeof (body as { username?: unknown } | null)?.username === "string"
      ? (body as { username: string }).username.trim()
      : "";

  if (!submitted) {
    return NextResponse.json(
      { error: "username is required" },
      { status: 400 },
    );
  }

  const username = THOUGHTSPOT_DEMO_USERNAME;

  const authApi = new AuthenticationApi(
    createBasicConfig(env.NEXT_PUBLIC_THOUGHTSPOT_HOST),
  );

  try {
    const token = await authApi.getFullAccessToken({
      username,
      secret_key: env.THOUGHTSPOT_SECRET_KEY,
      org_id: env.THOUGHTSPOT_ORG_ID,
      validity_time_in_sec: THOUGHTSPOT_TOKEN_VALIDITY_SECONDS,
    });

    // Best-effort: look up the user's display name (first + last name) so
    // the UI can greet them by name instead of their login username. Never
    // fail login over this.
    let displayName = username;
    try {
      const usersApi = new UsersApi(
        createBasicConfig(env.NEXT_PUBLIC_THOUGHTSPOT_HOST, {
          additionalHeaders: { Authorization: `Bearer ${token.token}` },
        }),
      );
      const users = await usersApi.searchUsers({ user_identifier: username });
      displayName = users[0]?.display_name || username;
    } catch (error) {
      console.error("Failed to fetch ThoughtSpot user display name", error);
    }

    const session: ThoughtSpotSession = {
      username,
      displayName,
      token: token.token,
      expiresAt: token.expiration_time_in_millis,
    };

    const cookieStore = await cookies();
    cookieStore.set(THOUGHTSPOT_SESSION_COOKIE, JSON.stringify(session), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)),
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to generate ThoughtSpot auth token", error);
    const status = error instanceof ApiException ? 502 : 500;
    return NextResponse.json(
      { error: "Failed to authenticate with ThoughtSpot" },
      { status },
    );
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(THOUGHTSPOT_SESSION_COOKIE)?.value;

  if (!raw) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let session: ThoughtSpotSession;
  try {
    session = JSON.parse(raw);
  } catch {
    cookieStore.delete(THOUGHTSPOT_SESSION_COOKIE);
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  if (session.expiresAt <= Date.now()) {
    cookieStore.delete(THOUGHTSPOT_SESSION_COOKIE);
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  return NextResponse.json(session);
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(THOUGHTSPOT_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
