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
  title: "Courtside — Barcelona games, players and crowds",
  description:
    "An organiser led pilot for local sports events, player signups and spectator discovery in Barcelona.",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "Courtside — Bring the game. Find your people.",
    description:
      "Play, watch and organise local sport in Barcelona. Private pilot.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Courtside",
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
