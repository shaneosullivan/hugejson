#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Copy jq.wasm from public to the output chunks directory
mkdir -p "$PROJECT_DIR/dist/_next/static/chunks"
if [ -f "$PROJECT_DIR/public/jq.wasm" ]; then
    cp "$PROJECT_DIR/public/jq.wasm" "$PROJECT_DIR/dist/_next/static/chunks/jq.wasm"
    echo "✅ Copied jq.wasm to dist chunks directory"
else
    echo "⚠️ jq.wasm not found in public directory, skipping copy"
fi

