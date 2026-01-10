import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forge Fitness",
  description: "Hardcore training log for lifting, progress, and goals.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
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
