import { copyFile, mkdir } from "node:fs/promises";

const assetsDirectory = ".open-next/assets";

await mkdir(assetsDirectory, { recursive: true });
await copyFile(".next/server/app/index.html", `${assetsDirectory}/index.html`);
await copyFile(".next/server/app/_not-found.html", `${assetsDirectory}/404.html`);
await copyFile("workers/static-site-worker.mjs", ".open-next/worker.js");

console.log("Prepared the static Sites worker and prerendered HTML.");
