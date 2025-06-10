"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Download, Code, Minimize2, Maximize2, Copy, FileText, Zap, AlertTriangle } from "lucide-react"
import { SimpleJsonTree } from "./components/simple-json-tree"
import { JsonSearch } from "./components/json-search"
import { Logo } from "./components/logo"

// Worker code as strings (same as before)
const jsonParserWorkerCode = `
self.onmessage = (e) => {
  const { type, data } = e.data

  try {
    switch (type) {
      case "PARSE_JSON":
        const parsed = JSON.parse(data)
        self.postMessage({
          type: "PARSE_SUCCESS",
          data: parsed,
        })
        break

      case "VALIDATE_JSON":
        JSON.parse(data)
        self.postMessage({
          type: "VALIDATION_SUCCESS",
          data: true,
        })
        break

      default:
        throw new Error(\`Unknown message type: \${type}\`)
    }
  } catch (error) {
    self.postMessage({
      type: "PARSE_ERROR",
      error: error.message,
    })
  }
}
`

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
`

const jsonSearchWorkerCode = `
self.onmessage = (e) => {
  const { type, data, searchTerm, caseSensitive = false, fullWord = false } = e.data

  try {
    switch (type) {
      case "SEARCH_JSON":
        const matches = findMatches(data, searchTerm, caseSensitive, fullWord)
        self.postMessage({
          type: "SEARCH_SUCCESS",
          matches: matches,
          count: matches.length,
        })
        break

      default:
        throw new Error(\`Unknown message type: \${type}\`)
    }
  } catch (error) {
    self.postMessage({
      type: "SEARCH_ERROR",
      error: error.message,
    })
  }
}

function findMatches(obj, searchTerm, caseSensitive, fullWord) {
  if (!searchTerm || !obj) return []

  const matches = []
  const searchTermToUse = caseSensitive ? searchTerm : searchTerm.toLowerCase()

  function matchesText(text, searchTerm, caseSensitive, fullWord) {
    const textToSearch = caseSensitive ? text : text.toLowerCase()

    if (fullWord) {
      const regex = new RegExp(\`\\\\b\${escapeRegExp(searchTerm)}\\\\b\`, caseSensitive ? "g" : "gi")
      return regex.test(textToSearch)
    } else {
      return textToSearch.includes(searchTerm)
    }
  }

  function escapeRegExp(string) {
    return string
      .replace(/\\\\/g, "\\\\\\\\")
      .replace(/\\./g, "\\\\.")
      .replace(/\\*/g, "\\\\*")
      .replace(/\\+/g, "\\\\+")
      .replace(/\\?/g, "\\\\?")
      .replace(/\\^/g, "\\\\^")
      .replace(/\\$/g, "\\\\$")
      .replace(/\\{/g, "\\\\{")
      .replace(/\\}/g, "\\\\}")
      .replace(/\\(/g, "\\\\(")
      .replace(/\\)/g, "\\\\)")
      .replace(/\\|/g, "\\\\|")
      .replace(/\\[/g, "\\\\[")
      .replace(/\\]/g, "\\\\]")
  }

  function searchInValue(value, path, key = null) {
    // Check if key matches (for object properties)
    if (key !== null && typeof key === "string") {
      if (matchesText(key, searchTermToUse, caseSensitive, fullWord)) {
        matches.push({
          path: path,
          value: key,
          type: "key",
        })
      }
    }

    // Check if current value matches
    if (value !== null && value !== undefined) {
      const valueStr = String(value)
      if (matchesText(valueStr, searchTermToUse, caseSensitive, fullWord)) {
        matches.push({
          path: path,
          value: value,
          type: typeof value,
        })
      }
    }

    // Recursively search in objects and arrays
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          const itemPath = path === "root" ? \`[\${index}]\` : \`\${path}[\${index}]\`
          searchInValue(item, itemPath, index)
        })
      } else {
        Object.keys(value).forEach((objKey) => {
          const keyPath = path === "root" ? objKey : \`\${path}.\${objKey}\`
          searchInValue(value[objKey], keyPath, objKey)
        })
      }
    }
  }

  searchInValue(obj, "root")
  return matches
}
`

function createWorkerFromCode(code: string): Worker {
  const blob = new Blob([code], { type: "application/javascript" })
  return new Worker(URL.createObjectURL(blob))
}

export default function JsonViewer() {
  const [leftContent, setLeftContent] = useState("")
  const [rightContent, setRightContent] = useState<any>(null)
  const [indentType, setIndentType] = useState("2-spaces")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collapsedLevels, setCollapsedLevels] = useState<Set<number>>(new Set())
  const [collapseLevel, setCollapseLevel] = useState("0")
  const [isDragging, setIsDragging] = useState(false)
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchMatches, setSearchMatches] = useState<any[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [navigateToMatch, setNavigateToMatch] = useState<number | null>(null)
  const [jsonStats, setJsonStats] = useState<{ size: number; nodes: number } | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const parserWorkerRef = useRef<Worker | null>(null)
  const formatterWorkerRef = useRef<Worker | null>(null)
  const searchWorkerRef = useRef<Worker | null>(null)

  // Initialize workers
  useEffect(() => {
    try {
      parserWorkerRef.current = createWorkerFromCode(jsonParserWorkerCode)
      formatterWorkerRef.current = createWorkerFromCode(jsonFormatterWorkerCode)
      searchWorkerRef.current = createWorkerFromCode(jsonSearchWorkerCode)

      const parserWorker = parserWorkerRef.current
      const formatterWorker = formatterWorkerRef.current
      const searchWorker = searchWorkerRef.current

      parserWorker.onmessage = (e) => {
        const { type, data, error } = e.data
        setIsLoading(false)

        if (type === "PARSE_SUCCESS") {
          setRightContent(data)
          setError(null)
          // Calculate stats
          const jsonString = JSON.stringify(data)
          setJsonStats({
            size: jsonString.length,
            nodes: countNodes(data),
          })
        } else if (type === "PARSE_ERROR") {
          setError(error)
          setRightContent(null)
          setJsonStats(null)
        }
      }

      formatterWorker.onmessage = (e) => {
        const { type, data, error } = e.data
        setIsLoading(false)

        if (type === "FORMAT_SUCCESS") {
          setLeftContent(data)
          setError(null)
        } else if (type === "FORMAT_ERROR") {
          setError(error)
        }
      }

      searchWorker.onmessage = (e) => {
        const { type, matches, count, error } = e.data
        setIsSearching(false)

        if (type === "SEARCH_SUCCESS") {
          setSearchMatches(matches || [])
          setCurrentMatchIndex(0) // Reset to first match
        } else if (type === "SEARCH_ERROR") {
          console.error("Search error:", error)
          setSearchMatches([])
          setCurrentMatchIndex(0)
        }
      }

      parserWorker.onerror = (error) => {
        console.error("Parser worker error:", error)
        setIsLoading(false)
        setError("Worker error occurred")
      }

      formatterWorker.onerror = (error) => {
        console.error("Formatter worker error:", error)
        setIsLoading(false)
        setError("Formatter error occurred")
      }

      searchWorker.onerror = (error) => {
        console.error("Search worker error:", error)
        setIsSearching(false)
        setSearchMatches([])
      }
    } catch (error) {
      console.error("Failed to initialize workers:", error)
      setError("Failed to initialize workers")
    }

    return () => {
      try {
        parserWorkerRef.current?.terminate()
        formatterWorkerRef.current?.terminate()
        searchWorkerRef.current?.terminate()
      } catch (error) {
        console.error("Error terminating workers:", error)
      }
    }
  }, [])

  // Count nodes in JSON for stats
  const countNodes = useCallback((obj: any, visited = new WeakSet(), depth = 0): number => {
    if (depth > 50) return 0 // Prevent infinite recursion
    if (typeof obj !== "object" || obj === null) return 1
    if (visited.has(obj)) return 1 // Circular reference

    visited.add(obj)
    let count = 1

    try {
      if (Array.isArray(obj)) {
        count += obj.reduce((acc, item) => acc + countNodes(item, visited, depth + 1), 0)
      } else {
        const keys = Object.keys(obj)
        count += keys.reduce((acc, key) => acc + countNodes(obj[key], visited, depth + 1), 0)
      }
    } catch (error) {
      console.warn("Error counting nodes:", error)
    }

    return count
  }, [])

  const handleLeftContentChange = useCallback((value: string) => {
    setLeftContent(value)

    if (value.trim()) {
      setIsLoading(true)
      setError(null)
      try {
        parserWorkerRef.current?.postMessage({
          type: "PARSE_JSON",
          data: value,
        })
      } catch (error) {
        setIsLoading(false)
        setError("Failed to process JSON")
      }
    } else {
      setRightContent(null)
      setError(null)
      setJsonStats(null)
    }
  }, [])

  const handleFileUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        if (file.size > 50 * 1024 * 1024) {
          // 50MB limit
          setError("File too large. Please use files smaller than 50MB.")
          return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          handleLeftContentChange(content)
        }
        reader.onerror = () => {
          setError("Failed to read file")
        }
        reader.readAsText(file)
      }
    },
    [handleLeftContentChange],
  )

  const handleFormat = useCallback(() => {
    if (!leftContent.trim()) return

    setIsLoading(true)
    const indent = indentType === "2-spaces" ? 2 : indentType === "4-spaces" ? 4 : indentType === "1-tab" ? "\t" : 2

    try {
      formatterWorkerRef.current?.postMessage({
        type: "FORMAT_JSON",
        data: leftContent,
        indent,
      })
    } catch (error) {
      setIsLoading(false)
      setError("Failed to format JSON")
    }
  }, [leftContent, indentType])

  const handleDownload = useCallback(() => {
    if (!leftContent) return

    try {
      const blob = new Blob([leftContent], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "data.json"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      setError("Failed to download file")
    }
  }, [leftContent])

  const handleCollapseAll = useCallback(() => {
    const level = Number.parseInt(collapseLevel)
    const newCollapsedLevels = new Set<number>()

    for (let i = level; i <= 100; i++) {
      newCollapsedLevels.add(i)
    }

    setCollapsedLevels(newCollapsedLevels)
  }, [collapseLevel])

  const handleExpandAll = useCallback(() => {
    setCollapsedLevels(new Set())
  }, [])

  const handleCopyFormatted = useCallback(() => {
    if (rightContent) {
      try {
        const indent = indentType === "2-spaces" ? 2 : indentType === "4-spaces" ? 4 : indentType === "1-tab" ? "\t" : 2
        const formatted = JSON.stringify(rightContent, null, indent)
        navigator.clipboard.writeText(formatted)
      } catch (error) {
        setError("Failed to copy to clipboard")
      }
    }
  }, [rightContent, indentType])

  // Search functionality
  const handleSearch = useCallback(
    (term: string, caseSensitive: boolean, fullWord: boolean) => {
      setSearchTerm(term)
      setCurrentMatchIndex(0)
      setNavigateToMatch(null)

      if (term.trim() && rightContent) {
        setIsSearching(true)
        try {
          searchWorkerRef.current?.postMessage({
            type: "SEARCH_JSON",
            data: rightContent,
            searchTerm: term,
            caseSensitive: caseSensitive,
            fullWord: fullWord,
          })
        } catch (error) {
          setIsSearching(false)
          setSearchMatches([])
        }
      } else {
        setSearchMatches([])
        setIsSearching(false)
      }
    },
    [rightContent],
  )

  const handleNavigateToMatch = useCallback(
    (index: number) => {
      if (searchMatches.length > 0) {
        setIsNavigating(true)
        setCurrentMatchIndex(index)
        setNavigateToMatch(index)
      }
    },
    [searchMatches.length],
  )

  const handleNavigationComplete = useCallback(() => {
    setNavigateToMatch(null)
    setIsNavigating(false)
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearchTerm("")
    setSearchMatches([])
    setCurrentMatchIndex(0)
    setNavigateToMatch(null)
    setIsSearching(false)
  }, [])

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        const file = files[0]
        if (file.size > 50 * 1024 * 1024) {
          // 50MB limit
          setError("File too large. Please use files smaller than 50MB.")
          return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          handleLeftContentChange(content)
        }
        reader.onerror = () => {
          setError("Failed to read dropped file")
        }
        reader.readAsText(file)
      }
    },
    [handleLeftContentChange],
  )

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

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
                <p className="text-sm text-gray-600 dark:text-gray-400">View and format large JSON files with ease</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {jsonStats && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-gray-200/50 dark:border-gray-600/50">
                  {formatFileSize(jsonStats.size)} • {jsonStats.nodes.toLocaleString()} nodes
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
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel */}
          <div className="flex-1 flex flex-col border-r border-gray-200/50 dark:border-gray-700/50 relative">
            <div className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">JSON Input</h2>
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
                isDragging ? "bg-indigo-50/80 dark:bg-indigo-900/30" : "bg-white/60 dark:bg-gray-800/60"
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
                className="absolute inset-0 p-4 font-mono text-sm resize-none border-none outline-none w-full h-full bg-transparent dark:text-gray-100 placeholder:text-gray-400"
                spellCheck={false}
              />
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-indigo-50/90 dark:bg-indigo-900/90 backdrop-blur-sm pointer-events-none">
                  <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-xl p-8 text-center border border-indigo-200/50 dark:border-indigo-700/50">
                    <Upload className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
                    <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Drop your JSON file here</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">We'll parse it instantly</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center Controls */}
          <div className="w-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col items-center py-6 space-y-4">
            <div className="flex flex-col items-center space-y-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCollapseAll}
                disabled={!rightContent}
                title="Collapse All Levels"
                className="hover:bg-orange-50 hover:text-orange-600"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Select value={collapseLevel} onValueChange={setCollapseLevel}>
                <SelectTrigger className="h-7 w-12 text-xs bg-white/80 backdrop-blur-sm border-gray-200/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">L0</SelectItem>
                  <SelectItem value="1">L1</SelectItem>
                  <SelectItem value="2">L2</SelectItem>
                  <SelectItem value="3">L3</SelectItem>
                  <SelectItem value="4">L4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleExpandAll}
              disabled={!rightContent}
              title="Expand All"
              className="hover:bg-green-50 hover:text-green-600"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>

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
          <div className="flex-1 flex flex-col bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
            <div className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">JSON Tree View</h2>
                {searchTerm && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                    Filtered
                  </span>
                )}
              </div>
              <JsonSearch
                onSearch={handleSearch}
                onNavigateToMatch={handleNavigateToMatch}
                onClear={handleClearSearch}
                matchCount={searchMatches.length}
                currentMatch={currentMatchIndex}
                isVisible={isSearchVisible}
                onToggle={() => setIsSearchVisible(!isSearchVisible)}
                isSearching={isSearching}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              {error && (
                <div className="bg-red-50/80 dark:bg-red-900/30 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 rounded-lg p-4 m-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                    <p className="text-red-800 dark:text-red-400 text-sm font-medium">Error:</p>
                  </div>
                  <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
                </div>
              )}
              {rightContent ? (
                <div className="relative h-full">
                  <SimpleJsonTree
                    data={rightContent}
                    collapsedLevels={collapsedLevels}
                    searchMatches={searchMatches}
                    currentMatchIndex={currentMatchIndex}
                    navigateToMatch={navigateToMatch}
                    onNavigationComplete={handleNavigationComplete}
                    isNavigating={isNavigating}
                  />
                  {isNavigating && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center z-50">
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex items-center space-x-3 border border-gray-200 dark:border-gray-700">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Navigating to match...
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  {!error && (
                    <div className="text-center">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p className="text-lg font-medium mb-2">Ready to view JSON</p>
                      <p className="text-sm">Enter valid JSON in the left panel to see the tree view</p>
                    </div>
                  )}
                </div>
              )}
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
  )
}
