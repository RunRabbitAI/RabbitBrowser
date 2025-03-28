import { ElementData } from "./types";
/**
 * Highlight clickable elements on the page and return their data
 * @param url The URL to navigate to and highlight elements on
 * @param waitTime Time to wait for element detection in ms
 * @returns Promise with the collected element data
 */
export declare function highlightAndCollect(url?: string, waitTime?: number): Promise<{
    elements: ElementData[];
}>;
/**
 * Main function to run the highlighter
 */
export declare function main(): Promise<void>;
