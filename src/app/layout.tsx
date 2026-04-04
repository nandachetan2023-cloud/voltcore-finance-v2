import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoltCore ERP — Power Plant Contractor HRMS",
  description: "Enterprise Resource Planning system for power plant contractors. HR, Payroll, Safety, Operations.",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500;600&family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased" style={{ fontFamily: "'Barlow', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
