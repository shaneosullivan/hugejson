#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

rm -rf "$PROJECT_DIR/public/_next"

node "$PROJECT_DIR/scripts/patchJqWeb.js" 