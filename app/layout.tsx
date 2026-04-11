import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GATEKEEPER - AI Call Screening",
  description: "Your personal AI assistant for intelligent call screening",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
