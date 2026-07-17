Set WshShell = CreateObject("WScript.Shell")
' Determinar la ruta absoluta de la carpeta del script
strPath = Wscript.ScriptFullName
Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objFile = objFSO.GetFile(strPath)
strFolder = objFSO.GetParentFolderName(objFile)

' Obtener la carpeta principal del proyecto
strParentFolder = objFSO.GetParentFolderName(strFolder)

' Cambiar el directorio de trabajo a la carpeta principal para ejecutar el backend
WshShell.CurrentDirectory = strParentFolder

' Ejecutar el servidor de impresión local (printer-server/server.js) en segundo plano (0 = ocultar ventana, false = no esperar)
WshShell.Run "cmd.exe /c node printer-server/server.js", 0, false

' Ejecutar también la bandeja de sistema (Bunker_Bandeja.bat) de forma invisible en segundo plano
WshShell.Run "cmd.exe /c Bunker_Bandeja.bat", 0, false
