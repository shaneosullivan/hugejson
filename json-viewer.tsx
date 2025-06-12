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
  Github,
} from "lucide-react";
import { SearchResults } from "./components/search-results";
import { Logo } from "./components/logo";

// Worker code as strings with file reading and performance tracking
const jsonParserWorkerCode = `
self.onmessage = (e) => {
  const { type, data, file } = e.data
  const startTime = performance.now()

  try {
    switch (type) {
      case "READ_AND_PARSE_FILE":
        console.log('🔧 Worker: Starting file read and parse')
        const fileStartTime = performance.now()
        
        const reader = new FileReader()
        reader.onload = (event) => {
          const readEndTime = performance.now()
          console.log(\`📖 Worker: File read completed in \${(readEndTime - fileStartTime).toFixed(2)}ms\`)
          
          const content = event.target.result
          
          self.postMessage({
            type: "FILE_READ_SUCCESS",
            content: content,
            readTime: readEndTime - fileStartTime
          })
          
          // Now parse the JSON
          const parseStartTime = performance.now()
          console.log('🔄 Worker: Starting JSON parse')
          
          try {
            const parsed = JSON.parse(content)
            const parseEndTime = performance.now()
            console.log(\`✅ Worker: JSON parse completed in \${(parseEndTime - parseStartTime).toFixed(2)}ms\`)
            
            self.postMessage({
              type: "PARSE_SUCCESS",
              data: parsed,
              parseTime: parseEndTime - parseStartTime,
              totalTime: parseEndTime - fileStartTime
            })
          } catch (parseError) {
            const parseEndTime = performance.now()
            console.log(\`❌ Worker: JSON parse failed in \${(parseEndTime - parseStartTime).toFixed(2)}ms\`)
            
            self.postMessage({
              type: "PARSE_ERROR",
              error: parseError.message,
              parseTime: parseEndTime - parseStartTime
            })
          }
        }
        
        reader.onerror = () => {
          const errorTime = performance.now()
          console.log(\`❌ Worker: File read failed in \${(errorTime - fileStartTime).toFixed(2)}ms\`)
          
          self.postMessage({
            type: "FILE_READ_ERROR",
            error: "Failed to read file",
            readTime: errorTime - fileStartTime
          })
        }
        
        reader.readAsText(file)
        break

      case "PARSE_JSON":
        console.log('🔄 Worker: Starting JSON parse (text input)')
        const parseStartTime = performance.now()
        
        const parsed = JSON.parse(data)
        const parseEndTime = performance.now()
        
        console.log(\`✅ Worker: JSON parse completed in \${(parseEndTime - parseStartTime).toFixed(2)}ms\`)
        
        self.postMessage({
          type: "PARSE_SUCCESS",
          data: parsed,
          parseTime: parseEndTime - parseStartTime
        })
        break

      case "VALIDATE_JSON":
        console.log('🔍 Worker: Starting JSON validation')
        const validateStartTime = performance.now()
        
        JSON.parse(data)
        const validateEndTime = performance.now()
        
        console.log(\`✅ Worker: JSON validation completed in \${(validateEndTime - validateStartTime).toFixed(2)}ms\`)
        
        self.postMessage({
          type: "VALIDATION_SUCCESS",
          data: true,
          validateTime: validateEndTime - validateStartTime
        })
        break

      default:
        throw new Error(\`Unknown message type: \${type}\`)
    }
  } catch (error) {
    const errorTime = performance.now()
    console.log(\`❌ Worker: Error in \${(errorTime - startTime).toFixed(2)}ms: \${error.message}\`)
    
    self.postMessage({
      type: "PARSE_ERROR",
      error: error.message,
      errorTime: errorTime - startTime
    })
  }
}
`;

const jsonFormatterWorkerCode = `
self.onmessage = (e) => {
  const { type, data, indent } = e.data

  try {
    switch (type) {
      case "FORMAT_JSON":
        const parsed = JSON.parse(data)
        const formatted = JSON.stringify(parsed, null, indent)
        self.postMessage({
          type: "FORMAT_SUCCESS",
          data: formatted,
        })
        break

      default:
        throw new Error(\`Unknown message type: \${type}\`)
    }
  } catch (error) {
    self.postMessage({
      type: "FORMAT_ERROR",
      error: error.message,
    })
  }
}
`;

