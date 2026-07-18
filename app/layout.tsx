import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Scenework — Book to Unreal",
  description:
    "Author novel chapters as approved game scenes, dialogue choices, YAML, and normalized JSON.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
