// Iterative stringify function to avoid stack overflow
function iterativeStringify(value, indent = null) {
  // Handle primitive values directly
  if (value === null) return "null";
  if (typeof value === "string") return `"${escapeString(value)}"`;
  if (typeof value === "number")
    return isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return String(value);
  if (value === undefined) return "null";

  const stack = [];
  const results = [];
  // Use WeakSet for non-array objects, __visited__ hack for arrays to save memory
  const visitedArrays = []; // Track arrays to clean up __visited__ properties
  const indentStr =
    indent === null
      ? ""
      : typeof indent === "string"
      ? indent
      : " ".repeat(indent);
  const useFormatting = indent !== null;

  // Initialize with root value
  stack.push({ value, context: "root", depth: 0 });

  while (stack.length > 0) {
    const item = stack.pop();

    if (
      Array.isArray(item.value) ||
      (typeof item.value === "object" && item.value !== null)
    ) {
      if (!item.processed) {
        // Check for circular references using __visited__ property hack for arrays
        if (item.value.__visited__) {
          throw new Error("Converting circular structure to JSON");
        }

        // Mark as processed and push back to handle closing
        item.processed = true;
        stack.push(item);

        // Mark array as visited using property hack and track for cleanup
        item.value.__visited__ = true;
        visitedArrays.push(item.value);

        if (Array.isArray(item.value)) {
          // Add opening bracket
          results.push("[");
          if (useFormatting && item.value.length > 0) {
            results.push("\n");
          }

          // Push array elements in reverse order
          for (let i = item.value.length - 1; i >= 0; i--) {
            if (i < item.value.length - 1) {
              if (useFormatting) {
                stack.push({ value: ",\n", context: "separator" });
              } else {
                stack.push({ value: ",", context: "separator" });
              }
            }
            stack.push({
              value: item.value[i],
              context: "array",
              depth: (item.depth || 0) + 1,
            });
            if (useFormatting) {
              stack.push({
                value: indentStr.repeat((item.depth || 0) + 1),
                context: "indent",
              });
            }
          }
        } else {
          // Add opening brace
          results.push("{");
          const entries = Object.entries(item.value);
          if (useFormatting && entries.length > 0) {
            results.push("\n");
          }

          // Push object properties in reverse order, skipping __visited__
          const filteredEntries = entries.filter(
            ([key]) => key !== "__visited__"
          );
          for (let i = filteredEntries.length - 1; i >= 0; i--) {
            const [key, val] = filteredEntries[i];

            if (i < filteredEntries.length - 1) {
              if (useFormatting) {
                stack.push({ value: ",\n", context: "separator" });
              } else {
                stack.push({ value: ",", context: "separator" });
              }
            }
            // Push value
            stack.push({
              value: val,
              context: "object",
              depth: (item.depth || 0) + 1,
            });
            // Push key with colon
            if (useFormatting) {
              stack.push({ value: ": ", context: "separator" });
            } else {
              stack.push({ value: ":", context: "separator" });
            }
            stack.push({ value: `"${escapeString(key)}"`, context: "key" });
            if (useFormatting) {
              stack.push({
                value: indentStr.repeat((item.depth || 0) + 1),
                context: "indent",
              });
            }
          }
        }
      } else {
        if (Array.isArray(item.value)) {
          // Add closing bracket
          if (useFormatting && item.value.length > 0) {
            results.push("\n" + indentStr.repeat(item.depth || 0));
          }
          results.push("]");
        } else {
          // Add closing brace
          const entries = Object.entries(item.value);
          const filteredEntries = entries.filter(
            ([key]) => key !== "__visited__"
          );
          if (useFormatting && filteredEntries.length > 0) {
            results.push("\n" + indentStr.repeat(item.depth || 0));
          }
          results.push("}");
        }
        // Array cleanup will happen at the end
      }
    } else if (typeof item.value === "string" && item.context === "separator") {
      // Handle separators and indentation directly
      results.push(item.value);
    } else if (typeof item.value === "string" && item.context === "indent") {
      // Handle indentation directly
      results.push(item.value);
    } else if (typeof item.value === "string" && item.context === "key") {
      // Handle object keys directly
      results.push(item.value);
    } else {
      // Handle primitive values
      results.push(formatPrimitive(item.value));
    }
  }

  // Clean up __visited__ properties from arrays
  for (const arr of visitedArrays) {
    delete arr.__visited__;
  }

  const result = results.join("");

  // Consolidate consecutive brackets to reduce line count when formatting
  if (useFormatting) {
    return consolidateBrackets(result);
  }

  return result;
}

function consolidateBrackets(str) {
  const lines = str.split("\n");
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for consecutive opening brackets
    if (trimmed === "[") {
      let brackets = "[";
      let j = i + 1;
      let indent = line.substring(0, line.indexOf("["));

      // Collect consecutive opening brackets (up to 50)
      while (
        j < lines.length &&
        lines[j].trim() === "[" &&
        brackets.length < 50
      ) {
        brackets += "[";
        j++;
      }

      if (brackets.length > 1) {
        result.push(indent + brackets);
        i = j;
        continue;
      }
    }

    // Check for consecutive closing brackets
    if (trimmed === "]") {
      let brackets = "]";
      let j = i + 1;
      let indent = line.substring(0, line.indexOf("]"));

      // Collect consecutive closing brackets (up to 50)
      while (
        j < lines.length &&
        lines[j].trim() === "]" &&
        brackets.length < 50
      ) {
        brackets += "]";
        j++;
      }

      if (brackets.length > 1) {
        result.push(indent + brackets);
        i = j;
        continue;
      }
    }

    result.push(line);
    i++;
  }

  return result.join("\n");
}

function formatPrimitive(value) {
  if (value === null) return "null";
  if (value === undefined) return "null";
  if (typeof value === "string") return `"${escapeString(value)}"`;
  if (typeof value === "number")
    return isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return String(value);
  return "null";
}

function escapeString(str) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\u0008/g, "\\b") // Backspace character
    .replace(/\f/g, "\\f");
}

function safeStringify(data, indent) {
  try {
    // Try native JSON.stringify first (faster)
    return JSON.stringify(data, null, indent);
  } catch (error) {
    // Fall back to iterative stringify for deep structures
    return iterativeStringify(data, 0);
  }
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
        const stringifyResult = safeStringify(matches);
        self.postMessage({
          type: "SEARCH_SUCCESS",
          matchesString: stringifyResult,
          count: matches.length,
        });
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: "SEARCH_ERROR",
      error: error.message,
    });
  }
};

function findMatches(obj, searchTerm, caseSensitive, fullWord) {
  if (!searchTerm || !obj) return [];

  const matches = [];
  const searchTermToUse = caseSensitive ? searchTerm : searchTerm.toLowerCase();

  function matchesText(text, searchTerm, caseSensitive, fullWord) {
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

  function escapeRegExp(string) {
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

  function searchInValue(value, path, key = null) {
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
