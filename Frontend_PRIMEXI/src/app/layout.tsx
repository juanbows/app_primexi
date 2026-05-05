import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: "PRIMEXI",
  title: {
    default: "PRIMEXI",
    template: "%s | PRIMEXI",
  },
  description:
    "PRIMEXI es una webapp de fantasy football con foco en gameweeks, rendimiento y noticias impulsadas por IA.",
  manifest: "/manifest.json?v=2",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/icon-32.png?v=2", type: "image/png", sizes: "32x32" },
      {
        url: "/android-chrome-192x192.png?v=2",
        type: "image/png",
        sizes: "192x192",
      },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=2", type: "image/png", sizes: "180x180" },
    ],
  },
  other: {
    "msapplication-TileColor": "#120014",
    "msapplication-TileImage": "/mstile-150x150.png?v=2",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PRIMEXI",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#120014",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
