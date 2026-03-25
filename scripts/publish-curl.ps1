# Publish to here.now using curl (Windows native)

param(
    [string]$distPath = "dist"
)

$credFile = "$HOME\.herenow\credentials"

if (-not (Test-Path $credFile)) {
    Write-Error "API key file not found: $credFile"
    exit 1
}

$ApiKey = (Get-Content $credFile -Raw).Trim()
Write-Host "[KEY] API Key loaded" -ForegroundColor Green

# Get files
$files = Get-ChildItem -Path $distPath -Recurse -File
Write-Host "[PACK] Found $($files.Count) files" -ForegroundColor Cyan

foreach ($file in $files) {
    $relativePath = ($file.FullName -replace [regex]::Escape((Get-Item $distPath).FullName), "") -replace "^\\", ""
    Write-Host "  - $relativePath" -ForegroundColor Gray
}

Write-Host "`n[PUBLISH] Uploading to here.now..." -ForegroundColor Cyan

# Create curl command
$curlArgs = @(
    "https://here.now/api/publish",
    "-H", "Authorization: Bearer $ApiKey",
    "-X", "POST"
)

# Add files
foreach ($file in $files) {
    $relativePath = ($file.FullName -replace [regex]::Escape((Get-Item $distPath).FullName), "") -replace "^\\", ""
    $curlArgs += "-F", "files[]=@`"$($file.FullName)`";filename=`"$relativePath`""
}

# Execute curl
& curl.exe @curlArgs -s | Tee-Object -Variable response
Write-Host "`n" -ForegroundColor Cyan

# Parse response
if ($response -match '"slug"') {
    $slug = $response | Select-String -Pattern '"slug":"([^"]+)"' | ForEach-Object { $_.Matches[0].Groups[1].Value }
    Write-Host "[SUCCESS] Published!" -ForegroundColor Green
    Write-Host "[URL] https://$slug.here.now/" -ForegroundColor Green
}
else {
    Write-Host "[ERROR] Publication may have failed. Response:" -ForegroundColor Red
    Write-Host $response
}
