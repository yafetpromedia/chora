import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/demo", "/join"],
        disallow: [
          "/admin",
          "/teacher",
          "/student",
          "/parent",
          "/platform",
          "/print",
          "/api",
          "/backend",
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
