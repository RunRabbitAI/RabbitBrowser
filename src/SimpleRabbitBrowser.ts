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
 * Simple API to detect and highlight interactive elements on web pages
 */
export class SimpleRabbitBrowser {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private elements: ElementData[] = [];
  private pageContext: any = null;
  private options: {
    focusOnConsent: boolean;
    waitTime: number;
    logDetails: boolean;
    earlyReturn: boolean;
    includePageContext: boolean;
  };

  /**
   * Create a new SimpleRabbitBrowser instance
   */
  constructor(
    options: {
      focusOnConsent?: boolean;
      waitTime?: number;
      logDetails?: boolean;
      earlyReturn?: boolean;
      includePageContext?: boolean;
    } = {}
  ) {
    // Default options
    this.options = {
      focusOnConsent: options.focusOnConsent ?? false,
      waitTime: options.waitTime ?? 3000,
      logDetails: options.logDetails ?? false,
      earlyReturn: options.earlyReturn ?? true,
      includePageContext: options.includePageContext ?? true,
    };
  }

  /**
   * Navigate to a URL and detect elements
   * @param url The URL to navigate to
   * @returns Promise resolving when navigation and detection are complete
   */
  async go(url: string): Promise<void> {
    try {
      // Launch browser if not already running
      if (!this.browser) {
        this.browser = await setupBrowser();
      }

      // Create a new page if needed
      if (!this.page) {
        this.page = await setupPage(this.browser);
      }

      // Clear previous elements
      this.elements = [];
      this.pageContext = null;

      // Navigate to URL
      await navigateTo(this.page, url);

      // Initialize components
      await initializeHighlighter(this.page);
      await initializeElementDetector(this.page, {
        focusOnConsent: this.options.focusOnConsent,
      });

      // Start detecting elements
      await this.page.evaluate(() => {
        window.processedElements = new Set();
        window.highlightedElements = window.highlightedElements || [];
        window.startObservingNewElements();
      });

      // Log if enabled
      if (this.options.logDetails) {
        log("Detecting interactive elements...");
      }

      // Progressive checking for elements
      const checkIntervals = [300, 500, 700, 1000, 1500];
      let totalWaitTime = 0;

      // Check at increasing intervals
      for (const interval of checkIntervals) {
        if (totalWaitTime >= this.options.waitTime) break;

        await new Promise((resolve) => setTimeout(resolve, interval));
        totalWaitTime += interval;

        // Collect elements
        const data = await collectElementData(this.page);
        this.elements = data.elements;

        // Early return if we found elements
        if (this.options.earlyReturn && this.elements.length > 0) {
          if (this.options.logDetails) {
            log(
              `Found ${this.elements.length} elements after ${totalWaitTime}ms - returning early`
            );
          }
          break;
        }
      }

      // Final wait if needed
      if (this.elements.length === 0 && totalWaitTime < this.options.waitTime) {
        const remainingTime = this.options.waitTime - totalWaitTime;
        if (this.options.logDetails) {
          log(`Waiting additional ${remainingTime}ms for elements...`);
        }

        await new Promise((resolve) => setTimeout(resolve, remainingTime));
        const data = await collectElementData(this.page);
        this.elements = data.elements;
      }

      // Collect page context if requested
      if (this.options.includePageContext) {
        if (this.options.logDetails) {
          log("Collecting page text context for AI analysis...");
        }
        const contextData = await collectPageTextContext(this.page);
        this.pageContext = contextData.pageContext;
      }

      // Log results if enabled
      if (this.options.logDetails) {
        if (this.elements.length === 0) {
          log("WARNING: No interactive elements were detected");
        } else {
          log(`Detected ${this.elements.length} interactive elements`);
        }
      }
    } catch (error) {
      // Clean up on error
      if (this.browser) {
        try {
          await this.browser.close();
        } catch (e) {
          // Ignore errors when closing
        }
        this.browser = null;
        this.page = null;
      }

      log(`Error detecting elements: ${error}`);
      throw error;
    }
  }

  /**
   * Get detected elements
   * @returns Array of detected elements
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
   * Close the browser if it's open
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

/**
 * Global instance for simple use
 */
export const simpleRabbitBrowser = new SimpleRabbitBrowser();
