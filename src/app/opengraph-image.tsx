import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

// The preview shown when a ledobiz.com link is shared on WhatsApp, LinkedIn, X or Slack.
export const alt = "Ledobiz: software, web and mobile app development in Lagos, Nigeria";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const assets = join(process.cwd(), "src/lib/server/pdf/assets");

export default async function Image() {
  const [logo, bold, regular] = await Promise.all([
    readFile(join(process.cwd(), "public/brand/ledobiz-logo-email.png")),
    readFile(join(assets, "PetrovSans-Bold.ttf")),
    readFile(join(assets, "GoogleSans-Regular.ttf")),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#000033", padding: "72px 80px", color: "#ffffff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse needs a plain <img>. */}
        <img src={`data:image/png;base64,${logo.toString("base64")}`} width={251} height={68} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontFamily: "Petrov Sans", fontSize: 68, lineHeight: 1.08, letterSpacing: -1 }}>Custom websites, mobile apps and desktop software</div>
          <div style={{ fontFamily: "Google Sans", fontSize: 30, color: "#c9cee0" }}>Software development company in {site.location} · {site.url.replace(/^https?:\/\//, "")}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 62, height: 8, background: "#35a9ce" }} />
          <div style={{ flex: 12, height: 8, background: "#33cc99" }} />
          <div style={{ flex: 12, height: 8, background: "#ff9900" }} />
          <div style={{ flex: 14, height: 8, background: "#ffffff" }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Petrov Sans", data: bold, style: "normal", weight: 700 },
        { name: "Google Sans", data: regular, style: "normal", weight: 400 },
      ],
    },
  );
}
