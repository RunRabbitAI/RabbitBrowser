export interface HighlightedElement {
    element: Element;
    highlight: HTMLElement;
    number: HTMLElement;
}
export interface ElementData {
    index: number;
    text: string;
    immediateText?: string;
    tagName: string;
    type?: string;
    id?: string;
    className?: string;
    href?: string;
    value?: string;
    attributes: Record<string, string>;
    selector: string;
    isVisible: boolean;
    isClickable: boolean;
}
declare global {
    interface Window {
        getClickableElements: () => Element[];
        highlightedElements: Array<HighlightedElement>;
        elementObserver: IntersectionObserver;
        updateHighlights: () => void;
        highlightClickableElement: (element: Element, index: number) => void;
        processedElements: Set<Element>;
        startObservingNewElements: () => void;
    }
}
