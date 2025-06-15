#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const workersDir = path.join(__dirname, '../workers');
const publicDir = path.join(__dirname, '../public');
const workerFiles = [
  'json-parser.ts',
  'json-formatter.ts', 
  'json-search.ts',
  'collapsibility-analyzer.ts'
];

console.log('🔨 Building TypeScript workers...');

async function buildWorker(filename) {
  const tsFile = path.join(workersDir, filename);
  const jsFile = path.join(workersDir, filename.replace('.ts', '.js'));
  
  return new Promise((resolve, reject) => {
    const bun = spawn('bun', ['build', tsFile, '--outfile', jsFile, '--target', 'browser'], {
      stdio: 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    bun.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    bun.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    bun.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Built ${filename} -> ${filename.replace('.ts', '.js')}`);
        resolve();
      } else {
        console.error(`❌ Failed to build ${filename}:`);
        console.error(stderr || stdout);
        reject(new Error(`Build failed for ${filename}`));
      }
    });
  });
}

async function copyWorkersToPublic() {
  const publicWorkersDir = path.join(publicDir, 'workers');
  
  // Create public/workers directory if it doesn't exist
  if (!fs.existsSync(publicWorkersDir)) {
    fs.mkdirSync(publicWorkersDir, { recursive: true });
  }
  
  // Copy JS files to public directory
  for (const filename of workerFiles) {
    const jsFilename = filename.replace('.ts', '.js');
    const srcFile = path.join(workersDir, jsFilename);
    const destFile = path.join(publicWorkersDir, jsFilename);
    
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`📂 Copied ${jsFilename} to public/workers/`);
    }
  }
}

async function buildAllWorkers() {
  try {
    // Build all workers in parallel
    await Promise.all(workerFiles.map(buildWorker));
    
    // Copy to public directory for serving
    await copyWorkersToPublic();
    
    console.log('🎉 All workers built and copied successfully!');
  } catch (error) {
    console.error('💥 Worker build failed:', error.message);
    process.exit(1);
  }
}

buildAllWorkers();