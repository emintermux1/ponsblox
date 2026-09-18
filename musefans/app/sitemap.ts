import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/discover", "/feed", "/messages", "/account", "/login", "/m/vale", "/m/nia", "/m/soren", "/m/mira", "/m/cass"];
  return paths.map((path) => ({
    url: `https://musefans.vercel.app${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
