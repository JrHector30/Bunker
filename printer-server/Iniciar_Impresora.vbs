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

' Ejecutar el servidor backend (api/index.js) en segundo plano (0 = ocultar ventana, false = no esperar)
' El backend iniciará automáticamente el servidor de impresión local (server.js) de forma nativa.
WshShell.Run "cmd.exe /c node api/index.js", 0, false
