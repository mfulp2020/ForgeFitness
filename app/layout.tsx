import type { Metadata } from "next";
import { Bebas_Neue, Sora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const bodyFont = Sora({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Bebas_Neue({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ForgeFit",
  description: "Hardcore training log for lifting, progress, and goals.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (publishableKey) {
    return (
      <ClerkProvider>
        <html lang="en">
          <body className={`${bodyFont.variable} ${displayFont.variable} antialiased bg-background text-foreground`}>
            {children}
          </body>
        </html>
      </ClerkProvider>
    );
  }

  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable} antialiased bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
