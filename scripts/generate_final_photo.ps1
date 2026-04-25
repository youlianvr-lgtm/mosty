Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $root "images\final.jpg"

$canvasWidth = 2160
$canvasHeight = 1296
$cols = 6
$rows = 3
$cellWidth = [int]($canvasWidth / $cols)
$cellHeight = [int]($canvasHeight / $rows)

$titleFont = New-Object System.Drawing.Font("Georgia", 25, [System.Drawing.FontStyle]::Bold)
$subtitleFont = New-Object System.Drawing.Font("Segoe UI Semibold", 12, [System.Drawing.FontStyle]::Regular)
$badgeFont = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)

$tiles = @(
  @{ Title = "1. 1940"; Subtitle = "District formation"; Image = "images\dubno_art.png"; Accent = [System.Drawing.Color]::FromArgb(170, 89, 44, 24) },
  @{ Title = "2. Schools"; Subtitle = "Culture in 1940s"; Image = "images\images.jpg"; Accent = [System.Drawing.Color]::FromArgb(160, 24, 62, 88) },
  @{ Title = "3. Recovery"; Subtitle = "Liberation and labor"; Image = "images\ef228649f3ab4c01f74b41c4161c4569.jpg"; Accent = [System.Drawing.Color]::FromArgb(170, 42, 56, 36) },
  @{ Title = "4. Neman"; Subtitle = "River route"; Image = "images\mosty_bridge.jpg"; Accent = [System.Drawing.Color]::FromArgb(170, 22, 66, 86) },
  @{ Title = "5. Hanging bridge"; Subtitle = "Mosty symbol"; Image = "bridgefromfar.jpg"; Accent = [System.Drawing.Color]::FromArgb(165, 30, 53, 74) },
  @{ Title = "6. Seven bridges"; Subtitle = "Urban structure"; Image = "images\mosty_bridge_sunset.jpg"; Accent = [System.Drawing.Color]::FromArgb(165, 26, 60, 92) },
  @{ Title = "7. 1971-1972"; Subtitle = "Opening date"; Image = "dateofbuilding.jpg"; Accent = [System.Drawing.Color]::FromArgb(170, 54, 54, 30) },
  @{ Title = "8. Church"; Subtitle = "Mosty sanctuary"; Image = "images\dchurch1.jpg"; Accent = [System.Drawing.Color]::FromArgb(170, 78, 52, 20) },
  @{ Title = "9. Museum"; Subtitle = "Forest and people"; Image = "images\mosty_museum_hall.jpg"; Accent = [System.Drawing.Color]::FromArgb(165, 36, 56, 44) },
  @{ Title = "10. Crafts"; Subtitle = "Local identity"; Image = "images\mosty_memorial_stone.jpg"; Accent = [System.Drawing.Color]::FromArgb(170, 44, 43, 43) },
  @{ Title = "11. Legend"; Subtitle = "Dubno church"; Image = "images\dubno_church_front.jpg"; Accent = [System.Drawing.Color]::FromArgb(170, 67, 49, 29) },
  @{ Title = "12. Nikolai"; Subtitle = "Church of 1840s"; Image = "images\dchurch1.jpg"; Accent = [System.Drawing.Color]::FromArgb(170, 72, 52, 24) },
  @{ Title = "13. Memorial"; Subtitle = "Countrymen, 1970"; Image = "images\dubno_memorial_square.jpg"; Accent = [System.Drawing.Color]::FromArgb(170, 58, 50, 33) },
  @{ Title = "14. Dubno museum"; Subtitle = "People and memory"; Image = "images\dubno_museum_1.jpg"; Accent = [System.Drawing.Color]::FromArgb(170, 48, 40, 52) },
  @{ Title = "15. Knyazevodtsy"; Subtitle = "23 July 1943"; Image = "images\big.jpg"; Accent = [System.Drawing.Color]::FromArgb(170, 62, 36, 36) },
  @{ Title = "16. Lunno"; Subtitle = "Neman and memory"; Image = "images\lunno_memorial.png"; Accent = [System.Drawing.Color]::FromArgb(165, 34, 67, 74) },
  @{ Title = "Final"; Subtitle = "Route completed"; Image = "bridgefromfar.jpg"; Accent = [System.Drawing.Color]::FromArgb(165, 32, 70, 55) },
  @{ Title = "Map"; Subtitle = "Route scheme"; Image = "images\route-map.png"; Accent = [System.Drawing.Color]::FromArgb(168, 28, 54, 66) }
)

