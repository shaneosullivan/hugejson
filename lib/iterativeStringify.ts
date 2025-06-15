type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

interface StackItem {
  value: any;
  context:
    | "root"
    | "array"
    | "object"
    | "separator"
    | "indent"
    | "key"
    | "consolidated-closing";
  processed?: boolean;
  depth?: number;
}

function iterativeStringify(
  value: JsonValue,
  indent: number | string | null = null
): string {
  // Constants for memory optimization
  const NULL_STRING = "null";
  const OPEN_BRACKET = "[";
  const CLOSE_BRACKET = "]";
  const OPEN_BRACE = "{";
  const CLOSE_BRACE = "}";
  const COMMA = ",";
  const COLON = ":";
  const NEWLINE = "\n";
  const SPACE_COLON = ": ";
  const COMMA_NEWLINE = ",\n";
  const QUOTE = '"';
  const ROOT_CONTEXT = "root";
  const ARRAY_CONTEXT = "array";
  const OBJECT_CONTEXT = "object";
  // const SEPARATOR_CONTEXT = "separator";
  // const INDENT_CONTEXT = "indent";
  // const KEY_CONTEXT = "key";
  const CONSOLIDATED_CLOSING_CONTEXT = "consolidated-closing";
  const CIRCULAR_ERROR = "Converting circular structure to JSON";

  const STRING: "string" = "string";
  const OBJECT = "object";

  const VISITED = "__visited__";

  const MAX_BRACKET_LENGTH = 50;

  // Handle primitive values directly
  if (value === null) return NULL_STRING;
  if (typeof value === "string")
    return `${QUOTE}${escapeString(value)}${QUOTE}`;
  if (typeof value === "number")
    return isFinite(value) ? String(value) : NULL_STRING;
  if (typeof value === "boolean") return String(value);
  if (value === undefined) return NULL_STRING;

  const stack: (StackItem | string)[] = [];
  const results: string[] = [];
  const visitedObjects: any[] = []; // Track visited objects for cleanup

  // Early bailout mechanism to prevent excessive memory usage
  const MAX_RESULTS_LENGTH = 1000000; // Higher limit - the real issue was formatting
  let totalEstimatedSize = 0;

  const indentStr =
    indent === null
      ? ""
      : typeof indent === "string"
      ? indent
      : " ".repeat(indent);
  // Simple heuristic: disable formatting for arrays/objects that are likely large
  // But allow formatting for deeply nested arrays (single element arrays) even if large
  let shouldFormat = indent !== null;
  if (shouldFormat && Array.isArray(value) && value.length > 1000) {
    // Check if it's a deeply nested single-element array structure
    let current: any = value;
    let depth = 0;
    while (Array.isArray(current) && current.length === 1 && depth < 10) {
      current = current[0];
      depth++;
      if (!Array.isArray(current)) {
        break;
      }
    }
    // If we found deep nesting, keep formatting enabled
    if (depth < 5) {
      shouldFormat = false; // Large arrays without deep nesting
    }
  } else if (
    shouldFormat &&
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length > 100
  ) {
    shouldFormat = false; // Objects with many keys
  }
  const useFormatting = shouldFormat;
  const MAX_FORMATTING_DEPTH = 50; // Disable formatting beyond this depth to prevent massive output

  try {
    // Initialize with root value
    stack.push({ value, context: ROOT_CONTEXT, depth: 0 });

    while (stack.length > 0) {
      const item = stack.pop()!;

      // Handle direct string items
      if (typeof item === STRING) {
        const str = item as string;
        totalEstimatedSize += str.length;

        // Early bailout if getting too large
        if (
          results.length > MAX_RESULTS_LENGTH ||
          totalEstimatedSize > 100000000
        ) {
          // 100MB limit
          throw new Error(
            `JSON output too large - results array: ${
              results.length
            }, estimated size: ${Math.round(
              totalEstimatedSize / 1024 / 1024
            )}MB`
          );
        }

        results.push(str);
        continue;
      }

      const stackItem: StackItem = item as StackItem;

      if (
        Array.isArray(stackItem.value) ||
        (typeof stackItem.value === OBJECT && stackItem.value !== null)
      ) {
        if (!stackItem.processed) {
          // Check for circular references using __visited__ property
          if ((stackItem.value as any).__visited__) {
            throw new Error(CIRCULAR_ERROR);
          }

          // Check if we should consolidate before marking as processed
          if (
            Array.isArray(stackItem.value) &&
            stackItem.value.length === 1 &&
            Array.isArray(stackItem.value[0])
          ) {
            // We will consolidate, so don't push back for closing
            (stackItem.value as any).__visited__ = true;
            visitedObjects.push(stackItem.value);

            // Consolidate opening brackets for nested arrays
            let brackets = OPEN_BRACKET;
            let currentArray = stackItem.value;
            let consolidatedDepth = 0;

            // Follow the chain of single-element arrays and consolidate brackets
            // Add safety limit to prevent infinite loops and massive bracket strings
            const MAX_CONSOLIDATION_DEPTH = MAX_BRACKET_LENGTH - 1; // Consolidate up to max bracket length
            while (
              Array.isArray(currentArray) &&
              currentArray.length === 1 &&
              Array.isArray(currentArray[0]) &&
              brackets.length < MAX_BRACKET_LENGTH && // Much lower bracket limit
              consolidatedDepth < MAX_CONSOLIDATION_DEPTH
            ) {
              brackets += OPEN_BRACKET;
              currentArray = currentArray[0];
              consolidatedDepth++;
            }

            totalEstimatedSize += brackets.length;
            results.push(brackets);

            // Always add newline after consolidation if formatting is enabled
            if (useFormatting && brackets.length > 1) {
              results.push(NEWLINE);
            }

            // Push closing brackets that will be handled later
            // consolidatedDepth is the number of EXTRA brackets we added beyond the first
            // We need to add closing brackets for all of them PLUS the regular array closing
            const closingBrackets = CLOSE_BRACKET.repeat(consolidatedDepth + 1);
            if (useFormatting) {
              stack.push({
                value: closingBrackets,
                context: CONSOLIDATED_CLOSING_CONTEXT,
                depth: stackItem.depth || 0,
              });
            } else {
              stack.push(closingBrackets);
            }

            // Continue processing the inner content
            if (currentArray.length > 0) {
              for (let i = currentArray.length - 1; i >= 0; i--) {
                if (i < currentArray.length - 1) {
                  stack.push(useFormatting ? COMMA_NEWLINE : COMMA);
                }

                stack.push({
                  value: currentArray[i],
                  context: ARRAY_CONTEXT,
                  depth: (stackItem.depth || 0) + consolidatedDepth + 1,
                });

                if (useFormatting && !!indentStr) {
                  const repeatCount = Math.min(
                    (stackItem.depth || 0) + consolidatedDepth + 1,
                    1000
                  );
                  stack.push(indentStr.repeat(repeatCount));
                }
              }
            }
            continue;
          } else {
            // Non-consolidation case: mark as processed and push back for closing
            stackItem.processed = true;
            stack.push(item);
            (stackItem.value as any).__visited__ = true;
            visitedObjects.push(stackItem.value);
          }

          if (Array.isArray(stackItem.value)) {
            // Standard array processing
            results.push(OPEN_BRACKET);

            // Handle empty arrays
            if (stackItem.value.length === 0) {
              continue; // Will process closing bracket next
            }

            if (
              useFormatting &&
              (stackItem.depth || 0) < MAX_FORMATTING_DEPTH
            ) {
              results.push(NEWLINE);
            }

            // Standard processing for all arrays
            const currentDepth = stackItem.depth || 0;
            for (let i = stackItem.value.length - 1; i >= 0; i--) {
              // Add comma separator for all elements except the last one (which is first in reverse)
              if (i < stackItem.value.length - 1) {
                stack.push(useFormatting ? COMMA_NEWLINE : COMMA);
              }

              // Push the actual value
              stack.push({
                value: stackItem.value[i],
                context: ARRAY_CONTEXT,
                depth: currentDepth + 1,
              });

              // Add indentation before element if formatting
              if (useFormatting) {
                const repeatCount = Math.min(currentDepth + 1, 1000);
                stack.push(indentStr.repeat(repeatCount));
              }
            }
          } else {
            results.push(OPEN_BRACE);
            const entries = Object.entries(stackItem.value).filter(
              ([key]) => key !== VISITED
            );

            // Handle empty objects
            if (entries.length === 0) {
              continue; // Will process closing brace next
            }

            if (
              useFormatting &&
              (stackItem.depth || 0) < MAX_FORMATTING_DEPTH
            ) {
              results.push(NEWLINE);
            }

            // Push object properties in reverse order
            for (let i = entries.length - 1; i >= 0; i--) {
              const [key, val] = entries[i];

              // Add comma separator for all properties except the last one (which is first in reverse)
              if (i < entries.length - 1) {
                stack.push(useFormatting ? COMMA_NEWLINE : COMMA);
              }

              // Push value
              stack.push({
                value: val,
                context: OBJECT_CONTEXT,
                depth: (stackItem.depth || 0) + 1,
              });

              // Push colon separator
              stack.push(useFormatting ? SPACE_COLON : COLON);

              // Push key
              stack.push(`${QUOTE}${escapeString(key)}${QUOTE}`);

              // Add indentation before key if formatting
              if (useFormatting && !!indentStr) {
                const repeatCount = Math.min((stackItem.depth || 0) + 1, 1000);
                stack.push(indentStr.repeat(repeatCount));
              }
            }
          }
        } else {
          // Processing closing brackets/braces
          if (Array.isArray(stackItem.value)) {
            if (useFormatting && stackItem.value.length > 0) {
              const repeatCount = Math.min(stackItem.depth || 0, 1000);
              results.push(NEWLINE + indentStr.repeat(repeatCount));
            }
            results.push(CLOSE_BRACKET);
          } else {
            const entries = Object.entries(stackItem.value).filter(
              ([key]) => key !== VISITED
            );
            if (useFormatting && entries.length > 0) {
              const repeatCount = Math.min(stackItem.depth || 0, 1000);
              results.push(NEWLINE + indentStr.repeat(repeatCount));
            }
            results.push(CLOSE_BRACE);
          }
        }
      } else if (stackItem.context === CONSOLIDATED_CLOSING_CONTEXT) {
        // Handle consolidated closing brackets with special formatting
        if (useFormatting) {
          const repeatCount = Math.min(stackItem.depth || 0, 1000);
          results.push(NEWLINE + indentStr.repeat(repeatCount));
        }
        results.push(stackItem.value);
      } else {
        // Handle primitive values
        results.push(formatPrimitive(stackItem.value));
      }
    }
  } finally {
    // Clean up any remaining __visited__ properties
    for (const obj of visitedObjects) {
      delete (obj as any).__visited__;
    }
  }

  // Handle very large results arrays by chunking to avoid string length limits
  if (results.length > 100000) {
    let result = "";
    const chunkSize = 10000;
    // Maximum safe string length in JavaScript (conservative estimate)
    const MAX_SAFE_STRING_LENGTH = 2 ** 29 - 24; // ~536MB (actual V8 limit)

    for (let i = 0; i < results.length; i += chunkSize) {
      const chunk = results.slice(i, Math.min(i + chunkSize, results.length));
      if (chunk.length < 1) {
        break;
      }

      // Calculate approximate length before joining to prevent "Invalid string length" error
      let approximateLength = 0;
      for (const item of chunk) {
        approximateLength +=
          typeof item === "string" ? item.length : String(item).length;
        // If this chunk would make the result too long, stop processing
        if (result.length + approximateLength > MAX_SAFE_STRING_LENGTH) {
          throw new Error(
            "JSON output too large - exceeds maximum safe string length: " +
              (result.length + approximateLength)
          );
        }
      }

      const chunkStr = chunk.join("");
      result += chunkStr;

      // Additional safety check on total result length
      if (result.length > MAX_SAFE_STRING_LENGTH) {
        throw new Error(
          "JSON output too large - exceeds maximum safe string length"
        );
      }
    }
    return result;
  }

  return results.join("");
}

function formatPrimitive(value: any): string {
  const NULL_STRING = "null";
  const QUOTE = '"';

  if (value === null) return NULL_STRING;
  if (value === undefined) return NULL_STRING;
  if (typeof value === "string")
    return `${QUOTE}${escapeString(value)}${QUOTE}`;
  if (typeof value === "number")
    return isFinite(value) ? String(value) : NULL_STRING;
  if (typeof value === "boolean") return String(value);
  return NULL_STRING;
}

function escapeString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\u0008/g, "\\b") // Backspace character (not word boundary)
    .replace(/\f/g, "\\f");
}

function safeStringify(data: JsonValue, indent?: number | string): string {
  try {
    // Try native JSON.stringify first (faster)
    return JSON.stringify(data, null, indent);
  } catch (error) {
    // Fall back to iterative stringify for deep structures
    return iterativeStringify(data, 0);
  }
}

export {
  iterativeStringify as stringify,
  safeStringify,
  formatPrimitive,
  escapeString,
};
