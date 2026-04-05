#!/bin/bash
set -e

echo "=== NPLatform Build Verification ==="
echo ""

echo "1. TypeScript check..."
npx tsc --noEmit || { echo "❌ TypeScript check failed"; exit 1; }
echo "✅ TypeScript check passed"
echo ""

echo "2. ESLint..."
npx next lint || { echo "❌ ESLint failed"; exit 1; }
echo "✅ ESLint passed"
echo ""

echo "3. Build..."
npm run build || { echo "❌ Build failed"; exit 1; }
echo "✅ Build passed"
echo ""

echo "4. Page count..."
PAGE_COUNT=$(find .next/server/app -name "*.html" 2>/dev/null | wc -l)
echo "   Generated pages: $PAGE_COUNT"
echo ""

echo "=== All checks passed ==="
