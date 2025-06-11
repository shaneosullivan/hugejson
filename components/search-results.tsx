"use client"

import { useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Hash } from "lucide-react"

interface SearchResult {
  lineNumber: number
  content: string
  contextBefore: string
  contextAfter: string
  path?: string
  type: 'text' | 'path'
  searchTerm?: string
}

interface SearchResultsProps {
  content: string
  jsonData?: any
  onResultClick: (lineNumber: number) => void
}

export function SearchResults({ content, jsonData, onResultClick }: SearchResultsProps) {
  const [textSearch, setTextSearch] = useState("")
  const [pathSearch, setPathSearch] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hoveredResult, setHoveredResult] = useState<number | null>(null)
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)

  // Split content into lines for searching
  const contentLines = content.split('\n')

  const performTextSearch = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    const searchResults: SearchResult[] = []

    contentLines.forEach((line, index) => {
      if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
        const lineNumber = index + 1
        const contextBefore = index > 0 ? contentLines[index - 1] : ""
        const contextAfter = index < contentLines.length - 1 ? contentLines[index + 1] : ""

        searchResults.push({
          lineNumber,
          content: line,
          contextBefore,
          contextAfter,
          type: 'text',
          searchTerm: searchTerm
        })
      }
    })

    setResults(searchResults)
    setIsSearching(false)
  }, [contentLines])

  const performPathSearch = useCallback((pathTerm: string) => {
    if (!pathTerm.trim() || !jsonData) {
      setResults([])
      return
    }

    setIsSearching(true)
    const searchResults: SearchResult[] = []
    const foundPaths = new Set<string>()

    // Convert JSON to lines with paths for searching
    const findPathMatches = (obj: any, currentPath: string = "", lineOffset: number = 0): number => {
      let currentLine = lineOffset

      if (typeof obj === "object" && obj !== null) {
        if (Array.isArray(obj)) {
          // Array opening bracket
          currentLine++
          
          obj.forEach((item, index) => {
            const itemPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`
            
            if (itemPath.toLowerCase().includes(pathTerm.toLowerCase()) && !isChildOfFoundPath(itemPath, foundPaths)) {
              // Find the corresponding line in the content
              const lineInContent = findLineForPath(itemPath, currentLine)
              if (lineInContent > 0) {
                const contextBefore = lineInContent > 1 ? contentLines[lineInContent - 2] : ""
                const contextAfter = lineInContent < contentLines.length ? contentLines[lineInContent] : ""

                searchResults.push({
                  lineNumber: lineInContent,
                  content: contentLines[lineInContent - 1],
                  contextBefore,
                  contextAfter,
                  path: itemPath,
                  type: 'path',
                  searchTerm: pathTerm
                })
                foundPaths.add(itemPath)
              }
            }
            
            currentLine = findPathMatches(item, itemPath, currentLine)
          })
          
          // Array closing bracket
          if (obj.length > 0) currentLine++
        } else {
          // Object opening bracket
          currentLine++
          
          Object.keys(obj).forEach((key) => {
            const keyPath = currentPath ? `${currentPath}.${key}` : key
            
            if (keyPath.toLowerCase().includes(pathTerm.toLowerCase()) && !isChildOfFoundPath(keyPath, foundPaths)) {
              // Find the corresponding line in the content
              const lineInContent = findLineForPath(keyPath, currentLine)
              if (lineInContent > 0) {
                const contextBefore = lineInContent > 1 ? contentLines[lineInContent - 2] : ""
                const contextAfter = lineInContent < contentLines.length ? contentLines[lineInContent] : ""

                searchResults.push({
                  lineNumber: lineInContent,
                  content: contentLines[lineInContent - 1],
                  contextBefore,
                  contextAfter,
                  path: keyPath,
                  type: 'path',
                  searchTerm: pathTerm
                })
                foundPaths.add(keyPath)
              }
            }
            
            currentLine = findPathMatches(obj[key], keyPath, currentLine)
          })
          
          // Object closing bracket
          if (Object.keys(obj).length > 0) currentLine++
        }
      } else {
        // Primitive value
        currentLine++
      }

      return currentLine
    }

    // Helper function to check if a path is a child of any already found paths
    const isChildOfFoundPath = (currentPath: string, foundPaths: Set<string>): boolean => {
      for (const foundPath of foundPaths) {
        if (currentPath.startsWith(foundPath + '.') || currentPath.startsWith(foundPath + '[')) {
          return true
        }
      }
      return false
    }

    // Helper function to find the line number for a given path
    const findLineForPath = (searchPath: string, approximateLine: number): number => {
      // Simple heuristic: look around the approximate line for the key
      const pathKey = searchPath.split('.').pop()?.split('[')[0] || searchPath
      
      for (let i = Math.max(0, approximateLine - 5); i < Math.min(contentLines.length, approximateLine + 5); i++) {
        if (contentLines[i].includes(`"${pathKey}"`)) {
          return i + 1
        }
      }
      
      // Fallback: search the entire content
      for (let i = 0; i < contentLines.length; i++) {
        if (contentLines[i].includes(`"${pathKey}"`)) {
          return i + 1
        }
      }
      
      return approximateLine
    }

    findPathMatches(jsonData)
    setResults(searchResults)
    setIsSearching(false)
  }, [jsonData, contentLines])

  const handleTextSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    performTextSearch(textSearch)
  }, [textSearch, performTextSearch])

  const handlePathSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    performPathSearch(pathSearch)
  }, [pathSearch, performPathSearch])

  // Improved path inference for hover (only when needed)
  const inferPathForLine = useCallback((lineIndex: number): string => {
    const startTime = performance.now()
    console.log(`🔍 Starting path inference for line ${lineIndex + 1}`)
    
    const pathParts: string[] = []
    let objectDepth = 0
    let arrayDepth = 0
    
    // Work backwards from the target line to build the path
    for (let i = lineIndex; i >= 0; i--) {
      const currentLine = contentLines[i].trim()
      
      // Skip empty lines and lines with just punctuation
      if (!currentLine || currentLine === ',' || currentLine === '') continue
      
      // Count braces and brackets to track nesting depth
      const openBraces = (currentLine.match(/{/g) || []).length
      const closeBraces = (currentLine.match(/}/g) || []).length
      const openBrackets = (currentLine.match(/\[/g) || []).length
      const closeBrackets = (currentLine.match(/]/g) || []).length
      
      // Update depth counters
      objectDepth += closeBraces - openBraces
      arrayDepth += closeBrackets - openBrackets
      
      // Handle closing brackets - we're exiting an array
      if (currentLine === ']' || currentLine.endsWith(']')) {
        // We'll count array index when we find the opening bracket
        continue
      }
      
      // Handle opening brackets - we're entering an array
      if (currentLine === '[' || currentLine.endsWith('[')) {
        if (arrayDepth > 0) {
          // Count how many items were in this array by looking forward
          let itemCount = 0
          for (let j = i + 1; j <= lineIndex; j++) {
            const nextLine = contentLines[j].trim()
            // Skip structural lines
            if (nextLine === '{' || nextLine === '}' || nextLine === '[' || nextLine === ']' || nextLine === ',' || nextLine === '') continue
            // Count actual value lines
            if (!nextLine.includes('[') && !nextLine.includes(']')) {
              itemCount++
            }
          }
          // Use the last item index (itemCount - 1, but at least 0)
          const arrayIndex = Math.max(0, itemCount - 1)
          pathParts.unshift(`[${arrayIndex}]`)
          arrayDepth--
        }
        continue
      }
      
      // Look for property names (object keys)
      const keyMatch = currentLine.match(/"([^"]+)"\s*:/)
      if (keyMatch && objectDepth > 0) {
        pathParts.unshift(keyMatch[1])
        objectDepth--
      }
      
      // Handle closing braces - we're exiting an object
      if (currentLine === '}' || currentLine.endsWith('}')) {
        continue
      }
      
      // Stop when we've resolved all nesting
      if (objectDepth <= 0 && arrayDepth <= 0) {
        break
      }
    }
    
    const result = pathParts.length > 0 ? pathParts.join('.').replace(/\.\[/g, '[') : 'root'
    const endTime = performance.now()
    console.log(`📍 Path inference completed in ${(endTime - startTime).toFixed(2)}ms: "${result}"`)
    
    return result
  }, [contentLines])
  
  // Handle mouse enter to calculate path lazily
  const handleResultHover = useCallback((resultIndex: number, lineIndex: number) => {
    setHoveredResult(resultIndex)
    const path = inferPathForLine(lineIndex - 1) // lineIndex is 1-based
    setHoveredPath(path)
  }, [inferPathForLine])
  
  // Handle mouse leave
  const handleResultLeave = useCallback(() => {
    setHoveredResult(null)
    setHoveredPath(null)
  }, [])

  const handleResultClick = useCallback((result: SearchResult) => {
    onResultClick(result.lineNumber)
  }, [onResultClick])

  // Function to highlight search terms in text
  const highlightText = useCallback((text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        return (
          <span key={index} className="bg-yellow-300 dark:bg-yellow-600 font-bold text-gray-900 dark:text-gray-100">
            {part}
          </span>
        )
      }
      return part
    })
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Search Inputs */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        {/* Text Search */}
        <form onSubmit={handleTextSearchSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search text content..."
              value={textSearch}
              onChange={(e) => {
                setTextSearch(e.target.value)
                // Clear path search when typing in text search
                if (e.target.value && pathSearch) {
                  setPathSearch('')
                }
              }}
              className="pl-10"
            />
          </div>
          <Button type="submit" size="sm" disabled={isSearching}>
            Search
          </Button>
        </form>

        {/* Path Search */}
        <form onSubmit={handlePathSearchSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search JSON path (e.g., user.name, items[0])..."
              value={pathSearch}
              onChange={(e) => {
                setPathSearch(e.target.value)
                // Clear text search when typing in path search
                if (e.target.value && textSearch) {
                  setTextSearch('')
                }
              }}
              className="pl-10"
            />
          </div>
          <Button type="submit" size="sm" disabled={isSearching || !jsonData}>
            Search
          </Button>
        </form>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-auto">
        {isSearching ? (
          <div className="p-4 text-center text-gray-500">
            Searching...
          </div>
        ) : results.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {textSearch || pathSearch ? "No results found" : "Enter a search term to find results"}
          </div>
        ) : (
          <div className="p-2">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 px-2">
              {results.length} result{results.length === 1 ? '' : 's'} found
            </div>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={() => handleResultHover(index, result.lineNumber)}
                  onMouseLeave={handleResultLeave}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors relative"
                >
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-shrink-0">
                      Line {result.lineNumber}
                    </div>
                    {hoveredResult === index && hoveredPath && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded max-w-xs truncate" title={hoveredPath}>
                        {result.type === 'path' && result.searchTerm ? 
                          highlightText(hoveredPath, result.searchTerm) : 
                          hoveredPath
                        }
                      </div>
                    )}
                    {result.path && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded max-w-xs truncate" title={result.path}>
                        {result.type === 'path' && result.searchTerm ? 
                          highlightText(result.path, result.searchTerm) : 
                          result.path
                        }
                      </div>
                    )}
                  </div>
                  
                  <div className="font-mono text-sm space-y-1">
                    {result.contextBefore && (
                      <div className="text-gray-400 dark:text-gray-600 truncate">
                        {result.searchTerm ? highlightText(result.contextBefore, result.searchTerm) : result.contextBefore}
                      </div>
                    )}
                    <div className="text-gray-900 dark:text-gray-100 bg-yellow-50 dark:bg-yellow-900/30 px-2 py-1 rounded">
                      {result.searchTerm ? highlightText(result.content, result.searchTerm) : result.content}
                    </div>
                    {result.contextAfter && (
                      <div className="text-gray-400 dark:text-gray-600 truncate">
                        {result.searchTerm ? highlightText(result.contextAfter, result.searchTerm) : result.contextAfter}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}