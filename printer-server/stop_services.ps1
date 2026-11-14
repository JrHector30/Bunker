# stop_services.ps1 - Detiene procesos previos de Búnker POS
$myPid = $PID
try {
    # 1. Matar procesos node que ejecuten server.js
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like "*printer-server*server.js*" -or $_.CommandLine -like "*server.js*" } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

    # 2. Matar procesos powershell que ejecuten BunkerTray.ps1 (excepto este mismo proceso)
    Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.ProcessId -ne $myPid -and $_.CommandLine -like "*BunkerTray.ps1*" } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
} catch {}
