# BunkerTray.ps1 - Bandeja de Sistema para Servidor de Impresion y Backend de Bunker
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Control de Instancia Unica mediante Mutex Global
$createdNew = $false
$mutex = New-Object System.Threading.Mutex($true, "Global\BunkerPOSTrayMutex", [ref]$createdNew)
if (-not $createdNew) {
    exit
}

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
    $killedCount = 0
    # 1. Puertos: 3000 (backend) y rango 19900..19999 (servidor de impresion)
    $conns = Get-NetTCPConnection -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 3000 -or ($_.LocalPort -ge 19900 -and $_.LocalPort -le 19999) }
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($p in $pids) {
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            $killedCount++
        }
    }
    # 2. Detener procesos node que ejecuten printer-server/server.js o api/index.js
    $targetProcs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*printer-server*server.js*" -or $_.CommandLine -like "*api*index.js*" }
    foreach ($p in $targetProcs) {
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
        $killedCount++
    }
    return $killedCount
}

function Start-BunkerProcesses {
    if (Test-Path $vbsPath) {
        Start-Process -FilePath "wscript.exe" -ArgumentList "`"$vbsPath`"" -WindowStyle Hidden
    } else {
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c node printer-server/server.js" -WorkingDirectory $scriptDir -WindowStyle Hidden
    }
}

function Get-BunkerStatus {
    $backendActive = $false
    $printerActive = $false
    
    # Comprobar backend local (puerto 3000)
    if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) {
        $backendActive = $true
    }
    
    # Comprobar servidor de impresion:
    # 1) Revisa puertos de bloqueo de estacion (19900..19999)
    $lockConn = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -ge 19900 -and $_.LocalPort -le 19999 }
    # 2) O proceso activo de node ejecutando server.js
    $printerProc = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*printer-server*server.js*" }
    
    if ($lockConn -or $printerProc) {
        $printerActive = $true
    }
    
    $printerStatusText = if ($printerActive) { "ACTIVO (Listo para imprimir)" } else { "DETENIDO" }
    $backendStatusText = if ($backendActive) { "ACTIVO (http://localhost:3000)" } else { "DETENIDO (o en la nube)" }
    
    if ($backendActive -and $printerActive) {
        return "Bunker está corriendo al 100%.`n• Impresora (USB/Red): $printerStatusText`n• Backend Local: $backendStatusText"
    } elseif ($printerActive) {
        return "Bunker listo para imprimir.`n• Impresora (USB/Red): $printerStatusText`n• Backend Local: $backendStatusText"
    } elseif ($backendActive) {
        return "Bunker parcialmente activo.`n• Backend Local: $backendStatusText`n• Impresora (USB/Red): $printerStatusText"
    } else {
        return "Bunker está completamente DETENIDO.`n• Impresora (USB/Red): DETENIDO`n• Backend Local: DETENIDO"
    }
}

# Crear Menú Contextual
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

$statusItem = New-Object System.Windows.Forms.ToolStripMenuItem("Ver Estado", $null, {
    $status = Get-BunkerStatus
    $notifyIcon.ShowBalloonTip(4000, "Estado de Bunker", $status, [System.Windows.Forms.ToolTipIcon]::Info)
})

$startItem = New-Object System.Windows.Forms.ToolStripMenuItem("Iniciar Bunker POS", $null, {
    $notifyIcon.ShowBalloonTip(2000, "Bunker POS", "Iniciando servicios en segundo plano...", [System.Windows.Forms.ToolTipIcon]::Info)
    Start-BunkerProcesses
    Start-Sleep -Seconds 3
    $status = Get-BunkerStatus
    $notifyIcon.ShowBalloonTip(4000, "Estado de Bunker", $status, [System.Windows.Forms.ToolTipIcon]::Info)
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
    $notifyIcon.ShowBalloonTip(4000, "Estado de Bunker", $status, [System.Windows.Forms.ToolTipIcon]::Info)
})

$exitItem = New-Object System.Windows.Forms.ToolStripMenuItem("Salir de la Bandeja", $null, {
    $notifyIcon.Visible = $false
    try {
        $mutex.ReleaseMutex()
        $mutex.Dispose()
    } catch {}
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