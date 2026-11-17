import type { Metadata } from "next";
import { Archivo, Public_Sans } from "next/font/google";
import "./globals.css";

// Archivo (with its width axis) for headings and numbers, Public Sans for reading text.
const display = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["wdth"],
});

const body = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CourtSide · Pickup games in Barcelona",
  description:
    "The home for niche sports games in Barcelona: beach volley, beach padel and street basketball. Find a game or organise your own.",
  metadataBase: new URL("https://courtside.courtsidebcn.workers.dev"),
  openGraph: {
    title: "CourtSide · Join the game",
    description:
      "Beach volley, beach padel and street basketball games in Barcelona. Tap to grab a spot.",
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
        className={`${display.variable} ${body.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
