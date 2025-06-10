"use client"

import { useState, useEffect } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"

interface JsonTreeProps {
  data: any
  path?: string
  level?: number
  collapsedLevels?: Set<number>
}

export function CollapsibleJsonTree({ data, path = "", level = 0, collapsedLevels = new Set() }: JsonTreeProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsedLevels.has(level))

  useEffect(() => {
    setIsCollapsed(collapsedLevels.has(level))
  }, [collapsedLevels, level])

  const renderValue = (value: any, key?: string | number, currentPath?: string) => {
    const fullPath = currentPath ? `${currentPath}.${key}` : String(key || "")

    if (value === null) {
      return <span className="text-gray-500 dark:text-gray-400">null</span>
    }

    if (typeof value === "boolean") {
      return <span className="text-blue-600 dark:text-blue-400">{String(value)}</span>
    }

    if (typeof value === "number") {
      return <span className="text-green-600 dark:text-green-400">{value}</span>
    }

    if (typeof value === "string") {
      return <span className="text-red-600 dark:text-red-400">"{value}"</span>
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-600 dark:text-gray-400">[]</span>
      }

      return (
        <div>
          <div className="flex items-center">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-1 focus:outline-none"
              aria-label={isCollapsed ? "Expand array" : "Collapse array"}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
            <span className="text-gray-600 dark:text-gray-400">[</span>
            {isCollapsed && <span className="text-gray-400 dark:text-gray-500 ml-2 text-xs">{value.length} items</span>}
          </div>
          {!isCollapsed && (
            <div className="ml-4 border-l border-gray-200 dark:border-gray-700 pl-4">
              {value.map((item, index) => (
                <div key={index} className="py-1">
                  <span className="text-gray-500 dark:text-gray-400 mr-2 text-xs">{index}:</span>
                  <CollapsibleJsonTree
                    data={item}
                    path={`${fullPath}[${index}]`}
                    level={level + 1}
                    collapsedLevels={collapsedLevels}
                  />
                </div>
              ))}
            </div>
          )}
          {!isCollapsed && <span className="text-gray-600 dark:text-gray-400">]</span>}
        </div>
      )
    }

    if (typeof value === "object") {
      const keys = Object.keys(value)
      if (keys.length === 0) {
        return <span className="text-gray-600 dark:text-gray-400">{"{}"}</span>
      }

      return (
        <div>
          <div className="flex items-center">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-1 focus:outline-none"
              aria-label={isCollapsed ? "Expand object" : "Collapse object"}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
            <span className="text-gray-600 dark:text-gray-400">{"{"}</span>
            {isCollapsed && <span className="text-gray-400 dark:text-gray-500 ml-2 text-xs">{keys.length} keys</span>}
          </div>
          {!isCollapsed && (
            <div className="ml-4 border-l border-gray-200 dark:border-gray-700 pl-4">
              {keys.map((key) => (
                <div key={key} className="py-1">
                  <span className="text-purple-600 dark:text-purple-400 mr-2">"{key}":</span>
                  <CollapsibleJsonTree
                    data={value[key]}
                    path={`${fullPath}.${key}`}
                    level={level + 1}
                    collapsedLevels={collapsedLevels}
                  />
                </div>
              ))}
            </div>
          )}
          {!isCollapsed && <span className="text-gray-600 dark:text-gray-400">{"}"}</span>}
        </div>
      )
    }

    return <span>{String(value)}</span>
  }

  return renderValue(data, "", path)
}
