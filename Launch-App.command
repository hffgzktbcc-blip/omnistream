#!/bin/bash
# ==========================================================
# 🚀 1-CLICK LAUNCHER FOR OMNISTREAM (React + Vite + Node)
# Automatically clears old ports and opens your app in browser
# ==========================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "🧹 Clearing any stuck ports (5200, 3001)..."
lsof -ti:5200,3001 | xargs kill -9 2>/dev/null || true
sleep 1

echo "🌐 Launching browser at http://localhost:5200..."
(sleep 2.5 && open "http://localhost:5200") &

echo "⚡ Starting OmniStream full-stack app..."
npm run dev
