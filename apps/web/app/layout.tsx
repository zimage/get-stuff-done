import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "../lib/AuthProvider";
import { TRPCProvider } from "../lib/TRPCProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Get Stuff Done",
  description: "A Getting Things Done productivity app",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>
          <AuthProvider>{children}</AuthProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
