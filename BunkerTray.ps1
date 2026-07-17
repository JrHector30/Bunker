# BunkerTray.ps1 - Bandeja de Sistema para Servidor de Impresión y Backend de Bunker
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrEmpty($scriptDir)) {
    $scriptDir = "C:\Users\JrHector\Downloads\Bunker"
}

$pngPath = Join-Path $scriptDir "client\public\iconCG-32x32.png"
$vbsPath = Join-Path $scriptDir "printer-server\Iniciar_Impresora.vbs"

# Crear el icono de la bandeja
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Text = "Bunker POS & Impresión"

# Cargar el icono desde el PNG si existe, si no usa un icono de sistema
if (Test-Path $pngPath) {
    try {
        $bitmap = [System.Drawing.Bitmap]::FromFile($pngPath)
        $hIcon = $bitmap.GetHicon()
        $notifyIcon.Icon = [System.Drawing.Icon]::FromHandle($hIcon)
    } catch {
        $notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
    }
} else {
    $notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
}

# Funciones de control de procesos
function Stop-BunkerProcesses {
    # Puertos: 3000 (backend) y 19999 (impresora)
    $ports = @(3000, 19999)
    $killedCount = 0
    foreach ($port in $ports) {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            $pids = $connections | Select-Object -ExpandProperty OwningProcess | Unique
            foreach ($pid in $pids) {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                $killedCount++
            }
        }
    }
    return $killedCount
}

function Start-BunkerProcesses {
    if (Test-Path $vbsPath) {
        # Ejecutar el VBS en segundo plano
        Start-Process -FilePath "wscript.exe" -ArgumentList "`"$vbsPath`"" -WindowStyle Hidden
    } else {
        # Fallback de ejecución directa de cmd
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c node api/index.js" -WorkingDirectory $scriptDir -WindowStyle Hidden
    }
}

function Get-BunkerStatus {
    $backendActive = $false
    $printerActive = $false
    
    # Comprobar puerto 3000
    if (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue) {
        $backendActive = $true
    }
    # Comprobar puerto 19999
    if (Get-NetTCPConnection -LocalPort 19999 -ErrorAction SilentlyContinue) {
        $printerActive = $true
    }
    
    if ($backendActive -and $printerActive) {
        return "Bunker está corriendo normalmente.`nBackend (Puerto 3000): ACTIVO`nImpresora (Puerto 19999): ACTIVO"
    } elseif ($backendActive) {
        return "Bunker parcialmente activo.`nBackend (Puerto 3000): ACTIVO`nImpresora (Puerto 19999): DETENIDO"
    } elseif ($printerActive) {
        return "Bunker parcialmente activo.`nBackend (Puerto 3000): DETENIDO`nImpresora (Puerto 19999): ACTIVO"
    } else {
        return "Bunker está completamente DETENIDO."
    }
}

# Crear Menú Contextual
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

$statusItem = New-Object System.Windows.Forms.ToolStripMenuItem("Ver Estado", $null, {
    $status = Get-BunkerStatus
    $notifyIcon.ShowBalloonTip(3000, "Estado de Bunker", $status, [System.Windows.Forms.ToolTipIcon]::Info)
})

$startItem = New-Object System.Windows.Forms.ToolStripMenuItem("Iniciar Bunker POS", $null, {
    $notifyIcon.ShowBalloonTip(2000, "Bunker POS", "Iniciando servicios en segundo plano...", [System.Windows.Forms.ToolTipIcon]::Info)
    Start-BunkerProcesses
    Start-Sleep -Seconds 3
    $status = Get-BunkerStatus
    $notifyIcon.ShowBalloonTip(3000, "Estado de Bunker", $status, [System.Windows.Forms.ToolTipIcon]::Info)
})

$stopItem = New-Object System.Windows.Forms.ToolStripMenuItem("Detener Bunker POS", $null, {
    $notifyIcon.ShowBalloonTip(2000, "Bunker POS", "Deteniendo servicios...", [System.Windows.Forms.ToolTipIcon]::Info)
    $killed = Stop-BunkerProcesses
    $notifyIcon.ShowBalloonTip(3000, "Bunker POS", "Servicios detenidos ($killed procesos finalizados).", [System.Windows.Forms.ToolTipIcon]::Info)
})

$restartItem = New-Object System.Windows.Forms.ToolStripMenuItem("Reiniciar Bunker POS", $null, {
    $notifyIcon.ShowBalloonTip(2000, "Bunker POS", "Reiniciando servicios...", [System.Windows.Forms.ToolTipIcon]::Info)
    Stop-BunkerProcesses
    Start-Sleep -Seconds 1
    Start-BunkerProcesses
    Start-Sleep -Seconds 3
    $status = Get-BunkerStatus
    $notifyIcon.ShowBalloonTip(3000, "Estado de Bunker", $status, [System.Windows.Forms.ToolTipIcon]::Info)
})

$exitItem = New-Object System.Windows.Forms.ToolStripMenuItem("Salir de la Bandeja", $null, {
    $notifyIcon.Visible = $false
    [System.Windows.Forms.Application]::Exit()
})

$contextMenu.Items.Add($statusItem) | Out-Null
$contextMenu.Items.Add("-") | Out-Null # Separador
$contextMenu.Items.Add($startItem) | Out-Null
$contextMenu.Items.Add($stopItem) | Out-Null
$contextMenu.Items.Add($restartItem) | Out-Null
$contextMenu.Items.Add("-") | Out-Null # Separador
$contextMenu.Items.Add($exitItem) | Out-Null

$notifyIcon.ContextMenuStrip = $contextMenu
$notifyIcon.Visible = $true

# Mostrar un globo informativo al iniciar la bandeja
$notifyIcon.ShowBalloonTip(3000, "Bunker POS", "Bandeja del sistema iniciada. Haz clic derecho para ver las opciones.", [System.Windows.Forms.ToolTipIcon]::Info)

# Mantener corriendo el script con el bucle de mensajes
[System.Windows.Forms.Application]::Run()
