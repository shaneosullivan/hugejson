"use client"

import { useMemo } from "react"
import { ChevronRight } from "lucide-react"

interface BreadcrumbProps {
  path: string
  isVisible: boolean
}

export function Breadcrumb({ path, isVisible }: BreadcrumbProps) {
  const breadcrumbSegments = useMemo(() => {
    if (!path || path === "root") {
      return [{ label: "root", isArray: false }]
    }

    const segments = [{ label: "root", isArray: false }]

    // Split the path and process each part
    const parts = path.split(/[.[\]]/).filter(Boolean)

    for (const part of parts) {
      // Check if this is an array index (numeric)
      if (/^\d+$/.test(part)) {
        segments.push({ label: `[${part}]`, isArray: true })
      } else {
        segments.push({ label: part, isArray: false })
      }
    }

    return segments
  }, [path])

  if (!isVisible || !path) {
    return null
  }

  return (
    <div
      className={`absolute top-0 left-0 right-0 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 px-4 py-2 transition-all duration-200 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <div className="flex items-center space-x-1 text-sm">
        <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">Path:</span>
        {breadcrumbSegments.map((segment, index) => (
          <div key={`${segment.label}-${index}`} className="flex items-center">
            {index > 0 && <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500 mx-1" />}
            <span
              className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                segment.isArray
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : index === 0
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
              }`}
            >
              {segment.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
