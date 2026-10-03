import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bible Challenge Tracker",
    short_name: "Bible Challenge",
    description: "Read Scripture at your pace and follow a daily reading plan.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#f7f7f1",
    theme_color: "#315b49",
    icons: [
      { src: "/icon.png", sizes: "1254x1254", type: "image/png", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    categories: ["education", "books"],
  };
}