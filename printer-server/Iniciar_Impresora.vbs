Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Determinar la ruta absoluta del script
strPath = WScript.ScriptFullName
strFolder = objFSO.GetParentFolderName(strPath)

' Asegurar Node.js en el PATH del proceso
WshShell.Environment("Process")("PATH") = WshShell.Environment("Process")("PATH") & ";C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;" & WshShell.ExpandEnvironmentStrings("%APPDATA%\npm")

' Detectar automáticamente la ubicación de server.js
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

' Estación por defecto: Caja
WshShell.Environment("Process")("STATION_ID") = "Caja"

' Iniciar en segundo plano invisible (0 = ocultar ventana, false = no bloquear)
WshShell.Run "cmd.exe /c node " & serverFile & " Caja", 0, false

' Iniciar bandeja si existe en el directorio
If objFSO.FileExists(runDir & "\Bunker_Bandeja.bat") Then
    WshShell.Run "cmd.exe /c Bunker_Bandeja.bat", 0, false
End If
