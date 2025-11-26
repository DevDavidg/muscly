import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muscly",
  description: "Local music player",
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
