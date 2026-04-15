#!/bin/bash

# Validation script to ensure old_erp is completely independent
# Run this script to verify there are no dependencies on voltcore_erp

set -e

echo "🔍 Validating old_erp independence..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

ERRORS=0

# Check 1: No hardcoded absolute paths
echo "✓ Checking for hardcoded absolute paths..."
if grep -r "/home/z/my-project" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git --exclude="*.log" 2>/dev/null; then
    echo "❌ Found hardcoded paths to /home/z/my-project"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ No hardcoded absolute paths found"
fi
echo ""

# Check 2: No references to voltcore_erp in imports
echo "✓ Checking for voltcore_erp imports..."
if grep -r "from.*voltcore_erp\|import.*voltcore_erp" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null; then
    echo "❌ Found imports referencing voltcore_erp"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ No voltcore_erp imports found"
fi
echo ""

# Check 3: No parent directory imports (../../voltcore_erp)
echo "✓ Checking for parent directory imports..."
if grep -r "from ['\"]\.\.\/\.\.\/" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null; then
    echo "❌ Found imports going up to parent directories"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ No parent directory imports found"
fi
echo ""

# Check 4: No file: dependencies in package.json
echo "✓ Checking package.json for local file dependencies..."
if grep -E "\"file:|\"link:" package.json 2>/dev/null; then
    echo "❌ Found local file/link dependencies in package.json"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ No local file dependencies found"
fi
echo ""

# Check 5: Verify all required files exist
echo "✓ Checking for required files..."
REQUIRED_FILES=(
    "package.json"
    ".env"
    "next.config.ts"
    "tsconfig.json"
    "prisma/schema.prisma"
    "src/app/layout.tsx"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        ERRORS=$((ERRORS + 1))
    fi
done

if [ $ERRORS -eq 0 ]; then
    echo "  ✅ All required files present"
fi
echo ""

# Check 6: Verify DATABASE_URL is configurable
echo "✓ Checking database configuration..."
if [ -f ".env" ]; then
    if grep -q "DATABASE_URL=" .env; then
        echo "  ✅ DATABASE_URL is configured in .env"
    else
        echo "⚠️  DATABASE_URL not found in .env (may need configuration)"
    fi
else
    echo "❌ .env file not found"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 7: Verify scripts use relative paths
echo "✓ Checking shell scripts for relative paths..."
SCRIPT_FILES=(
    ".zscripts/dev.sh"
    ".zscripts/build.sh"
    ".zscripts/start.sh"
    "serve.sh"
    "keepalive.sh"
)

for script in "${SCRIPT_FILES[@]}"; do
    if [ -f "$script" ]; then
        if grep -q "SCRIPT_DIR.*dirname" "$script"; then
            echo "  ✅ $script uses relative paths"
        else
            echo "⚠️  $script may not use relative paths"
        fi
    fi
done
echo ""

# Summary
echo "=================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ SUCCESS: old_erp is fully independent!"
    echo ""
    echo "You can now:"
    echo "  1. Move this directory anywhere"
    echo "  2. Run 'npm install' or 'bun install'"
    echo "  3. Configure .env with your database"
    echo "  4. Run 'npm run dev' to start"
    echo ""
    exit 0
else
    echo "❌ FAILED: Found $ERRORS issue(s)"
    echo ""
    echo "Please fix the issues above before deploying."
    echo ""
    exit 1
fi
