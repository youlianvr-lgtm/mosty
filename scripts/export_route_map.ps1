param(
  [string]$PptxPath = "schema routes.pptx",
  [int]$SlideIndex = 4,
  [string]$OutputPath = "images/route-map.png",
  [int]$Width = 2200
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root $PptxPath
if (-not (Test-Path $source)) {
  $source = Join-Path $root "схема маршрутов.pptx"
}
$target = Join-Path $root $OutputPath

if (-not (Test-Path $source)) {
  throw "Source file not found: $source"
}

$targetDir = Split-Path -Parent $target
if (-not (Test-Path $targetDir)) {
  New-Item -ItemType Directory -Path $targetDir | Out-Null
}

$powerPoint = $null
$presentation = $null

try {
  $powerPoint = New-Object -ComObject PowerPoint.Application
  $presentation = $powerPoint.Presentations.Open($source, $true, $true, $false)

  if ($SlideIndex -lt 1 -or $SlideIndex -gt $presentation.Slides.Count) {
    throw "Invalid slide index: $SlideIndex. Available: $($presentation.Slides.Count)"
  }

  $slide = $presentation.Slides.Item($SlideIndex)
  $pageWidth = [int]$presentation.PageSetup.SlideWidth
  $pageHeight = [int]$presentation.PageSetup.SlideHeight
  $height = [int]([Math]::Round($Width * ($pageHeight / $pageWidth)))

  $slide.Export($target, "PNG", $Width, $height)
  Write-Host "Exported: $target"
}
finally {
  if ($presentation) {
    $presentation.Close()
  }
  if ($powerPoint) {
    $powerPoint.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
