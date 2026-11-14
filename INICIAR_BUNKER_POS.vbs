' =====================================================================
' BÚNKER POS - INICIADOR MAESTRO DE SERVIDOR DE IMPRESIÓN Y BANDEJA
' =====================================================================
Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strPath = WScript.ScriptFullName
strFolder = objFSO.GetParentFolderName(strPath)

' Asegurar Node.js en el PATH del proceso
WshShell.Environment("Process")("PATH") = WshShell.Environment("Process")("PATH") & ";C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;" & WshShell.ExpandEnvironmentStrings("%APPDATA%\npm")

' Detectar directorio exacto de server.js
Dim serverDir
If objFSO.FileExists(strFolder & "\printer-server\server.js") Then
    serverDir = strFolder & "\printer-server"
ElseIf objFSO.FileExists(strFolder & "\server.js") Then
    serverDir = strFolder
Else
    serverDir = strFolder
End If

WshShell.CurrentDirectory = serverDir

' Estación asignada: si viene por parámetro usa ese, por defecto "Caja"
Dim stationName
If WScript.Arguments.Count > 0 Then
    stationName = Trim(WScript.Arguments(0))
Else
    stationName = "Caja"
End If

' 1. Iniciar servidor Node.js en segundo plano (modo oculto)
WshShell.Run "cmd.exe /c cd /d """ & serverDir & """ && node server.js " & stationName, 0, false

' 2. Iniciar Bandeja de Sistema (icono B en la barra de tareas)
If objFSO.FileExists(serverDir & "\Bunker_Bandeja.bat") Then
    WshShell.Run "cmd.exe /c cd /d """ & serverDir & """ && Bunker_Bandeja.bat", 0, false
ElseIf objFSO.FileExists(strFolder & "\Bunker_Bandeja.bat") Then
    WshShell.Run "cmd.exe /c cd /d """ & strFolder & """ && Bunker_Bandeja.bat", 0, false
End If

WScript.Sleep 1000

' Mostrar notificación de confirmación solo si fue ejecutado manualmente (no al iniciar con Windows)
Dim isSilent
isSilent = false
If WScript.Arguments.Count > 1 Then
    If LCase(Trim(WScript.Arguments(1))) = "silent" Then isSilent = true
End If

If Not isSilent Then
    MsgBox "Servidor de Impresión Búnker POS activo." & vbCrLf & vbCrLf & _
           "• Estación: """ & stationName & """" & vbCrLf & _
           "• Icono en bandeja: Activo (letra B)" & vbCrLf & vbCrLf & _
           "Listo para recibir órdenes de comanda y comprobantes.", 64, "Búnker POS - " & stationName
End If
