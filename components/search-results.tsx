"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Hash,
  Copy,
  Check,
  Code,
  HelpCircle,
  Wrench,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HelpContent } from "./help-content";
import { JqQueryBuilder } from "./jq-query-builder";

interface SearchResult {
  lineNumber: number;
  content: string;
  contextBefore: string;
  contextAfter: string;
  path?: string;
  type: "text" | "path";
  searchTerm?: string;
}

interface SearchResultsProps {
  content: string;
  jsonData?: any;
  onResultClick: (lineNumber: number) => void;
}

export function SearchResults({
  content,
  jsonData,
  onResultClick,
}: SearchResultsProps) {
  const [searchValue, setSearchValue] = useState("");
  const [searchType, setSearchType] = useState<"text" | "path" | "jq">("text");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [jqResult, setJqResult] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [hoveredResult, setHoveredResult] = useState<number | null>(null);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpTab, setHelpTab] = useState<"text" | "path" | "jq">("text");
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const { toast } = useToast();

  // Virtualization state
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Virtual list configuration
  const ITEM_HEIGHT = 120; // Approximate height of each result item
  const BUFFER_SIZE = 5; // Number of items to render outside visible area

  // Split content into lines for searching
  const contentLines = content.split("\n");

  // Precompute paths for all lines when content changes (only once per unique content)
  const linePathsRef = useRef<string[]>([]);
  const lastContentRef = useRef<string>("");

  useEffect(() => {
    // Only recompute if content has actually changed
    if (content === lastContentRef.current) {
      return;
    }

    lastContentRef.current = content;

    const computeAllLinePaths = () => {
      const startTime = performance.now();
      console.log(`🔄 Computing paths for all ${contentLines.length} lines`);

      const linePaths: string[] = new Array(contentLines.length);
      const pathStack: string[] = []; // Stack of parent keys
      const indentStack: number[] = []; // Stack of indentation levels

      const getIndentLevel = (line: string): number => {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
      };

      for (let i = 0; i < contentLines.length; i++) {
        const line = contentLines[i];
        if (!line) {
          linePaths[i] = "root";
          continue;
        }

        const currentIndent = getIndentLevel(line);
        const trimmedLine = line.trim();

        // Skip empty lines, commas, and structural characters
        if (
          !trimmedLine ||
          trimmedLine === "," ||
          trimmedLine === "{" ||
          trimmedLine === "}" ||
          trimmedLine === "[" ||
          trimmedLine === "]"
        ) {
          linePaths[i] = pathStack.length > 0 ? pathStack.join(".") : "root";
          continue;
        }

        // Pop stack entries that have higher or equal indentation (we've moved out of their scope)
        while (
          indentStack.length > 0 &&
          indentStack[indentStack.length - 1] >= currentIndent
        ) {
          pathStack.pop();
          indentStack.pop();
        }

        // Check if this line is a property key
        const keyMatch = trimmedLine.match(/^\s*"([^"]+)"\s*:/);
        if (keyMatch) {
          const key = keyMatch[1];

          // Build the current path including this key
          const currentPath =
            pathStack.length > 0 ? `${pathStack.join(".")}.${key}` : key;
          linePaths[i] = currentPath;

          // Check if this key will have nested content (ends with : but not a simple value)
          const hasNestedContent =
            trimmedLine.endsWith(":") ||
            trimmedLine.endsWith("{") ||
            trimmedLine.endsWith("[");
          if (hasNestedContent) {
            // This key will be a parent for subsequent lines
            pathStack.push(key);
            indentStack.push(currentIndent);
          }
        } else {
          // This is a value line, use the current parent path
          linePaths[i] = pathStack.length > 0 ? pathStack.join(".") : "root";
        }
      }

      const endTime = performance.now();
      console.log(
        `✅ Computed all line paths in ${(endTime - startTime).toFixed(2)}ms`
      );

      return linePaths;
    };

    linePathsRef.current = computeAllLinePaths();
  }, [content, contentLines]);

  // Calculate visible range for virtualization
  const visibleStartIndex = Math.max(
    0,
    Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE
  );
  const visibleEndIndex = Math.min(
    results.length,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE
  );
  const visibleResults = results.slice(visibleStartIndex, visibleEndIndex);

  // Update container height when component mounts or resizes (debounced)
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    let resizeTimeout: NodeJS.Timeout;
    const debouncedUpdateHeight = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateHeight, 150);
    };

    updateHeight();
    window.addEventListener("resize", debouncedUpdateHeight);
    return () => {
      window.removeEventListener("resize", debouncedUpdateHeight);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Handle scroll for virtualization
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const performTextSearch = useCallback(
    (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      const searchResults: SearchResult[] = [];

      contentLines.forEach((line, index) => {
        if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
          const lineNumber = index + 1;
          const contextBefore = index > 0 ? contentLines[index - 1] : "";
          const contextAfter =
            index < contentLines.length - 1 ? contentLines[index + 1] : "";

          searchResults.push({
            lineNumber,
            content: line,
            contextBefore,
            contextAfter,
            type: "text",
            searchTerm: searchTerm,
          });
        }
      });

      setResults(searchResults);
      setIsSearching(false);
    },
    [contentLines]
  );

  const performPathSearch = useCallback(
    (pathTerm: string) => {
      if (!pathTerm.trim() || !jsonData) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      const searchResults: SearchResult[] = [];
      const foundPaths = new Set<string>();

      // Convert JSON to lines with paths for searching
      const findPathMatches = (
        obj: any,
        currentPath: string = "",
        lineOffset: number = 0
      ): number => {
        let currentLine = lineOffset;

        if (typeof obj === "object" && obj !== null) {
          if (Array.isArray(obj)) {
            // Array opening bracket
            currentLine++;

            obj.forEach((item, index) => {
              const itemPath = currentPath
                ? `${currentPath}[${index}]`
                : `[${index}]`;

              if (
                itemPath.toLowerCase().includes(pathTerm.toLowerCase()) &&
                !isChildOfFoundPath(itemPath, foundPaths)
              ) {
                // Find the corresponding line in the content
                const lineInContent = findLineForPath(itemPath, currentLine);
                if (lineInContent > 0) {
                  const contextBefore =
                    lineInContent > 1 ? contentLines[lineInContent - 2] : "";
                  const contextAfter =
                    lineInContent < contentLines.length
                      ? contentLines[lineInContent]
                      : "";

                  searchResults.push({
                    lineNumber: lineInContent,
                    content: contentLines[lineInContent - 1],
                    contextBefore,
                    contextAfter,
                    path: itemPath,
                    type: "path",
                    searchTerm: pathTerm,
                  });
                  foundPaths.add(itemPath);
                }
              }

              currentLine = findPathMatches(item, itemPath, currentLine);
            });

            // Array closing bracket
            if (obj.length > 0) currentLine++;
          } else {
            // Object opening bracket
            currentLine++;

            Object.keys(obj).forEach((key) => {
              const keyPath = currentPath ? `${currentPath}.${key}` : key;

              if (
                keyPath.toLowerCase().includes(pathTerm.toLowerCase()) &&
                !isChildOfFoundPath(keyPath, foundPaths)
              ) {
                // Find the corresponding line in the content
                const lineInContent = findLineForPath(keyPath, currentLine);
                if (lineInContent > 0) {
                  const contextBefore =
                    lineInContent > 1 ? contentLines[lineInContent - 2] : "";
                  const contextAfter =
                    lineInContent < contentLines.length
                      ? contentLines[lineInContent]
                      : "";

                  searchResults.push({
                    lineNumber: lineInContent,
                    content: contentLines[lineInContent - 1],
                    contextBefore,
                    contextAfter,
                    path: keyPath,
                    type: "path",
                    searchTerm: pathTerm,
                  });
                  foundPaths.add(keyPath);
                }
              }

              currentLine = findPathMatches(obj[key], keyPath, currentLine);
            });

            // Object closing bracket
            if (Object.keys(obj).length > 0) currentLine++;
          }
        } else {
          // Primitive value
          currentLine++;
        }

        return currentLine;
      };

      // Helper function to check if a path is a child of any already found paths
      const isChildOfFoundPath = (
        currentPath: string,
        foundPaths: Set<string>
      ): boolean => {
        for (const foundPath of foundPaths) {
          if (
            currentPath.startsWith(foundPath + ".") ||
            currentPath.startsWith(foundPath + "[")
          ) {
            return true;
          }
        }
        return false;
      };

      // Helper function to find the line number for a given path
      const findLineForPath = (
        searchPath: string,
        approximateLine: number
      ): number => {
        // Simple heuristic: look around the approximate line for the key
        const pathKey =
          searchPath.split(".").pop()?.split("[")[0] || searchPath;

        for (
          let i = Math.max(0, approximateLine - 5);
          i < Math.min(contentLines.length, approximateLine + 5);
          i++
        ) {
          if (contentLines[i].includes(`"${pathKey}"`)) {
            return i + 1;
          }
        }

        // Fallback: search the entire content
        for (let i = 0; i < contentLines.length; i++) {
          if (contentLines[i].includes(`"${pathKey}"`)) {
            return i + 1;
          }
        }

        return approximateLine;
      };

      findPathMatches(jsonData);
      setResults(searchResults);
      setIsSearching(false);
    },
    [jsonData, contentLines]
  );

  // Global jq instance (loaded via script tag)
  const jqInstanceRef = useRef<any>(null);

  // Load jq-web module
  useEffect(() => {
    const loadJq = async () => {
      if (jqInstanceRef.current || typeof window === "undefined") return;

      try {
        // Load jq-web module and let it use default path resolution
        // Next.js rewrites will redirect /_next/static/chunks/jq.wasm to /jq.wasm
        const jqModule = await import("jq-web");
        const jq = jqModule.default || jqModule;

        // jq-web exports the instance directly, not a factory function
        jqInstanceRef.current = jq;
        console.log("✅ jq-web loaded successfully", jq);
      } catch (error) {
        console.error("❌ Failed to load jq-web:", error);
      }
    };

    loadJq();
  }, []);

  const performJqSearch = useCallback(
    async (jqQuery: string) => {
      if (!jqQuery.trim() || !jsonData) {
        setJqResult("");
        return;
      }

      setIsSearching(true);
      try {
        // Wait for jq to be loaded if it's not ready yet
        let attempts = 0;
        while (!jqInstanceRef.current && attempts < 20) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }

        if (!jqInstanceRef.current) {
          throw new Error("jq-web failed to load");
        }

        const result = jqInstanceRef.current.json(jsonData, jqQuery);

        // Convert result to string, preserving formatting
        let resultString: string;
        if (typeof result === "string") {
          resultString = result;
        } else {
          resultString = JSON.stringify(result, null, 2);
        }

        setJqResult(resultString);
        setResults([]); // Clear other search results when doing jq
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setJqResult(`Error: ${errorMessage}`);
        setResults([]);
      }
      setIsSearching(false);
    },
    [jsonData]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchValue.trim()) return;

      if (searchType === "text") {
        performTextSearch(searchValue);
        setJqResult(""); // Clear jq results when doing other searches
      } else if (searchType === "path") {
        performPathSearch(searchValue);
        setJqResult(""); // Clear jq results when doing other searches
      } else if (searchType === "jq") {
        performJqSearch(searchValue);
      }
    },
    [
      searchValue,
      searchType,
      performTextSearch,
      performPathSearch,
      performJqSearch,
    ]
  );

  // Handle mouse enter to get precomputed path
  const handleResultHover = useCallback(
    (resultIndex: number, lineIndex: number) => {
      setHoveredResult(resultIndex);
      // lineIndex is 1-based, convert to 0-based for array access
      const path = linePathsRef.current[lineIndex - 1] || "root";
      setHoveredPath(path);
      console.log(`📍 Hover path for line ${lineIndex}: "${path}"`);
    },
    []
  );

  // Handle mouse leave
  const handleResultLeave = useCallback(() => {
    setHoveredResult(null);
    setHoveredPath(null);
  }, []);

  // Handle path copy to clipboard
  const handlePathCopy = useCallback(
    async (path: string, event: React.MouseEvent) => {
      event.stopPropagation(); // Prevent triggering the result click

      try {
        await navigator.clipboard.writeText(path);
        setCopiedPath(path);
        toast({
          description: `Path copied: ${path}`,
          duration: 2000,
        });

        // Clear the copied indicator after a short delay
        setTimeout(() => setCopiedPath(null), 2000);
      } catch (error) {
        toast({
          description: "Failed to copy path to clipboard",
          variant: "destructive",
          duration: 2000,
        });
      }
    },
    [toast]
  );

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      onResultClick(result.lineNumber);
    },
    [onResultClick]
  );

  const handleQueryBuilderSubmit = useCallback(
    (query: string) => {
      // Update the search input first
      setSearchValue(query);
      setSearchType("jq");
      
      // Show that query is running
      setIsSearching(true);
      setResults([]);
      setJqResult("");
      
      // Use setTimeout to allow UI to update before running the query
      setTimeout(() => {
        performJqSearch(query);
      }, 100);
    },
    [performJqSearch]
  );

  const handleSaveQuery = useCallback(() => {
    if (!searchValue.trim()) {
      toast({
        description: "No query to save",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }
    setShowSaveDialog(true);
  }, [searchValue, toast]);

  const saveQueryToStorage = useCallback((name: string, description?: string) => {
    const savedQueries = JSON.parse(localStorage.getItem("jq-saved-queries") || "[]");
    const newQuery = {
      id: Date.now().toString(),
      name,
      description,
      query: searchValue,
      createdAt: new Date().toISOString(),
    };
    savedQueries.unshift(newQuery);
    localStorage.setItem("jq-saved-queries", JSON.stringify(savedQueries));
    
    toast({
      description: `Query "${name}" saved successfully`,
      duration: 2000,
    });
    setShowSaveDialog(false);
  }, [searchValue, toast]);

  // Function to highlight search terms in text
  const highlightText = useCallback((text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;

    const regex = new RegExp(
      `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        return (
          <span
            key={index}
            className="bg-yellow-300 dark:bg-yellow-600 font-bold text-gray-900 dark:text-gray-100"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          {/* Single Search Input */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              {searchType === "text" && (
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              )}
              {searchType === "path" && (
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              )}
              {searchType === "jq" && (
                <Code className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              )}
              <Input
                type="text"
                placeholder={
                  searchType === "text"
                    ? "Search text content..."
                    : searchType === "path"
                    ? "JSON path (e.g., user.name, items[0])..."
                    : "jq query (e.g., .[] | select(.age > 25))..."
                }
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchType === "jq" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowQueryBuilder(true)}
                disabled={!jsonData}
                title="Open jq Query Builder"
              >
                <Wrench className="w-4 h-4" />
              </Button>
            )}
            {searchValue.trim() && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSaveQuery}
                title="Save this query"
              >
                <Save className="w-4 h-4" />
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={
                isSearching ||
                ((searchType === "path" || searchType === "jq") && !jsonData)
              }
            >
              Search
            </Button>
          </div>

          {/* Search Type Radio Buttons */}
          <div className="flex items-center justify-between">
            <RadioGroup
              value={searchType}
              onValueChange={(value: "text" | "path" | "jq") =>
                setSearchType(value)
              }
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="text" id="text" />
                <Label htmlFor="text" className="text-sm font-medium">
                  Text
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="path" id="path" />
                <Label htmlFor="path" className="text-sm font-medium">
                  JSON Path
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="jq" id="jq" />
                <Label htmlFor="jq" className="text-sm font-medium">
                  JQ
                </Label>
              </div>
            </RadioGroup>

            <Dialog open={showHelp} onOpenChange={setShowHelp}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  <HelpCircle className="w-4 h-4 mr-1" />
                  Help
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Search Help</DialogTitle>
                  <DialogDescription>
                    Learn how to use different search types to query your JSON
                    data effectively.
                  </DialogDescription>
                </DialogHeader>
                <HelpContent helpTab={helpTab} setHelpTab={setHelpTab} />
              </DialogContent>
            </Dialog>
          </div>
        </form>
      </div>

      {/* Results List */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        {isSearching ? (
          <div className="p-4 text-center text-gray-500">
            {searchType === "jq" ? "Running jq query..." : "Searching..."}
          </div>
        ) : jqResult ? (
          <div className="p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              jq query result:
            </div>
            <Textarea
              value={jqResult}
              readOnly
              className="font-mono text-sm min-h-[400px] resize-none bg-gray-50 dark:bg-gray-900"
              placeholder="jq query results will appear here..."
            />
          </div>
        ) : results.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchValue.trim() && !isSearching
              ? `Press Enter or click Search to find ${searchType} results`
              : "Enter a search term to find results"}
          </div>
        ) : (
          <div className="p-2">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 px-2">
              {results.length} result{results.length === 1 ? "" : "s"} found
            </div>

            {/* Virtual container with proper height */}
            <div
              style={{
                height: results.length * ITEM_HEIGHT,
                position: "relative",
              }}
            >
              {/* Only render visible items */}
              <div
                style={{
                  transform: `translateY(${visibleStartIndex * ITEM_HEIGHT}px)`,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                }}
                className="space-y-2"
              >
                {visibleResults.map((result, virtualIndex) => {
                  const actualIndex = visibleStartIndex + virtualIndex;
                  return (
                    <div
                      key={actualIndex}
                      onClick={() => handleResultClick(result)}
                      onMouseEnter={() =>
                        handleResultHover(actualIndex, result.lineNumber)
                      }
                      onMouseLeave={handleResultLeave}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors relative"
                      style={{ minHeight: ITEM_HEIGHT - 8 }} // Account for margin
                    >
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-shrink-0">
                          Line {result.lineNumber}
                        </div>

                        {/* Fixed positioned path for JSON path search results */}
                        {result.path && (
                          <div
                            className="text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded max-w-xs truncate cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors flex items-center gap-1"
                            title={`${result.path} (click to copy)`}
                            onClick={(e) => handlePathCopy(result.path!, e)}
                          >
                            {copiedPath === result.path ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            {result.type === "path" && result.searchTerm
                              ? highlightText(result.path, result.searchTerm)
                              : result.path}
                          </div>
                        )}
                      </div>

                      {/* Absolutely positioned hover path - doesn't affect layout */}
                      {hoveredResult === actualIndex &&
                        hoveredPath &&
                        !result.path && (
                          <div
                            className="absolute top-3 right-3 z-10 text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded shadow-lg border border-blue-200 dark:border-blue-700 max-w-xs truncate cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors flex items-center gap-1"
                            title={`${hoveredPath} (click to copy)`}
                            onClick={(e) => handlePathCopy(hoveredPath, e)}
                          >
                            {copiedPath === hoveredPath ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            {hoveredPath}
                          </div>
                        )}

                      <div className="font-mono text-sm space-y-1">
                        {result.contextBefore && (
                          <div className="text-gray-400 dark:text-gray-600 truncate">
                            {result.searchTerm
                              ? highlightText(
                                  result.contextBefore,
                                  result.searchTerm
                                )
                              : result.contextBefore}
                          </div>
                        )}
                        <div className="text-gray-900 dark:text-gray-100 bg-yellow-50 dark:bg-yellow-900/30 px-2 py-1 rounded">
                          {result.searchTerm
                            ? highlightText(result.content, result.searchTerm)
                            : result.content}
                        </div>
                        {result.contextAfter && (
                          <div className="text-gray-400 dark:text-gray-600 truncate">
                            {result.searchTerm
                              ? highlightText(
                                  result.contextAfter,
                                  result.searchTerm
                                )
                              : result.contextAfter}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* jq Query Builder Modal */}
      <JqQueryBuilder
        isOpen={showQueryBuilder}
        onClose={() => setShowQueryBuilder(false)}
        onSubmit={handleQueryBuilderSubmit}
        initialQuery={searchType === "jq" ? searchValue : ""}
      />

      {/* Save Query Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4 text-gray-900">Save Query</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const name = formData.get("name") as string;
                const description = formData.get("description") as string;
                if (name) {
                  saveQueryToStorage(name, description || undefined);
                }
              }}
            >
              <div className="mb-4">
                <Label htmlFor="save-query-name" className="text-gray-900">
                  Query Name
                </Label>
                <Input
                  id="save-query-name"
                  name="name"
                  placeholder="My useful query"
                  required
                  autoFocus
                />
              </div>
              <div className="mb-4">
                <Label htmlFor="save-query-description" className="text-gray-900">
                  Description (optional)
                </Label>
                <Input
                  id="save-query-description"
                  name="description"
                  placeholder="What does this query do?"
                />
              </div>
              <div className="mb-4">
                <Label className="text-gray-700">Query</Label>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded border text-gray-900">
                  {searchValue}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
