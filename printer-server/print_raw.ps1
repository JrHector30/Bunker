param(
    [string]$printerName,
    [string]$filePath,
    [int]$anchoPapel,
    [int]$altoPapel
)

# Cargar librería de dibujo de .NET
Add-Type -AssemblyName System.Drawing

if (Test-Path $filePath) {
    $text = [System.IO.File]::ReadAllText($filePath)
    
    $printDoc = New-Object System.Drawing.Printing.PrintDocument
    $printDoc.PrinterSettings.PrinterName = $printerName
    
    # 1. Validar si el controlador declara soporte para papel personalizado
    $supportsCustom = $false
    foreach ($sz in $printDoc.PrinterSettings.PaperSizes) {
        if ($sz.Kind -eq [System.Drawing.Printing.PaperKind]::Custom) {
            $supportsCustom = $true
            break
        }
    }
    if (-not $supportsCustom) {
        Write-Host "⚠️ Advertencia: El controlador de la impresora '$printerName' no declara soporte nativo para papel personalizado (PaperKind.Custom). Forzando tamaño de todos modos."
    }

    # 2. Configurar el tamaño de papel de forma explícita
    $paperSize = New-Object System.Drawing.Printing.PaperSize("CustomTicket", $anchoPapel, $altoPapel)
    $printDoc.DefaultPageSettings.PaperSize = $paperSize
    
    # 3. Forzar márgenes en cero a nivel de página y configurar origen físico
    $printDoc.DefaultPageSettings.Margins.Left = 0
    $printDoc.DefaultPageSettings.Margins.Right = 0
    $printDoc.DefaultPageSettings.Margins.Top = 0
    $printDoc.DefaultPageSettings.Margins.Bottom = 0
    $printDoc.OriginAtMargins = $false 

    # 4. Asegurar márgenes en cero en tiempo de consulta de página
    $printDoc.add_QueryPageSettings({
        param($sender, $e)
        $e.PageSettings.Margins.Left = 0
        $e.PageSettings.Margins.Right = 0
        $e.PageSettings.Margins.Top = 0
        $e.PageSettings.Margins.Bottom = 0
    })

    # 5. Determinar tamaño de letra dinámico según el ancho del papel
    # 80mm (314) -> 9.0 | 58mm (228) -> 7.0 | 50mm (196) -> 6.0
    $fontSize = 9.0
    if ($anchoPapel -le 200) {
        $fontSize = 6.0
    } elseif ($anchoPapel -le 240) {
        $fontSize = 7.0
    }

    # 6. Controlador del evento de dibujo de página
    $printDoc.add_PrintPage({
        param($sender, $e)
        # Crear fuente monoespaciada con unidad de punto explícita
        $font = New-Object System.Drawing.Font("Consolas", $fontSize, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
        
        # Dibujar el ticket desde el origen físico (0,0)
        $e.Graphics.DrawString($text, $font, $brush, 0, 0)
    })

    # 6. Ejecutar el trabajo de impresión
    $printDoc.Print()
    Write-Host "✅ Ticket gráfico impreso con éxito ($anchoPapel x $altoPapel centésimas de pulgada) en: $printerName"
} else {
    Write-Error "❌ Archivo de ticket no encontrado: $filePath"
}
