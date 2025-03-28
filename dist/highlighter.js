"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Highlighter = void 0;
const domUtils_1 = require("./domUtils");
class Highlighter {
    constructor() {
        this.highlightedElements = [];
        this.processedElements = new Set();
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
        this.highlightContainer = document.createElement("div");
        this.highlightContainer.style.position = "absolute";
        this.highlightContainer.style.top = "0";
        this.highlightContainer.style.left = "0";
        this.highlightContainer.style.pointerEvents = "none";
        this.highlightContainer.style.zIndex = "9999";
        document.body.appendChild(this.highlightContainer);
    }
    getClickableElements() {
        const clickableSelectors = [
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
            ".nav-item",
            ".clickable",
            // Cookie consent button selectors
            '[aria-label*="consent"]',
            '[aria-label*="cookie"]',
            '[class*="consent"]',
            '[class*="cookie"]',
            '[id*="consent"]',
            '[id*="cookie"]',
            '[data-testid*="cookie"]',
            ".accept-cookies",
            ".reject-cookies",
            ".consent-button",
            ".agree-button",
            "[data-cookieconsent]",
            ".cc-button",
            ".cc-btn",
            ".gdpr-button",
            // Google-specific selectors
            "#L2AGLb",
            "#W0wltc",
            ".tHlp8d",
            "#VDity",
            "#CXQnmb",
            ".VfPpkd-LgbsSe",
            ".VfPpkd-LgbsSe-OWXEXe-k8QpJ",
            ".consent-button-detected",
        ];
        const elements = [];
        // Get elements from the document
        for (const selector of clickableSelectors) {
            try {
                const found = Array.from(document.querySelectorAll(selector));
                elements.push(...found);
            }
            catch (e) {
                // Skip invalid selectors
            }
        }
        // Filter out invisible elements and nested elements
        return elements.filter((element) => {
            try {
                const rect = element.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) {
                    return false;
                }
                let parent = element.parentElement;
                while (parent) {
                    if (elements.includes(parent)) {
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
        const elementData = this.highlightedElements.map(({ element }, index) => (0, domUtils_1.getElementData)(element, index + 1));
        const consentButtons = elementData.filter((el) => el.id === "L2AGLb" ||
            el.id === "W0wltc" ||
            el.className?.includes("tHlp8d") ||
            el.className?.includes("consent-button-detected"));
        return {
            elements: elementData,
            consentButtons,
        };
    }
}
exports.Highlighter = Highlighter;
