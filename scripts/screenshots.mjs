/**
 * Regenerates the README screenshots.
 *
 *   npm run build && npx next start --port 3100
 *   node scripts/screenshots.mjs
 *
 * Runs against demo fixtures, so the output is reproducible.
 */
import { mkdir } from "node:fs/promises";

import { chromium, devices } from "@playwright/test";

const BASE_URL = process.env.SCREENSHOT_URL ?? "http://127.0.0.1:3100";
const OUT_DIR = "screenshots";

const SHOTS = [
  {
    name: "home",
    viewport: { width: 1440, height: 960 },
    colorScheme: "light",
    path: "/",
  },
  {
    name: "dark",
    viewport: { width: 1440, height: 960 },
    colorScheme: "dark",
    path: "/?q=science",
  },
  {
    name: "search",
    viewport: { width: 1440, height: 960 },
    colorScheme: "light",
    path: "/?q=quantum",
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  for (const shot of SHOTS) {
    const context = await browser.newContext({
      viewport: shot.viewport,
      colorScheme: shot.colorScheme,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: "networkidle" });
    await page.locator("article").first().waitFor();
    // Let the card hover/entry transitions settle before capturing.
    await page.waitForTimeout(400);

    await page.screenshot({ path: `${OUT_DIR}/${shot.name}.png` });
    console.log(`captured ${OUT_DIR}/${shot.name}.png`);
    await context.close();
  }

  // Mobile view, captured through a real device profile.
  const mobile = await browser.newContext({
    ...devices["Pixel 7"],
    deviceScaleFactor: 2,
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(BASE_URL, { waitUntil: "networkidle" });
  await mobilePage.locator("article").first().waitFor();
  await mobilePage.waitForTimeout(400);
  await mobilePage.screenshot({ path: `${OUT_DIR}/mobile.png` });
  console.log(`captured ${OUT_DIR}/mobile.png`);
  await mobile.close();

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
