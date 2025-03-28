import { Browser, Page, CDPSession } from "puppeteer";
import puppeteer from "puppeteer";
import { ElementData, HighlightedTextBlock, Options } from "./types";
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
  private cdpClient: any = null;
  private cdpSession: CDPSession | null = null;
  private isCDP: boolean = false;
  private initialized: boolean = false;
  private elements: ElementData[] = [];
  private textBlocks: any[] = [];
  private pageContext: any = null;
  private currentUrl: string = "";
  private options: Options = {
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
    highlightAllText: true,
    focusOnConsent: false,
    logDetails: false,
    waitTime: 3000,
    minElementsRequired: 1,
    earlyReturn: true,
    includePageContext: true,
    includeFormInputs: true,
    includeTextBlocks: true,
    preserveBrowserViewport: false,
  };

  /**
   * Create a new RabbitBrowser instance
   */
  constructor(options: Partial<Options> = {}) {
    this.options = { ...this.options, ...options };
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
   * Initialize browser and page
   */
  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: this.options.headless ? ("new" as any) : false,
      defaultViewport: this.options.defaultViewport,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    this.page = await this.browser.newPage();
    window.highlightedElements = window.highlightedElements || [];
    window.highlightedTextBlocks = window.highlightedTextBlocks || [];
  }

  /**
   * Connect to an existing Chrome instance via CDP
   * @param options CDP connection options
   */
  async connectCDP(
    options: { browserWSEndpoint?: string; browserURL?: string } = {}
  ): Promise<void> {
    this.isCDP = true;

    if (!options.browserWSEndpoint && !options.browserURL) {
      // Default to connecting to Chrome on standard debugging port
      options.browserURL = "http://127.0.0.1:9222";
    }

    // Connect to the browser
    this.browser = await puppeteer.connect(options);

    // Get the default page or create a new one
    const pages = await this.browser.pages();
    this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();

    // Create a CDP session for direct protocol access
    this.cdpSession = await this.page.target().createCDPSession();

    // If preserving viewport, get the actual browser viewport size
    if (this.options.preserveBrowserViewport) {
      try {
        // Get the window size using CDP
        const { windowId } = await this.cdpSession.send(
          "Browser.getWindowForTarget"
        );
        const { bounds } = await this.cdpSession.send(
          "Browser.getWindowBounds",
          { windowId }
        );

        // Set the viewport to match the window size
        if (bounds.width && bounds.height) {
          await this.page.setViewport({
            width: bounds.width,
            height: bounds.height - 100, // Account for browser chrome/UI
          });
          console.log(
            `Using browser window size: ${bounds.width}x${bounds.height}`
          );
        }
      } catch (error) {
        console.warn(
          "Unable to get browser window size, using default viewport"
        );
      }
    }

    console.log("Connected to Chrome via CDP");
  }

  /**
   * Execute JavaScript in the page context via CDP
   * @param script JavaScript code to execute
   * @returns Result of the script execution
   */
  async evaluateWithCDP(script: string): Promise<any> {
    if (!this.cdpSession) {
      throw new Error("CDP session not initialized");
    }

    const result = await this.cdpSession.send("Runtime.evaluate", {
      expression: script,
      returnByValue: true,
      awaitPromise: true,
    });

    if (result.exceptionDetails) {
      throw new Error(
        `Script evaluation failed: ${result.exceptionDetails.text}`
      );
    }

    return result.result.value;
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
      this.textBlocks = [];
      this.pageContext = null;

      // Navigate to the URL
      await navigateTo(this.page, url);
      this.currentUrl = url;

      // Initialize the highlighter
      await initializeHighlighter(this.page);

      // Initialize the element detector
      await initializeElementDetector(this.page, {
        focusOnConsent: this.options.focusOnConsent,
        includeFormInputs: this.options.includeFormInputs,
        highlightAllText: this.options.highlightAllText,
      });

      // Start observing for elements
      await this.page.evaluate(() => {
        window.processedElements = new Set();
        window.processedTextBlocks = new Set();
        window.highlightedElements = window.highlightedElements || [];
        window.highlightedTextBlocks = window.highlightedTextBlocks || [];
        window.startObservingNewElements();
      });

      // Use progressive checking with early return if elements are found
      if (this.options.logDetails) {
        log("Detecting interactive elements and text blocks...");
      }

      // Check intervals in ms - first check quickly, then give more time if needed
      const checkIntervals = [300, 500, 700, 1000, 1500];
      let totalWaitTime = 0;
      let elementData: { elements: ElementData[]; textBlocks: any[] } = {
        elements: [],
        textBlocks: [],
      };

      // Check for elements at increasing intervals
      for (const interval of checkIntervals) {
        if (totalWaitTime >= this.options.waitTime) break;

        // Wait for the current interval
        await new Promise((resolve) => setTimeout(resolve, interval));
        totalWaitTime += interval;

        // Collect current elements and text blocks
        elementData = await collectElementData(this.page);

        // Store elements and text blocks
        this.elements = elementData.elements;
        this.textBlocks = elementData.textBlocks;

        // Early return if we found enough elements
        if (
          this.options.earlyReturn &&
          this.elements.length >= this.options.minElementsRequired
        ) {
          if (this.options.logDetails) {
            log(
              `Found ${this.elements.length} elements and ${this.textBlocks.length} text blocks after ${totalWaitTime}ms - returning early`
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
          this.textBlocks = elementData.textBlocks;
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
          log(
            `Detected ${this.elements.length} interactive elements and ${this.textBlocks.length} text blocks`
          );
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
   * Get all detected text blocks
   * @returns Array of text blocks with their content
   */
  getTextBlocks(): any[] {
    return this.textBlocks;
  }

  /**
   * Get page context information including text content
   * @returns Page context object with text content
   */
  getPageContext(): any {
    return this.pageContext;
  }

  /**
   * Get complete data with elements, text blocks and page context
   * @returns Object containing elements, text blocks and page context
   */
  getCompleteData(): {
    elements: ElementData[];
    textBlocks: any[];
    pageContext: any;
  } {
    return {
      elements: this.elements,
      textBlocks: this.textBlocks,
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
   * Get the current URL from the page using CDP
   * @returns The current URL
   */
  async getCurrentPageUrl(): Promise<string> {
    if (!this.page) {
      throw new Error("Browser not initialized or not connected via CDP");
    }

    return await this.page.evaluate(() => window.location.href);
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
    if (this.isCDP) {
      // For CDP, just disconnect without closing the browser
      if (this.browser) await this.browser.disconnect();
    } else {
      // For regular Puppeteer, close the browser
      if (this.browser) await this.browser.close();
    }

    this.browser = null;
    this.page = null;
    this.cdpSession = null;
    this.initialized = false;
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

// Add types to window object for TypeScript
declare global {
  interface Window {
    highlightedElements: Array<{
      element: Element;
      highlight: HTMLElement;
      number: HTMLElement;
    }>;
    highlightedTextBlocks: Array<{
      element: Element;
      highlight: HTMLElement;
      number: HTMLElement;
      text: string;
    }>;
    processedElements: Set<Element>;
    processedTextBlocks: Set<Element>;
    elementObserver: IntersectionObserver;
    textObserver: IntersectionObserver;
    updateHighlights: () => void;
    highlightClickableElement: (element: Element, index: number) => void;
    highlightTextBlock: (element: Element, index: number) => void;
    startObservingNewElements: () => void;
    getClickableElements: () => Element[];
  }
}
