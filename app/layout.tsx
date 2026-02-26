import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vol Memes — Solana Meme Coin Tracker",
  description: "Real-time Solana meme coin tracker showing bullish momentum and volume pressure. No FUD.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
