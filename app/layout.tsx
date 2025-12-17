import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 1. Define the base URL for all relative links (images, etc.)
export const metadata: Metadata = {
  metadataBase: new URL("https://uno-ebon.vercel.app"),
  title: {
    default: "Play UNO Online | Free Multiplayer Card Game",
    template: "%s | UNO Online",
  },
  description:
    "Play the classic UNO card game online for free. Enjoy multiplayer matches with friends or play solo against the computer. No download required.",
  keywords: [
    "UNO",
    "UNO online",
    "card game",
    "multiplayer game",
    "play uno with friends",
    "free online games",
    "classic card game",
  ],
  authors: [{ name: "UNO Ebon Team" }],
  creator: "UNO Ebon",
  publisher: "UNO Ebon",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // 2. Open Graph for Social Media (Facebook, Discord, LinkedIn, etc.)
  openGraph: {
    title: "Play UNO Online - Free Multiplayer Card Game",
    description:
      "Join the fun! Play UNO online with friends or solo. The classic card game is now available instantly in your browser.",
    url: "https://uno-ebon.vercel.app",
    siteName: "UNO Online",
    images: [
      {
        url: "/main_bg.png", // Uses your existing background as the preview image
        width: 1200,
        height: 630,
        alt: "UNO Online Game Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  // 3. Twitter Card data
  twitter: {
    card: "summary_large_image",
    title: "Play UNO Online",
    description: "Free multiplayer UNO card game. Play with friends instantly.",
    images: ["/main_bg.png"],
  },
  // 4. Robot instructions
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
    google: "0aJ_VQaPAaJmoDUS3z9VHmY5fzh9e5o9xUj8McYqrGE",
  },
};

// 5. Viewport settings for accessibility and mobile responsiveness
export const viewport: Viewport = {
  themeColor: "#C80000", // UNO Red
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
