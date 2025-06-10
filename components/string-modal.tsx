"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Copy, X } from "lucide-react"

interface StringModalProps {
  isOpen: boolean
  onClose: () => void
  value: string
  path: string
}

export function StringModal({ isOpen, onClose, value, path }: StringModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Full String Value
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{path}</p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="h-full border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            <textarea
              value={value}
              readOnly
              className="w-full h-full p-4 font-mono text-sm bg-transparent border-none outline-none resize-none text-gray-900 dark:text-gray-100"
              style={{ minHeight: "300px" }}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">{value.length.toLocaleString()} characters</div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="flex items-center space-x-2">
              <Copy className="w-4 h-4" />
              <span>{copied ? "Copied!" : "Copy"}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
