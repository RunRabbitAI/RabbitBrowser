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

// Close the browser when done
await rabbitBrowser.close();
```

### Creating your own instance

```javascript
import { RabbitBrowser } from 'rabbit-browser';

// Create a new instance with custom options
const browser = new RabbitBrowser({
  focusOnConsent: true, // Focus on consent-related elements
  waitTime: 5000,       // Maximum wait time in milliseconds
  logDetails: true,     // Log details to console
  earlyReturn: true,    // Return as soon as elements are found
});

// Navigate to a page
await browser.go('https://example.com');

// Get all detected elements
const elements = browser.getElements();
console.log(elements);

// Close the browser when done
await browser.close();
```

### Simple API

If you prefer a simpler API, you can use the `SimpleRabbitBrowser` class:

```javascript
import { SimpleRabbitBrowser } from 'rabbit-browser';

// Create a simple browser
const browser = new SimpleRabbitBrowser();

// Navigate to a page and get elements
await browser.go('https://example.com');
const elements = browser.getElements();
console.log(elements);

// Close when done
await browser.close();
```

## Element Data

The elements returned by `getElements()` have the following structure:

```json
[
  {
    "index": 0,
    "text": "Cookies",
    "immediateText": "Cookies",
    "tagName": "a",
    "className": "F4a1l consent-button-detected",
    "href": "https://policies.google.com/technologies/cookies?utm_source=ucbs&hl=de",
    "attributes": {
      "class": "F4a1l consent-button-detected",
      "href": "https://policies.google.com/technologies/cookies?utm_source=ucbs&hl=de",
      "target": "_blank",
      "data-highlight-id": "clickable-14"
    },
    "selector": "div#CXQnmb > div > div > div:nth-of-type(2) > div > div > a",
    "isVisible": true,
    "isClickable": true
  },
  {
    "index": 1,
    "text": "Alle ablehnen",
    "tagName": "button",
    "id": "W0wltc",
    "className": "tHlp8d consent-button-detected",
    "attributes": {
      "id": "W0wltc",
      "class": "tHlp8d consent-button-detected",
      "data-ved": "0ahUKEwixyp3Gg62MAxWwA9sEHRmQGpQQ4cIICIMB",
      "data-highlight-id": "clickable-20"
    },
    "selector": "#W0wltc",
    "isVisible": true,
    "isClickable": true
  }
]
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