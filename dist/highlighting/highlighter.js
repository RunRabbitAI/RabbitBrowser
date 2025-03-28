"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeHighlighter = initializeHighlighter;
exports.collectElementData = collectElementData;
/**
 * Initializes the highlighting system in the page
 */
async function initializeHighlighter(page) {
    // Set up the highlighting system
    await page.evaluate(() => {
        function sendToNodeJS(message) {
            console.log(`[HIGHLIGHT] ${message}`);
        }
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
        // Initialize containers to hold highlighting elements
        const highlightContainer = document.createElement("div");
        highlightContainer.style.position = "absolute";
        highlightContainer.style.top = "0";
        highlightContainer.style.left = "0";
        highlightContainer.style.pointerEvents = "none";
        highlightContainer.style.zIndex = "9999";
        document.body.appendChild(highlightContainer);
        // Store references to elements and their highlights
        window.highlightedElements = window.highlightedElements || [];
        window.processedElements = window.processedElements || new Set();
        sendToNodeJS("Highlighter initialized with containers and styles");
        // Create an Intersection Observer to detect when elements enter/exit viewport
        window.elementObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const elementId = entry.target.getAttribute("data-highlight-id");
                if (!elementId)
                    return;
                const highlight = document.querySelector(`.clickable-highlight[data-for="${elementId}"]`);
                const number = document.querySelector(`.clickable-number[data-for="${elementId}"]`);
                if (highlight && number) {
                    if (entry.isIntersecting) {
                        highlight.style.opacity = "1";
                        number.style.opacity = "1";
                    }
                    else {
                        highlight.style.opacity = "0";
                        number.style.opacity = "0";
                    }
                }
            });
        }, { threshold: 0.1 });
        // Update highlight positions
        window.updateHighlights = function () {
            window.highlightedElements.forEach((el) => {
                if (!el.element || !document.body.contains(el.element))
                    return;
                const rect = el.element.getBoundingClientRect();
                const scrollX = window.scrollX;
                const scrollY = window.scrollY;
                // Update highlight position
                if (el.highlight) {
                    el.highlight.style.top = rect.top + scrollY + "px";
                    el.highlight.style.left = rect.left + scrollX + "px";
                    el.highlight.style.width = rect.width + "px";
                    el.highlight.style.height = rect.height + "px";
                }
                // Update number position
                if (el.number) {
                    el.number.style.top = rect.top + scrollY + "px";
                    el.number.style.left = rect.left + scrollX + "px";
                }
            });
        };
        // Add scroll and resize event listeners
        window.addEventListener("scroll", window.updateHighlights);
        window.addEventListener("resize", window.updateHighlights);
        // Function to highlight a clickable element
        window.highlightClickableElement = function (element, index) {
            // Skip if already processed
            if (window.processedElements.has(element)) {
                return;
            }
            window.processedElements.add(element);
            // Give the element a unique identifier
            const elementId = "clickable-" + index;
            element.setAttribute("data-highlight-id", elementId);
            // Create highlight elements
            const highlight = document.createElement("div");
            highlight.className = "clickable-highlight";
            highlight.setAttribute("data-for", elementId);
            const number = document.createElement("div");
            number.className = "clickable-number";
            number.setAttribute("data-for", elementId);
            number.textContent = index.toString();
            // Add to container
            highlightContainer.appendChild(highlight);
            highlightContainer.appendChild(number);
            // Store reference
            window.highlightedElements.push({
                element,
                highlight,
                number,
            });
            // Observe this element
            window.elementObserver.observe(element);
            // Set position
            const rect = element.getBoundingClientRect();
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            highlight.style.top = rect.top + scrollY + "px";
            highlight.style.left = rect.left + scrollX + "px";
            highlight.style.width = rect.width + "px";
            highlight.style.height = rect.height + "px";
            number.style.top = rect.top + scrollY + "px";
            number.style.left = rect.left + scrollX + "px";
        };
        // Function to start observing for new elements
        window.startObservingNewElements = function () {
            // Function to update clickable elements when DOM changes
            function refreshClickableElements() {
                const newElements = window.getClickableElements();
                // Filter for elements we haven't processed yet
                const newUnprocessedElements = newElements.filter((element) => {
                    return !window.processedElements.has(element);
                });
                if (newUnprocessedElements.length > 0) {
                    sendToNodeJS(`Found ${newUnprocessedElements.length} new clickable elements`);
                }
                // Process each new element
                newUnprocessedElements.forEach((element, i) => {
                    window.highlightClickableElement(element, i + 1);
                });
                if (newUnprocessedElements.length > 0) {
                    sendToNodeJS(`Total highlighted elements: ${window.highlightedElements.length}`);
                }
            }
            // Create a mutation observer
            const observer = new MutationObserver(() => {
                refreshClickableElements();
            });
            // Start observing the document
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false,
            });
            // Initial scan
            refreshClickableElements();
            sendToNodeJS("Started observing for new elements");
        };
    });
}
/**
 * Collects and returns data about highlighted elements
 */
