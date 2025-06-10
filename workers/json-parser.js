self.onmessage = (e) => {
  const { type, data } = e.data

  try {
    switch (type) {
      case "PARSE_JSON":
        const parsed = JSON.parse(data)
        self.postMessage({
          type: "PARSE_SUCCESS",
          data: parsed,
        })
        break

      case "VALIDATE_JSON":
        JSON.parse(data)
        self.postMessage({
          type: "VALIDATION_SUCCESS",
          data: true,
        })
        break

      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    self.postMessage({
      type: "PARSE_ERROR",
      error: error.message,
    })
  }
}
