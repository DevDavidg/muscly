import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "INICIO — DavidG Library",
  description: "INICIO · DavidG Library · 16 tracks",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
