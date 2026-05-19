import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Faster — Tbilisi ride-hailing prototype",
  description:
    "Two-sided taxi prototype: passenger + driver flows, fair commission, ka/ru/en.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
