#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Copy jq.wasm from public to the output chunks directory
# mkdir -p "$PROJECT_DIR/out/_next/static/chunks"
cp "$PROJECT_DIR/public/jq.wasm" "$PROJECT_DIR/out/_next/static/chunks/jq.wasm"

echo "✅ Copied jq.wasm to output directory"