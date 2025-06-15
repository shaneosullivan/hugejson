import { safeStringify } from '../lib/iterativeStringify';

interface CollapsibilityResult {
  path: string;
  level: number;
  isCollapsible: boolean;
  children: CollapsibilityResult[];
}

function analyzeCollapsibility(obj: any, path: string = "", level: number = 0): CollapsibilityResult {
  const result: CollapsibilityResult = {
    path,
    level,
    isCollapsible: false,
    children: [],
  };

  if (typeof obj === "object" && obj !== null) {
    if (Array.isArray(obj)) {
      result.isCollapsible = obj.length > 0;
      obj.forEach((item, index) => {
        const childPath = path ? `${path}[${index}]` : `[${index}]`;
        result.children.push(analyzeCollapsibility(item, childPath, level + 1));
      });
    } else {
      const keys = Object.keys(obj);
      result.isCollapsible = keys.length > 0;
      keys.forEach((key) => {
        const childPath = path ? `${path}.${key}` : key;
        result.children.push(
          analyzeCollapsibility(obj[key], childPath, level + 1)
        );
      });
    }
  }

  return result;
}

self.onmessage = (e) => {
  const { type, data } = e.data;

  try {
    switch (type) {
      case "ANALYZE_COLLAPSIBILITY":
        const parsed = JSON.parse(data);
        const analysis = analyzeCollapsibility(parsed);
        const stringifyResult = safeStringify(analysis);
        self.postMessage({
          type: "ANALYSIS_SUCCESS",
          dataString: stringifyResult,
        });
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error: any) {
    self.postMessage({
      type: "ANALYSIS_ERROR",
      error: error.message,
    });
  }
};