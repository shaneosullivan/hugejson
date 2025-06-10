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
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    self.postMessage({
      type: "FORMAT_ERROR",
      error: error.message,
    })
  }
}
