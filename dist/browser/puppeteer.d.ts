import { Browser, Page } from "puppeteer";
/**
 * Sets up and launches the browser
 */
export declare function setupBrowser(): Promise<Browser>;
/**
 * Creates a new page in the browser
 */
export declare function setupPage(browser: Browser): Promise<Page>;
/**
 * Navigates to a URL
 */
export declare function navigateTo(page: Page, url: string): Promise<void>;
