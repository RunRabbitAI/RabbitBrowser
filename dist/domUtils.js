"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSelector = generateSelector;
exports.getElementData = getElementData;
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
function getElementData(element, index) {
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
    const hasOnClickAttr = element.hasAttribute("onclick");
    const isClickable = tagName === "a" ||
        tagName === "button" ||
        (tagName === "input" &&
            ["button", "submit", "reset", "checkbox", "radio"].includes(type)) ||
        element.getAttribute("role") === "button" ||
        window.getComputedStyle(element).cursor === "pointer" ||
        hasOnClickAttr;
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
}
