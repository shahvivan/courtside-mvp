import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CourtSide · Pickup games in Barcelona",
  description:
    "Find a pickup game in Barcelona or organise your own: padel, beach volleyball, basketball.",
  metadataBase: new URL("https://courtside.courtsidebcn.workers.dev"),
  openGraph: {
    title: "CourtSide · Join the game",
    description:
      "Pickup padel, beach volleyball and basketball in Barcelona. Tap to grab a spot.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "CourtSide",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
