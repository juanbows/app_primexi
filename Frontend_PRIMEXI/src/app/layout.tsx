import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PRIMEXI",
    template: "%s | PRIMEXI",
  },
  description:
    "PRIMEXI es una webapp de fantasy football con foco en gameweeks, rendimiento y noticias impulsadas por IA.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#38003c",
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
