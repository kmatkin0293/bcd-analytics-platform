"use client";

import {
  AuthType,
  type EmbedConfig,
  startAutoMCPFrameRenderer,
} from "@thoughtspot/visual-embed-sdk";
import { useInit } from "@thoughtspot/visual-embed-sdk/react";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { THOUGHTSPOT_CUSTOM_CSS_URL } from "@/config";
import { env } from "@/env";
import type { ThoughtSpotSession } from "@/lib/thoughtspot-session";

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; username: string };

type ThoughtSpotAuthContextValue = {
  auth: AuthState;
  refresh: () => Promise<void>;
};

const ThoughtSpotAuthContext =
  createContext<ThoughtSpotAuthContextValue | null>(null);

/** Pages that work with no ThoughtSpot session — never auto-redirected away from. */
const PUBLIC_PATHS = new Set(["/", "/login", "/config"]);

async function fetchSession(): Promise<ThoughtSpotSession | null> {
  const response = await fetch("/api/auth/token", { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as ThoughtSpotSession;
}

/** Mounts only once a session exists — calls the SDK's init hook exactly once per session. */
function ThoughtSpotInit({
  username,
  onSessionDead,
}: {
  username: string;
  onSessionDead: () => void;
}) {
  const getAuthToken = useCallback(async () => {
    const session = await fetchSession();
    if (!session) {
      // The SDK calls this on every embed render/refresh, so a session
      // that died mid-visit (not just on initial page load) is caught
      // here too — flip the shared auth state so the redirect effect
      // in the provider below fires.
      onSessionDead();
      throw new Error("ThoughtSpot session expired");
    }
    return session.token;
  }, [onSessionDead]);

  const config = useMemo<EmbedConfig>(
    () => ({
      thoughtSpotHost: env.NEXT_PUBLIC_THOUGHTSPOT_HOST,
      authType: AuthType.TrustedAuthTokenCookieless,
      username,
      getAuthToken,
      customizations: {
        style: {
          customCSSUrl: THOUGHTSPOT_CUSTOM_CSS_URL,
          customCSS: {
            rules_UNSTABLE: {
              ".pinboard-header-module__pinboardHeaderContainer": {
                display: "none !important",
              },
              ".pinboard-header-module__pinboardHeader": {
                display: "none !important",
              },
              ".pinboard-header-module__tabAndFilterWrapper": {
                display: "none !important",
              },
            },
          },
        },
      },
    }),
    [username, getAuthToken],
  );

  useInit(config);

  // Watches the DOM for embedded-visualization iframes (rendered by Vera's
  // chat) and swaps them in-place for fully authenticated embeds.
  useEffect(() => {
    const observer = startAutoMCPFrameRenderer({
      frameParams: { height: "600px" },
    });
    return () => observer.disconnect();
  }, []);

  return null;
}

/**
 * Wraps the whole app: tracks whether the visitor has an active ThoughtSpot
 * session (via the `/api/auth/token` cookie) and, once one exists, initializes
 * the Visual Embed SDK so every page can render embeds without re-initializing.
 */
export function ThoughtSpotAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const pathname = usePathname();
  const router = useRouter();

  const refresh = useCallback(async () => {
    const session = await fetchSession();
    setAuth(
      session
        ? { status: "authenticated", username: session.username }
        : { status: "unauthenticated" },
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // A dead/expired session on a page that needs one (anything embedding a
  // liveboard or calling Vera) would otherwise just show stuck-loading
  // embeds with no explanation — send the visitor straight back to sign-in
  // instead. Skips pages that work with no session at all.
  useEffect(() => {
    if (auth.status === "unauthenticated" && !PUBLIC_PATHS.has(pathname)) {
      router.replace("/login");
    }
  }, [auth.status, pathname, router]);

  const value = useMemo(() => ({ auth, refresh }), [auth, refresh]);

  return (
    <ThoughtSpotAuthContext.Provider value={value}>
      {auth.status === "authenticated" ? (
        <ThoughtSpotInit
          username={auth.username}
          onSessionDead={() => setAuth({ status: "unauthenticated" })}
        />
      ) : null}
      {children}
    </ThoughtSpotAuthContext.Provider>
  );
}

export function useThoughtSpotAuth() {
  const ctx = useContext(ThoughtSpotAuthContext);
  if (!ctx) {
    throw new Error(
      "useThoughtSpotAuth must be used within a ThoughtSpotAuthProvider",
    );
  }
  return ctx;
}
