"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { ChevronRight, ChevronDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StringModal } from "./string-modal"
import { Breadcrumb } from "./breadcrumb"
import type { JSX } from "react/jsx-runtime"

interface JsonTreeProps {
  data: any
  collapsedLevels?: Set<number>
  searchMatches?: any[]
  currentMatchIndex?: number
  navigateToMatch?: number | null
  onNavigationComplete?: () => void
  isNavigating?: boolean
}

export function SimpleJsonTree({
  data,
  collapsedLevels = new Set(),
  searchMatches = [],
  currentMatchIndex = 0,
  navigateToMatch = null,
  onNavigationComplete,
  isNavigating = false,
}: JsonTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const [hiddenSiblings, setHiddenSiblings] = useState<Set<string>>(new Set())
  const [currentMatchPath, setCurrentMatchPath] = useState<string | null>(null)
  const [initialExpandedPaths, setInitialExpandedPaths] = useState<Set<string>>(new Set())
  const [modalState, setModalState] = useState<{ isOpen: boolean; value: string; path: string }>({
    isOpen: false,
    value: "",
    path: "",
  })
  const [breadcrumbPath, setBreadcrumbPath] = useState<string>("")
  const [showBreadcrumb, setShowBreadcrumb] = useState(false)
  const initializedRef = useRef(false)
  const lastCollapsedLevelsRef = useRef<Set<number>>(new Set())
  const lineNumberRef = useRef(1)

  // Store full values for truncated strings
  const fullValuesRef = useRef<Map<string, string>>(new Map())

  // Initialize expanded state based on collapsedLevels
  useEffect(() => {
    if (!data) return

    const collapsedLevelsChanged =
      collapsedLevels.size !== lastCollapsedLevelsRef.current.size ||
      Array.from(collapsedLevels).some((level) => !lastCollapsedLevelsRef.current.has(level))

    if (!initializedRef.current || collapsedLevelsChanged) {
      const initialExpanded = new Set<string>()
      const fullValues = new Map<string, string>()

      const addExpandedPaths = (obj: any, path: string, level: number) => {
        if (typeof obj === "object" && obj !== null) {
          if (!collapsedLevels.has(level)) {
            initialExpanded.add(path)
          }

          if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
              const itemPath = `${path}[${index}]`
              // Store full string values
              if (typeof item === "string" && item.length > 100) {
                fullValues.set(itemPath, item)
              }
              addExpandedPaths(item, itemPath, level + 1)
            })
          } else {
            Object.keys(obj).forEach((key) => {
              const keyPath = `${path}.${key}`
              const value = obj[key]
              // Store full string values
              if (typeof value === "string" && value.length > 100) {
                fullValues.set(keyPath, value)
              }
              addExpandedPaths(value, keyPath, level + 1)
            })
          }
        } else if (typeof obj === "string" && obj.length > 100) {
          // Store full string values for root level strings too
          fullValues.set(path, obj)
        }
      }

      addExpandedPaths(data, "root", 0)
      setExpandedPaths(initialExpanded)
      setInitialExpandedPaths(new Set(initialExpanded))
      fullValuesRef.current = fullValues
      lastCollapsedLevelsRef.current = new Set(collapsedLevels)
      initializedRef.current = true
    }
  }, [data, collapsedLevels])

  // Reset to initial state when search is cleared
  useEffect(() => {
    if (searchMatches.length === 0 && currentMatchPath !== null) {
      setCurrentMatchPath(null)
      setHiddenSiblings(new Set())
      setExpandedPaths(new Set(initialExpandedPaths))
      setBreadcrumbPath("")
      setShowBreadcrumb(false)
    }
  }, [searchMatches.length, currentMatchPath, initialExpandedPaths])

  // Show breadcrumb for current search match
  useEffect(() => {
    if (searchMatches.length > 0 && currentMatchIndex >= 0 && currentMatchIndex < searchMatches.length) {
      const currentMatch = searchMatches[currentMatchIndex]
      if (currentMatch) {
        setBreadcrumbPath(currentMatch.path)
        setShowBreadcrumb(true)
      }
    } else {
      if (searchMatches.length === 0) {
        setBreadcrumbPath("")
        setShowBreadcrumb(false)
      }
    }
  }, [searchMatches, currentMatchIndex])

  // Create a safe ID from a path
  const createSafeId = useCallback((path: string): string => {
    // Replace special characters with encoded versions
    return path
      .replace(/\./g, "-dot-")
      .replace(/\[/g, "-lbracket-")
      .replace(/\]/g, "-rbracket-")
      .replace(/\(/g, "-lparen-")
      .replace(/\)/g, "-rparen-")
      .replace(/>/g, "-gt-")
      .replace(/</g, "-lt-")
      .replace(/\s+/g, "-space-")
      .replace(/\//g, "-slash-")
      .replace(/:/g, "-colon-")
  }, [])

  // Helper function to get all parent paths for a given path - improved to handle special characters
  const getParentPaths = useCallback((path: string): string[] => {
    console.log(`🔍 GETTING PARENT PATHS FOR: "${path}"`)
    if (path === "root") return ["root"]

    const parentPaths = ["root"]

    // More robust path parsing that handles parentheses and other special characters
    const parts = []
    let current = ""
    let inBrackets = false
    let bracketDepth = 0
    let inParens = false
    let parenDepth = 0

    for (let i = 0; i < path.length; i++) {
      const char = path[i]

      if (char === "[") {
        if (current && !inBrackets && !inParens) {
          parts.push(current)
          current = ""
        }
        inBrackets = true
        bracketDepth++
        if (bracketDepth === 1) continue // Skip the opening bracket
      } else if (char === "]") {
        bracketDepth--
        if (bracketDepth === 0) {
          if (current) {
            parts.push(`[${current}]`)
            current = ""
          }
          inBrackets = false
          continue // Skip the closing bracket
        }
      } else if (char === "(" && !inBrackets) {
        // Handle parentheses as part of the key name
        inParens = true
        parenDepth++
        current += char
      } else if (char === ")" && inParens) {
        parenDepth--
        current += char
        if (parenDepth === 0) {
          inParens = false
        }
      } else if (char === "." && !inBrackets && !inParens) {
        if (current) {
          parts.push(current)
          current = ""
        }
        continue
      } else {
        current += char
      }
    }

    if (current) {
      parts.push(current)
    }

    console.log(`🧩 PARSED PATH PARTS:`, parts)

    // Build the parent paths
    let currentPath = "root"
    for (const part of parts) {
      if (part.startsWith("[") && part.endsWith("]")) {
        // Array index
        currentPath = currentPath === "root" ? part : `${currentPath}${part}`
      } else {
        // Object key
        currentPath = currentPath === "root" ? part : `${currentPath}.${part}`
      }
      parentPaths.push(currentPath)
    }

    console.log(`📂 PARENT PATHS:`, parentPaths)
    return parentPaths
  }, [])

  // Handle navigation to specific match
  useEffect(() => {
    if (navigateToMatch !== null && searchMatches.length > 0) {
      const match = searchMatches[navigateToMatch]
      if (match) {
        console.log("🔍 NAVIGATING TO MATCH:", {
          matchIndex: navigateToMatch,
          matchPath: match.path,
          matchValue: match.value,
          matchType: match.type,
        })

        setCurrentMatchPath(match.path)
        setBreadcrumbPath(match.path)
        setShowBreadcrumb(true)

        // Reset hidden siblings
        setHiddenSiblings(new Set())

        // Expand path to the match
        setTimeout(() => {
          const pathsToExpand = new Set<string>()
          const siblingsToHide = new Set<string>()
          const matchPath = match.path

          // Get all parent paths that need to be expanded
          const allParentPaths = getParentPaths(matchPath)
          console.log("📂 PARENT PATHS TO EXPAND:", allParentPaths)
          allParentPaths.forEach((path) => pathsToExpand.add(path))

          // Parse the path more carefully to handle special characters
          const parts = []
          let current = ""
          let inBrackets = false
          let bracketDepth = 0
          let inParens = false
          let parenDepth = 0

          for (let i = 0; i < matchPath.length; i++) {
            const char = matchPath[i]

            if (char === "[") {
              if (current && !inBrackets && !inParens) {
                parts.push(current)
                current = ""
              }
              inBrackets = true
              bracketDepth++
              if (bracketDepth === 1) continue
            } else if (char === "]") {
              bracketDepth--
              if (bracketDepth === 0) {
                if (current) {
                  parts.push(current)
                  current = ""
                }
                inBrackets = false
                continue
              }
            } else if (char === "(" && !inBrackets) {
              // Handle parentheses as part of the key name
              inParens = true
              parenDepth++
              current += char
            } else if (char === ")" && inParens) {
              parenDepth--
              current += char
              if (parenDepth === 0) {
                inParens = false
              }
            } else if (char === "." && !inBrackets && !inParens) {
              if (current) {
                parts.push(current)
                current = ""
              }
              continue
            } else {
              current += char
            }
          }

          if (current) {
            parts.push(current)
          }

          console.log("🧩 PARSED PATH PARTS:", parts)

          // Add logic to hide siblings at each level except for the path to the match
          let currentPath = "root"

          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]
            const parentPath = currentPath

            if (currentPath === "root") {
              currentPath = part
            } else {
              if (/^\d+$/.test(part)) {
                currentPath = `${currentPath}[${part}]`
              } else {
                currentPath = `${currentPath}.${part}`
              }
            }

            console.log(
              `🔗 PROCESSING PART ${i}: "${part}", currentPath: "${currentPath}", parentPath: "${parentPath}"`,
            )

            // Hide siblings at this level
            const parentData = getDataAtPath(data, parentPath)
            console.log(`📊 PARENT DATA AT "${parentPath}":`, parentData ? Object.keys(parentData).slice(0, 5) : "null")

            if (parentData && typeof parentData === "object") {
              if (Array.isArray(parentData)) {
                const matchIndex = Number.parseInt(part)
                console.log(`📋 ARRAY: hiding siblings of index ${matchIndex} out of ${parentData.length} items`)
                parentData.forEach((_, siblingIndex) => {
                  if (siblingIndex !== matchIndex) {
                    const siblingPath = parentPath === "root" ? `[${siblingIndex}]` : `${parentPath}[${siblingIndex}]`
                    siblingsToHide.add(siblingPath)
                  }
                })
              } else {
                const keys = Object.keys(parentData)
                console.log(`🗝️ OBJECT: hiding siblings of key "${part}" out of keys:`, keys.slice(0, 10))
                keys.forEach((key) => {
                  if (key !== part) {
                    const siblingPath = parentPath === "root" ? key : `${parentPath}.${key}`
                    siblingsToHide.add(siblingPath)
                  }
                })
              }
            }
          }

          console.log("✅ FINAL PATHS TO EXPAND:", Array.from(pathsToExpand))
          console.log("❌ SIBLINGS TO HIDE:", Array.from(siblingsToHide).slice(0, 10))

          // Apply the expanded paths and hidden siblings
          setExpandedPaths(pathsToExpand)
          setHiddenSiblings(siblingsToHide)

          // Scroll to the match after a short delay
          setTimeout(() => {
            const safeId = createSafeId(match.path)
            const elementId = `json-node-${safeId}`
            console.log("🎯 LOOKING FOR ELEMENT:", elementId)
            const element = document.getElementById(elementId)
            console.log("🎯 SCROLLING TO ELEMENT:", element ? "FOUND" : "NOT FOUND", elementId)
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" })
            } else {
              console.error("⚠️ ELEMENT NOT FOUND FOR PATH:", match.path)
              console.log(
                "⚠️ ALL AVAILABLE JSON-NODE ELEMENTS:",
                Array.from(document.querySelectorAll('[id^="json-node-"]')).map((el) => el.id),
              )
            }
            onNavigationComplete?.()
          }, 200)
        }, 100)
      }
    }
  }, [navigateToMatch, searchMatches, onNavigationComplete, data, getParentPaths, createSafeId])

  // Helper function to get data at a specific path
  const getDataAtPath = useCallback((obj: any, path: string) => {
    console.log(`🔍 GET DATA AT PATH: "${path}"`)

    if (path === "root") {
      console.log("📍 RETURNING ROOT DATA")
      return obj
    }

    // Use the same improved parsing logic
    const parts = []
    let current = ""
    let inBrackets = false
    let bracketDepth = 0
    let inParens = false
    let parenDepth = 0

    for (let i = 0; i < path.length; i++) {
      const char = path[i]

      if (char === "[") {
        if (current && !inBrackets && !inParens) {
          parts.push(current)
          current = ""
        }
        inBrackets = true
        bracketDepth++
        if (bracketDepth === 1) continue
      } else if (char === "]") {
        bracketDepth--
        if (bracketDepth === 0) {
          if (current) {
            parts.push(current)
            current = ""
          }
          inBrackets = false
          continue
        }
      } else if (char === "(" && !inBrackets) {
        // Handle parentheses as part of the key name
        inParens = true
        parenDepth++
        current += char
      } else if (char === ")" && inParens) {
        parenDepth--
        current += char
        if (parenDepth === 0) {
          inParens = false
        }
      } else if (char === "." && !inBrackets && !inParens) {
        if (current) {
          parts.push(current)
          current = ""
        }
        continue
      } else {
        current += char
      }
    }

    if (current) {
      parts.push(current)
    }

    console.log(`🧩 PARSED PARTS FOR "${path}":`, parts)

    let currentData = obj
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      console.log(
        `🔗 ACCESSING PART ${i}: "${part}", currentData type:`,
        Array.isArray(currentData) ? "array" : typeof currentData,
      )

      if (currentData && typeof currentData === "object") {
        if (Array.isArray(currentData)) {
          const index = Number.parseInt(part)
          console.log(`📋 ARRAY ACCESS: index ${index} of ${currentData.length}`)
          currentData = currentData[index]
        } else {
          console.log(`🗝️ OBJECT ACCESS: key "${part}" in keys:`, Object.keys(currentData).slice(0, 10))
          currentData = currentData[part]
        }
        console.log(
          `📊 RESULT:`,
          currentData
            ? typeof currentData === "object"
              ? `${Array.isArray(currentData) ? "array" : "object"} with ${Array.isArray(currentData) ? currentData.length : Object.keys(currentData).length} items`
              : currentData
            : "null/undefined",
        )
      } else {
        console.log("❌ CANNOT ACCESS - currentData is not an object")
        return null
      }
    }

    return currentData
  }, [])

  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }, [])

  const toggleSiblings = useCallback(
    (parentPath: string, type: "above" | "below", matchPath: string) => {
      const parentData = getDataAtPath(data, parentPath)
      if (!parentData || typeof parentData !== "object") return

      const pathsToToggle = new Set<string>()

      if (Array.isArray(parentData)) {
        const matchIndex = Number.parseInt(
          matchPath
            .split(/[.[\]]/)
            .filter(Boolean)
            .pop() || "0",
        )
        parentData.forEach((_, index) => {
          if ((type === "above" && index < matchIndex) || (type === "below" && index > matchIndex)) {
            const siblingPath = parentPath === "root" ? `[${index}]` : `${parentPath}[${index}]`
            pathsToToggle.add(siblingPath)
          }
        })
      } else {
        const keys = Object.keys(parentData)
        const matchKey =
          matchPath
            .split(/[.[\]]/)
            .filter(Boolean)
            .pop() || ""
        const matchKeyIndex = keys.indexOf(matchKey)

        keys.forEach((key, index) => {
          if ((type === "above" && index < matchKeyIndex) || (type === "below" && index > matchKeyIndex)) {
            const siblingPath = parentPath === "root" ? key : `${parentPath}.${key}`
            pathsToToggle.add(siblingPath)
          }
        })
      }

      setHiddenSiblings((prev) => {
        const newSet = new Set(prev)
        const isCurrentlyHidden = Array.from(pathsToToggle).some((path) => newSet.has(path))

        pathsToToggle.forEach((path) => {
          if (isCurrentlyHidden) {
            newSet.delete(path)
          } else {
            newSet.add(path)
          }
        })

        return newSet
      })
    },
    [data],
  )

  const getPreviewText = useCallback((obj: any, maxItems = 5) => {
    if (Array.isArray(obj)) {
      return `[0..${Math.min(maxItems - 1, obj.length - 1)}]${obj.length > maxItems ? "..." : ""}`
    } else if (typeof obj === "object" && obj !== null) {
      const keys = Object.keys(obj)
      const preview = keys.slice(0, maxItems).join(", ")
      return preview + (keys.length > maxItems ? "..." : "")
    }
    return ""
  }, [])

  const handleStringClick = useCallback((value: string, path: string) => {
    const fullValue = fullValuesRef.current.get(path) || value
    setModalState({
      isOpen: true,
      value: fullValue,
      path: path,
    })
  }, [])

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, value: "", path: "" })
  }, [])

  const handleMouseEnter = useCallback(
    (path: string) => {
      setHoveredPath(path)
      if (!showBreadcrumb || breadcrumbPath !== path) {
        setBreadcrumbPath(path)
        setShowBreadcrumb(true)
      }
    },
    [showBreadcrumb, breadcrumbPath],
  )

  const handleMouseLeave = useCallback(() => {
    setHoveredPath(null)
    // Only hide breadcrumb if we're not in search mode
    if (searchMatches.length === 0) {
      setShowBreadcrumb(false)
      setBreadcrumbPath("")
    } else {
      // Return to showing the current search match path
      if (currentMatchIndex >= 0 && currentMatchIndex < searchMatches.length) {
        setBreadcrumbPath(searchMatches[currentMatchIndex].path)
      }
    }
  }, [searchMatches.length, currentMatchIndex])

  // Create a map of paths to matches for quick lookup
  const matchMap = useMemo(() => {
    const map = new Map<string, any>()
    searchMatches.forEach((match, index) => {
      map.set(match.path, { ...match, index })
    })
    return map
  }, [searchMatches])

  // Reset line number counter before rendering
  const resetLineNumber = useCallback(() => {
    lineNumberRef.current = 1
  }, [])

  const getNextLineNumber = useCallback(() => {
    return lineNumberRef.current++
  }, [])

  // Helper to count hidden siblings
  const getHiddenSiblingsCount = useCallback(
    (parentPath: string, type: "above" | "below", matchPath: string) => {
      const parentData = getDataAtPath(data, parentPath)
      if (!parentData || typeof parentData !== "object") return 0

      let count = 0

      if (Array.isArray(parentData)) {
        const matchIndex = Number.parseInt(
          matchPath
            .split(/[.[\]]/)
            .filter(Boolean)
            .pop() || "0",
        )
        if (type === "above") {
          count = matchIndex
        } else {
          count = parentData.length - matchIndex - 1
        }
      } else {
        const keys = Object.keys(parentData)
        const matchKey =
          matchPath
            .split(/[.[\]]/)
            .filter(Boolean)
            .pop() || ""
        const matchKeyIndex = keys.indexOf(matchKey)

        if (type === "above") {
          count = matchKeyIndex
        } else {
          count = keys.length - matchKeyIndex - 1
        }
      }

      return count
    },
    [data],
  )

  const renderSiblingToggle = useCallback(
    (parentPath: string, type: "above" | "below", matchPath: string, level: number) => {
      const count = getHiddenSiblingsCount(parentPath, type, matchPath)
      if (count === 0) return null

      const parentData = getDataAtPath(data, parentPath)
      const isArray = Array.isArray(parentData)
      const isHidden = (() => {
        if (isArray) {
          const matchIndex = Number.parseInt(
            matchPath
              .split(/[.[\]]/)
              .filter(Boolean)
              .pop() || "0",
          )
          const testIndex = type === "above" ? 0 : parentData.length - 1
          const testPath = parentPath === "root" ? `[${testIndex}]` : `${parentPath}[${testIndex}]`
          return hiddenSiblings.has(testPath)
        } else {
          const keys = Object.keys(parentData)
          const matchKey =
            matchPath
              .split(/[.[\]]/)
              .filter(Boolean)
              .pop() || ""
          const matchKeyIndex = keys.indexOf(matchKey)
          const testKey = type === "above" ? keys[0] : keys[keys.length - 1]
          const testPath = parentPath === "root" ? testKey : `${parentPath}.${testKey}`
          return hiddenSiblings.has(testPath)
        }
      })()

      const lineNumber = getNextLineNumber()
      const indent = level * 16
      const toggleKey = `${parentPath}-${type}-toggle`

      return (
        <div
          key={toggleKey}
          className="flex items-start py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded transition-colors"
        >
          <div className="w-8 text-xs text-gray-400 dark:text-gray-500 text-right mr-3 mt-0.5 font-mono select-none">
            {lineNumber}
          </div>
          <div style={{ paddingLeft: `${indent}px` }} className="flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSiblings(parentPath, type, matchPath)}
              className="h-6 px-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <MoreHorizontal className="w-3 h-3 mr-1" />
              {isHidden ? "Show" : "Hide"} {count} {type} {isArray ? "items" : "properties"}
            </Button>
          </div>
        </div>
      )
    },
    [getHiddenSiblingsCount, getDataAtPath, hiddenSiblings, toggleSiblings, getNextLineNumber, data],
  )

  const renderJsonValue = useCallback(
    (value: any, key: string | number | null, path: string, level: number, parentPath?: string): JSX.Element | null => {
      // Check if this path should be hidden
      if (hiddenSiblings.has(path)) {
        console.log("🚫 HIDING PATH:", path)
        return null
      }

      const isExpanded = expandedPaths.has(path)
      const isHovered = hoveredPath === path
      const match = matchMap.get(path)
      const isMatch = !!match
      const isCurrentMatch = match && match.index === currentMatchIndex

      // Check if this is a key match
      const isKeyMatch = match && match.type === "key"

      const indent = level * 16
      const lineNumber = getNextLineNumber()
      const safeId = createSafeId(path)

      // Check if we need to render sibling toggles for this item
      const shouldRenderToggles = currentMatchPath && path === currentMatchPath && parentPath

      if (value === null) {
        const elementKey = `${path}-null`
        return (
          <div key={elementKey}>
            {shouldRenderToggles && renderSiblingToggle(parentPath, "above", path, level)}
            <div
              className={`flex items-start py-1 px-2 rounded transition-colors ${
                isMatch && !isKeyMatch ? "bg-yellow-100 dark:bg-yellow-900/30" : ""
              } ${isCurrentMatch && !isKeyMatch ? "bg-yellow-200 dark:bg-yellow-800/50 ring-2 ring-yellow-400" : ""}`}
              id={`json-node-${safeId}`}
              onMouseEnter={() => handleMouseEnter(path)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="w-8 text-xs text-gray-400 dark:text-gray-500 text-right mr-3 mt-0.5 font-mono select-none">
                {lineNumber}
              </div>
              <div style={{ paddingLeft: `${indent}px` }} className="flex-1">
                {key !== null && (
                  <span
                    className={`mr-2 font-medium ${
                      isKeyMatch ? "bg-yellow-200 dark:bg-yellow-800/50" : ""
                    } ${isKeyMatch && isCurrentMatch ? "ring-2 ring-yellow-400" : ""} text-violet-600 dark:text-violet-400`}
                  >
                    {typeof key === "string" ? `"${key}":` : `${key}:`}
                  </span>
                )}
                <span className="text-gray-500 dark:text-gray-400">null</span>
              </div>
            </div>
            {shouldRenderToggles && renderSiblingToggle(parentPath, "below", path, level)}
          </div>
        )
      }

      if (typeof value === "boolean") {
        const elementKey = `${path}-boolean`
        return (
          <div key={elementKey}>
            {shouldRenderToggles && renderSiblingToggle(parentPath, "above", path, level)}
            <div
              className={`flex items-start py-1 px-2 rounded transition-colors ${
                isMatch && !isKeyMatch ? "bg-yellow-100 dark:bg-yellow-900/30" : ""
              } ${isCurrentMatch && !isKeyMatch ? "bg-yellow-200 dark:bg-yellow-800/50 ring-2 ring-yellow-400" : ""}`}
              id={`json-node-${safeId}`}
              onMouseEnter={() => handleMouseEnter(path)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="w-8 text-xs text-gray-400 dark:text-gray-500 text-right mr-3 mt-0.5 font-mono select-none">
                {lineNumber}
              </div>
              <div style={{ paddingLeft: `${indent}px` }} className="flex-1">
                {key !== null && (
                  <span
                    className={`mr-2 font-medium ${
                      isKeyMatch ? "bg-yellow-200 dark:bg-yellow-800/50" : ""
                    } ${isKeyMatch && isCurrentMatch ? "ring-2 ring-yellow-400" : ""} text-violet-600 dark:text-violet-400`}
                  >
                    {typeof key === "string" ? `"${key}":` : `${key}:`}
                  </span>
                )}
                <span className="text-blue-600 dark:text-blue-400">{String(value)}</span>
              </div>
            </div>
            {shouldRenderToggles && renderSiblingToggle(parentPath, "below", path, level)}
          </div>
        )
      }

      if (typeof value === "number") {
        const elementKey = `${path}-number`
        return (
          <div key={elementKey}>
            {shouldRenderToggles && renderSiblingToggle(parentPath, "above", path, level)}
            <div
              className={`flex items-start py-1 px-2 rounded transition-colors ${
                isMatch && !isKeyMatch ? "bg-yellow-100 dark:bg-yellow-900/30" : ""
              } ${isCurrentMatch && !isKeyMatch ? "bg-yellow-200 dark:bg-yellow-800/50 ring-2 ring-yellow-400" : ""}`}
              id={`json-node-${safeId}`}
              onMouseEnter={() => handleMouseEnter(path)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="w-8 text-xs text-gray-400 dark:text-gray-500 text-right mr-3 mt-0.5 font-mono select-none">
                {lineNumber}
              </div>
              <div style={{ paddingLeft: `${indent}px` }} className="flex-1">
                {key !== null && (
                  <span
                    className={`mr-2 font-medium ${
                      isKeyMatch ? "bg-yellow-200 dark:bg-yellow-800/50" : ""
                    } ${isKeyMatch && isCurrentMatch ? "ring-2 ring-yellow-400" : ""} text-violet-600 dark:text-violet-400`}
                  >
                    {typeof key === "string" ? `"${key}":` : `${key}:`}
                  </span>
                )}
                <span className="text-emerald-600 dark:text-emerald-400">{value}</span>
              </div>
            </div>
            {shouldRenderToggles && renderSiblingToggle(parentPath, "below", path, level)}
          </div>
        )
      }

      if (typeof value === "string") {
        const isTruncated = value.length > 100
        const displayValue = isTruncated ? `${value.substring(0, 100)}...` : value
        const elementKey = `${path}-string`

        return (
          <div key={elementKey}>
            {shouldRenderToggles && renderSiblingToggle(parentPath, "above", path, level)}
            <div
              className={`flex items-start py-1 px-2 rounded transition-colors ${
                isMatch && !isKeyMatch ? "bg-yellow-100 dark:bg-yellow-900/30" : ""
              } ${isCurrentMatch && !isKeyMatch ? "bg-yellow-200 dark:bg-yellow-800/50 ring-2 ring-yellow-400" : ""}`}
              id={`json-node-${safeId}`}
              onMouseEnter={() => handleMouseEnter(path)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="w-8 text-xs text-gray-400 dark:text-gray-500 text-right mr-3 mt-0.5 font-mono select-none">
                {lineNumber}
              </div>
              <div style={{ paddingLeft: `${indent}px` }} className="flex-1">
                {key !== null && (
                  <span
                    className={`mr-2 font-medium ${
                      isKeyMatch ? "bg-yellow-200 dark:bg-yellow-800/50" : ""
                    } ${isKeyMatch && isCurrentMatch ? "ring-2 ring-yellow-400" : ""} text-violet-600 dark:text-violet-400`}
                  >
                    {typeof key === "string" ? `"${key}":` : `${key}:`}
                  </span>
                )}
                <span
                  className={`text-rose-600 dark:text-rose-400 ${isTruncated ? "cursor-pointer hover:underline" : ""}`}
                  onClick={isTruncated ? () => handleStringClick(value, path) : undefined}
                  title={isTruncated ? "Click to view full string" : undefined}
                >
                  "{displayValue}"
                </span>
              </div>
            </div>
            {shouldRenderToggles && renderSiblingToggle(parentPath, "below", path, level)}
          </div>
        )
      }

      if (Array.isArray(value)) {
        const elements = []
        const arrayKey = `${path}-array`

        // Array header
        elements.push(
          <div key={`${arrayKey}-header`}>
            {shouldRenderToggles && renderSiblingToggle(parentPath, "above", path, level)}
            <div
              className={`flex items-start py-1 px-2 rounded transition-colors ${
                isMatch && !isKeyMatch ? "bg-yellow-100 dark:bg-yellow-900/30" : ""
              } ${isCurrentMatch && !isKeyMatch ? "bg-yellow-200 dark:bg-yellow-800/50 ring-2 ring-yellow-400" : ""}`}
              id={`json-node-${safeId}`}
              onMouseEnter={() => handleMouseEnter(path)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="w-8 text-xs text-gray-400 dark:text-gray-500 text-right mr-3 mt-0.5 font-mono select-none">
                {lineNumber}
              </div>
              <div style={{ paddingLeft: `${indent}px` }} className="flex-1 min-w-0">
                <div className="flex items-center">
                  {key !== null && (
                    <span
                      className={`mr-2 font-medium ${
                        isKeyMatch ? "bg-yellow-200 dark:bg-yellow-800/50" : ""
                      } ${isKeyMatch && isCurrentMatch ? "ring-2 ring-yellow-400" : ""} text-violet-600 dark:text-violet-400`}
                    >
                      {typeof key === "string" ? `"${key}":` : `${key}:`}
                    </span>
                  )}
                  {value.length > 0 && (
                    <button
                      onClick={() => {
                        console.log("🖱️ CLICKED ARRAY TOGGLE:", {
                          path: path,
                          isCurrentlyExpanded: isExpanded,
                          arrayLength: value.length,
                          willExpand: !isExpanded,
                        })

                        if (!isExpanded) {
                          // About to expand - log what children will be visible
                          console.log(
                            "👶 ARRAY CHILDREN THAT WILL BE VISIBLE:",
                            value.map((_, index) => {
                              const childPath = `${path}[${index}]`
                              const isHidden = hiddenSiblings.has(childPath)
                              return { index, path: childPath, hidden: isHidden }
                            }),
                          )
                        }

                        toggleExpanded(path)
                      }}
                      className="flex items-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mr-1 focus:outline-none flex-shrink-0"
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  )}
                  <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">[</span>
                  {!isExpanded && value.length > 0 && (
                    <span
                      className="text-gray-400 dark:text-gray-500 ml-2 text-xs cursor-help whitespace-nowrap overflow-hidden"
                      onMouseEnter={() => setHoveredPath(path)}
                      onMouseLeave={() => setHoveredPath(null)}
                    >
                      {value.length} {value.length === 1 ? "item" : "items"}
                      {isHovered && (
                        <span className="ml-1 text-indigo-500 dark:text-indigo-400 whitespace-nowrap overflow-hidden">
                          ({getPreviewText(value)})
                        </span>
                      )}
                    </span>
                  )}
                  {value.length === 0 && <span className="text-gray-600 dark:text-gray-400">]</span>}
                </div>
              </div>
            </div>
            {shouldRenderToggles && renderSiblingToggle(parentPath, "below", path, level)}
          </div>,
        )

        // Array items (if expanded)
        if (isExpanded && value.length > 0) {
          value.forEach((item, index) => {
            const itemPath = `${path}[${index}]`
            const renderedItem = renderJsonValue(item, index, itemPath, level + 1, path)
            if (renderedItem) {
              elements.push(renderedItem)
            }
          })

          // Closing bracket
          const closingLineNumber = getNextLineNumber()
          elements.push(
            <div key={`${arrayKey}-close`} className="flex items-start py-1 px-2">
              <div className="w-8 text-xs text-gray-400 dark:text-gray-500 text-right mr-3 mt-0.5 font-mono select-none">
                {closingLineNumber}
              </div>
              <div style={{ paddingLeft: `${indent}px` }} className="flex-1">
                <span className="text-gray-600 dark:text-gray-400">]</span>
              </div>
            </div>,
          )
        }

        return <div key={arrayKey}>{elements}</div>
      }

      if (typeof value === "object" && value !== null) {
        const elements = []
        const keys = Object.keys(value)
        const objectKey = `${path}-object`

        // Object header
        elements.push(
          <div key={`${objectKey}-header`}>
            {shouldRenderToggles && renderSiblingToggle(parentPath, "above", path, level)}
            <div
              className={`flex items-start py-1 px-2 rounded transition-colors ${
                isMatch && !isKeyMatch ? "bg-yellow-100 dark:bg-yellow-900/30" : ""
              } ${isCurrentMatch && !isKeyMatch ? "bg-yellow-200 dark:bg-yellow-800/50 ring-2 ring-yellow-400" : ""}`}
              id={`json-node-${safeId}`}
              onMouseEnter={() => handleMouseEnter(path)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="w-8 text-xs text-gray-400 dark:text-gray-500 text-right mr-3 mt-0.5 font-mono select-none">
                {lineNumber}
              </div>
              <div style={{ paddingLeft: `${indent}px` }} className="flex-1 min-w-0">
                <div className="flex items-center">
                  {key !== null && (
                    <span
                      className={`mr-2 font-medium ${
                        isKeyMatch ? "bg-yellow-200 dark:bg-yellow-800/50" : ""
                      } ${isKeyMatch && isCurrentMatch ? "ring-2 ring-yellow-400" : ""} text-violet-600 dark:text-violet-400`}
                    >
                      {typeof key === "string" ? `"${key}":` : `${key}:`}
                    </span>
                  )}
                  {keys.length > 0 && (
                    <button
                      onClick={() => {
                        console.log("🖱️ CLICKED OBJECT TOGGLE:", {
                          path: path,
                          isCurrentlyExpanded: isExpanded,
                          keyCount: keys.length,
                          keys: keys.slice(0, 10),
                          willExpand: !isExpanded,
                        })

                        if (!isExpanded) {
                          // About to expand - log what children will be visible
                          console.log(
                            "👶 OBJECT CHILDREN THAT WILL BE VISIBLE:",
                            keys.map((key) => {
                              const childPath = path === "root" ? key : `${path}.${key}`
                              const isHidden = hiddenSiblings.has(childPath)
                              return { key, path: childPath, hidden: isHidden }
                            }),
                          )
                        }

                        toggleExpanded(path)
                      }}
                      className="flex items-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mr-1 focus:outline-none flex-shrink-0"
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  )}
                  <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">{"{"}</span>
                  {!isExpanded && keys.length > 0 && (
                    <span
                      className="text-gray-400 dark:text-gray-500 ml-2 text-xs cursor-help whitespace-nowrap overflow-hidden"
                      onMouseEnter={() => setHoveredPath(path)}
                      onMouseLeave={() => setHoveredPath(null)}
                    >
                      {keys.length} {keys.length === 1 ? "key" : "keys"}
                      {isHovered && (
                        <span className="ml-1 text-indigo-500 dark:text-indigo-400 whitespace-nowrap overflow-hidden">
                          ({getPreviewText(value)})
                        </span>
                      )}
                    </span>
                  )}
                  {keys.length === 0 && <span className="text-gray-600 dark:text-gray-400">{"}"}</span>}
                </div>
              </div>
            </div>
            {shouldRenderToggles && renderSiblingToggle(parentPath, "below", path, level)}
          </div>,
        )

        // Object properties (if expanded)
        if (isExpanded && keys.length > 0) {
          keys.forEach((objKey) => {
            const propPath = path === "root" ? objKey : `${path}.${objKey}`
            const renderedProp = renderJsonValue(value[objKey], objKey, propPath, level + 1, path)
            if (renderedProp) {
              elements.push(renderedProp)
            }
          })

          // Closing bracket
          const closingLineNumber = getNextLineNumber()
          elements.push(
            <div key={`${objectKey}-close`} className="flex items-start py-1 px-2">
              <div className="w-8 text-xs text-gray-400 dark:text-gray-500 text-right mr-3 mt-0.5 font-mono select-none">
                {closingLineNumber}
              </div>
              <div style={{ paddingLeft: `${indent}px` }} className="flex-1">
                <span className="text-gray-600 dark:text-gray-400">{"}"}</span>
              </div>
            </div>,
          )
        }

        return <div key={objectKey}>{elements}</div>
      }

      return <div key={`${path}-unknown`}>Unknown type</div>
    },
    [
      expandedPaths,
      hoveredPath,
      toggleExpanded,
      getPreviewText,
      matchMap,
      currentMatchIndex,
      getNextLineNumber,
      hiddenSiblings,
      currentMatchPath,
      renderSiblingToggle,
      handleStringClick,
      handleMouseEnter,
      handleMouseLeave,
      createSafeId,
    ],
  )

  if (!data) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        <p>No data to display</p>
      </div>
    )
  }

  // Reset line numbers before rendering
  resetLineNumber()

  return (
    <div className="relative h-full">
      <Breadcrumb path={breadcrumbPath} isVisible={showBreadcrumb} />
      <div className="font-mono text-sm p-4 h-full overflow-auto">{renderJsonValue(data, null, "root", 0)}</div>
      <StringModal isOpen={modalState.isOpen} onClose={closeModal} value={modalState.value} path={modalState.path} />
    </div>
  )
}
