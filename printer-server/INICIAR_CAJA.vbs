Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strPath = WScript.ScriptFullName
strFolder = objFSO.GetParentFolderName(strPath)

' Asegurar Node.js en el PATH del proceso
WshShell.Environment("Process")("PATH") = WshShell.Environment("Process")("PATH") & ";C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;" & WshShell.ExpandEnvironmentStrings("%APPDATA%\npm")

' Detectar ubicación de server.js
Dim serverFile, runDir
If objFSO.FileExists(strFolder & "\server.js") Then
    serverFile = "server.js"
    runDir = strFolder
ElseIf objFSO.FileExists(strFolder & "\printer-server\server.js") Then
    serverFile = "printer-server\server.js"
    runDir = strFolder
ElseIf objFSO.FileExists(objFSO.GetParentFolderName(strFolder) & "\printer-server\server.js") Then
    serverFile = "printer-server\server.js"
    runDir = objFSO.GetParentFolderName(strFolder)
Else
    serverFile = "server.js"
    runDir = strFolder
End If

WshShell.CurrentDirectory = runDir

' Establecer estación CAJA
WshShell.Environment("Process")("STATION_ID") = "Caja"
WshShell.Run "cmd.exe /c set STATION_ID=Caja&& node " & serverFile & " Caja", 0, false

' Iniciar bandeja si existe en el directorio
If objFSO.FileExists(runDir & "\Bunker_Bandeja.bat") Then
    WshShell.Run "cmd.exe /c Bunker_Bandeja.bat", 0, false
End If

WScript.Sleep 1500
MsgBox "Servidor de Impresión Búnker iniciado correctamente." & vbCrLf & vbCrLf & "Estación asignada: ""Caja""" & vbCrLf & "Este equipo imprimirá los comprobantes y precuentas de Caja.", 64, "Búnker POS - Estación Caja"
