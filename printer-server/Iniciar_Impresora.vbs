Set WshShell = CreateObject("WScript.Shell")
' Determinar la ruta absoluta de la carpeta del script
strPath = Wscript.ScriptFullName
Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objFile = objFSO.GetFile(strPath)
strFolder = objFSO.GetParentFolderName(objFile)

' Cambiar el directorio de trabajo a la carpeta del script
WshShell.CurrentDirectory = strFolder

' Ejecutar el servidor de impresión en segundo plano (0 = ocultar ventana, false = no esperar a que termine)
WshShell.Run "cmd.exe /c node server.js", 0, false
