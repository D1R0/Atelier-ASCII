import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Atelier ASCII: ASCII art that looks drawn by hand",
  description:
    "Turn any image, video or webcam into ASCII art. Shape-matched characters, text portraits, hand editing, looping animations, and exports for GitHub, Discord, terminals, GIF and video. Runs entirely in your browser.",
  openGraph: {
    title: "Atelier ASCII",
    description: "ASCII art that looks drawn by hand. Images, video and webcam, right in your browser.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website"
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#D5D6D0" },
    { media: "(prefers-color-scheme: dark)", color: "#18191C" }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&family=JetBrains+Mono:wght@400;700&display=swap"
        />
      </head>
      {/* Extensions like ColorZilla add attributes to <body> before React hydrates. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
