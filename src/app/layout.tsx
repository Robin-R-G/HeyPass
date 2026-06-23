import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PWAInstallPrompt } from "@/components/pwa-install";
import "./globals.css";
import { PWARegister } from "./pwa-register";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Heypass | Event Operations Platform",
    template: "%s | Heypass",
  },
  description:
    "White-label event management platform. Create, manage, and scale your events with complete branding control.",
  keywords: [
    "event management",
    "registration",
    "ticketing",
    "check-in",
    "certificates",
    "white label",
    "branding",
  ],
  authors: [{ name: "Heypass" }],
  creator: "Heypass",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Heypass",
    title: "Heypass | Event Operations Platform",
    description:
      "White-label event management platform with complete branding control.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Heypass | Event Operations Platform",
    description:
      "White-label event management platform with complete branding control.",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HeyPass",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider>
          <div className="hp-bg-gradient" />
          <div className="min-h-screen">{children}</div>
          <PWAInstallPrompt />
          <PWARegister />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
