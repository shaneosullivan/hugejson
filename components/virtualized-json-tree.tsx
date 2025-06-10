"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import { useVirtualizer } from "@tanstack/react-virtual"

interface JsonNode {
  id: string
  key?: string | number
  value: any
  type: string
  level: number
  path: string
  isCollapsible: boolean
  parentId?: string
  hasChildren: boolean
  children?: string[] // IDs of child nodes
}

interface VirtualizedJsonTreeProps {
  data: any
  collapsedLevels?: Set<number>
  searchTerm?: string
  currentMatchIndex?: number
  onRenderProgress?: (progress: number) => void
  onSearchMatches?: (matches: JsonNode[], totalCount: number) => void
}

export function VirtualizedJsonTree({
  data,
  collapsedLevels = new Set(),
  searchTerm = "",
  currentMatchIndex = 0,
  onRenderProgress,
  onSearchMatches,
}: VirtualizedJsonTreeProps) {
  const [allNodes, setAllNodes] = useState<Record<string, JsonNode>>({})
  const [visibleNodeIds, setVisibleNodeIds] = useState<string[]>([])
  const [isRendering, setIsRendering] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  // Safe JSON flattening with depth limit and circular reference detection
  const processJson = useCallback((obj: any, maxDepth = 100): Record<string, JsonNode> => {
    const nodes: Record<string, JsonNode> = {}
    const visited = new WeakSet()
    const queue: Array<{
      value: any
      key?: string | number
      path: string
      level: number
      parentId?: string
      nodeId: string
    }> = [{ value: obj, path: "root", level: 0, nodeId: "root" }]

    while (queue.length > 0) {
      const { value, key, path, level, parentId, nodeId } = queue.shift()!

      if (level > maxDepth) continue // Prevent infinite depth

      // Check for circular references
      if (typeof value === "object" && value !== null) {
        if (visited.has(value)) {
          // Add a circular reference indicator
          nodes[nodeId] = {
            id: nodeId,
            key,
            value: "[Circular Reference]",
            type: "circular",
            level,
            path,
            isCollapsible: false,
            parentId,
            hasChildren: false,
          }
          continue
        }
        visited.add(value)
      }

      let hasChildren = false
      let isCollapsible = false
      const children: string[] = []

      // Determine if this node has children
      if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          hasChildren = value.length > 0
          isCollapsible = hasChildren

          // Process array children
          if (hasChildren) {
            value.forEach((item, index) => {
              const childId = `${nodeId}[${index}]`
              children.push(childId)
              queue.push({
                value: item,
                key: index,
                path: `${path}[${index}]`,
                level: level + 1,
                parentId: nodeId,
                nodeId: childId,
              })
            })
          }
        } else {
          const keys = Object.keys(value)
          hasChildren = keys.length > 0
          isCollapsible = hasChildren

          // Process object children
          if (hasChildren) {
            keys.forEach((objKey) => {
              const childId = `${nodeId}.${objKey}`
              children.push(childId)
              queue.push({
                value: value[objKey],
                key: objKey,
                path: `${path}.${objKey}`,
                level: level + 1,
                parentId: nodeId,
                nodeId: childId,
              })
            })
          }
        }
      }

      // Add current node
      nodes[nodeId] = {
        id: nodeId,
        key,
        value,
        type: Array.isArray(value) ? "array" : typeof value,
        level,
        path,
        isCollapsible,
        parentId,
        hasChildren,
        children,
      }
    }

    return nodes
  }, [])

  // Render nodes in chunks to prevent freezing
  useEffect(() => {
    if (!data) {
      setAllNodes({})
      setVisibleNodeIds([])
      return
    }

    setIsRendering(true)
    onRenderProgress?.(0)

    const processInChunks = async () => {
      try {
        // Process the entire JSON structure
        const processedNodes = processJson(data)

        // Update state with all nodes
        setAllNodes(processedNodes)

        // Set initial expanded state based on collapsedLevels
        const initialExpanded = new Set<string>()
        Object.values(processedNodes).forEach((node) => {
          if (!collapsedLevels.has(node.level) && node.isCollapsible) {
            initialExpanded.add(node.id)
          }
        })
        setExpandedNodes(initialExpanded)

        setIsRendering(false)
        onRenderProgress?.(100)
      } catch (error) {
        console.error("Error processing JSON:", error)
        setIsRendering(false)
        setAllNodes({})
      }
    }

    processInChunks()
  }, [data, processJson, onRenderProgress, collapsedLevels])

  // Update visible nodes based on expanded state
  useEffect(() => {
    if (Object.keys(allNodes).length === 0) {
      setVisibleNodeIds([])
      return
    }

    const rootNode = allNodes["root"]
    if (!rootNode) {
      setVisibleNodeIds([])
      return
    }

    // Build visible nodes list using BFS
    const visible: string[] = ["root"]
    const queue = [...(rootNode.children || [])]

    while (queue.length > 0) {
      const nodeId = queue.shift()!
      const node = allNodes[nodeId]

      if (!node) continue

      visible.push(nodeId)

      // If this node is expanded, add its children to the queue
      if (expandedNodes.has(node.id) && node.children) {
        queue.push(...node.children)
      }
    }

    setVisibleNodeIds(visible)
  }, [allNodes, expandedNodes])

  // Search functionality
  const searchMatches = useMemo(() => {
    if (!searchTerm || visibleNodeIds.length === 0) return []

    return visibleNodeIds
      .filter((id) => {
        const node = allNodes[id]
        if (!node) return false

        const searchValue = String(node.value).toLowerCase()
        const searchKey = String(node.key || "").toLowerCase()
        const term = searchTerm.toLowerCase()

        return searchValue.includes(term) || searchKey.includes(term)
      })
      .map((id) => allNodes[id])
  }, [allNodes, visibleNodeIds, searchTerm])

  useEffect(() => {
    onSearchMatches?.(searchMatches, searchMatches.length)
  }, [searchMatches, onSearchMatches])

  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }, [])

  // Set up virtualization
  const virtualizer = useVirtualizer({
    count: visibleNodeIds.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24, // Estimated row height
    overscan: 20, // Number of items to render outside of the visible area
  })

  // Get preview of keys for hover tooltip
  const getKeyPreview = useCallback(
    (node: JsonNode, maxKeys = 5) => {
      if (!node.hasChildren || !node.children || node.children.length === 0) return ""

      if (node.type === "array") {
        // For arrays, show the first few indices
        return `[0..${Math.min(maxKeys, node.children.length) - 1}]${node.children.length > maxKeys ? "..." : ""}`
      } else {
        // For objects, show the first few key names
        const keyNames = node.children
          .slice(0, maxKeys)
          .map((childId) => {
            const childNode = allNodes[childId]
            return childNode ? String(childNode.key) : ""
          })
          .filter(Boolean)

        return keyNames.join(", ") + (node.children.length > maxKeys ? "..." : "")
      }
    },
    [allNodes],
  )

  const renderNode = useCallback(
    (nodeId: string, index: number) => {
      const node = allNodes[nodeId]
      if (!node) return null

      const isExpanded = expandedNodes.has(node.id)
      const isMatch = searchMatches.some((match) => match.id === node.id)
      const isCurrentMatch = searchMatches[currentMatchIndex]?.id === node.id
      const isHovered = hoveredNode === node.id

      const renderValue = () => {
        if (node.type === "circular") {
          return <span className="text-orange-600 dark:text-orange-400 italic">{node.value}</span>
        }

        if (node.value === null) {
          return <span className="text-gray-500 dark:text-gray-400">null</span>
        }

        if (typeof node.value === "boolean") {
          return <span className="text-blue-600 dark:text-blue-400">{String(node.value)}</span>
        }

        if (typeof node.value === "number") {
          return <span className="text-emerald-600 dark:text-emerald-400">{node.value}</span>
        }

        if (typeof node.value === "string") {
          const displayValue = node.value.length > 100 ? `${node.value.substring(0, 100)}...` : node.value
          return <span className="text-rose-600 dark:text-rose-400">"{displayValue}"</span>
        }

        if (Array.isArray(node.value)) {
          return (
            <div className="flex items-center">
              {node.isCollapsible && (
                <button
                  onClick={() => toggleExpand(node.id)}
                  className="flex items-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mr-1 focus:outline-none"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              <span className="text-gray-600 dark:text-gray-400">[</span>
              {!isExpanded && node.hasChildren && (
                <span
                  className="text-gray-400 dark:text-gray-500 ml-2 text-xs cursor-help"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {node.children?.length || 0} {node.children?.length === 1 ? "item" : "items"}
                  {isHovered && (
                    <span className="ml-1 text-indigo-500 dark:text-indigo-400">({getKeyPreview(node)})</span>
                  )}
                </span>
              )}
              {!node.hasChildren && <span className="text-gray-600 dark:text-gray-400">]</span>}
              {isExpanded && <span className="text-gray-600 dark:text-gray-400 ml-1">...</span>}
            </div>
          )
        }

        if (typeof node.value === "object") {
          return (
            <div className="flex items-center">
              {node.isCollapsible && (
                <button
                  onClick={() => toggleExpand(node.id)}
                  className="flex items-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mr-1 focus:outline-none"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              <span className="text-gray-600 dark:text-gray-400">{"{"}</span>
              {!isExpanded && node.hasChildren && (
                <span
                  className="text-gray-400 dark:text-gray-500 ml-2 text-xs cursor-help"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {node.children?.length || 0} {node.children?.length === 1 ? "key" : "keys"}
                  {isHovered && (
                    <span className="ml-1 text-indigo-500 dark:text-indigo-400">({getKeyPreview(node)})</span>
                  )}
                </span>
              )}
              {!node.hasChildren && <span className="text-gray-600 dark:text-gray-400">{"}"}</span>}
              {isExpanded && <span className="text-gray-600 dark:text-gray-400 ml-1">...</span>}
            </div>
          )
        }

        return <span className="text-gray-600 dark:text-gray-400">{String(node.value)}</span>
      }

      return (
        <div
          key={node.id}
          className={`py-1 px-2 rounded transition-colors ${
            isMatch ? "bg-yellow-100 dark:bg-yellow-900/30" : ""
          } ${isCurrentMatch ? "bg-yellow-200 dark:bg-yellow-800/50 ring-2 ring-yellow-400" : ""}`}
          style={{ paddingLeft: `${node.level * 16 + 8}px` }}
          id={`json-node-${index}`}
          data-index={index}
        >
          <div className="flex items-center">
            {node.key !== undefined && (
              <span className="text-violet-600 dark:text-violet-400 mr-2 font-medium">
                {typeof node.key === "string" ? `"${node.key}":` : `${node.key}:`}
              </span>
            )}
            {renderValue()}
          </div>
        </div>
      )
    },
    [allNodes, expandedNodes, searchMatches, currentMatchIndex, toggleExpand, hoveredNode, getKeyPreview],
  )

  if (isRendering) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Rendering JSON tree...</p>
        </div>
      </div>
    )
  }

  if (Object.keys(allNodes).length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        <p>No data to display</p>
      </div>
    )
  }

  return (
    <div ref={parentRef} className="font-mono text-sm h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderNode(visibleNodeIds[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
