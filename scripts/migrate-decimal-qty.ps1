# Decimal Quantity Migration Script
# Run this script to migrate database for decimal quantity support

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Finara Decimal Qty Migration" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if database is running
Write-Host "[1/5] Checking database connection..." -ForegroundColor Yellow
$dbCheck = docker ps --filter "name=finara-postgres" --filter "status=running" --format "{{.Names}}"
if ($dbCheck -ne "finara-postgres") {
    Write-Host "❌ Database is not running!" -ForegroundColor Red
    Write-Host "Please start the database first:" -ForegroundColor Red
    Write-Host "docker start finara-postgres" -ForegroundColor White
    exit 1
}
Write-Host "✅ Database is running" -ForegroundColor Green
Write-Host ""

# Step 2: Create backup
Write-Host "[2/5] Creating database backup..." -ForegroundColor Yellow
$backupDate = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backup_decimal_qty_$backupDate.sql"
docker exec finara-postgres pg_dump -U postgres finara > $backupFile
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup created: $backupFile" -ForegroundColor Green
} else {
    Write-Host "❌ Backup failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Generate Prisma Client
Write-Host "[3/5] Generating Prisma Client..." -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma Client generated" -ForegroundColor Green
} else {
    Write-Host "❌ Prisma generation failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Push schema changes
Write-Host "[4/5] Pushing schema changes to database..." -ForegroundColor Yellow
Write-Host "⚠️  This will modify the database structure" -ForegroundColor Yellow
$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne "y") {
    Write-Host "❌ Migration cancelled" -ForegroundColor Red
    exit 1
}

npm run db:push
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Schema changes applied" -ForegroundColor Green
} else {
    Write-Host "❌ Schema push failed!" -ForegroundColor Red
    Write-Host "Restore backup with:" -ForegroundColor Red
    Write-Host "docker exec -i finara-postgres psql -U postgres finara < $backupFile" -ForegroundColor White
    exit 1
}
Write-Host ""

# Step 5: Verify changes
Write-Host "[5/5] Verifying changes..." -ForegroundColor Yellow
Write-Host "Opening Prisma Studio for verification..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Please check:" -ForegroundColor Cyan
Write-Host "  1. ItemTransaksi.qty is now Decimal" -ForegroundColor White
Write-Host "  2. TransaksiMasuk.qty is now Decimal" -ForegroundColor White
Write-Host "  3. TransaksiKeluar.qty is now Decimal" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to open Prisma Studio..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Start-Process -NoNewWindow npm run db:studio

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Migration Complete! ✅" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Test kasir with decimal quantities (0.5, 0.25, etc)" -ForegroundColor White
Write-Host "  2. Run tests: npm test" -ForegroundColor White
Write-Host "  3. Read docs: docs/DECIMAL_QTY_MIGRATION.md" -ForegroundColor White
Write-Host ""
Write-Host "Backup location: $backupFile" -ForegroundColor Yellow
