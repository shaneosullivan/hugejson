"use client";

import type React from "react";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Download,
  Code,
  Copy,
  FileText,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { SearchResults } from "./components/search-results";
import { Logo } from "./components/logo";
import { safeStringify } from "./lib/iterativeStringify";

async function verifyWorkerFile(path: string): Promise<boolean> {
  try {
    const response = await fetch(path);
    const exists = response.ok;
    console.log(`🔍 Worker file ${path}: ${exists ? 'exists' : 'NOT FOUND'} (status: ${response.status})`);
    return exists;
  } catch (error) {
    console.error(`❌ Failed to verify worker file ${path}:`, error);
    return false;
  }
}

function createWorkerFromFile(path: string): Worker {
  try {
    console.log(`🔧 Creating worker from: ${path}`);
    const worker = new Worker(path);
    console.log(`✅ Worker created successfully: ${path}`);
    return worker;
  } catch (error) {
    console.error(`❌ Failed to create worker from ${path}:`, error);
    throw error;
  }
}

export default function JsonViewer() {
  const [leftContent, setLeftContent] = useState("");
  const [rightContent, setRightContent] = useState<any>(null);
  const [indentType, setIndentType] = useState("2-spaces");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jsonStats, setJsonStats] = useState<{
    size: number;
    nodes: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const parserWorkerRef = useRef<Worker | null>(null);
  const formatterWorkerRef = useRef<Worker | null>(null);
  const performanceTimerRef = useRef<number>(0);

  // Clear textarea on mount to prevent browser form restoration
  useEffect(() => {
    // Clear both the React state and the DOM element
    setLeftContent("");
    if (textareaRef.current) {
      textareaRef.current.value = "";
    }
  }, []);

  // Initialize workers
  useEffect(() => {
    async function initWorkers() {
      try {
        console.log('🚀 Initializing workers...');
        
        // First verify the worker files exist
        const parserExists = await verifyWorkerFile('/workers/json-parser.js');
        const formatterExists = await verifyWorkerFile('/workers/json-formatter.js');
        
        if (!parserExists || !formatterExists) {
          setError(`Worker files not found - Parser: ${parserExists}, Formatter: ${formatterExists}`);
          return;
        }
        
        parserWorkerRef.current = createWorkerFromFile('/workers/json-parser.js');
        formatterWorkerRef.current = createWorkerFromFile('/workers/json-formatter.js');

      const parserWorker = parserWorkerRef.current;
      const formatterWorker = formatterWorkerRef.current;

      parserWorker.onmessage = (e) => {
        const { type, data, error, content } = e.data;

        if (type === "FILE_READ_SUCCESS") {
          setLeftContent(content);
        } else if (type === "PARSE_SUCCESS") {
          if (e.data.dataString) {
            // Parse the stringified data
            const parsedData = JSON.parse(e.data.dataString);
            setRightContent(parsedData);
          } else {
            // Fallback for legacy format
            setRightContent(data);
          }
          setError(null);
          setIsLoading(false);
        } else if (type === "PARSE_ERROR" || type === "FILE_READ_ERROR") {
          setError(error);
          setRightContent(null);
          setJsonStats(null);
          setIsLoading(false);
        }
      };

      formatterWorker.onmessage = (e) => {
        const { type, error } = e.data;
        setIsLoading(false);

        if (type === "FORMAT_SUCCESS") {
          if (e.data.dataString) {
            setLeftContent(e.data.dataString);
          } else {
            // Fallback for legacy format
            setLeftContent(e.data.data);
          }
          setError(null);
        } else if (type === "FORMAT_ERROR") {
          console.error("Formatter worker error:", error);
          setError(error);
        }
      };

      parserWorker.onerror = (error) => {
        console.error("Parser worker error:", error);
        setIsLoading(false);
        setError("Worker error occurred");
      };

      formatterWorker.onerror = (error) => {
        console.error("Formatter worker error:", error);
        setIsLoading(false);
        setError("Formatter error occurred");
      };
      } catch (error) {
        console.error("Failed to initialize workers:", error);
        setError("Failed to initialize workers");
      }
    }

    initWorkers();

    return () => {
      try {
        parserWorkerRef.current?.terminate();
        formatterWorkerRef.current?.terminate();
      } catch (error) {
        console.error("Error terminating workers:", error);
      }
    };
  }, []);

  // Count nodes in JSON for stats

  const handleLeftContentChange = useCallback((value: string) => {
    console.log("✏️ Main: Text input changed, starting parse");
    performanceTimerRef.current = performance.now();

    setLeftContent(value);

    if (value.trim()) {
      setIsLoading(true);
      setError(null);
      try {
        parserWorkerRef.current?.postMessage({
          type: "PARSE_JSON",
          data: value,
        });
      } catch (error) {
        setIsLoading(false);
        setError("Failed to process JSON");
      }
    } else {
      setRightContent(null);
      setError(null);
      setJsonStats(null);
    }
  }, []);

  const handleFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        performanceTimerRef.current = performance.now();

        if (file.size > 50 * 1024 * 1024) {
          // 50MB limit
          setError("File too large. Please use files smaller than 50MB.");
          return;
        }

        // Show loading state immediately and force UI update
        setIsLoading(true);
        setError(null);

        // Use requestAnimationFrame to ensure loading UI is rendered before processing
        requestAnimationFrame(() => {
          // Add another frame to be extra sure the loading UI is painted
          requestAnimationFrame(() => {
            try {
              parserWorkerRef.current?.postMessage({
                type: "READ_AND_PARSE_FILE",
                file: file,
              });
            } catch (error) {
              setIsLoading(false);
              setError("Failed to process file");
            }
          });
        });
      }
    },
    []
  );

  const handleFormat = useCallback(() => {
    if (!leftContent.trim()) {
      return;
    }

    setIsLoading(true);
    const indent =
      indentType === "2-spaces"
        ? 2
        : indentType === "4-spaces"
        ? 4
        : indentType === "1-tab"
        ? "\t"
        : 2;

    try {
      formatterWorkerRef.current?.postMessage({
        type: "FORMAT_JSON",
        data: leftContent,
        indent,
      });
    } catch (error) {
      setIsLoading(false);
      setError("Failed to format JSON");
    }
  }, [leftContent, indentType]);

  const handleDownload = useCallback(() => {
    if (!leftContent) {
      return;
    }

    try {
      const blob = new Blob([leftContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "data.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      setError("Failed to download file");
    }
  }, [leftContent]);

  const handleCopyFormatted = useCallback(() => {
    if (rightContent) {
      try {
        const indent =
          indentType === "2-spaces"
            ? 2
            : indentType === "4-spaces"
            ? 4
            : indentType === "1-tab"
            ? "\t"
            : 2;
        const formatted = safeStringify(rightContent, indent);
        navigator.clipboard.writeText(formatted);
      } catch (error) {
        setError("Failed to copy to clipboard");
      }
    }
  }, [rightContent, indentType]);

  // Scroll to line functionality with highlighting
  const handleScrollToLine = useCallback((lineNumber: number) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const lines = textarea.value.split("\n");

      if (lineNumber > 0 && lineNumber <= lines.length) {
        // Calculate the character position for the start of the target line
        const targetLineStart =
          lines.slice(0, lineNumber - 1).join("\n").length +
          (lineNumber > 1 ? 1 : 0);
        const targetLineEnd = targetLineStart + lines[lineNumber - 1].length;

        // Set cursor position and select the entire line
        textarea.focus();
        textarea.setSelectionRange(targetLineStart, targetLineEnd);

        // Calculate approximate scroll position
        const lineHeight = 20; // Approximate line height in pixels
        const scrollTop = (lineNumber - 1) * lineHeight;

        // Scroll to the line with some offset to center it
        textarea.scrollTop = Math.max(0, scrollTop - textarea.clientHeight / 2);
      }
    }
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.size > 50 * 1024 * 1024) {
          // 50MB limit
          setError("File too large. Please use files smaller than 50MB.");
          return;
        }

        performanceTimerRef.current = performance.now();

        // Show loading state immediately and force UI update
        setIsLoading(true);
        setError(null);

        // Use requestAnimationFrame to ensure loading UI is rendered before processing
        requestAnimationFrame(() => {
          // Add another frame to be extra sure the loading UI is painted
          requestAnimationFrame(() => {
            try {
              parserWorkerRef.current?.postMessage({
                type: "READ_AND_PARSE_FILE",
                file: file,
              });
            } catch (error) {
              setIsLoading(false);
              setError("Failed to process dropped file");
            }
          });
        });
      }
    },
    [handleLeftContentChange]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) {
      return "0 Bytes";
    }
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  };

  const content = (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Beautiful gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-blue-900 dark:to-violet-900">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent dark:via-white/5"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 py-4 px-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Logo className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                  Huge JSON Viewer
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View and search large JSON files
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {jsonStats && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-gray-200/50 dark:border-gray-600/50">
                  {formatFileSize(jsonStats.size)} •{" "}
                  {jsonStats.nodes.toLocaleString()} nodes
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleFileUpload}
                className="bg-white/90 hover:bg-white backdrop-blur-sm border-gray-300 text-gray-800 font-medium"
              >
                <Upload className="w-4 h-4 mr-2" />
                Load File
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <a
                  href="https://github.com/shaneosullivan/hugejson"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View source on GitHub"
                >
                  <svg
                    height="34"
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    version="1.1"
                    width="34"
                    className=""
                    style={{ height: "34px", width: "34px" }}
                  >
                    <path
                      d="M12 1C5.9225 1 1 5.9225 1 12C1 16.8675 4.14875 20.9787 8.52125 22.4362C9.07125 22.5325 9.2775 22.2025 9.2775 21.9137C9.2775 21.6525 9.26375 20.7862 9.26375 19.865C6.5 20.3737 5.785 19.1912 5.565 18.5725C5.44125 18.2562 4.905 17.28 4.4375 17.0187C4.0525 16.8125 3.5025 16.3037 4.42375 16.29C5.29 16.2762 5.90875 17.0875 6.115 17.4175C7.105 19.0812 8.68625 18.6137 9.31875 18.325C9.415 17.61 9.70375 17.1287 10.02 16.8537C7.5725 16.5787 5.015 15.63 5.015 11.4225C5.015 10.2262 5.44125 9.23625 6.1425 8.46625C6.0325 8.19125 5.6475 7.06375 6.2525 5.55125C6.2525 5.55125 7.17375 5.2625 9.2775 6.67875C10.1575 6.43125 11.0925 6.3075 12.0275 6.3075C12.9625 6.3075 13.8975 6.43125 14.7775 6.67875C16.8813 5.24875 17.8025 5.55125 17.8025 5.55125C18.4075 7.06375 18.0225 8.19125 17.9125 8.46625C18.6138 9.23625 19.04 10.2125 19.04 11.4225C19.04 15.6437 16.4688 16.5787 14.0213 16.8537C14.42 17.1975 14.7638 17.8575 14.7638 18.8887C14.7638 20.36 14.75 21.5425 14.75 21.9137C14.75 22.2025 14.9563 22.5462 15.5063 22.4362C19.8513 20.9787 23 16.8537 23 12C23 5.9225 18.0775 1 12 1Z"
                      fill="currentColor"
                    ></path>
                  </svg>
                </a>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel */}
          <div className="w-1/2 flex flex-col border-r border-gray-200/50 dark:border-gray-700/50 relative">
            <div className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  JSON Input
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={indentType} onValueChange={setIndentType}>
                  <SelectTrigger className="h-8 text-xs bg-white/90 hover:bg-white backdrop-blur-sm border-gray-300 text-gray-800 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2-spaces">2 Spaces</SelectItem>
                    <SelectItem value="4-spaces">4 Spaces</SelectItem>
                    <SelectItem value="1-tab">1 Tab</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleFormat}
                  disabled={!leftContent || isLoading}
                  title="Format JSON"
                  className="text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-300/50 bg-white/80"
                >
                  <Code className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDownload}
                  disabled={!leftContent}
                  title="Download JSON"
                  className="text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 border border-gray-300/50 bg-white/80"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div
              className={`flex-1 relative transition-colors duration-200 ${
                isDragging
                  ? "bg-indigo-50/80 dark:bg-indigo-900/30"
                  : "bg-white/60 dark:bg-gray-800/60"
              } backdrop-blur-sm`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <textarea
                ref={textareaRef}
                value={leftContent}
                onChange={(e) => handleLeftContentChange(e.target.value)}
                placeholder="Paste your JSON here, drag & drop a JSON file, or click 'Load File' to get started..."
                className="absolute inset-0 p-4 font-mono text-sm resize-none border-none outline-none w-full h-full bg-transparent dark:text-gray-100 placeholder:text-gray-400 whitespace-nowrap overflow-x-auto"
                spellCheck={false}
              />
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-indigo-50/90 dark:bg-indigo-900/90 backdrop-blur-sm pointer-events-none">
                  <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-xl p-8 text-center border border-indigo-200/50 dark:border-indigo-700/50">
                    <Upload className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
                    <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Drop your JSON file here
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      We'll parse it instantly
                    </p>
                  </div>
                </div>
              )}
              {isLoading && leftContent && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm pointer-events-none">
                  <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-xl p-8 text-center border border-gray-200/50 dark:border-gray-700/50">
                    <Zap className="w-16 h-16 mx-auto text-indigo-500 mb-4 animate-spin" />
                    <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Processing JSON file...
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Please wait while we parse your data
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center Controls */}
          <div className="w-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col items-center py-6 space-y-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyFormatted}
              disabled={!rightContent}
              title="Copy Formatted JSON"
              className="text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-300/50 bg-white/80"
            >
              <Copy className="w-4 h-4" />
            </Button>

            {isLoading && (
              <div className="text-center text-indigo-600 dark:text-indigo-400">
                <Zap className="animate-spin h-5 w-5 mx-auto" />
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="w-1/2 flex flex-col bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
            <div className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Search Results
                </h2>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {error && (
                <div className="bg-red-50/80 dark:bg-red-900/30 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 rounded-lg p-4 m-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                    <p className="text-red-800 dark:text-red-400 text-sm font-medium">
                      Error:
                    </p>
                  </div>
                  <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                    {error}
                  </p>
                </div>
              )}
              <SearchResults
                content={leftContent}
                jsonData={rightContent}
                onResultClick={handleScrollToLine}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json,text/plain"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );

  return content;
}
