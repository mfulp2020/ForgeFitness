import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ForgeFit",
    short_name: "ForgeFit",
    description: "Hardcore training log for lifting, progress, and goals.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b12",
    theme_color: "#8b5cf6",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
