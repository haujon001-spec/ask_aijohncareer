# publish.ps1 - Publish to here.now
param(
    [string]$Path = "dist",
    [string]$ApiKey = $null,
    [string]$Slug = $null
)

# Get API key from credentials file if not provided
if (-not $ApiKey) {
    $credFile = "$HOME\.herenow\credentials"
    if (Test-Path $credFile) {
        $ApiKey = Get-Content $credFile -Raw
    }
}

if (-not $ApiKey) {
    Write-Error "API key not found. Set HERENOW_API_KEY or ~/.herenow/credentials"
    exit 1
}

if (-not (Test-Path $Path)) {
    Write-Error "Path not found: $Path"
    exit 1
}

# Get file list
$files = @()
if ((Get-Item $Path).PSIsContainer) {
    $files = Get-ChildItem -Path $Path -Recurse -File | ForEach-Object {
        @{
            path = $_.FullName | Resolve-Path -Relative
            relativePath = ($_.FullName -replace [regex]::Escape((Get-Item $Path).FullName), "") -replace "^\\", ""
        }
    }
} else {
    $files = @(@{
        path = (Get-Item $Path).FullName
        relativePath = (Get-Item $Path).Name
    })
}

Write-Host "Publishing $($files.Count) file(s) to here.now..."

# Create multipart form data
$boundary = [System.Guid]::NewGuid().ToString()
$bodyLines = @()

foreach ($file in $files) {
    $filePath = $file.path
    $relativePath = $file.relativePath
    
    $bodyLines += "--$boundary"
    $bodyLines += "Content-Disposition: form-data; name=`"files[]`"; filename=`"$relativePath`""
    $bodyLines += "Content-Type: application/octet-stream"
    $bodyLines += ""
    
    $fileContent = [System.IO.File]::ReadAllBytes($filePath)
    $bodyLines += [System.Text.Encoding]::UTF8.GetString($fileContent)
}

$bodyLines += "--$boundary--"

# Make API call
$uri = "https://here.now/api/publish"
$headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type" = "multipart/form-data; boundary=$boundary"
}

Try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body ($bodyLines -join "`r`n") -ErrorAction Stop
    Write-Host "✓ Published successfully!"
    Write-Host "URL: https://$($response.slug).here.now/"
    exit 0
} Catch {
    Write-Error "Failed to publish: $_"
    exit 1
}
