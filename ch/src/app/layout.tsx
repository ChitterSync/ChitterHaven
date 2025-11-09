import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GlobalTooltip from "./GlobalTooltip";
import ThemeController from "./ThemeController";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChitterHaven",
  description: "A messaging platform by ChitterSync. IN OPEN BETA.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ minHeight: "100vh" }}
      >
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css"
        />
        <Script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/common.min.js" strategy="afterInteractive" />
        {children}
        <ThemeController />
        <GlobalTooltip />
      </body>
    </html>
  );
}
