import { cp, mkdir, rm } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const out = new URL("../www/", import.meta.url);

const files = [
  ".nojekyll",
  "analytics-config.js",
  "analytics.js",
  "app.js",
  "auth-config.js",
  "auth.js",
  "index.html",
  "manifest.webmanifest",
  "pwa.js",
  "styles.css",
  "sw.js",
];

const directories = ["data", "icons"];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await Promise.all(files.map((file) => cp(new URL(file, root), new URL(file, out))));
await Promise.all(directories.map((directory) => cp(new URL(directory, root), new URL(directory, out), { recursive: true })));

console.log("Prepared native web assets in www/.");
