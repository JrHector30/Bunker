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
Else
    serverFile = "server.js"
    runDir = strFolder
End If

WshShell.CurrentDirectory = runDir

' Determinar el nombre de la estación (argumento de línea de comando o InputBox)
Dim stationName
If WScript.Arguments.Count > 0 Then
    stationName = Trim(WScript.Arguments(0))
Else
    stationName = InputBox("Ingresa el nombre de la estación para este equipo (PC o Laptop):" & vbCrLf & vbCrLf & "Ejemplos: Caja, Laptop, Cocina, Bar", "Búnker - Asignar Estación de Impresión", "Laptop")
    If Trim(stationName) = "" Then
        WScript.Quit
    End If
End If

stationName = Trim(stationName)

' Iniciar el servidor asignando la estación seleccionada
WshShell.Environment("Process")("STATION_ID") = stationName
WshShell.Run "cmd.exe /c set STATION_ID=" & stationName & "&& node " & serverFile & " " & stationName, 0, false

' Iniciar bandeja de sistema con icono B si existe
If objFSO.FileExists(runDir & "\Bunker_Bandeja.bat") Then
    WshShell.Run "cmd.exe /c Bunker_Bandeja.bat", 0, false
ElseIf objFSO.FileExists(strFolder & "\Bunker_Bandeja.bat") Then
    WshShell.Run "cmd.exe /c """ & strFolder & "\Bunker_Bandeja.bat""", 0, false
End If

' Confirmación al usuario
WScript.Sleep 1500
MsgBox "Servidor de Impresión Búnker iniciado correctamente." & vbCrLf & vbCrLf & "Estación asignada: """ & stationName & """" & vbCrLf & "El sistema ya está listo para imprimir y responder al botón Actualizar.", 64, "Búnker POS - " & stationName
