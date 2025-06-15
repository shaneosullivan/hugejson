import { safeStringify } from '../lib/iterativeStringify';

self.onmessage = (e) => {
  const { type, data, file } = e.data
  const startTime = performance.now();


  try {
    switch (type) {
      case "READ_AND_PARSE_FILE":
        const fileStartTime = performance.now()
        
        const reader = new FileReader()
        reader.onload = (event) => {
          const readEndTime = performance.now()
          
          let content = event.target!.result as string;
          
          try {
            content = safeStringify(JSON.parse(event.target!.result as string), 2);
          } catch (error) {
            console.error("Failed to parse JSON when reading the file:", error);
          }
          
          self.postMessage({
            type: "FILE_READ_SUCCESS",
            content: content,
            readTime: readEndTime - fileStartTime
          })
          
          // Now parse the JSON
          const parseStartTime = performance.now()
          
          try {
            const parsed = JSON.parse(content)
            const parseEndTime = performance.now()
            
            // Use safe stringify for deep structures
            const stringifyResult = safeStringify(parsed, 2)
            
            self.postMessage({
              type: "PARSE_SUCCESS",
              dataString: stringifyResult,
              parseTime: parseEndTime - parseStartTime,
              totalTime: parseEndTime - fileStartTime
            })
          } catch (parseError: any) {
            const parseEndTime = performance.now()
            
            self.postMessage({
              type: "PARSE_ERROR",
              error: parseError.message,
              parseTime: parseEndTime - parseStartTime
            })
          }
        }
        
        reader.onerror = () => {
          const errorTime = performance.now()
          
          self.postMessage({
            type: "FILE_READ_ERROR",
            error: "Failed to read file",
            readTime: errorTime - fileStartTime
          })
        }
        
        reader.readAsText(file)
        break

      case "PARSE_JSON":
        const parseStartTime = performance.now()
        
        const parsed = JSON.parse(data)
        const parseEndTime = performance.now()
        
        // Use safe stringify for deep structures
        const stringifyResult = safeStringify(parsed, 2)
        
        self.postMessage({
          type: "PARSE_SUCCESS",
          dataString: stringifyResult,
          parseTime: parseEndTime - parseStartTime
        })
        break

      case "VALIDATE_JSON":
        const validateStartTime = performance.now()
        
        JSON.parse(data)
        const validateEndTime = performance.now()
        
        self.postMessage({
          type: "VALIDATION_SUCCESS",
          data: true,
          validateTime: validateEndTime - validateStartTime
        })
        break

      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error: any) {
    const errorTime = performance.now()
    
    self.postMessage({
      type: "PARSE_ERROR",
      error: error.message,
      errorTime: errorTime - startTime
    })
  }
}