#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const workersDir = path.join(__dirname, "../workers");
const publicDir = path.join(__dirname, "../public");

// Debug: Show current working directory and paths
// console.log("🔍 Build environment:");
// console.log("  Current working directory:", process.cwd());
// console.log("  Script directory:", __dirname);
// console.log("  Workers source directory:", workersDir);
// console.log("  Public output directory:", publicDir);
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

  // Ensure the output directory exists
  const outputDir = path.dirname(jsFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
  }

  console.log(`🔨 Building ${filename}:`);
  console.log(`  Source: ${tsFile}`);
  console.log(`  Output: ${jsFile}`);

  return new Promise((resolve, reject) => {
    // Try bun first, fallback to node if bun is not available
    const hasBun = (() => {
      try {
        require.resolve("bun");
        return true;
      } catch {
        return false;
      }
    })();

    let buildCommand, buildArgs;

    if (hasBun) {
      buildCommand = "bun";
      buildArgs = [
        "build",
        tsFile,
        "--outfile",
        jsFile,
        "--target",
        "browser",
        "--no-splitting",
        "--minify",
      ];
    } else {
      // Fallback to using npx and esbuild with proper bundling for workers
      buildCommand = "npx";
      buildArgs = [
        "esbuild",
        tsFile,
        "--outfile=" + jsFile,
        "--bundle", // Bundle all dependencies inline
        "--format=iife", // Use IIFE format for workers (no imports/exports)
        "--target=es2020",
        "--platform=browser",
        "--minify", // Minify for smaller files
      ];
    }

    console.log(`  Command: ${buildCommand} ${buildArgs.join(" ")}`);

    const buildProcess = spawn(buildCommand, buildArgs, {
      stdio: "pipe",
      cwd: process.cwd(),
    });

    let stdout = "";
    let stderr = "";

    buildProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    buildProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    buildProcess.on("close", (code) => {
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
    // Ensure public/workers directory exists
    const workersPublicDir = path.join(publicDir, "workers");
    if (!fs.existsSync(workersPublicDir)) {
      fs.mkdirSync(workersPublicDir, { recursive: true });
      console.log("📁 Created public/workers directory");
    }

    // Build all workers in parallel
    await Promise.all(workerFiles.map(buildWorker));

    // Verify all files were created - use the actual build output paths
    console.log("🔍 Verifying built files:");
    for (const filename of workerFiles) {
      const jsFileName = filename.replace(".ts", ".js");
      const jsFile = path.join(publicDir, "workers", jsFileName);

      // Try both the expected path and check if bun created it elsewhere
      let actualFile = jsFile;
      if (!fs.existsSync(jsFile)) {
        // Check if it was created in the current working directory
        const cwdFile = path.join(
          process.cwd(),
          "public",
          "workers",
          jsFileName
        );
        if (fs.existsSync(cwdFile)) {
          actualFile = cwdFile;
        }
      }

      if (fs.existsSync(actualFile)) {
        const stats = fs.statSync(actualFile);
        console.log(`✅ ${jsFileName} (${stats.size} bytes) at ${actualFile}`);
      } else {
        console.error(`❌ Missing: ${jsFileName} (checked ${jsFile})`);
        // List what's actually in the workers directory for debugging
        const workersDir = path.dirname(jsFile);
        if (fs.existsSync(workersDir)) {
          const files = fs.readdirSync(workersDir);
          console.log(`📁 Workers directory contents: ${files.join(", ")}`);
        } else {
          console.log(`📁 Workers directory doesn't exist: ${workersDir}`);
        }
      }
    }

    console.log("🎉 All workers built and copied successfully!");
  } catch (error) {
    console.error("💥 Worker build failed:", error.message);
    process.exit(1);
  }
}

buildAllWorkers();
