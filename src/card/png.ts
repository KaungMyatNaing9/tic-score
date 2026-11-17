import { existsSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/macos/Inter-Regular.ttf",
  "/usr/share/fonts/truetype/macos/Inter-Medium.ttf",
  "/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf",
  "/usr/share/fonts/truetype/macos/Inter-Bold.ttf",
  "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Regular.ttf",
  "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Medium.ttf",
  "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Bold.ttf",
  "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf",
  "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
];

export function findFonts(env: NodeJS.ProcessEnv = process.env): string[] {
  const extra = [env.TIC_SCORE_FONT, env.TIC_SCORE_FONT_DIR].filter((value): value is string =>
    Boolean(value),
  );
  const files = [...extra, ...FONT_CANDIDATES].filter((file) => existsSync(file));
  return [...new Set(files)];
}

/** Rasterize the share-card SVG. Looks for Inter, JetBrains Mono, and Noto Serif on disk. */
export function renderPng(svg: string, env: NodeJS.ProcessEnv = process.env): Buffer {
  const fontFiles = findFonts(env);
  if (fontFiles.length === 0) {
    throw new Error(
      "No fonts found for the PNG card. Install Inter or DejaVu, or set TIC_SCORE_FONT to a .ttf file. The SVG export does not need a font file.",
    );
  }
  const renderer = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    font: {
      fontFiles,
      loadSystemFonts: false,
      defaultFontFamily: "Inter",
    },
  });
  return Buffer.from(renderer.render().asPng());
}
