import { safeStringify, stringify as iterativeStringify } from '../lib/iterativeStringify';

self.onmessage = (e) => {
  const { type, data, indent } = e.data

  try {
    switch (type) {
      case "FORMAT_JSON":
        const parsed = JSON.parse(data)
        
        try {
          // Try native JSON.stringify first (faster)
          const formatted = safeStringify(parsed, 2)
          self.postMessage({
            type: "FORMAT_SUCCESS",
            dataString: formatted,
          })
        } catch (stringifyError) {
          // Fall back to iterative stringify for deep structures
          const formatted = iterativeStringify(parsed, indent)
          self.postMessage({
            type: "FORMAT_SUCCESS",
            dataString: formatted,
          })
        }
        break

      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error: any) {
    console.error("Formatter worker error:", error)
    self.postMessage({
      type: "FORMAT_ERROR",
      error: error.message,
    })
  }
}