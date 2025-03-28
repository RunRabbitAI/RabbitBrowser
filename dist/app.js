"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
async function runHighlighter() {
    // CLI Logging function
    function log(message) {
        console.log(`[Highlighter] ${message}`);
    }
    log("Launching browser...");
    const browser = await puppeteer_1.default.launch({
        headless: false,
        defaultViewport: null,
        args: ["--start-maximized", "--disable-web-security"],
    });
    const page = await browser.newPage();
    // Set the window size to fit most screens
    await page.setViewport({
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
    });
    log("Navigating to Google...");
    await page.goto("https://www.google.com", {
        waitUntil: "networkidle2",
        timeout: 30000,
    });
    log("Page loaded, initializing highlighter...");
    // Wait for the DOM to be ready
    await page.waitForSelector("body");
    // No longer wait for consent dialog - proceed directly
    // Inject our highlighter code into the page
    await page.evaluate(() => {
        // Create a style element for our highlighting CSS
        const style = document.createElement("style");
        style.innerHTML = `
      .clickable-highlight {
        position: absolute;
        pointer-events: none;
        z-index: 10000;
        box-sizing: border-box;
        border: 2px solid red;
        transition: opacity 0.2s ease;
      }
      .clickable-number {
        position: absolute;
        background-color: red;
        color: white;
        padding: 2px 5px;
        border-radius: 10px;
        font-size: 12px;
        z-index: 10001;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
    `;
        document.head.appendChild(style);
        // Initialize container to hold highlighting elements
        const highlightContainer = document.createElement("div");
        highlightContainer.style.position = "absolute";
        highlightContainer.style.top = "0";
        highlightContainer.style.left = "0";
        highlightContainer.style.pointerEvents = "none";
        highlightContainer.style.zIndex = "9999";
        document.body.appendChild(highlightContainer);
        // Define the Highlighter class
        class Highlighter {
            constructor() {
                this.highlightedElements = [];
                this.processedElements = new Set();
                this.highlightContainer = highlightContainer;
            }
            getClickableElements() {
                // Basic clickable selectors
                const basicSelectors = [
                    "a",
                    "button",
                    'input[type="button"]',
                    'input[type="submit"]',
                    'input[type="reset"]',
                    'input[type="checkbox"]',
                    'input[type="radio"]',
                    "select",
                    '[role="button"]',
                    '[role="link"]',
                    '[role="checkbox"]',
                    '[role="tab"]',
                    '[role="menuitem"]',
                    '[tabindex]:not([tabindex="-1"])',
                    "[onclick]",
                    "[data-toggle]",
                    ".btn",
                    ".button",
                    "[class*='btn-']",
                    "[class*='button']",
                    "nav a", // Navigation links
                ];
                let elements = [];
                // First, get elements using basic selectors
                for (const selector of basicSelectors) {
                    try {
                        const found = Array.from(document.querySelectorAll(selector));
                        elements.push(...found);
                    }
                    catch (e) {
                        // Skip invalid selectors
                    }
                }
                // Then, look for elements with pointer cursor but not in selector list
                document.querySelectorAll("*").forEach((el) => {
                    if (!elements.includes(el)) {
                        try {
                            const style = window.getComputedStyle(el);
                            if (style.cursor === "pointer") {
                                elements.push(el);
                            }
                        }
                        catch (e) {
                            // Skip error
                        }
                    }
                });
                // Filter out invisible elements, body and html
                return elements.filter((element) => {
                    try {
                        // Skip if already processed
                        if (this.processedElements.has(element)) {
                            return false;
                        }
                        // Skip body, html, head, script, style
                        const tagName = element.tagName.toLowerCase();
                        if ([
                            "body",
                            "html",
                            "head",
                            "script",
                            "style",
                            "meta",
                            "link",
                        ].includes(tagName)) {
                            return false;
                        }
                        // Skip invisible elements
                        const rect = element.getBoundingClientRect();
                        if (rect.width === 0 || rect.height === 0) {
                            return false;
                        }
                        // Skip elements with display: none or visibility: hidden
                        const computedStyle = window.getComputedStyle(element);
                        if (computedStyle.display === "none" ||
                            computedStyle.visibility === "hidden") {
                            return false;
                        }
                        // Skip if any parent is already going to be highlighted
                        let parent = element.parentElement;
                        while (parent) {
                            if (elements.includes(parent) &&
                                !this.processedElements.has(parent)) {
                                return false;
                            }
                            parent = parent.parentElement;
                        }
                        return true;
                    }
                    catch (e) {
                        return false;
                    }
                });
            }
            highlightElement(element, index) {
                if (this.processedElements.has(element)) {
                    return;
                }
                this.processedElements.add(element);
                const elementId = "clickable-" + index;
                element.setAttribute("data-highlight-id", elementId);
                const highlight = document.createElement("div");
                highlight.className = "clickable-highlight";
                highlight.setAttribute("data-for", elementId);
                const number = document.createElement("div");
                number.className = "clickable-number";
                number.setAttribute("data-for", elementId);
                number.textContent = index.toString();
                this.highlightContainer.appendChild(highlight);
                this.highlightContainer.appendChild(number);
                this.highlightedElements.push({
                    element,
                    highlight,
                    number,
                });
                const rect = element.getBoundingClientRect();
                const scrollX = window.scrollX;
                const scrollY = window.scrollY;
                highlight.style.top = rect.top + scrollY + "px";
                highlight.style.left = rect.left + scrollX + "px";
                highlight.style.width = rect.width + "px";
                highlight.style.height = rect.height + "px";
                number.style.top = rect.top + scrollY + "px";
                number.style.left = rect.left + scrollX + "px";
            }
            highlight() {
                const elements = this.getClickableElements();
                elements.forEach((element, index) => {
                    this.highlightElement(element, index + 1);
                });
                // Debug
                console.log(`Found and highlighted ${this.highlightedElements.length} elements`);
                const elementData = this.highlightedElements.map(({ element }, index) => {
                    const originalText = element.textContent?.trim() || "";
                    const tagName = element.tagName.toLowerCase();
                    const type = element.getAttribute("type") || "";
                    const attributes = {};
                    Array.from(element.attributes).forEach((attr) => {
                        attributes[attr.name] = attr.value;
                    });
                    let immediateText = "";
                    for (let i = 0; i < element.childNodes.length; i++) {
                        const node = element.childNodes[i];
                        if (node.nodeType === Node.TEXT_NODE) {
                            immediateText += node.textContent || "";
                        }
                    }
                    immediateText = immediateText.trim();
                    return {
                        index: index + 1,
                        text: originalText,
                        immediateText: immediateText || undefined,
                        tagName,
                        type: type || undefined,
                        id: element.id || undefined,
                        className: element.className || undefined,
                        href: element instanceof HTMLAnchorElement ? element.href : undefined,
                        value: element instanceof HTMLInputElement ? element.value : undefined,
                        attributes,
                        selector: this.generateSelector(element),
                        isVisible: true,
                        isClickable: true,
                    };
                });
                // Identify consent-related buttons based on content and context
                const consentButtons = elementData.filter((el) => {
                    const text = el.text.toLowerCase();
                    const consentKeywords = [
                        "consent",
                        "cookie",
                        "privacy",
                        "gdpr",
                        "accept",
                        "reject",
                        "agree",
                        "disagree",
                        "allow",
                        "deny",
                    ];
                    // Check text content
                    const hasConsentText = consentKeywords.some((keyword) => text.includes(keyword));
                    // Check element ID
                    const hasConsentId = el.id &&
                        consentKeywords.some((keyword) => el.id?.toLowerCase().includes(keyword));
                    // Check class names
                    const hasConsentClass = el.className &&
                        consentKeywords.some((keyword) => el.className?.toLowerCase().includes(keyword));
                    return hasConsentText || hasConsentId || hasConsentClass;
                });
                return {
                    elements: elementData,
                    consentButtons,
                };
            }
            generateSelector(el) {
                if (el.id) {
                    return `#${el.id}`;
                }
                let path = "";
                let element = el;
                while (element && element.nodeType === Node.ELEMENT_NODE) {
                    let selector = element.nodeName.toLowerCase();
                    if (element.id) {
                        selector += `#${element.id}`;
                        path = selector + (path ? " > " + path : "");
                        break;
                    }
                    else {
                        let sibling = element.previousElementSibling;
                        let index = 1;
                        while (sibling) {
                            if (sibling.nodeName.toLowerCase() === selector) {
                                index++;
                            }
                            sibling = sibling.previousElementSibling;
                        }
                        if (index > 1) {
                            selector += `:nth-of-type(${index})`;
                        }
                    }
                    path = selector + (path ? " > " + path : "");
                    element = element.parentNode;
                }
                return path;
            }
        }
        // Make Highlighter available globally
        window.Highlighter = Highlighter;
    });
    // Get the results
    const result = await page.evaluate(() => {
        const highlighter = new window.Highlighter();
        return highlighter.highlight();
    });
    // Log results
    if (result.elements.length === 0) {
        log("WARNING: No clickable elements were collected");
    }
    else {
        log(`Collected data for ${result.elements.length} clickable elements`);
        if (result.consentButtons.length > 0) {
            log(`Found ${result.consentButtons.length} consent buttons`);
            result.consentButtons.forEach((button, i) => {
                log(`  ${i + 1}. ${button.tagName} ${button.id ? `id="${button.id}"` : ""} | "${button.text}"`);
            });
        }
    }
    log("Highlight process completed - browser window remains open with highlights");
    return result;
}
// Run the highlighter
runHighlighter().catch((error) => console.error("Error:", error));
