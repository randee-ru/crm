import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

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
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
