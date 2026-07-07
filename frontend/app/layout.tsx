import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "CRM Kit",
    template: "%s · CRM Kit",
  },
  description:
    "CRM Kit - модульная CRM/ERP-платформа с плотным корпоративным интерфейсом для сервисного бизнеса.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
