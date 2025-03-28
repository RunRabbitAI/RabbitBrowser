# Rabbit Browser

A browser automation tool for detecting interactive elements on web pages, with a focus on consent dialogs.

## Installation

```bash
npm install rabbit-browser
```

## Usage

There are two ways to use Rabbit Browser: with the default instance or by creating your own instance.

### Using the default instance

```javascript
import rabbitBrowser from 'rabbit-browser';

// Navigate to a page
await rabbitBrowser.go('https://example.com');

// Get all detected elements
const elements = rabbitBrowser.getElements();
console.log(elements);

// Get page context (for AI analysis)
const pageContext = rabbitBrowser.getPageContext();
console.log(pageContext);

// Or get everything in one call
const completeData = rabbitBrowser.getCompleteData();
console.log(completeData.elements);
console.log(completeData.pageContext);

// Close the browser when done
await rabbitBrowser.close();
```

### Creating your own instance

```javascript
import { RabbitBrowser } from 'rabbit-browser';

// Create a new instance with custom options
const browser = new RabbitBrowser({
  focusOnConsent: true,     // Focus on consent-related elements
  waitTime: 5000,           // Maximum wait time in milliseconds
  logDetails: true,         // Log details to console
  earlyReturn: true,        // Return as soon as elements are found
  includePageContext: true, // Collect page text context for AI
});

// Navigate to a page
await browser.go('https://example.com');

// Get complete data (elements and page context)
const data = browser.getCompleteData();
console.log(data);

// Close the browser when done
await browser.close();
```

### Simple API

If you prefer a simpler API, you can use the `SimpleRabbitBrowser` class:

```javascript
import { SimpleRabbitBrowser } from 'rabbit-browser';

// Create a simple browser
const browser = new SimpleRabbitBrowser();

// Navigate to a page and get data
await browser.go('https://example.com');
const data = browser.getCompleteData();
console.log(data);

// Close when done
await browser.close();
```

## Optimized Data for AI

RabbitBrowser is designed to produce token-efficient output suitable for use with AI services. The data is optimized to:

1. Remove unnecessary attributes and metadata
2. Simplify selectors for better readability
3. Limit text content to what's most relevant
4. Include only meaningful headings and paragraphs
5. Truncate long text blocks to reduce token usage

This optimization reduces token usage when sending the data to AI services, while maintaining all the important information about the page structure and content.

## Element Data

The elements returned by `getElements()` have the following optimized structure:

```json
[
  {
    "text": "Cookies",
    "tagName": "a",
    "id": "cookie-link",
    "href": "https://example.com/cookies",
    "attributes": {
      "href": "/cookies",
      "target": "_blank"
    },
    "selector": "a.cookie-link",
    "isClickable": true
  },
  {
    "text": "Accept All",
    "tagName": "button",
    "id": "accept-button",
    "attributes": {
      "name": "accept"
    },
    "selector": "#accept-button",
    "isClickable": true
  }
]
```

## Page Context Data

The page context returned by `getPageContext()` has the following optimized structure:

```json
{
  "title": "Example Website",
  "url": "https://example.com",
  "metaDescription": "This is the example website's meta description",
  "headings": {
    "h1": ["Main Heading 1"],
    "h2": ["Subheading 1", "Subheading 2"]
  },
  "mainContent": [
    "This is the first paragraph of content...",
    "Another paragraph with more information..."
  ],
  "navigation": [
    "Home", "About", "Products", "Contact"
  ],
  "footer": "Copyright 2023. All rights reserved."
}
```

## Additional Methods

The `RabbitBrowser` class provides several additional methods:

- `getElementCount()`: Get the number of detected elements
- `getCurrentUrl()`: Get the current URL
- `filterElements(filter)`: Filter elements based on a custom function
- `findElementsByText(text)`: Find elements by their text content
- `findElementsByTagName(tagName)`: Find elements by their tag name
- `takeScreenshot(path)`: Take a screenshot of the page
- `close()`: Close the browser

## License

MIT 