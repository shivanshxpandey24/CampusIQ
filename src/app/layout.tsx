import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusIQ · Smart Campus",
  description: "Connected operations for your campus community.",
  applicationName: "CampusIQ",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#152d4b" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
