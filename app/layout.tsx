import type { Metadata } from "next";
import Script from "next/script";
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
    "UNO by Ata",
    "UNO Multiplayer",
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
    google: "0aJ_VQaPAaJmoDUS3z9VHmY5fzh9e5o9xUj8McYqrGE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <GoogleTagManager gtmId="GTM-TKWP3PRW" />
      <GoogleAnalytics gaId="G-8YS588K0R7" />
      <head>
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TKWP3PRW');`,
          }}
        />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#ffffff" />
      </head>

      <body className="antialiased">
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TKWP3PRW"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
