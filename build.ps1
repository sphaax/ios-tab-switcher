# Packages the extension into dist/ for Chrome Web Store upload.
# Only runtime files are included (whitelist), so dev files, git data,
# reference images, and docs never end up in the uploaded zip.
#
# Zip entry names use forward slashes: PowerShell's built-in Compress-Archive
# writes backslashes (a ZIP-spec violation that can make Chrome misread nested
# folders), so the archive is built with .NET directly instead.
#
# Usage:  powershell -ExecutionPolicy Bypass -File build.ps1

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Read the version from the manifest for the output filename.
$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$version = $manifest.version

$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$zip = Join-Path $dist "ios-tab-switcher-v$version.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }

# Runtime files only. manifest.json must sit at the zip root.
$include = @(
  'manifest.json',
  'background.js',
  'switcher.html',
  'switcher.css',
  'switcher.js',
  'lib',
  '_locales',
  'icons'
)

# Gather (fullPath, entryName) pairs, entry names relative with forward slashes.
$files = New-Object System.Collections.ArrayList
foreach ($item in $include) {
  $p = Join-Path $root $item
  if (-not (Test-Path $p)) { throw "Missing required item: $item" }
  if (Test-Path $p -PathType Container) {
    Get-ChildItem -Path $p -Recurse -File | ForEach-Object {
      $rel = $_.FullName.Substring($root.Length + 1) -replace '\\', '/'
      [void]$files.Add(@($_.FullName, $rel))
    }
  } else {
    [void]$files.Add(@($p, ($item -replace '\\', '/')))
  }
}

$archive = [System.IO.Compression.ZipFile]::Open($zip, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($f in $files) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $archive, $f[0], $f[1], [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally {
  $archive.Dispose()
}

$sizeKb = [math]::Round((Get-Item $zip).Length / 1KB, 1)
Write-Host "Created $zip ($sizeKb KB)"
Write-Host "Upload it at https://chrome.google.com/webstore/devconsole"
