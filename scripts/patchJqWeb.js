const fs = require("fs");
const path = require("path");
const jqWebPath = path.join(__dirname, "..", "node_modules", "jq-web", "jq.js");

const contents = fs.readFileSync(jqWebPath, "utf8");

const lines = contents.split("\n");

let found = false;
const patchedLines = lines.map((line) => {
  // Patch the line to use the correct path for jq.wasm
  if (line.includes("require('fs')")) {
    found = true;
    return line.replace(
      `require('fs')`,
      `{
  readFile: () => {},
  writeFile: () => {},
  existsSync: () => false,
  readFileSync: () => '',
  writeFileSync: () => {},
  promises: {
    readFile: () => Promise.resolve(''),
    writeFile: () => Promise.resolve(),
  }
}`
    );
  }
  return line;
});

if (found) {
  fs.writeFileSync(jqWebPath, patchedLines.join("\n"), "utf8");
}
