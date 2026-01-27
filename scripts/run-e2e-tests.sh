#!/bin/bash
set -e

echo "🧪 Starting E2E Tests..."

# Check if dev server is already running
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  echo "✅ Dev server already running on port 5173"
else
  echo "🚀 Starting dev server..."
  npm run dev &
  DEV_PID=$!

  # Wait for server to be ready
  echo "⏳ Waiting for dev server..."
  sleep 10

  # Check if server started successfully
  if ! lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "❌ Failed to start dev server"
    exit 1
  fi

  echo "✅ Dev server started (PID: $DEV_PID)"
fi

echo ""
echo "📋 Test Scenarios:"
echo "  1. Auth & Login Workflow"
echo "  2. Invite Code Signup Workflow"
echo "  3. Member CRUD Workflow"
echo "  4. Weekly Marks Entry Workflow"
echo ""
echo "⚠️  Manual testing required - see tests/e2e/*.md for detailed steps"
echo ""
echo "✨ E2E test environment ready!"
echo ""
echo "To stop the dev server after testing:"
if [ -n "$DEV_PID" ]; then
  echo "  kill $DEV_PID"
else
  echo "  Find the process with: lsof -ti:5173 | xargs kill"
fi
