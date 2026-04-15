# Validation script to ensure old_erp is completely independent
# Run this script to verify there are no dependencies on voltcore_erp

Write-Host "🔍 Validating old_erp independence..." -ForegroundColor Cyan
Write-Host ""

$ErrorCount = 0
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Check 1: No hardcoded absolute paths
Write-Host "✓ Checking for hardcoded absolute paths..." -ForegroundColor Yellow
$hardcodedPaths = Get-ChildItem -Recurse -File -Exclude *.log | 
    Where-Object { $_.DirectoryName -notmatch 'node_modules|\.next|\.git' } |
    Select-String -Pattern "/home/z/my-project" -SimpleMatch -ErrorAction SilentlyContinue

if ($hardcodedPaths) {
    Write-Host "  ❌ Found hardcoded paths to /home/z/my-project" -ForegroundColor Red
    $hardcodedPaths | ForEach-Object { Write-Host "     $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
    $ErrorCount++
} else {
    Write-Host "  ✅ No hardcoded absolute paths found" -ForegroundColor Green
}
Write-Host ""

# Check 2: No references to voltcore_erp in imports
Write-Host "✓ Checking for voltcore_erp imports..." -ForegroundColor Yellow
$voltcoreImports = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx,*.js,*.jsx -ErrorAction SilentlyContinue |
    Select-String -Pattern "from.*voltcore_erp|import.*voltcore_erp" -ErrorAction SilentlyContinue

if ($voltcoreImports) {
    Write-Host "  ❌ Found imports referencing voltcore_erp" -ForegroundColor Red
    $voltcoreImports | ForEach-Object { Write-Host "     $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
    $ErrorCount++
} else {
    Write-Host "  ✅ No voltcore_erp imports found" -ForegroundColor Green
}
Write-Host ""

# Check 3: No parent directory imports (../../voltcore_erp)
Write-Host "✓ Checking for parent directory imports..." -ForegroundColor Yellow
$parentImports = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx,*.js,*.jsx -ErrorAction SilentlyContinue |
    Select-String -Pattern "from ['`"]\.\.\/\.\.\/" -ErrorAction SilentlyContinue

if ($parentImports) {
    Write-Host "  ❌ Found imports going up to parent directories" -ForegroundColor Red
    $parentImports | ForEach-Object { Write-Host "     $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
    $ErrorCount++
} else {
    Write-Host "  ✅ No parent directory imports found" -ForegroundColor Green
}
Write-Host ""

# Check 4: No file: dependencies in package.json
Write-Host "✓ Checking package.json for local file dependencies..." -ForegroundColor Yellow
$fileDeps = Select-String -Path package.json -Pattern "`"file:|`"link:" -ErrorAction SilentlyContinue

if ($fileDeps) {
    Write-Host "  ❌ Found local file/link dependencies in package.json" -ForegroundColor Red
    $ErrorCount++
} else {
    Write-Host "  ✅ No local file dependencies found" -ForegroundColor Green
}
Write-Host ""

# Check 5: Verify all required files exist
Write-Host "✓ Checking for required files..." -ForegroundColor Yellow
$requiredFiles = @(
    "package.json",
    ".env",
    "next.config.ts",
    "tsconfig.json",
    "prisma/schema.prisma",
    "src/app/layout.tsx"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "  ❌ Missing required file: $file" -ForegroundColor Red
        $missingFiles += $file
        $ErrorCount++
    }
}

if ($missingFiles.Count -eq 0) {
    Write-Host "  ✅ All required files present" -ForegroundColor Green
}
Write-Host ""

# Check 6: Verify DATABASE_URL is configurable
Write-Host "✓ Checking database configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "DATABASE_URL=") {
        Write-Host "  ✅ DATABASE_URL is configured in .env" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  DATABASE_URL not found in .env (may need configuration)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ .env file not found" -ForegroundColor Red
    $ErrorCount++
}
Write-Host ""

# Check 7: Verify scripts use relative paths
Write-Host "✓ Checking shell scripts for relative paths..." -ForegroundColor Yellow
$scriptFiles = @(
    ".zscripts/dev.sh",
    ".zscripts/build.sh",
    ".zscripts/start.sh",
    "serve.sh",
    "keepalive.sh"
)

foreach ($script in $scriptFiles) {
    if (Test-Path $script) {
        $scriptContent = Get-Content $script -Raw
        if ($scriptContent -match "SCRIPT_DIR.*dirname") {
            Write-Host "  ✅ $script uses relative paths" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  $script may not use relative paths" -ForegroundColor Yellow
        }
    }
}
Write-Host ""

# Summary
Write-Host "==================================" -ForegroundColor Cyan
if ($ErrorCount -eq 0) {
    Write-Host "✅ SUCCESS: old_erp is fully independent!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now:" -ForegroundColor White
    Write-Host "  1. Move this directory anywhere" -ForegroundColor White
    Write-Host "  2. Run 'npm install' or 'bun install'" -ForegroundColor White
    Write-Host "  3. Configure .env with your database" -ForegroundColor White
    Write-Host "  4. Run 'npm run dev' to start" -ForegroundColor White
    Write-Host ""
    exit 0
} else {
    Write-Host "❌ FAILED: Found $ErrorCount issue(s)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the issues above before deploying." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
