Set WshShell = CreateObject("WScript.Shell")

' Obtener la carpeta donde está este archivo VBS
strPath = WScript.ScriptFullName
Set objFSO = CreateObject("Scripting.FileSystemObject")
strFolder = objFSO.GetParentFolderName(strPath)

' Cambiar el directorio de trabajo a la carpeta printer-server
WshShell.CurrentDirectory = strFolder

' Establecer la estación a Cocina
WshShell.Environment("Process")("STATION_ID") = "Cocina"

' Iniciar el servidor de impresion invisible como estacion Cocina (0 = sin ventana, false = no esperar)
WshShell.Run "cmd.exe /c set STATION_ID=Cocina&& node server.js Cocina", 0, false

' Mostrar globo de confirmacion (opcional)
Set objShell = CreateObject("WScript.Shell")
WScript.Sleep 2000
MsgBox "Impresora COCINA iniciada correctamente." & Chr(13) & "Puedes cerrar este mensaje.", 64, "Bunker - Cocina"
