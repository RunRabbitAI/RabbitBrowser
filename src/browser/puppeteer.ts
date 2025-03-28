import puppeteer, { Browser, Page } from "puppeteer";
import { log } from "../utils/logger";

/**
 * Sets up and launches the browser
 */
export async function setupBrowser(): Promise<Browser> {
  log("Launching browser...");
  return await puppeteer.launch({
    headless: false,
    defaultViewport: null, // Use window size instead of viewport
    args: ["--start-maximized", "--disable-web-security"], // Start with maximized window and disable CORS for iframes
  });
}

/**
 * Creates a new page in the browser
 */
export async function setupPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();

  // Intercept console messages from browser for CLI logging
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[HIGHLIGHT]")) {
      // This is a message specifically for CLI logging
      log(text.replace("[HIGHLIGHT] ", ""));
    }
  });

  // Set the window size to fit most screens
  await page.setViewport({
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
  });

  return page;
}

/**
 * Navigates to a URL
 */
export async function navigateTo(page: Page, url: string): Promise<void> {
  log(`Navigating to ${url}...`);
  await page.goto(url, {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  log("Page loaded, initializing highlighter...");
}
