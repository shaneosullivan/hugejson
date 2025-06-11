"use client"

import { useState, useCallback, useRef } from "react"
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
  const [currentSearchTerm, setCurrentSearchTerm] = useState('')

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

    // Convert JSON to lines with paths for searching
    const findPathMatches = (obj: any, currentPath: string = "", lineOffset: number = 0): number => {
      let currentLine = lineOffset

      if (typeof obj === "object" && obj !== null) {
        if (Array.isArray(obj)) {
          // Array opening bracket
          currentLine++
          
          obj.forEach((item, index) => {
            const itemPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`
            
            if (itemPath.toLowerCase().includes(pathTerm.toLowerCase())) {
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
            
            if (keyPath.toLowerCase().includes(pathTerm.toLowerCase())) {
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
    setCurrentSearchTerm(textSearch)
    performTextSearch(textSearch)
  }, [textSearch, performTextSearch])

  const handlePathSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setCurrentSearchTerm(pathSearch)
    performPathSearch(pathSearch)
  }, [pathSearch, performPathSearch])

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
              onChange={(e) => setTextSearch(e.target.value)}
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
              onChange={(e) => setPathSearch(e.target.value)}
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
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Line {result.lineNumber}
                    </div>
                    {result.path && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                        {result.type === 'path' && result.searchTerm ? highlightText(result.path, result.searchTerm) : result.path}
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