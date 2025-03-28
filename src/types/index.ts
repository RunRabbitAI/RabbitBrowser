// Types for highlighted elements
export interface HighlightedElement {
  element: Element;
  highlight: HTMLElement;
  number: HTMLElement;
}

// Type for highlighted text blocks
export interface HighlightedTextBlock {
  element: Element;
  highlight: HTMLElement;
  number: HTMLElement;
  text: string;
}

// Types for element data
export interface ElementData {
  id?: string;
  tagName: string;
  type?: string;
  text: string;
  attributes?: Record<string, string>;
  href?: string;
  isVisible: boolean;
  isClickable: boolean;
  interactable?: boolean;
  isFormInput?: boolean;
  label?: string;
  placeholder?: string;
  name?: string;
  required?: boolean;
  checked?: boolean;
  options?: Array<{ value: string; text: string; selected: boolean }>;
  puppet?: {
    selector: string;
    index: number;
  };
}

// Extend window interface
declare global {
  interface Window {
    getClickableElements: () => Element[];
    highlightedElements: Array<HighlightedElement>;
    highlightedTextBlocks: Array<HighlightedTextBlock>;
    elementObserver: IntersectionObserver;
    textObserver: IntersectionObserver;
    updateHighlights: () => void;
    highlightClickableElement: (element: Element, index: number) => void;
    highlightTextBlock: (element: Element, index: number) => void;
    processedElements: Set<Element>;
    processedTextBlocks: Set<Element>;
    startObservingNewElements: () => void;
    _detectorOptions?: {
      focusOnConsent?: boolean;
      includeFormInputs?: boolean;
      highlightAllText?: boolean;
      [key: string]: any;
    };
  }
}

export interface Options {
  headless: boolean;
  defaultViewport: {
    width: number;
    height: number;
  };
  highlightAllText: boolean;
  focusOnConsent: boolean;
  logDetails: boolean;
  waitTime: number;
  minElementsRequired: number;
  earlyReturn: boolean;
  includePageContext: boolean;
  includeFormInputs: boolean;
  includeTextBlocks: boolean;
  preserveBrowserViewport: boolean;
}
