Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap 64, 64
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Transparent)

$skin  = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(198, 134, 66))
$hair  = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(80, 50, 20))
$shirt = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(0, 100, 180))
$pants = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(30, 50, 120))
$eye   = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(50, 50, 150))

# Head top row (hair + sides)
$g.FillRectangle($skin, 0, 0, 32, 8)
$g.FillRectangle($hair, 8, 0, 8, 8)

# Head middle row (face + sides)
$g.FillRectangle($skin, 0, 8, 32, 8)
# Eyes on face
$g.FillRectangle($eye, 9, 10, 2, 2)
$g.FillRectangle($eye, 13, 10, 2, 2)

# Body
$g.FillRectangle($shirt, 16, 16, 24, 16)

# Right leg
$g.FillRectangle($pants, 0, 16, 16, 16)

# Right arm
$g.FillRectangle($shirt, 40, 16, 16, 16)

# Left leg (1.8 format)
$g.FillRectangle($pants, 16, 48, 16, 16)

# Left arm (1.8 format)
$g.FillRectangle($shirt, 32, 48, 16, 16)

$g.Dispose()

$dir = "c:\Developer\MineCraft\MineMate\resource_pack\textures\entity"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$bmp.Save("$dir\minemate_companion.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Texture created at $dir\minemate_companion.png"
