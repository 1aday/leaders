import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Profilemaker — Leader Dossiers",
  description: "Transform character schemas into beautiful, organized dossiers.",
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
