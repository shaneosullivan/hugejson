import { safeStringify } from "../lib/iterativeStringify";

interface SearchMatch {
  path: string;
  value: any;
  type: string;
  fullValue: string;
}

self.onmessage = (e) => {
  const {
    type,
    data,
    searchTerm,
    caseSensitive = false,
    fullWord = false,
  } = e.data;

  try {
    switch (type) {
      case "SEARCH_JSON":
        const matches = findMatches(data, searchTerm, caseSensitive, fullWord);
        const stringifyResult = safeStringify(matches as any);
        self.postMessage({
          type: "SEARCH_SUCCESS",
          matchesString: stringifyResult,
          count: matches.length,
        });
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error: any) {
    self.postMessage({
      type: "SEARCH_ERROR",
      error: error.message,
    });
  }
};

function findMatches(
  obj: any,
  searchTerm: string,
  caseSensitive: boolean,
  fullWord: boolean
): SearchMatch[] {
  if (!searchTerm || !obj) return [];

  const matches: SearchMatch[] = [];
  const searchTermToUse = caseSensitive ? searchTerm : searchTerm.toLowerCase();

  function matchesText(
    text: string,
    searchTerm: string,
    caseSensitive: boolean,
    fullWord: boolean
  ): boolean {
    const textToSearch = caseSensitive ? text : text.toLowerCase();

    if (fullWord) {
      const regex = new RegExp(
        `\\b${escapeRegExp(searchTerm)}\\b`,
        caseSensitive ? "g" : "gi"
      );
      return regex.test(textToSearch);
    } else {
      return textToSearch.includes(searchTerm);
    }
  }

  function escapeRegExp(string: string): string {
    return string
      .replace(/\\/g, "\\\\")
      .replace(/\./g, "\\.")
      .replace(/\*/g, "\\*")
      .replace(/\+/g, "\\+")
      .replace(/\?/g, "\\?")
      .replace(/\^/g, "\\^")
      .replace(/\$/g, "\\$")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\|/g, "\\|")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]");
  }

  function searchInValue(
    value: any,
    path: string,
    key: string | number | null = null
  ): void {
    // Check if key matches (for object properties)
    if (key !== null && typeof key === "string") {
      if (matchesText(key, searchTermToUse, caseSensitive, fullWord)) {
        matches.push({
          path: path,
          value: key,
          type: "key",
          fullValue: key, // Keys are never truncated
        });
      }
    }

    // Check if current value matches - always use the full value for searching
    if (value !== null && value !== undefined) {
      const fullValueStr = String(value);
      if (matchesText(fullValueStr, searchTermToUse, caseSensitive, fullWord)) {
        matches.push({
          path: path,
          value: value,
          type: typeof value,
          fullValue: fullValueStr, // Store the full value for reference
        });
      }
    }

    // Recursively search in objects and arrays
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          const itemPath = path === "root" ? `[${index}]` : `${path}[${index}]`;
          searchInValue(item, itemPath, index);
        });
      } else {
        Object.keys(value).forEach((objKey) => {
          const keyPath = path === "root" ? objKey : `${path}.${objKey}`;
          searchInValue(value[objKey], keyPath, objKey);
        });
      }
    }
  }

  searchInValue(obj, "root");

  return matches;
}