function New-RectF([float]$x, [float]$y, [float]$width, [float]$height) {
  return [System.Drawing.RectangleF]::new($x, $y, $width, $height)
}

function Draw-CoverImage {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Path,
    [System.Drawing.RectangleF]$Target
  )

  if (-not (Test-Path $Path)) {
    $fallback = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 28, 40, 46))
    $Graphics.FillRectangle($fallback, $Target)
    $fallback.Dispose()
    return
  }

  $img = [System.Drawing.Image]::FromFile($Path)
  try {
    $sourceRatio = $img.Width / $img.Height
    $targetRatio = $Target.Width / $Target.Height

    if ($sourceRatio -gt $targetRatio) {
      $srcHeight = $img.Height
      $srcWidth = [int]($img.Height * $targetRatio)
      $srcX = [int](($img.Width - $srcWidth) / 2)
      $srcY = 0
    } else {
      $srcWidth = $img.Width
      $srcHeight = [int]($img.Width / $targetRatio)
      $srcX = 0
      $srcY = [int](($img.Height - $srcHeight) / 2)
    }

    $sourceRect = [System.Drawing.RectangleF]::new($srcX, $srcY, $srcWidth, $srcHeight)
    $Graphics.DrawImage($img, $Target, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
  } finally {
    $img.Dispose()
  }
}

$bitmap = New-Object System.Drawing.Bitmap($canvasWidth, $canvasHeight)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$graphics.Clear([System.Drawing.Color]::FromArgb(255, 10, 15, 15))

try {
  for ($index = 0; $index -lt $tiles.Count; $index++) {
    $col = $index % $cols
    $row = [Math]::Floor($index / $cols)
    $tileRect = New-RectF ($col * $cellWidth) ($row * $cellHeight) $cellWidth $cellHeight
    $innerRect = New-RectF ($tileRect.X + 8) ($tileRect.Y + 8) ($tileRect.Width - 16) ($tileRect.Height - 16)
    $tile = $tiles[$index]
    $imagePath = Join-Path $root $tile.Image

    Draw-CoverImage -Graphics $graphics -Path $imagePath -Target $innerRect

    $overlayBrush = New-Object System.Drawing.SolidBrush($tile.Accent)
    $graphics.FillRectangle($overlayBrush, $innerRect)
    $overlayBrush.Dispose()

    $shadowBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      $innerRect,
      [System.Drawing.Color]::FromArgb(0, 0, 0, 0),
      [System.Drawing.Color]::FromArgb(220, 8, 12, 14),
      90
    )
    $graphics.FillRectangle($shadowBrush, $innerRect)
    $shadowBrush.Dispose()

    $badgeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(214, 12, 18, 18))
    $graphics.FillRectangle($badgeBrush, $innerRect.X + 14, $innerRect.Y + 14, 118, 28)
    $badgeBrush.Dispose()

    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 243, 236, 224))
    $captionRect = New-RectF ($innerRect.X + 20) ($innerRect.Bottom - 56) ($innerRect.Width - 30) 38
    $graphics.DrawString("Route", $badgeFont, $textBrush, $innerRect.X + 21, $innerRect.Y + 21)
    $graphics.DrawString($tile.Title, $titleFont, $textBrush, $innerRect.X + 20, $innerRect.Bottom - 98)
    $graphics.DrawString($tile.Subtitle, $subtitleFont, $textBrush, $captionRect)
    $textBrush.Dispose()

    $framePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 215, 200, 160), 2)
    $graphics.DrawRectangle($framePen, [System.Drawing.Rectangle]::Round($innerRect))
    $framePen.Dispose()
  }

  $footerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(205, 230, 222, 206))
  $graphics.DrawString("Travel around Mostovsky district", $subtitleFont, $footerBrush, 30, $canvasHeight - 28)
  $footerBrush.Dispose()

  $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $encoder = [System.Drawing.Imaging.Encoder]::Quality
  $parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, [long]92)
  $bitmap.Save($outputPath, $jpegCodec, $parameters)
}
finally {
  $graphics.Dispose()
  $bitmap.Dispose()
  $titleFont.Dispose()
  $subtitleFont.Dispose()
  $badgeFont.Dispose()
}
