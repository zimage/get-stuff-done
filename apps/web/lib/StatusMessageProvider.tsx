"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface StatusMessageContextValue {
  message: string | null;
  setMessage: (message: string, durationMs?: number) => void;
  clearMessage: () => void;
}

const StatusMessageContext = createContext<StatusMessageContextValue | null>(null);

export function StatusMessageProvider({ children }: { children: ReactNode }) {
  const [message, setMessageState] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearMessage = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessageState(null);
  }, []);

  const setMessage = useCallback((next: string, durationMs = 4000) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessageState(next);
    timeoutRef.current = setTimeout(() => setMessageState(null), durationMs);
  }, []);

  return (
    <StatusMessageContext.Provider value={{ message, setMessage, clearMessage }}>
      {children}
    </StatusMessageContext.Provider>
  );
}

export function useStatusMessage(): StatusMessageContextValue {
  const ctx = useContext(StatusMessageContext);
  if (!ctx) throw new Error("useStatusMessage must be used within StatusMessageProvider");
  return ctx;
}
