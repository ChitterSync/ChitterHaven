import type { Metadata } from "next";
import "./globals.css";
import GlobalTooltip from "./GlobalTooltip";
import ThemeController from "./ThemeController";

export const metadata: Metadata = {
  title: "ChitterHaven",
  description: "A messaging platform for ChitterSync. IN OPEN BETA.",
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
        className="antialiased"
        style={{ minHeight: "100vh" }}
      >
        {children}
        <ThemeController />
        <GlobalTooltip />
      </body>
    </html>
  );
}
