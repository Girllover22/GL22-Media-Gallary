#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules/electron ]; then
  npm install --no-audit --no-fund
fi
npm start
