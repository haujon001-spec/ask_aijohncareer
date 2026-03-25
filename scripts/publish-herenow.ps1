# PowerShell script to publish to here.now

$distPath = "dist"
$credFile = "$HOME\.herenow\credentials"

# Load API key
if (-not (Test-Path $credFile)) {
    Write-Error "API key file not found: $credFile"
    exit 1
}

$ApiKey = (Get-Content $credFile -Raw).Trim()
Write-Host "[KEY] API Key loaded" -ForegroundColor Green

# Get files to upload
$files = Get-ChildItem -Path $distPath -Recurse -File
Write-Host "[PACK] Found $($files.Count) files to publish" -ForegroundColor Cyan

# Create form data
$form = @{}
$fileIndex = 0

foreach ($file in $files) {
    $relativePath = ($file.FullName -replace [regex]::Escape((Get-Item $distPath).FullName), "") -replace "^\\", ""
    $form["files[$fileIndex]"] = $file
    $fileIndex++
    Write-Host "  - $relativePath" -ForegroundColor Gray
}

# Publish to here.now
Write-Host "`n[PUBLISH] Publishing to here.now..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest `
        -Uri "https://here.now/api/publish" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $ApiKey"
        } `
        -Form $form `
        -SkipHttpErrorCheck

    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 201) {
        $data = $response.Content | ConvertFrom-Json
        Write-Host "`n[SUCCESS] Published successfully!" -ForegroundColor Green
        Write-Host "[URL] https://$($data.slug).here.now/" -ForegroundColor Green
    } else {
        Write-Host "`n[ERROR] Status Code: $($response.StatusCode)" -ForegroundColor Red
        Write-Host $response.Content
    }
} catch {
    Write-Error "Failed to publish: $_"
    exit 1
}
