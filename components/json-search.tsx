"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { Search, ChevronUp, ChevronDown, X, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

interface JsonSearchProps {
  onSearch: (term: string, caseSensitive: boolean, fullWord: boolean) => void
  onNavigateToMatch: (index: number) => void
  onClear: () => void
  matchCount: number
  currentMatch: number
  isVisible: boolean
  onToggle: () => void
  isSearching?: boolean
}

export function JsonSearch({
  onSearch,
  onNavigateToMatch,
  onClear,
  matchCount,
  currentMatch,
  isVisible,
  onToggle,
  isSearching = false,
}: JsonSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [fullWord, setFullWord] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const handleSearch = useCallback(
    (value: string) => {
      setSearchTerm(value)
      onSearch(value, caseSensitive, fullWord)
    },
    [onSearch, caseSensitive, fullWord],
  )

  const handleCaseSensitiveChange = useCallback(
    (checked: boolean) => {
      setCaseSensitive(checked)
      if (searchTerm) {
        onSearch(searchTerm, checked, fullWord)
      }
    },
    [onSearch, searchTerm, fullWord],
  )

  const handleFullWordChange = useCallback(
    (checked: boolean) => {
      setFullWord(checked)
      if (searchTerm) {
        onSearch(searchTerm, caseSensitive, checked)
      }
    },
    [onSearch, searchTerm, caseSensitive],
  )

  const handleNext = useCallback(() => {
    if (matchCount > 0) {
      const nextIndex = (currentMatch + 1) % matchCount
      onNavigateToMatch(nextIndex)
    }
  }, [matchCount, currentMatch, onNavigateToMatch])

  const handlePrevious = useCallback(() => {
    if (matchCount > 0) {
      const prevIndex = (currentMatch - 1 + matchCount) % matchCount
      onNavigateToMatch(prevIndex)
    }
  }, [matchCount, currentMatch, onNavigateToMatch])

  const handleClearOrClose = useCallback(() => {
    if (searchTerm) {
      // If there's a search term, clear it
      setSearchTerm("")
      onClear()
    } else {
      // If no search term, close the search box
      onToggle()
    }
  }, [searchTerm, onClear, onToggle])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && matchCount > 0) {
        e.preventDefault()
        onNavigateToMatch(currentMatch)
      } else if (e.key === "Escape") {
        handleClearOrClose()
      } else if (e.key === "ArrowUp" && matchCount > 0) {
        e.preventDefault()
        handlePrevious()
      } else if (e.key === "ArrowDown" && matchCount > 0) {
        e.preventDefault()
        handleNext()
      }
    },
    [matchCount, currentMatch, onNavigateToMatch, handleClearOrClose, handlePrevious, handleNext],
  )

  // Focus input when search becomes visible
  useEffect(() => {
    if (isVisible) {
      const input = document.querySelector('input[placeholder="Search JSON..."]') as HTMLInputElement
      if (input) {
        setTimeout(() => input.focus(), 100)
      }
    }
  }, [isVisible])

  if (!isVisible) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={onToggle}
        className="text-gray-600 dark:text-gray-400"
        title="Search JSON (Ctrl+F)"
      >
        <Search className="w-4 h-4" />
      </Button>
    )
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-sm">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <Input
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search JSON..."
          className="h-8 text-sm border-none shadow-none focus-visible:ring-0 min-w-[200px]"
          autoFocus
        />

        {/* Match count and navigation - better layout */}
        <div className="flex items-center space-x-1">
          {isSearching && searchTerm && (
            <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[80px] text-center">
              Searching...
            </div>
          )}
          {!isSearching && matchCount > 0 && (
            <>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[80px] text-center">
                {currentMatch + 1} of {matchCount}
              </span>
              <div className="flex items-center">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handlePrevious}
                  disabled={matchCount === 0}
                  title="Previous match (Up arrow)"
                  className="h-6 w-6 p-0"
                >
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleNext}
                  disabled={matchCount === 0}
                  title="Next match (Down arrow)"
                  className="h-6 w-6 p-0"
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </div>
            </>
          )}
          {!isSearching && searchTerm && matchCount === 0 && (
            <span className="text-xs text-red-500 dark:text-red-400 whitespace-nowrap min-w-[80px] text-center">
              No matches
            </span>
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowOptions(!showOptions)}
          title="Search options"
          className={showOptions ? "bg-gray-100 dark:bg-gray-700" : ""}
        >
          <Settings className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleClearOrClose}
          title={searchTerm ? "Clear search (Esc)" : "Close search (Esc)"}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search Options */}
      {showOptions && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="case-sensitive" checked={caseSensitive} onCheckedChange={handleCaseSensitiveChange} />
              <label htmlFor="case-sensitive" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                Case sensitive
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="full-word" checked={fullWord} onCheckedChange={handleFullWordChange} />
              <label htmlFor="full-word" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                Full word
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
