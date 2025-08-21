#!/bin/bash

echo "🔍 Testing migration setup..."

# Test 1: Check if required files exist
echo "📁 Checking required files..."
if [ -f "scripts/migrate-data.ts" ]; then
    echo "✅ Migration script found"
else
    echo "❌ Migration script not found"
    exit 1
fi

if [ -f ".db/db.json" ]; then
    echo "✅ Database JSON file found"
else
    echo "❌ Database JSON file not found"
    exit 1
fi

if [ -f "scripts/tsconfig.json" ]; then
    echo "✅ TypeScript config found"
else
    echo "❌ TypeScript config not found"
    exit 1
fi

# Test 2: Check TypeScript compilation
echo ""
echo "🔧 Testing TypeScript compilation..."
if npx tsc --project scripts/tsconfig.json --noEmit; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# Test 3: Check data file structure
echo ""
echo "📊 Checking data file structure..."
PRODUCT_COUNT=$(jq '.products | length' .db/db.json 2>/dev/null || echo "0")
if [ "$PRODUCT_COUNT" -gt 0 ]; then
    echo "✅ Found $PRODUCT_COUNT products in data file"
else
    echo "❌ No products found in data file or invalid JSON"
    exit 1
fi

# Test 4: Check if required dependencies are installed
echo ""
echo "📦 Checking dependencies..."
if npm list mongoose > /dev/null 2>&1; then
    echo "✅ mongoose dependency found"
else
    echo "⚠️  mongoose dependency might be missing"
fi

if npm list ts-node > /dev/null 2>&1; then
    echo "✅ ts-node dependency found"
else
    echo "⚠️  ts-node dependency might be missing"
fi

echo ""
echo "🎉 Migration setup test completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Build migration image: docker build -f scripts/Dockerfile.migration -t dhruvjaindocker/k8s-shop-migration:latest ."
echo "2. Push to Docker Hub: docker push dhruvjaindocker/k8s-shop-migration:latest"
echo "3. Apply migration job: kubectl apply -f kubernetes/12-migration-job.yml"
