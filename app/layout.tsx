import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UNO | by Ata",
  description: "Created by Ata",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
