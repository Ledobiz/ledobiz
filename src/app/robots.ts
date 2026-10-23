import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // The team area isn't listed here on purpose: robots.txt is public, so naming it would advertise it.
    // Its pages carry their own noindex tag instead (see the dashboard and login page metadata).
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/pay"] },
    sitemap: new URL("/sitemap.xml", site.url).toString(),
  };
}
