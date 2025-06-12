#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Only copy to .next directory for development (not watched by Next.js file watcher)
mkdir -p "$PROJECT_DIR/.next/static/chunks"
mkdir -p "$PROJECT_DIR/public/_next/static/chunks"
if [ -f "$PROJECT_DIR/public/jq.wasm" ]; then
    cp "$PROJECT_DIR/public/jq.wasm" "$PROJECT_DIR/.next/static/chunks/jq.wasm"
    cp "$PROJECT_DIR/public/jq.wasm" "$PROJECT_DIR/public/_next/static/chunks/jq.wasm"
    echo "✅ Copied jq.wasm to .next chunks directory for development"
else
    echo "⚠️ jq.wasm not found in public directory"
fi