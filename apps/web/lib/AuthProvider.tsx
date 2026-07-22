"use client";

import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from "@react-oauth/google";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AppShell } from "../components/AppShell";
import { authTokenStore } from "./authTokenStore";
import { trpc } from "./trpc";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  familyId: string | null;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refreshMutation = trpc.auth.refresh.useMutation();
  const loginMutation = trpc.auth.loginWithGoogle.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();

  useEffect(() => {
    refreshMutation.mutate(
      {},
      {
        onSuccess: (data) => {
          authTokenStore.current = data.accessToken;
          setUser(data.user);
          setStatus("authenticated");
        },
        onError: () => {
          setStatus("unauthenticated");
        },
      },
    );
    // Runs once on mount to silently resume a session from the httpOnly cookie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleSuccess = useCallback(
    (credentialResponse: CredentialResponse) => {
      if (!credentialResponse.credential) return;
      loginMutation.mutate(
        { idToken: credentialResponse.credential },
        {
          onSuccess: (data) => {
            authTokenStore.current = data.accessToken;
            setUser(data.user);
            setStatus("authenticated");
          },
        },
      );
    },
    [loginMutation],
  );

  const logout = useCallback(() => {
    logoutMutation.mutate(
      {},
      {
        onSettled: () => {
          authTokenStore.current = null;
          setUser(null);
          setStatus("unauthenticated");
        },
      },
    );
  }, [logoutMutation]);

  if (status === "loading") {
    return (
      <div className="center-screen">
        <p>Loading…</p>
      </div>
    );
  }

  if (status === "unauthenticated" || !user) {
    return (
      <div className="center-screen">
        <h1>Get Stuff Done</h1>
        <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => console.error("Google login failed")} />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, logout }}>
      <AppShell>{children}</AppShell>
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthGate>{children}</AuthGate>
    </GoogleOAuthProvider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
