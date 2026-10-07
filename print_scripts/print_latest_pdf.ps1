# ============================================================
# One More Shot - Print Latest PDF to Epson L8050
# ============================================================
# How to use:
#   1. Download the PDF from the admin panel
#   2. Open & check it looks good
#   3. Double-click this script (or run in PowerShell)
#   4. It finds the latest PDF in Downloads
#   5. Asks you Yes/No
#   6. Sends to Epson L8050 if you say Yes
# ============================================================

$PrinterName = "EPSON L8050 Series"
$DownloadsFolder = "$env:USERPROFILE\Downloads"

# Find the most recent PDF
$latestPdf = Get-ChildItem -Path $DownloadsFolder -Filter "*.pdf" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $latestPdf) {
    Write-Host ""
    Write-Host "  No PDF files found in Downloads folder!" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit
}

# Show file info
Write-Host ""
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host "   One More Shot - Print to Epson" -ForegroundColor Cyan
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Latest PDF found:" -ForegroundColor Yellow
Write-Host "    Name: $($latestPdf.Name)" -ForegroundColor White
Write-Host "    Size: $([math]::Round($latestPdf.Length / 1KB, 1)) KB" -ForegroundColor White
Write-Host "    Date: $($latestPdf.LastWriteTime.ToString('dd-MMM-yyyy hh:mm tt'))" -ForegroundColor White
Write-Host ""
Write-Host "  Printer: $PrinterName" -ForegroundColor Green
Write-Host ""

# Ask confirmation
$response = Read-Host "  Do you want to print this? (yes/no)"

if ($response -match "^(y|yes)$") {
    Write-Host ""
    Write-Host "  Sending to printer..." -ForegroundColor Yellow
    
    try {
        # Print using the default PDF application (SumatraPDF, Adobe, Edge, etc.)
        Start-Process -FilePath $latestPdf.FullName -Verb PrintTo -ArgumentList "`"$PrinterName`"" -ErrorAction Stop
        
        Write-Host "  Sent to $PrinterName successfully!" -ForegroundColor Green
        Write-Host "  (Epson preview will show up if enabled in driver settings)" -ForegroundColor DarkGray
    }
    catch {
        Write-Host "  PrintTo failed, trying alternate method..." -ForegroundColor Yellow
        try {
            # Fallback: use Print verb (uses default printer)
            Start-Process -FilePath $latestPdf.FullName -Verb Print -ErrorAction Stop
            Write-Host "  Sent to default printer!" -ForegroundColor Green
        }
        catch {
            Write-Host "  Error: $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host ""
    Write-Host "  Print cancelled." -ForegroundColor Gray
}

Write-Host ""
Read-Host "Press Enter to exit"
