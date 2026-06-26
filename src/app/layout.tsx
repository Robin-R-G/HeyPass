import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ToastProvider } from "@/components/toast";
import { PWAInstallPrompt } from "@/components/pwa-install";
import { AuthInterceptor } from "@/components/auth-interceptor";
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
    default: "HeyPass | Event Operations Platform",
    template: "%s | HeyPass",
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
  authors: [{ name: "HeyPass" }],
  creator: "HeyPass",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "HeyPass",
    title: "HeyPass | Event Operations Platform",
    description:
      "White-label event management platform with complete branding control.",
  },
  twitter: {
    card: "summary_large_image",
    title: "HeyPass | Event Operations Platform",
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
  maximumScale: 5,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            if (!('serviceWorker' in navigator)) return;
            var v = localStorage.getItem('sw_version');
            if (v !== '3') {
              localStorage.setItem('sw_version', '3');
              navigator.serviceWorker.getRegistrations().then(function(regs) {
                regs.forEach(function(r) { r.unregister(); });
                return caches.keys();
              }).then(function(names) {
                if (names) names.forEach(function(n) { caches.delete(n); });
                window.location.reload();
              }).catch(function() { window.location.reload(); });
            }
          })();
        `}} />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-hp-bg text-hp-text font-sans`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <ToastProvider>
            <AuthInterceptor />
            <div className="hp-bg-gradient" />
            <div className="min-h-screen">{children}</div>
            <PWAInstallPrompt />
            <PWARegister />
            <Analytics />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
