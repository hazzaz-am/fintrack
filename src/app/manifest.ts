import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinTrack",
    short_name: "FinTrack",
    description: "A personal finance tracker for accounts, transactions, savings goals, and investments.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f2ea",
    theme_color: "#221f1c",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
