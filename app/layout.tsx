
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GarmentAI Inspector | Quality Control",
  description:
    "AI-assisted garment quality inspection and human review management system.",
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
