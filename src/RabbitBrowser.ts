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

    // Initialize window variables in browser context
    await this.page.evaluate(() => {
      window.highlightedElements = window.highlightedElements || [];
      window.highlightedTextBlocks = window.highlightedTextBlocks || [];
    });
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
   * Click on an element
   * @param elementOrIndex The element data or index of the element to click
   * @returns Promise resolving when the click is complete
   */
  async clickElement(elementOrIndex: ElementData | number): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not initialized. Call go() first.");
    }

    // Get the element data
    let element: ElementData;
    if (typeof elementOrIndex === "number") {
      if (elementOrIndex < 0 || elementOrIndex >= this.elements.length) {
        throw new Error(
          `Element index ${elementOrIndex} out of bounds (0-${
            this.elements.length - 1
          })`
        );
      }
      element = this.elements[elementOrIndex];
    } else {
      element = elementOrIndex;
    }

    // Ensure the element is interactable
    if (!element.interactable) {
      console.warn(
        `Warning: Element "${element.text}" (${element.tagName}) may not be interactable`
      );
    }

    try {
      if (!element.puppet?.selector) {
        throw new Error("Element has no selector for interaction");
      }

      // Wait briefly for any navigation to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Extract meaningful data to find the element directly
      const elementText = element.text || "";
      const elementId = element.id || "";
      const elementType = element.type || "";
      const tagName = element.tagName;
      const selector = element.puppet.selector;
      const href = element.href || "";

      // Click the element - using a more robust approach that combines selector with attributes
      await this.page.evaluate(
        ({ selector, elementText, elementId, elementType, tagName, href }) => {
          // First try to find by selector
          const elements = Array.from(document.querySelectorAll(selector));

          // If no elements found, try other approaches
          if (elements.length === 0) {
            // More detailed logging for debugging
            console.log(`No elements found with selector: ${selector}`);
            return;
          }

          // Try to find the exact element that matches our attributes
          let targetElement = null;

          for (const el of elements) {
            // Look for attributes match (if they're provided)
            const matchesId = elementId ? el.id === elementId : true;
            const matchesType = elementType
              ? (el as HTMLElement).getAttribute("type") === elementType
              : true;
            const matchesHref =
              href && el instanceof HTMLAnchorElement ? el.href === href : true;
            const hasMatchingText = elementText
              ? el.textContent?.includes(elementText)
              : true;

            // If this element matches what we're looking for
            if (matchesId && matchesType && matchesHref && hasMatchingText) {
              targetElement = el as HTMLElement;
              break;
            }
          }

          // If we still didn't find a specific match, use the first element
          if (!targetElement && elements.length > 0) {
            targetElement = elements[0] as HTMLElement;
          }

          if (!targetElement) {
            throw new Error(`Could not find element matching ${selector}`);
          }

          // Click the element
          targetElement.click();
        },
        { selector, elementText, elementId, elementType, tagName, href }
      );

      // Log click for debugging
      console.log(`Clicked ${element.tagName} element: "${element.text}"`);

      // Wait for any navigation or network activity to settle
      await this.page
        .waitForNavigation({ waitUntil: "networkidle0", timeout: 5000 })
        .catch(() => console.log("No navigation occurred after click"));
    } catch (error) {
      console.error(`Error clicking element: ${error}`);
      throw error;
    }
  }

  /**
   * Fill an input element with text
   * @param elementOrIndex The element data or index of the input element to fill
   * @param value The text value to fill in
   * @returns Promise resolving when the input is filled
   */
  async fillInput(
    elementOrIndex: ElementData | number,
    value: string
  ): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not initialized. Call go() first.");
    }

    // Get the element data
    let element: ElementData;
    if (typeof elementOrIndex === "number") {
      if (elementOrIndex < 0 || elementOrIndex >= this.elements.length) {
        throw new Error(
          `Element index ${elementOrIndex} out of bounds (0-${
            this.elements.length - 1
          })`
        );
      }
      element = this.elements[elementOrIndex];
    } else {
      element = elementOrIndex;
    }

    // Ensure it's a form input
    if (
      !element.isFormInput &&
      element.tagName !== "input" &&
      element.tagName !== "textarea"
    ) {
      throw new Error(
        `Element "${element.text}" (${element.tagName}) is not a form input`
      );
    }

    try {
      if (!element.puppet?.selector) {
        throw new Error("Element has no selector for interaction");
      }

      // Extract meaningful data to find the element directly
      const inputText = element.text || "";
      const inputPlaceholder = element.placeholder || "";
      const inputId = element.id || "";
      const inputName = element.name || "";
      const inputType = element.type || "";
      const tagName = element.tagName;
      const selector = element.puppet.selector;

      // Fill the input - using a more robust approach that combines selector with attributes
      await this.page.evaluate(
        ({
          selector,
          inputText,
          inputPlaceholder,
          inputId,
          inputName,
          inputType,
          tagName,
          value,
        }) => {
          // First try to find by selector
          const elements = Array.from(document.querySelectorAll(selector));

          // If no elements found, try other approaches
          if (elements.length === 0) {
            // More detailed logging for debugging
            console.log(`No elements found with selector: ${selector}`);
            return;
          }

          // Try to find the exact element that matches our attributes
          let targetElement = null;

          for (const el of elements) {
            // Cast to the right type
            const inputEl = el as HTMLInputElement | HTMLTextAreaElement;

            // Look for attributes match (if they're provided)
            const matchesId = inputId ? inputEl.id === inputId : true;
            const matchesName = inputName ? inputEl.name === inputName : true;
            const matchesType = inputType
              ? (inputEl as HTMLInputElement).type === inputType
              : true;
            const matchesPlaceholder = inputPlaceholder
              ? inputEl.placeholder === inputPlaceholder
              : true;

            // If this element matches what we're looking for
            if (matchesId && matchesName && matchesType && matchesPlaceholder) {
              targetElement = inputEl;
              break;
            }
          }

          // If we still didn't find a specific match, use the first element
          if (!targetElement && elements.length > 0) {
            targetElement = elements[0] as
              | HTMLInputElement
              | HTMLTextAreaElement;
          }

          if (!targetElement) {
            throw new Error(
              `Could not find input element matching ${selector}`
            );
          }

          // Clear the current value
          targetElement.value = "";

          // Focus and trigger input events
          targetElement.focus();

          // Set the new value
          targetElement.value = value;

          // Dispatch input and change events to trigger any listeners
          targetElement.dispatchEvent(new Event("input", { bubbles: true }));
          targetElement.dispatchEvent(new Event("change", { bubbles: true }));
        },
        {
          selector,
          inputText,
          inputPlaceholder,
          inputId,
          inputName,
          inputType,
          tagName,
          value,
        }
      );

      // Log the action for debugging
      console.log(`Filled ${element.tagName} element with "${value}"`);
    } catch (error) {
      console.error(`Error filling input: ${error}`);
      throw error;
    }
  }

  /**
   * Submit a form
   * @param formElementOrIndex The form element data or index to submit
   * @returns Promise resolving when the form is submitted
   */
  async submitForm(formElementOrIndex: ElementData | number): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not initialized. Call go() first.");
    }

    // Get the element data
    let element: ElementData;
    if (typeof formElementOrIndex === "number") {
      if (
        formElementOrIndex < 0 ||
        formElementOrIndex >= this.elements.length
      ) {
        throw new Error(
          `Element index ${formElementOrIndex} out of bounds (0-${
            this.elements.length - 1
          })`
        );
      }
      element = this.elements[formElementOrIndex];
    } else {
      element = formElementOrIndex;
    }

    // Validate that it's a form element
    if (element.tagName !== "form") {
      console.warn(
        `Warning: Element is not a form but attempting to submit anyway`
      );
    }

    try {
      if (!element.puppet?.selector) {
        throw new Error("Element has no selector for interaction");
      }

      // Get all matching elements and submit the form at the specified index
      const selector = element.puppet.selector;
      const index = element.puppet.index;

      await this.page.evaluate(
        ({ selector, index }) => {
          const elements = document.querySelectorAll(selector);
          if (elements.length <= index) {
            throw new Error(
              `Could not find element with selector ${selector} at index ${index}`
            );
          }

          const form = elements[index] as HTMLFormElement;
          form.submit();
        },
        { selector, index }
      );

      // Log the action for debugging
      console.log(`Submitted form`);

      // Wait for navigation to complete
      await this.page
        .waitForNavigation({ waitUntil: "networkidle0", timeout: 5000 })
        .catch(() =>
          console.log("No navigation occurred after form submission")
        );
    } catch (error) {
      console.error(`Error submitting form: ${error}`);
      throw error;
    }
  }

  /**
   * Select an option in a dropdown
   * @param selectElementOrIndex The select element data or index
   * @param optionValue The value of the option to select
   * @returns Promise resolving when the option is selected
   */
  async selectOption(
    selectElementOrIndex: ElementData | number,
    optionValue: string
  ): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not initialized. Call go() first.");
    }

    // Get the element data
    let element: ElementData;
    if (typeof selectElementOrIndex === "number") {
      if (
        selectElementOrIndex < 0 ||
        selectElementOrIndex >= this.elements.length
      ) {
        throw new Error(
          `Element index ${selectElementOrIndex} out of bounds (0-${
            this.elements.length - 1
          })`
        );
      }
      element = this.elements[selectElementOrIndex];
    } else {
      element = selectElementOrIndex;
    }

    // Ensure it's a select input
    if (element.tagName !== "select") {
      throw new Error(
        `Element "${element.text}" (${element.tagName}) is not a select element`
      );
    }

    try {
      if (!element.puppet?.selector) {
        throw new Error("Element has no selector for interaction");
      }

      // Get all matching elements and select the option on the element at the specified index
      const selector = element.puppet.selector;
      const index = element.puppet.index;

      await this.page.evaluate(
        ({ selector, index, optionValue }) => {
          const elements = document.querySelectorAll(selector);
          if (elements.length <= index) {
            throw new Error(
              `Could not find element with selector ${selector} at index ${index}`
            );
          }

          const selectElement = elements[index] as HTMLSelectElement;
          selectElement.value = optionValue;

          // Dispatch change event
          selectElement.dispatchEvent(new Event("change", { bubbles: true }));
        },
        { selector, index, optionValue }
      );

      // Log the action for debugging
      console.log(`Selected option "${optionValue}" in select element`);
    } catch (error) {
      console.error(`Error selecting option: ${error}`);
      throw error;
    }
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
