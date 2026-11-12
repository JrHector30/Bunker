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

' Establecer estación COCINA
WshShell.Environment("Process")("STATION_ID") = "Cocina"
WshShell.Run "cmd.exe /c set STATION_ID=Cocina&& node " & serverFile & " Cocina", 0, false

WScript.Sleep 1500
MsgBox "Servidor de Impresión Búnker iniciado correctamente." & vbCrLf & vbCrLf & "Estación asignada: ""Cocina""" & vbCrLf & "Este equipo imprimirá las comandas de Cocina.", 64, "Búnker POS - Estación Cocina"