function createWorkerFromCode(code: string): Worker {
  const blob = new Blob([code], { type: "application/javascript" });
  return new Worker(URL.createObjectURL(blob));
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

  // Initialize workers
  useEffect(() => {
    try {
      parserWorkerRef.current = createWorkerFromCode(jsonParserWorkerCode);
      formatterWorkerRef.current = createWorkerFromCode(
        jsonFormatterWorkerCode
      );

      const parserWorker = parserWorkerRef.current;
      const formatterWorker = formatterWorkerRef.current;

      parserWorker.onmessage = (e) => {
        const messageReceiveTime = performance.now();
        const {
          type,
          data,
          error,
          content,
          readTime,
          parseTime,
          totalTime,
          validateTime,
          errorTime,
        } = e.data;
        
        const messageProcessTime = performance.now() - messageReceiveTime;
        console.log(`📨 Main: Message received and processed in ${messageProcessTime.toFixed(2)}ms (type: ${type})`);

        if (type === "FILE_READ_SUCCESS") {
          const timeSinceStart = messageReceiveTime - performanceTimerRef.current;
          console.log(`📄 Main: File content received after ${timeSinceStart.toFixed(2)}ms from start`);
          
          const uiUpdateStart = performance.now();
          console.log(`📏 Main: Content size: ${(content.length / 1024 / 1024).toFixed(2)}MB`);

          setLeftContent(content);

          const uiUpdateEnd = performance.now();
          console.log(
            `🎨 Main: UI update (setLeftContent) completed in ${(
              uiUpdateEnd - uiUpdateStart
            ).toFixed(2)}ms`
          );
        } else if (type === "PARSE_SUCCESS") {
          const timeSinceStart = messageReceiveTime - performanceTimerRef.current;
          console.log(`🎯 Main: Parse success received after ${timeSinceStart.toFixed(2)}ms from start`);
          
          const reactUpdatesStart = performance.now();

          setRightContent(data);
          setError(null);
          setIsLoading(false);
          
          const reactUpdatesEnd = performance.now();
          console.log(`⚛️ Main: React state updates completed in ${(reactUpdatesEnd - reactUpdatesStart).toFixed(2)}ms`);

          // Calculate stats
          const statsStartTime = performance.now();
          const jsonString = JSON.stringify(data);
          const stringifyEnd = performance.now();
          console.log(`🔄 Main: JSON.stringify completed in ${(stringifyEnd - statsStartTime).toFixed(2)}ms`);
          
          const nodeCountStart = performance.now();
          const nodeCount = countNodes(data);
          const nodeCountEnd = performance.now();
          console.log(`🌳 Main: Node counting completed in ${(nodeCountEnd - nodeCountStart).toFixed(2)}ms`);
          
          setJsonStats({
            size: jsonString.length,
            nodes: nodeCount,
          });

          const statsEndTime = performance.now();
          const totalProcessTime = performance.now() - performanceTimerRef.current;
          const delayTime = totalProcessTime - (totalTime || 0);

          console.log(
            `📊 Main: Stats calculation completed in ${(
              statsEndTime - statsStartTime
            ).toFixed(2)}ms`
          );
          console.log(
            `⏱️ TOTAL WORKFLOW TIME: ${totalProcessTime.toFixed(2)}ms`
          );
          console.log(
            `🐌 UNACCOUNTED DELAY TIME: ${delayTime.toFixed(2)}ms`
          );

          if (parseTime)
            console.log(`   - Parse time: ${parseTime.toFixed(2)}ms`);
          if (readTime)
            console.log(`   - File read time: ${readTime.toFixed(2)}ms`);
          if (totalTime)
            console.log(`   - Worker total time: ${totalTime.toFixed(2)}ms`);
          console.log(
            `   - JSON.stringify: ${(stringifyEnd - statsStartTime).toFixed(2)}ms`
          );
          console.log(
            `   - Node counting: ${(nodeCountEnd - nodeCountStart).toFixed(2)}ms`
          );
          console.log(
            `   - React updates: ${(reactUpdatesEnd - reactUpdatesStart).toFixed(2)}ms`
          );
          console.log(
            `   - Stats calculation: ${(statsEndTime - statsStartTime).toFixed(
              2
            )}ms`
          );
        } else if (type === "PARSE_ERROR" || type === "FILE_READ_ERROR") {
          console.log(`❌ Main: Error received: ${error}`);
          setError(error);
          setRightContent(null);
          setJsonStats(null);
          setIsLoading(false);

          const totalErrorTime =
            performance.now() - performanceTimerRef.current;
          console.log(`⏱️ ERROR WORKFLOW TIME: ${totalErrorTime.toFixed(2)}ms`);
          if (errorTime)
            console.log(`   - Error time: ${errorTime.toFixed(2)}ms`);
          if (validateTime)
            console.log(`   - Validate time: ${validateTime.toFixed(2)}ms`);
        }
      };

      formatterWorker.onmessage = (e) => {
        const { type, data, error } = e.data;
        setIsLoading(false);

        if (type === "FORMAT_SUCCESS") {
          setLeftContent(data);
          setError(null);
        } else if (type === "FORMAT_ERROR") {
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
  const countNodes = useCallback(
    (obj: any, visited = new WeakSet(), depth = 0): number => {
      if (depth > 50) return 0; // Prevent infinite recursion
      if (typeof obj !== "object" || obj === null) return 1;
      if (visited.has(obj)) return 1; // Circular reference

      visited.add(obj);
      let count = 1;

      try {
        if (Array.isArray(obj)) {
          count += obj.reduce(
            (acc, item) => acc + countNodes(item, visited, depth + 1),
            0
          );
        } else {
          const keys = Object.keys(obj);
          count += keys.reduce(
            (acc, key) => acc + countNodes(obj[key], visited, depth + 1),
            0
          );
        }
      } catch (error) {
        console.warn("Error counting nodes:", error);
      }

      return count;
    },
    []
  );

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
        console.log(
          `📁 Main: File selected (${file.name}, ${(
            file.size /
            1024 /
            1024
          ).toFixed(2)}MB)`
        );
        performanceTimerRef.current = performance.now();

        if (file.size > 50 * 1024 * 1024) {
          // 50MB limit
          setError("File too large. Please use files smaller than 50MB.");
          return;
        }

        console.log("🔄 Main: Setting loading state");
        const loadingStartTime = performance.now();

        // Show loading state immediately and force UI update
        setIsLoading(true);
        setError(null);

        const loadingEndTime = performance.now();
        console.log(
          `🎨 Main: Loading state set in ${(
            loadingEndTime - loadingStartTime
          ).toFixed(2)}ms`
        );

        // Use requestAnimationFrame to ensure loading UI is rendered before processing
        requestAnimationFrame(() => {
          console.log("🎬 Main: requestAnimationFrame callback - loading UI should be visible");
          
          // Add another frame to be extra sure the loading UI is painted
          requestAnimationFrame(() => {
            const animationFrameTime = performance.now();
            const uiRenderDelay = animationFrameTime - loadingEndTime;
            console.log(`🖼️ Main: UI render delay: ${uiRenderDelay.toFixed(2)}ms`);
            
            console.log("🚀 Main: Starting worker file processing (after UI render)");
            const workerStartTime = performance.now();

            try {
              parserWorkerRef.current?.postMessage({
                type: "READ_AND_PARSE_FILE",
                file: file,
              });

              const workerDispatchTime = performance.now();
              console.log(
                `📤 Main: Worker message dispatched in ${(
                  workerDispatchTime - workerStartTime
                ).toFixed(2)}ms`
              );
            } catch (error) {
              console.log("❌ Main: Failed to dispatch to worker");
              setIsLoading(false);
              setError("Failed to process file");
            }
          });
        }); // Small delay to ensure UI update
      }
    },
    []
  );

  const handleFormat = useCallback(() => {
    if (!leftContent.trim()) return;

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
    if (!leftContent) return;

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
        const formatted = JSON.stringify(rightContent, null, indent);
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

        console.log(
          `🎯 Main: File dropped (${file.name}, ${(
            file.size /
            1024 /
            1024
          ).toFixed(2)}MB)`
        );
        performanceTimerRef.current = performance.now();

        console.log("🔄 Main: Setting loading state for dropped file");
        const loadingStartTime = performance.now();

        // Show loading state immediately and force UI update
        setIsLoading(true);
        setError(null);

        const loadingEndTime = performance.now();
        console.log(
          `🎨 Main: Loading state set in ${(
            loadingEndTime - loadingStartTime
          ).toFixed(2)}ms`
        );

        // Use requestAnimationFrame to ensure loading UI is rendered before processing
        requestAnimationFrame(() => {
          console.log("🎬 Main: requestAnimationFrame callback - loading UI should be visible (dropped file)");
          
          // Add another frame to be extra sure the loading UI is painted
          requestAnimationFrame(() => {
            const animationFrameTime = performance.now();
            const uiRenderDelay = animationFrameTime - loadingEndTime;
            console.log(`🖼️ Main: UI render delay: ${uiRenderDelay.toFixed(2)}ms (dropped file)`);
            
            console.log(
              "🚀 Main: Starting worker file processing for dropped file (after UI render)"
            );
            const workerStartTime = performance.now();

            try {
              parserWorkerRef.current?.postMessage({
                type: "READ_AND_PARSE_FILE",
                file: file,
              });

              const workerDispatchTime = performance.now();
              console.log(
                `📤 Main: Worker message dispatched in ${(
                  workerDispatchTime - workerStartTime
                ).toFixed(2)}ms`
              );
            } catch (error) {
              console.log(
                "❌ Main: Failed to dispatch to worker for dropped file"
              );
              setIsLoading(false);
              setError("Failed to process dropped file");
            }
          });
        }); // Small delay to ensure UI update
      }
    },
    [handleLeftContentChange]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  };

  return (
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
                  View and format large JSON files with ease
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
                className="bg-white/60 hover:bg-white/80 backdrop-blur-sm border-gray-200/50"
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
                  <Github className="h-5 w-5" />
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
                  <SelectTrigger className="h-8 text-xs bg-white/80 hover:bg-white/80 backdrop-blur-sm border-gray-200/50">
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
                  className="hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <Code className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDownload}
                  disabled={!leftContent}
                  title="Download JSON"
                  className="hover:bg-emerald-50 hover:text-emerald-600"
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
              className="hover:bg-blue-50 hover:text-blue-600"
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
}