async function collectElementData(page) {
    return await page.evaluate(() => {
        function sendToNodeJS(message) {
            console.log(`[HIGHLIGHT] ${message}`);
        }
        if (!window.highlightedElements ||
            window.highlightedElements.length === 0) {
            sendToNodeJS("No highlighted elements found to process");
            return { elements: [] };
        }
        sendToNodeJS(`Processing data for ${window.highlightedElements.length} highlighted elements`);
        // Check if we have consent buttons among highlighted elements
        const consentButtons = window.highlightedElements.filter(({ element }) => element.classList.contains("consent-button-detected") ||
            element.id === "L2AGLb" ||
            element.id === "W0wltc" ||
            element.classList.contains("tHlp8d"));
        if (consentButtons.length > 0) {
            sendToNodeJS(`Found ${consentButtons.length} consent buttons among highlighted elements:`);
            consentButtons.forEach(({ element }, i) => {
                const tagName = element.tagName.toLowerCase();
                const id = element.id ? `id="${element.id}"` : "";
                const text = element.textContent?.trim().substring(0, 50) || "";
                sendToNodeJS(`  ${i + 1}. ${tagName} ${id} | "${text}"`);
            });
        }
        // Map the highlighted elements to their data
        const elements = window.highlightedElements.map(({ element }, index) => {
            // Get the element's text content
            const originalText = element.textContent?.trim() || "";
            // Get element's type
            const tagName = element.tagName.toLowerCase();
            const type = element.getAttribute("type") || "";
            // Get attributes
            const attributes = {};
            Array.from(element.attributes).forEach((attr) => {
                attributes[attr.name] = attr.value;
            });
            // Get immediate text content (excluding child element text)
            let immediateText = "";
            for (let i = 0; i < element.childNodes.length; i++) {
                const node = element.childNodes[i];
                if (node.nodeType === Node.TEXT_NODE) {
                    immediateText += node.textContent || "";
                }
            }
            immediateText = immediateText.trim();
            // Check if element has event listeners (approximation)
            const hasOnClickAttr = element.hasAttribute("onclick");
            const isClickable = tagName === "a" ||
                tagName === "button" ||
                (tagName === "input" &&
                    ["button", "submit", "reset", "checkbox", "radio"].includes(type)) ||
                element.getAttribute("role") === "button" ||
                window.getComputedStyle(element).cursor === "pointer" ||
                hasOnClickAttr;
            // Generate the selector
            function generateSelector(el) {
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
            // Return element data
            return {
                index,
                text: originalText,
                immediateText: immediateText || undefined,
                tagName,
                type: type || undefined,
                id: element.id || undefined,
                className: element.className || undefined,
                href: element instanceof HTMLAnchorElement ? element.href : undefined,
                value: element instanceof HTMLInputElement ? element.value : undefined,
                attributes,
                selector: generateSelector(element),
                isVisible: true,
                isClickable,
            };
        });
        return { elements };
    });
}
//# sourceMappingURL=highlighter.js.map