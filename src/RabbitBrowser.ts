import { Browser, Page } from "puppeteer";
import { ElementData } from "./types/index";
import { log } from "./utils/logger";
import { setupBrowser, setupPage, navigateTo } from "./browser/puppeteer";
import { initializeElementDetector } from "./highlighting/elementDetector";
import {
  initializeHighlighter,
  collectElementData,
  collectPageTextContext,
} from "./highlighting/highlighter";

/**
 * RabbitBrowser provides a simple API for detecting and highlighting interactive elements on web pages
 */
export class RabbitBrowser {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private initialized: boolean = false;
  private elements: ElementData[] = [];
  private pageContext: any = null;
  private currentUrl: string = "";
  private options: {
    focusOnConsent: boolean;
    logDetails: boolean;
    waitTime: number;
    minElementsRequired: number;
    earlyReturn: boolean;
    includePageContext: boolean;
  };

  /**
   * Create a new RabbitBrowser instance
   */
  constructor(
    options: {
      focusOnConsent?: boolean;
      logDetails?: boolean;
      waitTime?: number;
      minElementsRequired?: number;
      earlyReturn?: boolean;
      includePageContext?: boolean;
    } = {}
  ) {
    // Default options
    this.options = {
      focusOnConsent: options.focusOnConsent ?? false,
      logDetails: options.logDetails ?? false,
      waitTime: options.waitTime ?? 3000,
      minElementsRequired: options.minElementsRequired ?? 1,
      earlyReturn: options.earlyReturn ?? true,
      includePageContext: options.includePageContext ?? true,
    };
  }

  /**
   * Initialize the browser if it hasn't been initialized yet
   */
  private async ensureBrowserInitialized(): Promise<void> {
    if (!this.browser) {
      this.browser = await setupBrowser();
      this.initialized = true;
    }
  }

  /**
   * Navigate to a URL and initialize the element detector
   * @param url The URL to navigate to
   * @param options Optional settings for this navigation
   * @returns Promise resolving when navigation and initialization are complete
   */
  async go(url: string): Promise<void> {
    // Make sure browser is running
    await this.ensureBrowserInitialized();

    try {
      // Create a new page if needed
      if (!this.page) {
        this.page = await setupPage(this.browser!);
      }

      // Clear previous elements
      this.elements = [];
      this.pageContext = null;

      // Navigate to the URL
      await navigateTo(this.page, url);
      this.currentUrl = url;

      // Initialize the highlighter
      await initializeHighlighter(this.page);

      // Initialize the element detector
      await initializeElementDetector(this.page, {
        focusOnConsent: this.options.focusOnConsent,
      });

      // Start observing for elements
      await this.page.evaluate(() => {
        window.processedElements = new Set();
        window.highlightedElements = window.highlightedElements || [];
        window.startObservingNewElements();
      });

      // Use progressive checking with early return if elements are found
      if (this.options.logDetails) {
        log("Detecting interactive elements...");
      }

      // Check intervals in ms - first check quickly, then give more time if needed
      const checkIntervals = [300, 500, 700, 1000, 1500];
      let totalWaitTime = 0;
      let elementData: { elements: ElementData[] } = { elements: [] };

      // Check for elements at increasing intervals
      for (const interval of checkIntervals) {
        if (totalWaitTime >= this.options.waitTime) break;

        // Wait for the current interval
        await new Promise((resolve) => setTimeout(resolve, interval));
        totalWaitTime += interval;

        // Collect current elements
        elementData = await collectElementData(this.page);

        // Store elements
        this.elements = elementData.elements;

        // Early return if we found enough elements
        if (
          this.options.earlyReturn &&
          this.elements.length >= this.options.minElementsRequired
        ) {
          if (this.options.logDetails) {
            log(
              `Found ${this.elements.length} elements after ${totalWaitTime}ms - returning early`
            );
          }
          break;
        }
      }

      // If we haven't found enough elements yet and still have time, do one final wait
      if (
        this.elements.length < this.options.minElementsRequired &&
        totalWaitTime < this.options.waitTime
      ) {
        const remainingTime = this.options.waitTime - totalWaitTime;
        if (remainingTime > 0) {
          if (this.options.logDetails) {
            log(`Waiting additional ${remainingTime}ms for more elements...`);
          }
          await new Promise((resolve) => setTimeout(resolve, remainingTime));

          // Final collection
          elementData = await collectElementData(this.page);
          this.elements = elementData.elements;
        }
      }

      // Collect page context if requested
      if (this.options.includePageContext) {
        if (this.options.logDetails) {
          log("Collecting page text context for AI analysis...");
        }
        const contextData = await collectPageTextContext(this.page);
        this.pageContext = contextData.pageContext;
      }

      // Log completion
      if (this.options.logDetails) {
        if (this.elements.length === 0) {
          log("WARNING: No interactive elements were detected");
        } else {
          log(`Detected ${this.elements.length} interactive elements`);
        }
      }
    } catch (error) {
      log(`Error during navigation: ${error}`);
      throw error;
    }
  }

  /**
   * Get all detected elements
   * @returns Array of detected elements with their properties
   */
  getElements(): ElementData[] {
    return this.elements;
  }

  /**
   * Get page context information including text content
   * @returns Page context object with text content
   */
  getPageContext(): any {
    return this.pageContext;
  }

  /**
   * Get complete data with both elements and page context
   * @returns Object containing elements and page context
   */
  getCompleteData(): { elements: ElementData[]; pageContext: any } {
    return {
      elements: this.elements,
      pageContext: this.pageContext,
    };
  }

  /**
   * Get element count
   * @returns Number of detected elements
   */
  getElementCount(): number {
    return this.elements.length;
  }

  /**
   * Get the current URL
   * @returns The current URL
   */
  getCurrentUrl(): string {
    return this.currentUrl;
  }

  /**
   * Get elements that match certain criteria
   * @param filter Function that returns true for elements to include
   * @returns Filtered elements
   */
  filterElements(filter: (element: ElementData) => boolean): ElementData[] {
    return this.elements.filter(filter);
  }

  /**
   * Find elements by text content
   * @param text Text to search for
   * @returns Elements that contain the specified text
   */
  findElementsByText(text: string): ElementData[] {
    return this.elements.filter((element) =>
      element.text.toLowerCase().includes(text.toLowerCase())
    );
  }

  /**
   * Find elements by tag name
   * @param tagName Tag name to search for
   * @returns Elements with the specified tag name
   */
  findElementsByTagName(tagName: string): ElementData[] {
    return this.elements.filter(
      (element) => element.tagName.toLowerCase() === tagName.toLowerCase()
    );
  }

  /**
   * Takes a screenshot of the current page
   * @param path File path to save the screenshot
   */
  async takeScreenshot(path: string): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not initialized. Call go() first.");
    }

    await this.page.screenshot({ path });
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.initialized = false;
    }
  }

  /**
   * Check if the browser is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export a pre-configured instance for quick use
export const rabbitBrowser = new RabbitBrowser();
