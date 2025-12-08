import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { GoogleTagManager, GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://uno-ebon.vercel.app"),
  title: {
    default: "UNO Online | Multiplayer Card Game",
    template: "%s | UNO Online",
  },
  description:
    "Play UNO Online with friends or against the computer. A fast-paced, multiplayer card game experience accessible directly in your browser. No download required.",
  keywords: [
    "UNO",
    "UNO Online",
    "Multiplayer Card Game",
    "Play UNO with friends",
    "Card Game",
    "Browser Game",
    "Free UNO Game",
  ],
  authors: [{ name: "Ata Khatri" }],
  openGraph: {
    title: "UNO Online | Play with Friends",
    description:
      "Join the fun! Play UNO multiplayer instantly in your browser.",
    url: "https://uno-ebon.vercel.app/",
    siteName: "UNO Online",
    images: [
      {
        url: "/main_bg.png",
        width: 1200,
        height: 630,
        alt: "UNO Online Game Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "YOUR_GOOGLE_SEARCH_CONSOLE_VERIFICATION_CODE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <GoogleTagManager gtmId="GTM-XXXXXXX" />
      <GoogleAnalytics gaId="G-XXXXXXXXXX" />

      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
