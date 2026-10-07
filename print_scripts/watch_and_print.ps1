# ============================================================
# One More Shot - Auto-Watch Downloads & Print
# ============================================================
# Run this BEFORE downloading from admin panel.
# It watches your Downloads folder for new PDFs.
# When a new PDF appears, it asks if you want to print.
#
# To stop watching: Press Ctrl+C
# ============================================================

$PrinterName = "EPSON L8050 Series"
$DownloadsFolder = "$env:USERPROFILE\Downloads"

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host "   One More Shot - Print Watcher" -ForegroundColor Cyan  
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Watching: $DownloadsFolder" -ForegroundColor Yellow
Write-Host "  Printer:  $PrinterName" -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop" -ForegroundColor DarkGray
Write-Host ""

# Create file system watcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $DownloadsFolder
$watcher.Filter = "*.pdf"
$watcher.EnableRaisingEvents = $false

# Get current files to know what's new
$existingFiles = @(Get-ChildItem -Path $DownloadsFolder -Filter "*.pdf" | Select-Object -ExpandProperty FullName)

Write-Host "  Waiting for new PDF downloads..." -ForegroundColor Gray
Write-Host ""

try {
    while ($true) {
        # Check for new PDFs every 2 seconds
        Start-Sleep -Seconds 2
        
        $currentFiles = @(Get-ChildItem -Path $DownloadsFolder -Filter "*.pdf" | Select-Object -ExpandProperty FullName)
        $newFiles = $currentFiles | Where-Object { $_ -notin $existingFiles }
        
        foreach ($newFile in $newFiles) {
            $fileInfo = Get-Item $newFile
            
            # Wait a moment for the file to finish downloading
            Start-Sleep -Seconds 2
            
            Write-Host ""
            Write-Host "  NEW PDF DETECTED!" -ForegroundColor Green
            Write-Host "    Name: $($fileInfo.Name)" -ForegroundColor White
            Write-Host "    Size: $([math]::Round($fileInfo.Length / 1KB, 1)) KB" -ForegroundColor White
            Write-Host ""
            
            # Play a beep
            [System.Console]::Beep(800, 300)
            
            $response = Read-Host "  Print this to Epson? (yes/no)"
            
            if ($response -match "^(y|yes)$") {
                Write-Host "  Sending to $PrinterName..." -ForegroundColor Yellow
                try {
                    Start-Process -FilePath $newFile -Verb PrintTo -ArgumentList "`"$PrinterName`"" -ErrorAction Stop
                    Write-Host "  Sent!" -ForegroundColor Green
                }
                catch {
                    Start-Process -FilePath $newFile -Verb Print -ErrorAction SilentlyContinue
                    Write-Host "  Sent to default printer!" -ForegroundColor Green
                }
            } else {
                Write-Host "  Skipped." -ForegroundColor Gray
            }
            
            # Add to known files so we don't ask again
            $existingFiles += $newFile
            
            Write-Host ""
            Write-Host "  Watching for more PDFs..." -ForegroundColor Gray
        }
    }
}
finally {
    Write-Host ""
    Write-Host "  Watcher stopped." -ForegroundColor Yellow
}
