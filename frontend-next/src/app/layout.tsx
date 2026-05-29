import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASPIS — Student Performance Intelligence System",
  description: "AI-Powered educational success monitoring, multi-factor correlation, and predictive analytics platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-background-primary text-text-primary min-h-screen">
        {children}
      </body>
    </html>
  );
}
