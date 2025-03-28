import { Page } from "puppeteer";
import { ElementData } from "../types";
/**
 * Initializes the highlighting system in the page
 */
export declare function initializeHighlighter(page: Page): Promise<void>;
/**
 * Collects and returns data about highlighted elements
 */
export declare function collectElementData(page: Page): Promise<{
    elements: ElementData[];
}>;
