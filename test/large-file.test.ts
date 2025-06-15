import { describe, it, expect } from "bun:test";
import { stringify } from "../lib/iterativeStringify";

describe("Large JSON Processing Tests", () => {
  // it("should process large JSON file efficiently", async () => {
  //   const filePath = "/private/tmp/json/temp.json";

  //   // Skip test if file doesn't exist
  //   if (!fs.existsSync(filePath)) {
  //     console.log("Skipping large file test - file not found at", filePath);
  //     return;
  //   }

  //   const startTime = Date.now();

  //   // Read and parse the file
  //   const fileContent = fs.readFileSync(filePath, "utf8");
  //   const fileSizeMB = fileContent.length / 1024 / 1024;

  //   console.log(`File size: ${fileSizeMB.toFixed(2)}MB`);

  //   const jsonData = JSON.parse(fileContent);
  //   const parseTime = Date.now() - startTime;

  //   // Test our iterative stringify
  //   const stringifyStartTime = Date.now();
  //   const result = stringify(jsonData);
  //   const stringifyTime = Date.now() - stringifyStartTime;

  //   console.log(
  //     `Parse time: ${parseTime}ms, Stringify time: ${stringifyTime}ms`
  //   );
  //   console.log(`Output size: ${(result.length / 1024 / 1024).toFixed(2)}MB`);

  //   // Assertions
  //   expect(result).not.toBe(undefined);
  //   expect(result.length > 0).toBe(true);
  //   expect(stringifyTime < 5000).toBe(true); // Should complete in under 5 seconds

  //   // Verify it's valid JSON by parsing it back
  //   expect(() => JSON.parse(result)).not.toThrow();
  // });

  it("should handle deeply nested arrays with 500 levels", () => {
    const MAX_BRACKET_LENGTH = 50;

    // Create nested array: [[[[]]]] but 500 levels deep
    let nestedArray: any = JSON.parse(
      "[".repeat(500) + '"hello world"' + "]".repeat(500)
    );

    const startTime = Date.now();
    const result = stringify(nestedArray, 0); // indent of 0
    const processingTime = Date.now() - startTime;

    console.log(`Deep array (500 levels) processed in ${processingTime}ms`);
    console.log(`Output length: ${result.length} characters`);

    // Verify structure
    const openingBrackets = (result.match(/\[/g) || []).length;
    const closingBrackets = (result.match(/\]/g) || []).length;

    // Assertions
    expect(result).not.toBe(undefined);
    expect(result.length > 0).toBe(true);
    expect(openingBrackets).toBe(500);
    expect(closingBrackets).toBe(500);
    expect(processingTime < 100).toBe(true); // Should be very fast due to consolidation

    const numLines = 500 / MAX_BRACKET_LENGTH;
    const finalString =
      ("[".repeat(MAX_BRACKET_LENGTH) + "\n").repeat(numLines) +
      '"hello world"' +
      ("\n" + "]".repeat(MAX_BRACKET_LENGTH)).repeat(numLines);

    // fs.mkdirSync("./tmp/hugejson", { recursive: true });
    // fs.writeFileSync("./tmp/hugejson/result.txt", result);
    // fs.writeFileSync("./tmp/hugejson/expected.txt", finalString);

    // The result should match the expected format exactly
    expect(result).toBe(finalString);

    expect(result).toContain('"hello world"');

    // Verify it's valid JSON
    expect(() => JSON.parse(result)).not.toThrow();

    // Verify round-trip consistency
    const reparsed = JSON.parse(result);
    expect(stringify(reparsed, 0)).toBe(result);
  });

  it("should disable formatting for large structures", () => {
    // Create a large array that should trigger no-formatting mode
    const largeArray = new Array(2000)
      .fill(0)
      .map((_, i) => ({ id: i, value: `item${i}` }));

    const resultWithoutIndent = stringify(largeArray);
    const resultWithIndent = stringify(largeArray, 2);

    // With large arrays, both should be the same (formatting disabled)
    expect(resultWithoutIndent).toBe(resultWithIndent);
    expect(resultWithoutIndent).not.toContain("\n"); // No newlines in output
  });
});
