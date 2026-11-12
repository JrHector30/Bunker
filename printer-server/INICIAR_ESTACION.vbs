Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strPath = WScript.ScriptFullName
strFolder = objFSO.GetParentFolderName(strPath)

' Asegurar Node.js en el PATH del proceso
WshShell.Environment("Process")("PATH") = WshShell.Environment("Process")("PATH") & ";C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;" & WshShell.ExpandEnvironmentStrings("%APPDATA%\npm")

' Detectar directorio exacto de server.js
Dim serverDir
If objFSO.FileExists(strFolder & "\server.js") Then
    serverDir = strFolder
ElseIf objFSO.FileExists(strFolder & "\printer-server\server.js") Then
    serverDir = strFolder & "\printer-server"
ElseIf objFSO.FileExists(objFSO.GetParentFolderName(strFolder) & "\printer-server\server.js") Then
    serverDir = objFSO.GetParentFolderName(strFolder) & "\printer-server"
Else
    serverDir = strFolder
End If

WshShell.CurrentDirectory = serverDir

' Determinar el nombre de la estación
Dim stationName
If WScript.Arguments.Count > 0 Then
    stationName = Trim(WScript.Arguments(0))
Else
    stationName = InputBox("Ingresa el nombre de la estación para este equipo (PC o Laptop):" & vbCrLf & vbCrLf & "Ejemplos: Caja, Laptop, Cocina, Bar", "Búnker - Asignar Estación de Impresión", "Cocina")
    If Trim(stationName) = "" Then
        WScript.Quit
    End If
End If

stationName = Trim(stationName)

' Iniciar estacion seleccionada directamente dentro de la carpeta del servidor
WshShell.Run "cmd.exe /c cd /d """ & serverDir & """ && set STATION_ID=" & stationName & "&& node server.js " & stationName, 0, false

' Iniciar bandeja si existe
If objFSO.FileExists(serverDir & "\Bunker_Bandeja.bat") Then
    WshShell.Run "cmd.exe /c cd /d """ & serverDir & """ && Bunker_Bandeja.bat", 0, false
ElseIf objFSO.FileExists(strFolder & "\Bunker_Bandeja.bat") Then
    WshShell.Run "cmd.exe /c cd /d """ & strFolder & """ && Bunker_Bandeja.bat", 0, false
End If

WScript.Sleep 1500
MsgBox "Servidor de Impresión Búnker iniciado correctamente." & vbCrLf & vbCrLf & "Estación asignada: """ & stationName & """" & vbCrLf & "El sistema ya está listo para imprimir y responder al botón Actualizar.", 64, "Búnker POS - " & stationName
