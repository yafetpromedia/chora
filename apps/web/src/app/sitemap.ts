import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const now = new Date();

  const publicRoutes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/demo", changeFrequency: "monthly", priority: 0.9 },
    { path: "/register", changeFrequency: "monthly", priority: 0.9 },
    { path: "/login", changeFrequency: "monthly", priority: 0.8 },
    { path: "/join", changeFrequency: "monthly", priority: 0.6 },
  ];

  return publicRoutes.map((route) => ({
    url: `${site}${route.path === "/" ? "" : route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
