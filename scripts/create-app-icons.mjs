import { copyFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const source = new URL("../icons/icon-1024.png", import.meta.url);
const appIconDir = new URL("../app-icons/AppIcon.appiconset/", import.meta.url);
const iosIconDir = new URL("../ios/App/App/Assets.xcassets/AppIcon.appiconset/", import.meta.url);

const specs = [
  { idiom: "iphone", size: "20x20", scale: "2x", pixels: 40, filename: "Icon-20@2x.png" },
  { idiom: "iphone", size: "20x20", scale: "3x", pixels: 60, filename: "Icon-20@3x.png" },
  { idiom: "iphone", size: "29x29", scale: "2x", pixels: 58, filename: "Icon-29@2x.png" },
  { idiom: "iphone", size: "29x29", scale: "3x", pixels: 87, filename: "Icon-29@3x.png" },
  { idiom: "iphone", size: "40x40", scale: "2x", pixels: 80, filename: "Icon-40@2x.png" },
  { idiom: "iphone", size: "40x40", scale: "3x", pixels: 120, filename: "Icon-40@3x.png" },
  { idiom: "iphone", size: "60x60", scale: "2x", pixels: 120, filename: "Icon-60@2x.png" },
  { idiom: "iphone", size: "60x60", scale: "3x", pixels: 180, filename: "Icon-60@3x.png" },
  { idiom: "ipad", size: "20x20", scale: "1x", pixels: 20, filename: "Icon-iPad-20.png" },
  { idiom: "ipad", size: "20x20", scale: "2x", pixels: 40, filename: "Icon-iPad-20@2x.png" },
  { idiom: "ipad", size: "29x29", scale: "1x", pixels: 29, filename: "Icon-iPad-29.png" },
  { idiom: "ipad", size: "29x29", scale: "2x", pixels: 58, filename: "Icon-iPad-29@2x.png" },
  { idiom: "ipad", size: "40x40", scale: "1x", pixels: 40, filename: "Icon-iPad-40.png" },
  { idiom: "ipad", size: "40x40", scale: "2x", pixels: 80, filename: "Icon-iPad-40@2x.png" },
  { idiom: "ipad", size: "76x76", scale: "1x", pixels: 76, filename: "Icon-iPad-76.png" },
  { idiom: "ipad", size: "76x76", scale: "2x", pixels: 152, filename: "Icon-iPad-76@2x.png" },
  { idiom: "ipad", size: "83.5x83.5", scale: "2x", pixels: 167, filename: "Icon-iPad-83.5@2x.png" },
  { idiom: "ios-marketing", size: "1024x1024", scale: "1x", pixels: 1024, filename: "Icon-AppStore-1024.png" },
];

function resize(input, output, pixels) {
  const result = spawnSync("sips", ["-z", String(pixels), String(pixels), input.pathname, "--out", output.pathname], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Could not create ${output.pathname}`);
  }
}

async function writeContents(directory) {
  const contents = {
    images: specs.map(({ idiom, size, scale, filename }) => ({ filename, idiom, scale, size })),
    info: { author: "xcode", version: 1 },
  };
  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(new URL("Contents.json", directory), `${JSON.stringify(contents, null, 2)}\n`),
  );
}

async function writeIconSetPortable(directory) {
  await mkdir(directory, { recursive: true });
  for (const spec of specs) {
    resize(source, new URL(spec.filename, directory), spec.pixels);
  }
  await writeContents(directory);
}

await writeIconSetPortable(appIconDir);
await writeIconSetPortable(iosIconDir);
await copyFile(source, new URL("AppIcon-512@2x.png", iosIconDir)).catch(() => {});
resize(source, new URL("../icons/icon-512.png", import.meta.url), 512);
resize(source, new URL("../icons/icon-192.png", import.meta.url), 192);
resize(source, new URL("../icons/apple-touch-icon.png", import.meta.url), 180);

console.log("Created web and iOS app icons from icons/icon-1024.png");
