import { ImageResponse } from "next/og";

export const dynamic = "force-static";

// Maskable icons are cropped to a circle/rounded-square by the OS, so the
// glyph is kept inside the ~80% "safe zone" and the background fills edge to
// edge (https://web.dev/articles/maskable-icon).
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#221f1c",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "80%",
            height: "80%",
            alignItems: "center",
            justifyContent: "center",
            color: "#e3b64c",
            fontSize: 220,
            fontWeight: 700,
            fontFamily: "sans-serif",
          }}
        >
          F
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
