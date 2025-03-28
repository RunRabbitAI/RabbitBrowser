import { Page } from "puppeteer";
import { ElementData } from "../types/index";

/**
 * Initializes the highlighting system in the page
 */
export async function initializeHighlighter(page: Page): Promise<void> {
  // Set up the highlighting system
  await page.evaluate(() => {
    function sendToNodeJS(message: string) {
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
    window.elementObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const elementId = entry.target.getAttribute("data-highlight-id");
          if (!elementId) return;

          const highlight = document.querySelector(
            `.clickable-highlight[data-for="${elementId}"]`
          ) as HTMLElement;
          const number = document.querySelector(
            `.clickable-number[data-for="${elementId}"]`
          ) as HTMLElement;

          if (highlight && number) {
            if (entry.isIntersecting) {
              highlight.style.opacity = "1";
              number.style.opacity = "1";
            } else {
              highlight.style.opacity = "0";
              number.style.opacity = "0";
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    // Update highlight positions
    window.updateHighlights = function () {
      window.highlightedElements.forEach((el) => {
        if (!el.element || !document.body.contains(el.element)) return;

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
    window.highlightClickableElement = function (
      element: Element,
      index: number
    ) {
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
          sendToNodeJS(
            `Found ${newUnprocessedElements.length} new clickable elements`
          );
        }

        // Process each new element
        newUnprocessedElements.forEach((element, i) => {
          window.highlightClickableElement(element, i + 1);
        });

        if (newUnprocessedElements.length > 0) {
          sendToNodeJS(
            `Total highlighted elements: ${window.highlightedElements.length}`
          );
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
 * Collects and returns data about highlighted elements with optimized output for AI token usage
 */
export async function collectElementData(
  page: Page
): Promise<{ elements: ElementData[] }> {
  return await page.evaluate(() => {
    function sendToNodeJS(message: string) {
      console.log(`[HIGHLIGHT] ${message}`);
    }

    if (
      !window.highlightedElements ||
      window.highlightedElements.length === 0
    ) {
      sendToNodeJS("No highlighted elements found to process");
      return { elements: [] };
    }

    sendToNodeJS(
      `Processing data for ${window.highlightedElements.length} highlighted elements`
    );

    // Check if we have consent buttons among highlighted elements
    const consentButtons = window.highlightedElements.filter(
      ({ element }) =>
        element.classList.contains("consent-button-detected") ||
        element.id === "L2AGLb" ||
        element.id === "W0wltc" ||
        element.classList.contains("tHlp8d")
    );

    if (consentButtons.length > 0) {
      sendToNodeJS(
        `Found ${consentButtons.length} consent buttons among highlighted elements:`
      );
      consentButtons.forEach(({ element }, i) => {
        const tagName = element.tagName.toLowerCase();
        const id = element.id ? `id="${element.id}"` : "";
        const text = element.textContent?.trim().substring(0, 50) || "";
        sendToNodeJS(`  ${i + 1}. ${tagName} ${id} | "${text}"`);
      });
    }

    // Filter out duplicate elements or button/text pairs before mapping
    const uniqueElements = filterDuplicateElements(window.highlightedElements);

    // Find additional form elements that might not be highlighted yet
    function findFormElements() {
      const formElements = [];

      // Get all input, select, and textarea elements
      const inputs = Array.from(
        document.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])'
        )
      );
      const selects = Array.from(document.querySelectorAll("select"));
      const textareas = Array.from(document.querySelectorAll("textarea"));

      // Combine all form elements
      return [...inputs, ...selects, ...textareas].filter((el) => {
        // Skip elements that are already highlighted
        if (window.processedElements.has(el)) {
          return false;
        }

        // Skip elements that are children of already processed elements
        let parent = el.parentElement;
        while (parent) {
          if (window.processedElements.has(parent)) {
            return false;
          }
          parent = parent.parentElement;
        }

        return true;
      });
    }

    // Function to filter out duplicate elements like button text nodes
    function filterDuplicateElements(
      elements: Array<{
        element: Element;
        highlight: HTMLElement;
        number: HTMLElement;
      }>
    ) {
      const result: Array<{
        element: Element;
        highlight: HTMLElement;
        number: HTMLElement;
      }> = [];
      const skipElements = new Set<Element>();

      // First pass: identify child elements that should be skipped
      elements.forEach(({ element }) => {
        // Check if it's a text container inside a button/link
        const tagName = element.tagName.toLowerCase();
        const parentElement = element.parentElement;

        // Skip text containers inside buttons
        if (
          (tagName === "span" || tagName === "div" || tagName === "p") &&
          element.children.length === 0 &&
          parentElement &&
          (parentElement.tagName.toLowerCase() === "button" ||
            parentElement.tagName.toLowerCase() === "a" ||
            parentElement.getAttribute("role") === "button")
        ) {
          skipElements.add(element);
        }

        // Check if any other element is a parent of this element
        elements.forEach(({ element: otherElement }) => {
          if (element !== otherElement && element.contains(otherElement)) {
            skipElements.add(otherElement);
          }
        });
      });

      // Second pass: build result without duplicates
      elements.forEach((entry) => {
        if (!skipElements.has(entry.element)) {
          result.push(entry);
        }
      });

      // Log numbers
      if (skipElements.size > 0) {
        sendToNodeJS(
          `Filtered out ${skipElements.size} duplicate or child elements`
        );
      }

      return result;
    }

    // Add additional form elements to the list
    const formElements = findFormElements();
    if (formElements.length > 0) {
      sendToNodeJS(`Found ${formElements.length} additional form elements`);
      formElements.forEach((element, i) => {
        const currentIndex = window.highlightedElements.length + i + 1;
        window.highlightClickableElement(element, currentIndex);
      });
    }

    // Function to find associated label text for a form element
    function findLabelText(element: Element): string {
      // Check for label with "for" attribute
      if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) {
          return label.textContent?.trim() || "";
        }
      }

      // Check for parent label
      let parent = element.parentElement;
      while (parent) {
        if (parent.tagName.toLowerCase() === "label") {
          const clone = parent.cloneNode(true) as HTMLElement;
          // Remove the input element text from the label
          const inputElements = clone.querySelectorAll(
            "input, select, textarea"
          );
          inputElements.forEach((el) => el.remove());
          return clone.textContent?.trim() || "";
        }
        parent = parent.parentElement;
      }

      return "";
    }

    // Map the highlighted elements to their data, optimized for token usage
    const elements = uniqueElements.map(({ element }, index) => {
      // Get the element's text content
      const originalText = element.textContent?.trim() || "";

      // Get element's type
      const tagName = element.tagName.toLowerCase();
      const type = element.getAttribute("type") || "";

      // Get only essential attributes (skip highlight-related ones)
      const attributes: Record<string, string> = {};
      Array.from(element.attributes).forEach((attr: Attr) => {
        // Skip data-highlight attributes and other non-essential ones
        if (
          !attr.name.startsWith("data-highlight") &&
          attr.name !== "style" &&
          attr.name !== "class" &&
          attr.name !== "id" && // Already captured separately
          !attr.name.startsWith("aria") && // Skip most aria attributes
          attr.name !== "tabindex"
        ) {
          attributes[attr.name] = attr.value;
        }
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
      const isClickable =
        tagName === "a" ||
        tagName === "button" ||
        (tagName === "input" &&
          ["button", "submit", "reset", "checkbox", "radio"].includes(type)) ||
        element.getAttribute("role") === "button" ||
        window.getComputedStyle(element).cursor === "pointer" ||
        hasOnClickAttr;

      // Check if element is a fillable form element
      const isFormInput =
        tagName === "input" || tagName === "textarea" || tagName === "select";

      // Generate a simplified selector - just essential for identification
      function generateSimplifiedSelector(el: Element): string {
        if (el.id) {
          return `#${el.id}`;
        }

        // For non-id elements, use a simpler path
        let tagPath = el.tagName.toLowerCase();

        // Add a class if available (but simplified)
        if (el.className) {
          const mainClass = el.className.split(" ")[0]; // Just use first class
          tagPath += `.${mainClass}`;
        }

        return tagPath;
      }

      // Create a lean element data object
      const elementData: any = {
        text: originalText,
        tagName,
      };

      // Only add these fields if they have values
      if (element.id) elementData.id = element.id;
      if (type) elementData.type = type;
      if (Object.keys(attributes).length > 0)
        elementData.attributes = attributes;
      if (tagName === "a" && element instanceof HTMLAnchorElement)
        elementData.href = element.href;

      // Enhanced data for form elements
      if (isFormInput) {
        elementData.isFormInput = true;

        // Find associated label
        const labelText = findLabelText(element);
        if (labelText) elementData.label = labelText;

        // Get placeholder
        const placeholder = element.getAttribute("placeholder");
        if (placeholder) elementData.placeholder = placeholder;

        // Get name
        const name = element.getAttribute("name");
        if (name) elementData.name = name;

        // Get required status
        if (element.hasAttribute("required")) elementData.required = true;

        // Get current value
        if (tagName === "input" && element instanceof HTMLInputElement) {
          if (type === "checkbox" || type === "radio") {
            elementData.checked = element.checked;
          } else if (element.value) {
            elementData.value = element.value;
          }
        } else if (
          tagName === "textarea" &&
          element instanceof HTMLTextAreaElement
        ) {
          if (element.value) elementData.value = element.value;
        } else if (
          tagName === "select" &&
          element instanceof HTMLSelectElement
        ) {
          if (element.value) elementData.value = element.value;

          // Get options for select elements
          const options = Array.from(element.options).map((option) => ({
            value: option.value,
            text: option.text,
            selected: option.selected,
          }));

          if (options.length > 0) elementData.options = options;
        }
      } else if (
        tagName === "input" &&
        element instanceof HTMLInputElement &&
        element.value
      ) {
        elementData.value = element.value;
      }

      // Add simplified selector
      elementData.selector = generateSimplifiedSelector(element);
      elementData.isClickable = isClickable;

      return elementData;
    });

    return { elements };
  });
}

/**
 * Collects meaningful text content from the page for context, optimized for token usage
 */
export async function collectPageTextContext(
  page: Page
): Promise<{ pageContext: any }> {
  return await page.evaluate(() => {
    function sendToNodeJS(message: string) {
      console.log(`[HIGHLIGHT] ${message}`);
    }

    sendToNodeJS("Collecting page text context for AI analysis");

    // Function to clean text
    const cleanText = (text: string) => {
      return text.replace(/\s+/g, " ").trim();
    };

    // Get page title
    const title = document.title;

    // Get meta description
    const metaDescription =
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") || "";

    // Get h1, h2, h3 elements with text, but limit to a reasonable number
    const getHeadings = (selector: string, limit: number) => {
      return Array.from(document.querySelectorAll(selector))
        .map((el) => cleanText(el.textContent || ""))
        .filter((text) => text.length > 5) // Only meaningful headings
        .slice(0, limit); // Limit to specified number
    };

    const headings = {
      h1: getHeadings("h1", 3), // Usually just need the main headings
      h2: getHeadings("h2", 5), // A few subheadings
      h3: getHeadings("h3", 5), // A few section titles
    };

    // Get main content paragraphs, but limit and summarize if too long
    // Prioritize content in main, article, or section tags, fallback to all p tags if needed
    let mainContentSelector = "main p, article p, section p";
    let paragraphs = Array.from(document.querySelectorAll(mainContentSelector))
      .map((el) => cleanText(el.textContent || ""))
      .filter((text) => text.length > 30); // Only include substantial paragraphs

    // If we didn't find enough paragraphs, try all paragraphs
    if (paragraphs.length < 2) {
      paragraphs = Array.from(document.querySelectorAll("p"))
        .map((el) => cleanText(el.textContent || ""))
        .filter((text) => text.length > 30);
    }

    // Limit paragraphs and truncate if too long
    paragraphs = paragraphs
      .slice(0, 5)
      .map((p) => (p.length > 200 ? p.substring(0, 200) + "..." : p));

    // Get navigation items text (only a reasonable number)
    const navigationText = Array.from(
      document.querySelectorAll("nav a, header a")
    )
      .map((el) => cleanText(el.textContent || ""))
      .filter((text) => text.length > 0)
      .slice(0, 8); // Only keep the first 8 nav items

    // Get footer text but keep it compact
    const footerText = Array.from(document.querySelectorAll("footer"))
      .map((el) => cleanText(el.textContent || ""))
      .filter((text) => text.length > 0)
      .slice(0, 1) // Usually just need first footer
      .map((text) =>
        text.length > 150 ? text.substring(0, 150) + "..." : text
      );

    // Return structured context information - optimized for token usage
    const pageContext: any = {
      title,
      url: window.location.href,
    };

    // Only add fields that have content
    if (metaDescription) pageContext.metaDescription = metaDescription;
    if (headings.h1.length > 0 || headings.h2.length > 0) {
      pageContext.headings = {};
      if (headings.h1.length > 0) pageContext.headings.h1 = headings.h1;
      if (headings.h2.length > 0) pageContext.headings.h2 = headings.h2;
      if (headings.h3.length > 0) pageContext.headings.h3 = headings.h3;
    }
    if (paragraphs.length > 0) pageContext.mainContent = paragraphs;
    if (navigationText.length > 0) pageContext.navigation = navigationText;
    if (footerText.length > 0) pageContext.footer = footerText[0];

    return { pageContext };
  });
}
