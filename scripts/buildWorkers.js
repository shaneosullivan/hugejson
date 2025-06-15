#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const workersDir = path.join(__dirname, "../workers");
const publicDir = path.join(__dirname, "../public");
const workerFiles = [
  "json-parser.ts",
  "json-formatter.ts",
  "json-search.ts",
  "collapsibility-analyzer.ts",
];

console.log("🔨 Building TypeScript workers...");

async function buildWorker(filename) {
  const jsFileName = filename.replace(".ts", ".js");
  const tsFile = path.join(workersDir, filename);
  const jsFile = path.join(publicDir, "workers", jsFileName);

  return new Promise((resolve, reject) => {
    const bun = spawn(
      "bun",
      ["build", tsFile, "--outfile", jsFile, "--target", "browser"],
      {
        stdio: "pipe",
      }
    );

    let stdout = "";
    let stderr = "";

    bun.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    bun.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    bun.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ Built ${filename} -> ${jsFile}`);
        resolve();
      } else {
        console.error(`❌ Failed to build ${filename}:`);
        console.error(stderr || stdout);
        reject(new Error(`Build failed for ${filename}`));
      }
    });
  });
}

async function buildAllWorkers() {
  try {
    // Build all workers in parallel
    await Promise.all(workerFiles.map(buildWorker));

    console.log("🎉 All workers built and copied successfully!");
  } catch (error) {
    console.error("💥 Worker build failed:", error.message);
    process.exit(1);
  }
}

buildAllWorkers();
