import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { site } from "@/lib/site";
import "./globals.css";

const googleSans = localFont({
  variable: "--font-google-sans",
  display: "swap",
  src: [
    { path: "./fonts/GoogleSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/GoogleSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/GoogleSans-Bold.woff2", weight: "700", style: "normal" },
  ],
});

const petrovSans = localFont({
  variable: "--font-petrov-sans",
  display: "swap",
  src: [
    { path: "./fonts/PetrovSans-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/PetrovSans-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/PetrovSans-ExtraBold.woff2", weight: "800", style: "normal" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.seoTitle,
    template: "%s · Ledobiz",
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.legalName, url: site.url }],
  creator: site.legalName,
  publisher: site.legalName,
  category: "technology",
  formatDetection: { telephone: false },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_NG",
    title: site.seoTitle,
    description: site.description,
  },
  twitter: { card: "summary_large_image", title: site.seoTitle, description: site.description },
  // Set GOOGLE_SITE_VERIFICATION to the code from Google Search Console's "HTML tag" method.
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  themeColor: "#000033",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${googleSans.variable} ${petrovSans.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
