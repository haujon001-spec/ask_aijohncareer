$distPath = "c:\Users\haujo\projects\DEV\ask_aijohncareer\dist"
$slug = "placid-solace-frmj"

# Load API key from credentials file
$credFile = "$HOME\.herenow\credentials"
if (-not (Test-Path $credFile)) {
    Write-Host "[ERROR] API key not found at $credFile" -ForegroundColor Red
    exit 1
}
$ApiKey = (Get-Content $credFile -Raw).Trim()
Write-Host "[KEY] API key loaded" -ForegroundColor Green

# Get all files
$files = Get-ChildItem -Path $distPath -Recurse -File

# Build file manifest for API
$fileManifest = @()
foreach ($file in $files) {
    $relativePath = ($file.FullName -replace [regex]::Escape($distPath), "") -replace "^\\", ""
    # Convert backslashes to forward slashes for web
    $relativePath = $relativePath -replace "\\", "/"
    $size = $file.Length
    $contentType = switch ($file.Extension) {
        '.html' { 'text/html; charset=utf-8' }
        '.js' { 'text/javascript; charset=utf-8' }
        '.css' { 'text/css; charset=utf-8' }
        '.json' { 'application/json' }
        '.png' { 'image/png' }
        '.jpg' { 'image/jpeg' }
        '.svg' { 'image/svg+xml' }
        default { 'application/octet-stream' }
    }
    $fileManifest += @{
        path = $relativePath
        size = $size
        contentType = $contentType
    }
}

Write-Host ("[INFO] Found " + $fileManifest.Count + " files to deploy") -ForegroundColor Cyan
$fileManifest | ForEach-Object { Write-Host ("  - " + $_.path + " (" + $_.size + " bytes)") -ForegroundColor Gray }

# Create site via API (anonymous - 24hr)
Write-Host "`n[PUBLISH] Creating site..." -ForegroundColor Cyan

$payload = @{
    files = $fileManifest
} | ConvertTo-Json -Depth 10

Write-Host "Payload: $payload" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "https://here.now/api/v1/publish" `
        -Method Post `
        -Headers @{
            "Content-Type" = "application/json"
            "X-HereNow-Client" = "copilot/deploy"
            "Authorization" = "Bearer $ApiKey"
        } `
        -Body $payload
} catch {
    Write-Host "[ERROR] API Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception.Response -ForegroundColor Red
    exit 1
}

Write-Host "[SUCCESS] Site created!" -ForegroundColor Green
Write-Host ("SLUG: " + $response.slug) -ForegroundColor Yellow
Write-Host ("URL: " + $response.siteUrl) -ForegroundColor Yellow

Write-Host "`n[UPLOAD] Uploading files..." -ForegroundColor Cyan
foreach ($uploadInfo in $response.upload.uploads) {
    # Convert forward slashes back to backslashes for Windows file system
    $localPath = $uploadInfo.path -replace "/", "\"
    $filePath = Join-Path $distPath $localPath
    $fileContent = [System.IO.File]::ReadAllBytes($filePath)
    
    # Convert headers from PSCustomObject to hashtable
    $headers = @{}
    $uploadInfo.headers.PSObject.Properties | ForEach-Object {
        $headers[$_.Name] = $_.Value
    }
    
    Invoke-RestMethod -Uri $uploadInfo.url `
        -Method Put `
        -Headers $headers `
        -Body $fileContent | Out-Null
    
    Write-Host ("  . " + $uploadInfo.path) -ForegroundColor Green
}

Write-Host "`n[FINALIZE] Finalizing deployment..." -ForegroundColor Cyan

$finalizePayload = @{
    versionId = $response.upload.versionId
} | ConvertTo-Json

$finalizeResponse = Invoke-RestMethod -Uri $response.upload.finalizeUrl `
    -Method Post `
    -Headers @{
        "Content-Type" = "application/json"
        "X-HereNow-Client" = "copilot/deploy"
        "Authorization" = "Bearer $ApiKey"
    } `
    -Body $finalizePayload

Write-Host "[LIVE] Site is now live!" -ForegroundColor Green
Write-Host ("URL: " + $finalizeResponse.siteUrl) -ForegroundColor Green

if ($response.claimUrl) {
    Write-Host "`n[CLAIM] To keep this site permanently, visit:" -ForegroundColor Yellow
    Write-Host $response.claimUrl -ForegroundColor Yellow
}
